import { createHash } from 'node:crypto';
import { AppError } from '@core/domain';
import type { SqliteDatabaseConnection } from './connection';

export interface SqliteMigrationSpec {
  readonly version: number;
  readonly name: string;
  readonly sql: string;
}

export interface MigrationExecutionReport {
  readonly currentVersion: number;
  readonly appliedVersions: readonly number[];
  readonly totalMigrations: number;
}

export const MIGRATION_001_INITIAL_SCHEMA_SQL = `
-- 1. projects
CREATE TABLE projects (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('ACTIVE', 'ARCHIVED')),
  current_recipe_version INTEGER NOT NULL CHECK (current_recipe_version >= 0),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

-- 2. template_artifacts (Template V0 bất biến, chỉ đọc)
CREATE TABLE template_artifacts (
  project_id TEXT PRIMARY KEY REFERENCES projects(id) ON DELETE RESTRICT,
  id TEXT NOT NULL,
  path TEXT NOT NULL,
  sha256 TEXT NOT NULL CHECK (length(sha256) = 64),
  parsed_at TEXT NOT NULL,
  ooxml_map_json TEXT NOT NULL,
  read_only INTEGER NOT NULL DEFAULT 1 CHECK (read_only = 1)
);

CREATE TRIGGER trg_template_artifacts_prevent_immutable_mutation
BEFORE UPDATE ON template_artifacts
WHEN OLD.sha256 != NEW.sha256 OR OLD.path != NEW.path OR NEW.read_only != 1
BEGIN
  SELECT RAISE(ABORT, 'IMMUTABLE_TEMPLATE_V0_PROTECTED');
END;

CREATE TRIGGER trg_template_artifacts_prevent_delete
BEFORE DELETE ON template_artifacts
BEGIN
  SELECT RAISE(ABORT, 'IMMUTABLE_TEMPLATE_V0_PROTECTED');
END;

-- 3. source_artifacts (Source Snapshots bất biến theo sha256)
CREATE TABLE source_artifacts (
  project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  id TEXT NOT NULL,
  version INTEGER NOT NULL CHECK (version >= 1),
  type TEXT NOT NULL CHECK (type IN ('EXCEL', 'DOCX', 'PDF', 'CSV')),
  path TEXT NOT NULL,
  sha256 TEXT NOT NULL CHECK (length(sha256) = 64),
  imported_at TEXT NOT NULL,
  read_only INTEGER NOT NULL DEFAULT 1 CHECK (read_only = 1),
  PRIMARY KEY (project_id, id, version)
);

CREATE INDEX idx_source_artifacts_project_sha256
  ON source_artifacts(project_id, sha256);

-- 4. data_definitions
CREATE TABLE data_definitions (
  project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  key TEXT NOT NULL,
  data_type TEXT NOT NULL,
  unit TEXT,
  validation_json TEXT NOT NULL,
  default_policy TEXT NOT NULL CHECK (default_policy IN ('STOP_ON_MISSING', 'USE_EXPLICIT_DEFAULT')),
  PRIMARY KEY (project_id, key)
);

-- 5. data_bindings
CREATE TABLE data_bindings (
  project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  id TEXT NOT NULL,
  version INTEGER NOT NULL CHECK (version >= 1),
  target_key TEXT,
  source_id TEXT NOT NULL,
  source_sha256 TEXT CHECK (source_sha256 IS NULL OR length(source_sha256) = 64),
  range_selector TEXT NOT NULL,
  lookup_spec_json TEXT NOT NULL,
  priority INTEGER NOT NULL CHECK (priority >= 0),
  status TEXT NOT NULL,
  PRIMARY KEY (project_id, id, version)
);

-- 6. data_revisions
CREATE TABLE data_revisions (
  project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  id TEXT NOT NULL,
  key TEXT NOT NULL,
  value_json TEXT NOT NULL,
  provenance_json TEXT NOT NULL,
  status TEXT NOT NULL,
  version INTEGER NOT NULL CHECK (version >= 1),
  created_at TEXT NOT NULL,
  PRIMARY KEY (project_id, id)
);

CREATE INDEX idx_data_revisions_project_key
  ON data_revisions(project_id, key, version);

-- 7. logical_sections (Section != Page)
CREATE TABLE logical_sections (
  project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  id TEXT NOT NULL,
  parent_id TEXT,
  title TEXT NOT NULL,
  section_order INTEGER NOT NULL CHECK (section_order >= 0),
  start_anchor TEXT NOT NULL,
  end_anchor TEXT NOT NULL,
  required_for_build INTEGER NOT NULL DEFAULT 1 CHECK (required_for_build IN (0, 1)),
  PRIMARY KEY (project_id, id)
);

-- 8. document_blocks
CREATE TABLE document_blocks (
  project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  id TEXT NOT NULL,
  section_id TEXT NOT NULL,
  ooxml_locator TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('paragraph', 'table', 'image', 'sdt', 'range')),
  style_ref TEXT,
  anchor_fingerprint TEXT NOT NULL,
  block_order INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (project_id, id),
  FOREIGN KEY (project_id, section_id) REFERENCES logical_sections(project_id, id) ON DELETE CASCADE
);

CREATE INDEX idx_document_blocks_project_section
  ON document_blocks(project_id, section_id, block_order);

-- 9. change_requests
CREATE TABLE change_requests (
  project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  id TEXT NOT NULL,
  section_id TEXT NOT NULL,
  prompt TEXT NOT NULL,
  change_kind TEXT NOT NULL,
  status TEXT NOT NULL,
  affected_scope TEXT NOT NULL,
  old_value_json TEXT,
  new_value_json TEXT,
  linked_build_id TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  PRIMARY KEY (project_id, id)
);

-- 10. saved_rules (Typed Rule IR có phiên bản)
CREATE TABLE saved_rules (
  project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  id TEXT NOT NULL,
  version INTEGER NOT NULL CHECK (version >= 1),
  target_section_id TEXT,
  text_instruction TEXT NOT NULL,
  io_schema_json TEXT NOT NULL,
  execution_plan_json TEXT NOT NULL,
  test_cases_json TEXT NOT NULL,
  status TEXT NOT NULL,
  requires_human_review INTEGER NOT NULL CHECK (requires_human_review IN (0, 1)),
  review_triggers_json TEXT,
  PRIMARY KEY (project_id, id, version)
);

-- 11. dependency_edges (Đồ thị DAG)
CREATE TABLE dependency_edges (
  project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  id TEXT NOT NULL,
  from_id TEXT NOT NULL,
  to_id TEXT NOT NULL,
  from_node_type TEXT,
  to_node_type TEXT,
  type TEXT NOT NULL CHECK (type IN ('USES', 'PRODUCES', 'REFERENCES', 'REWRITES')),
  condition_expr TEXT,
  discovered_by TEXT NOT NULL CHECK (discovered_by IN ('USER', 'RULE_COMPILER', 'AI_PROPOSAL')),
  approved INTEGER NOT NULL CHECK (approved IN (0, 1)),
  edge_order INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (project_id, id),
  CHECK (from_id != to_id)
);

CREATE INDEX idx_dependency_edges_project_from_to
  ON dependency_edges(project_id, from_id, to_id);

-- 12. runs
CREATE TABLE runs (
  project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  id TEXT NOT NULL,
  mode TEXT NOT NULL CHECK (mode IN ('SELECTED', 'AFFECTED', 'FULL')),
  plan_hash TEXT NOT NULL CHECK (length(plan_hash) = 64),
  snapshot_id TEXT NOT NULL,
  started_at TEXT NOT NULL,
  completed_at TEXT,
  result TEXT NOT NULL CHECK (result IN ('RUNNING', 'SUCCEEDED', 'FAILED', 'CANCELLED')),
  PRIMARY KEY (project_id, id)
);

-- 13. run_steps
CREATE TABLE run_steps (
  project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  id TEXT NOT NULL,
  run_id TEXT NOT NULL,
  step_order INTEGER NOT NULL DEFAULT 0,
  rule_id TEXT NOT NULL,
  rule_version INTEGER,
  input_hashes_json TEXT NOT NULL,
  output_hash TEXT CHECK (output_hash IS NULL OR length(output_hash) = 64),
  result_fingerprint TEXT CHECK (result_fingerprint IS NULL OR length(result_fingerprint) = 64),
  evidence_json TEXT NOT NULL,
  errors_json TEXT NOT NULL,
  PRIMARY KEY (project_id, id),
  FOREIGN KEY (project_id, run_id) REFERENCES runs(project_id, id) ON DELETE CASCADE
);

-- 14. section_revisions
CREATE TABLE section_revisions (
  project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  id TEXT NOT NULL,
  section_id TEXT NOT NULL,
  base_template_hash TEXT NOT NULL CHECK (length(base_template_hash) = 64),
  rule_id TEXT,
  rule_version INTEGER,
  input_fingerprint TEXT NOT NULL CHECK (length(input_fingerprint) = 64),
  outputs_json TEXT NOT NULL,
  patch_set_json TEXT NOT NULL,
  review_status TEXT NOT NULL CHECK (review_status IN ('DRAFT', 'REVIEW_REQUIRED', 'APPROVED', 'SUPERSEDED')),
  approval_json TEXT,
  revision_order INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (project_id, id)
);

CREATE INDEX idx_section_revisions_project_section
  ON section_revisions(project_id, section_id, revision_order);

-- 15. builds (BuildManifest khóa cứng đầu vào dựng tài liệu)
CREATE TABLE builds (
  project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  id TEXT NOT NULL,
  template_hash TEXT NOT NULL CHECK (length(template_hash) = 64),
  source_snapshot_ids_json TEXT NOT NULL,
  recipe_version INTEGER NOT NULL CHECK (recipe_version >= 0),
  rule_versions_json TEXT NOT NULL,
  selected_revisions_json TEXT NOT NULL,
  layout_policy_json TEXT NOT NULL,
  renderer_info_json TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('BLOCKED', 'BUILDING', 'RENDERED', 'LAYOUT_REVIEW', 'APPROVED', 'EXPORTED')),
  build_order INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (project_id, id)
);

-- 16. build_artifacts
CREATE TABLE build_artifacts (
  project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  id TEXT NOT NULL,
  manifest_id TEXT NOT NULL,
  docx_path TEXT NOT NULL,
  pdf_preview_path TEXT,
  checksum TEXT NOT NULL CHECK (length(checksum) = 64),
  page_count INTEGER NOT NULL CHECK (page_count >= 1),
  layout_report_json TEXT NOT NULL,
  created_at TEXT NOT NULL,
  PRIMARY KEY (project_id, id),
  FOREIGN KEY (project_id, manifest_id) REFERENCES builds(project_id, id) ON DELETE CASCADE
);

-- 17. layout_issues
CREATE TABLE layout_issues (
  project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  id TEXT NOT NULL,
  build_id TEXT NOT NULL,
  issue_order INTEGER NOT NULL DEFAULT 0,
  section_id TEXT,
  block_id TEXT,
  type TEXT NOT NULL,
  severity TEXT NOT NULL CHECK (severity IN ('INFO', 'WARNING', 'CRITICAL')),
  start_page INTEGER NOT NULL CHECK (start_page >= 1),
  end_page INTEGER NOT NULL CHECK (end_page >= start_page),
  detail TEXT NOT NULL,
  PRIMARY KEY (project_id, id),
  FOREIGN KEY (project_id, build_id) REFERENCES build_artifacts(project_id, id) ON DELETE CASCADE
);

-- 18. audit_events (Nhật ký kiểm toán bất biến — append-only)
CREATE TABLE audit_events (
  seq INTEGER PRIMARY KEY AUTOINCREMENT,
  id TEXT NOT NULL UNIQUE,
  correlation_id TEXT NOT NULL,
  timestamp TEXT NOT NULL,
  channel TEXT NOT NULL,
  actor_type TEXT NOT NULL CHECK (actor_type IN ('USER', 'AI_AGENT')),
  actor_id TEXT NOT NULL,
  ai_role TEXT,
  mutating INTEGER NOT NULL CHECK (mutating IN (0, 1)),
  outcome TEXT NOT NULL CHECK (outcome IN ('ALLOWED', 'DENIED', 'VALIDATION_ERROR', 'HANDLER_ERROR')),
  error_code TEXT,
  target_entity_id TEXT
);

CREATE INDEX idx_audit_events_timestamp
  ON audit_events(timestamp DESC, seq DESC);

CREATE TRIGGER trg_audit_events_no_update
BEFORE UPDATE ON audit_events
BEGIN
  SELECT RAISE(ABORT, 'AUDIT_EVENTS_APPEND_ONLY');
END;

CREATE TRIGGER trg_audit_events_no_delete
BEFORE DELETE ON audit_events
BEGIN
  SELECT RAISE(ABORT, 'AUDIT_EVENTS_APPEND_ONLY');
END;
`;

