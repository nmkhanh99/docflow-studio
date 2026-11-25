import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  createLogicalSection,
  createProject,
  createSectionRevision,
  createTemplateArtifact
} from '@core/domain';
import { SqliteAuditLogger } from '@infra/logging';
import {
  INITIAL_SQLITE_MIGRATIONS,
  SqliteDatabaseConnection,
  SqliteProjectRepository,
  runSqliteMigrations,
  type SqliteMigrationSpec
} from '@infra/sqlite';

const SAMPLE_HASH_A = 'a'.repeat(64);
const SAMPLE_HASH_B = 'b'.repeat(64);

describe('Integration: SQLite Schema Migrations nguyên tử, Idempotency & ProjectRepository (§5, §9.2)', () => {
  let tempDir = '';

  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'docflow-sqlite-test-'));
  });

  afterEach(async () => {
    if (tempDir) {
      await rm(tempDir, { recursive: true, force: true });
    }
  });

  it('tạo đầy đủ 10+ bảng nền tảng trong 001_initial_schema và chạy lại nhiều lần (idempotent) không mất dữ liệu', async () => {
    const dbFilePath = join(tempDir, 'project.sqlite');
    const conn = new SqliteDatabaseConnection({ dbFilePath });

    try {
      const firstRun = runSqliteMigrations(conn);
      expect(firstRun.currentVersion).toBe(1);
      expect(firstRun.appliedVersions).toEqual([1]);

      const tableRows = conn
        .prepare("SELECT name FROM sqlite_master WHERE type = 'table' ORDER BY name ASC")
        .all() as Array<{ name: string }>;
      const tableNames = tableRows.map((r) => r.name);

      const requiredTables = [
        'projects',
        'template_artifacts',
        'source_artifacts',
        'logical_sections',
        'section_revisions',
        'saved_rules',
        'dependency_edges',
        'runs',
        'builds',
        'audit_events'
      ];
      for (const tbl of requiredTables) {
        expect(tableNames, `Thiếu bảng nền tảng bắt buộc: ${tbl}`).toContain(tbl);
      }

      const repo = new SqliteProjectRepository(conn);
      const project = createProject({
        id: 'proj-idem-01',
        title: 'Dự án kiểm thử Idempotent Migration',
        status: 'ACTIVE',
        currentRecipeVersion: 2,
        createdAt: '2026-11-25T10:00:00.000Z',
        updatedAt: '2026-11-25T10:05:00.000Z'
      });
      await repo.saveProject(project);

      // Chạy lại migration lần 2 & lần 3: không báo lỗi, không chạy lại SQL cũ và không làm mất dữ liệu
      const secondRun = runSqliteMigrations(conn);
      expect(secondRun.currentVersion).toBe(1);
      expect(secondRun.appliedVersions).toEqual([]);

      const thirdRun = runSqliteMigrations(conn);
      expect(thirdRun.currentVersion).toBe(1);
      expect(thirdRun.appliedVersions).toEqual([]);

      const loaded = await repo.getProject('proj-idem-01');
      expect(loaded).toEqual(project);
    } finally {
      conn.close();
    }
  });

  it('rollback nguyên tử toàn bộ DDL và dữ liệu trung gian khi một migration bị lỗi giữa chừng', async () => {
    const dbFilePath = join(tempDir, 'rollback-migration.sqlite');
    const conn = new SqliteDatabaseConnection({ dbFilePath });

    try {
      runSqliteMigrations(conn, INITIAL_SQLITE_MIGRATIONS);
      const repo = new SqliteProjectRepository(conn);
      await repo.saveProject(
        createProject({
          id: 'proj-keep-safe',
          title: 'Dữ liệu phải an toàn khi migration sau lỗi',
          status: 'ACTIVE',
          currentRecipeVersion: 1,
          createdAt: '2026-11-25T09:00:00.000Z',
          updatedAt: '2026-11-25T09:00:00.000Z'
        })
      );

      const brokenMigrations: readonly SqliteMigrationSpec[] = [
        ...INITIAL_SQLITE_MIGRATIONS,
        {
          version: 2,
          name: '002_partial_broken_migration',
          sql: `
            CREATE TABLE temp_experimental_nodes (
              id TEXT PRIMARY KEY,
              label TEXT NOT NULL
            );
            INSERT INTO temp_experimental_nodes (id, label) VALUES ('n-1', 'Dữ liệu tạm trước khi lỗi');
            UPDATE projects SET current_recipe_version = 999 WHERE id = 'proj-keep-safe';
            -- Câu lệnh SQL sai cú pháp cố ý ở cuối migration để kích hoạt rollback nguyên tử:
            THIS_IS_INVALID_SQL_STATEMENT_THAT_MUST_ROLLBACK;
          `
        }
      ];

      expect(() => runSqliteMigrations(conn, brokenMigrations)).toThrow();

      // Xác minh phiên bản vẫn ở 1, bảng temp_experimental_nodes KHÔNG tồn tại và current_recipe_version vẫn là 1
      const versionRow = conn
        .prepare('SELECT MAX(version) AS v FROM _schema_migrations')
        .get() as { v: number };
      expect(versionRow.v).toBe(1);

      const leakedTable = conn
        .prepare(
          "SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'temp_experimental_nodes'"
        )
        .get();
      expect(leakedTable).toBeUndefined();

      const intactProject = await repo.getProject('proj-keep-safe');
      expect(intactProject?.currentRecipeVersion).toBe(1);

      // Phát hiện nếu ai đó sửa đổi nội dung SQL của migration 001 đã chạy (checksum mismatch)
      const tamperedHistory: readonly SqliteMigrationSpec[] = [
        {
          version: 1,
          name: '001_initial_schema',
          sql: '-- Nội dung SQL đã bị sửa khác với lịch sử'
        }
      ];
      expect(() => runSqliteMigrations(conn, tamperedHistory)).toThrowError(
        expect.objectContaining({ code: 'ARTIFACT_INTEGRITY_VIOLATION' })
      );
    } finally {
      conn.close();
    }
  });

  it('rollback nguyên tử giao dịch bất đồng bộ trên ProjectRepository, bảo vệ bất biến Template V0 / AuditEvent và khóa kết nối chỉ đọc', async () => {
    const dbFilePath = join(tempDir, 'repo-tx.sqlite');
    const conn = new SqliteDatabaseConnection({ dbFilePath });
    runSqliteMigrations(conn);

    const repo = new SqliteProjectRepository(conn);
    const auditLogger = new SqliteAuditLogger(conn);

    try {
      await repo.saveProject(
        createProject({
          id: 'proj-tx-01',
          title: 'Dự án kiểm thử giao dịch Repository',
          status: 'ACTIVE',
          currentRecipeVersion: 1,
          createdAt: '2026-11-25T08:00:00.000Z',
          updatedAt: '2026-11-25T08:00:00.000Z'
        })
      );

      await repo.saveTemplateArtifact(
        'proj-tx-01',
        createTemplateArtifact({
          id: 'template-v0',
          path: '/tmp/out-of-repo/template/original.docx',
          sha256: SAMPLE_HASH_A,
          parsedAt: '2026-11-25T08:01:00.000Z',
          ooxmlMap: { sectionBreakCount: 2 }
        })
      );

      // Chặn cập nhật đổi mã băm sha256 của Template V0 đã khóa trong SQLite
      await expect(
        repo.saveTemplateArtifact(
          'proj-tx-01',
          createTemplateArtifact({
            id: 'template-v0',
            path: '/tmp/out-of-repo/template/original.docx',
            sha256: SAMPLE_HASH_B,
            parsedAt: '2026-11-25T08:05:00.000Z',
            ooxmlMap: {}
          })
        )
      ).rejects.toMatchObject({
        code: 'IMMUTABLE_TARGET_PROTECTED'
      });

      // Giao dịch bất đồng bộ lỗi giữa chừng -> rollback toàn bộ section và revision vừa ghi
      await expect(
        repo.runInTransaction(async () => {
          await repo.saveDocumentStructure(
            'proj-tx-01',
            [
              createLogicalSection({
                id: 'section-doanh-thu',
                parentId: null,
                title: 'Phần 02 — Doanh thu kế hoạch',
                order: 1,
                startAnchor: 'w:p[10]',
                endAnchor: 'w:p[25]'
              })
            ],
            []
          );

          await repo.saveSectionRevisions('proj-tx-01', [
            createSectionRevision({
              id: 'rev-sec02-01',
              sectionId: 'section-doanh-thu',
              baseTemplateHash: SAMPLE_HASH_A,
              ruleId: 'rule.revenue',
              ruleVersion: 1,
              inputFingerprint: SAMPLE_HASH_B,
              outputs: { revenue: '3750000000' },
              patchSet: [
                {
                  blockId: 'blk-201',
                  op: 'replaceText',
                  payload: { newText: '3.750.000.000 đồng' }
                }
              ],
              reviewStatus: 'REVIEW_REQUIRED',
              approval: null
            })
          ]);

          throw new Error('Mô phỏng lỗi bất ngờ trước khi commit');
        })
      ).rejects.toThrow('Mô phỏng lỗi bất ngờ trước khi commit');

      expect(await repo.listLogicalSections('proj-tx-01')).toEqual([]);
      expect(await repo.listSectionRevisions('proj-tx-01')).toEqual([]);

      // Nhật ký kiểm toán append-only: ghi thành công nhưng cấm UPDATE hoặc DELETE
      auditLogger.record({
        id: 'aud-0001',
        correlationId: 'corr-0001',
        timestamp: '2026-11-25T08:10:00.000Z',
        channel: 'section.saveRevision',
        actorType: 'USER',
        actorId: 'local-user',
        mutating: true,
        outcome: 'ALLOWED',
        targetEntityId: 'rev-sec02-01'
      });
      expect(auditLogger.listRecent(5)).toHaveLength(1);

      expect(() =>
        conn.exec("DELETE FROM audit_events WHERE id = 'aud-0001'")
      ).toThrow(/AUDIT_EVENTS_APPEND_ONLY/);

      // Mở kết nối thứ hai ở chế độ chỉ đọc (readonly: true): đọc được nhưng cấm ghi
      const readOnlyConn = new SqliteDatabaseConnection({ dbFilePath, readonly: true });
      try {
        const roRepo = new SqliteProjectRepository(readOnlyConn);
        const roProject = await roRepo.getProject('proj-tx-01');
        expect(roProject?.id).toBe('proj-tx-01');

        await expect(
          roRepo.saveProject({
            ...roProject!,
            title: 'Cố ghi trên kết nối chỉ đọc'
          })
        ).rejects.toMatchObject({
          code: 'CAPABILITY_DENIED'
        });
      } finally {
        readOnlyConn.close();
      }
    } finally {
      conn.close();
    }
  });
});