export const INITIAL_SQLITE_MIGRATIONS: readonly SqliteMigrationSpec[] = Object.freeze([
  Object.freeze({
    version: 1,
    name: '001_initial_schema',
    sql: MIGRATION_001_INITIAL_SCHEMA_SQL
  })
]);

function computeMigrationChecksum(spec: SqliteMigrationSpec): string {
  return createHash('sha256')
    .update(`${String(spec.version)}:${spec.name}:${spec.sql.trim()}`, 'utf8')
    .digest('hex');
}

function validateAndSortMigrations(
  migrations: readonly SqliteMigrationSpec[]
): readonly SqliteMigrationSpec[] {
  const seenVersions = new Set<number>();
  for (const m of migrations) {
    if (!Number.isInteger(m.version) || m.version < 1) {
      throw new AppError({
        code: 'DOMAIN_INVARIANT_VIOLATION',
        message: `Phiên bản migration '${String(m.version)}' phải là số nguyên dương.`,
        details: { version: m.version, name: m.name },
        recoverable: false
      });
    }
    if (!m.name.trim() || !m.sql.trim()) {
      throw new AppError({
        code: 'DOMAIN_INVARIANT_VIOLATION',
        message: `Migration phiên bản ${String(m.version)} thiếu tên hoặc nội dung SQL.`,
        details: { version: m.version, name: m.name },
        recoverable: false
      });
    }
    if (seenVersions.has(m.version)) {
      throw new AppError({
        code: 'DOMAIN_INVARIANT_VIOLATION',
        message: `Phát hiện trùng lặp số phiên bản migration SQLite: ${String(m.version)}.`,
        details: { version: m.version, name: m.name },
        recoverable: false
      });
    }
    seenVersions.add(m.version);
  }

  return [...migrations].sort((a, b) => a.version - b.version);
}

interface AppliedMigrationRow {
  readonly version: number;
  readonly name: string;
  readonly checksum: string;
  readonly applied_at: string;
}

/**
 * Bộ chạy SQLite Schema Migrations nguyên tử và lũy đẳng (idempotent):
 * - Bọc toàn bộ đợt nâng cấp schema trong một giao dịch nguyên tử `BEGIN IMMEDIATE ... COMMIT`
 *   (rollback sạch cả DDL lẫn dữ liệu nếu có bất kỳ câu lệnh lỗi giữa chừng).
 * - Đối chiếu mã băm `checksum` của các migration đã chạy để phát hiện thay đổi schema lịch sử trái phép.
 */
export function runSqliteMigrations(
  connection: SqliteDatabaseConnection,
  migrations: readonly SqliteMigrationSpec[] = INITIAL_SQLITE_MIGRATIONS,
  now: () => Date = () => new Date()
): MigrationExecutionReport {
  const ordered = validateAndSortMigrations(migrations);

  if (connection.isReadOnly) {
    const existingRows = connection
      .prepare('SELECT version, name, checksum, applied_at FROM _schema_migrations ORDER BY version ASC')
      .all() as unknown as AppliedMigrationRow[];

    const appliedMap = new Map<number, AppliedMigrationRow>(
      existingRows.map((r) => [r.version, r])
    );

    for (const spec of ordered) {
      const applied = appliedMap.get(spec.version);
      if (!applied) {
        throw new AppError({
          code: 'CAPABILITY_DENIED',
          message: `Cơ sở dữ liệu chỉ đọc đang thiếu migration phiên bản ${String(spec.version)} ('${spec.name}').`,
          details: { version: spec.version, name: spec.name },
          recoverable: false
        });
      }
      const expectedChecksum = computeMigrationChecksum(spec);
      if (applied.checksum !== expectedChecksum) {
        throw new AppError({
          code: 'ARTIFACT_INTEGRITY_VIOLATION',
          message: `Mã băm lịch sử của migration ${String(spec.version)} ('${spec.name}') không khớp với đặc tả hiện tại.`,
          details: {
            version: spec.version,
            name: spec.name,
            expectedChecksum,
            recordedChecksum: applied.checksum
          },
          recoverable: false
        });
      }
    }

    const latestVersion =
      existingRows.length > 0 ? existingRows[existingRows.length - 1]!.version : 0;
    return Object.freeze({
      currentVersion: latestVersion,
      appliedVersions: Object.freeze([]),
      totalMigrations: ordered.length
    });
  }

  return connection.runInTransactionSync(() => {
    connection.exec(`
      CREATE TABLE IF NOT EXISTS _schema_migrations (
        version INTEGER PRIMARY KEY,
        name TEXT NOT NULL,
        checksum TEXT NOT NULL,
        applied_at TEXT NOT NULL
      );
    `);

    const existingRows = connection
      .prepare(
        'SELECT version, name, checksum, applied_at FROM _schema_migrations ORDER BY version ASC'
      )
      .all() as unknown as AppliedMigrationRow[];

    const appliedByVersion = new Map<number, AppliedMigrationRow>(
      existingRows.map((row) => [row.version, row])
    );
    const specByVersion = new Map<number, SqliteMigrationSpec>(
      ordered.map((spec) => [spec.version, spec])
    );

    for (const recorded of existingRows) {
      const matchingSpec = specByVersion.get(recorded.version);
      if (!matchingSpec) {
        throw new AppError({
          code: 'ARTIFACT_INTEGRITY_VIOLATION',
          message: `Cơ sở dữ liệu chứa phiên bản migration lạ (${String(recorded.version)}: '${recorded.name}') không có trong bộ mã ứng dụng.`,
          details: { recordedVersion: recorded.version, recordedName: recorded.name },
          recoverable: false
        });
      }
      const expectedChecksum = computeMigrationChecksum(matchingSpec);
      if (recorded.checksum !== expectedChecksum) {
        throw new AppError({
          code: 'ARTIFACT_INTEGRITY_VIOLATION',
          message: `Nội dung migration đã chạy '${matchingSpec.name}' (v${String(matchingSpec.version)}) bị thay đổi trái phép so với lịch sử cơ sở dữ liệu.`,
          details: {
            version: matchingSpec.version,
            name: matchingSpec.name,
            expectedChecksum,
            recordedChecksum: recorded.checksum
          },
          recoverable: false
        });
      }
    }

    const newlyAppliedVersions: number[] = [];
    const insertMigrationStmt = connection.prepare(
      'INSERT INTO _schema_migrations (version, name, checksum, applied_at) VALUES (?, ?, ?, ?)'
    );

    for (const spec of ordered) {
      if (appliedByVersion.has(spec.version)) {
        continue;
      }
      connection.exec(spec.sql);
      insertMigrationStmt.run(
        spec.version,
        spec.name,
        computeMigrationChecksum(spec),
        now().toISOString()
      );
      newlyAppliedVersions.push(spec.version);
    }

    const latestRow = connection
      .prepare('SELECT COALESCE(MAX(version), 0) AS max_version FROM _schema_migrations')
      .get() as { max_version: number } | undefined;

    return Object.freeze({
      currentVersion: latestRow?.max_version ?? 0,
      appliedVersions: Object.freeze(newlyAppliedVersions),
      totalMigrations: ordered.length
    });
  });
}
