import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const APP_ROOT = resolve(__dirname, '../..');

function collectFilesRecursively(dirPath: string, extensions: readonly string[]): string[] {
  const results: string[] = [];
  for (const entry of readdirSync(dirPath)) {
    const fullPath = join(dirPath, entry);
    const stat = statSync(fullPath);
    if (stat.isDirectory()) {
      results.push(...collectFilesRecursively(fullPath, extensions));
    } else if (extensions.some((ext) => fullPath.endsWith(ext))) {
      results.push(fullPath);
    }
  }
  return results;
}

describe('Kiến trúc Ports & Adapters 4 lớp — Ranh giới thư mục và phụ thuộc (§9.3)', () => {
  it('có đầy đủ cây thư mục module theo DOCFLOW_STUDIO_SPEC.md §9.3 và tài liệu kiến trúc 09', () => {
    const requiredDirectories = [
      'src/main',
      'src/preload',
      'src/ui/shell',
      'src/ui/workspace',
      'src/ui/recipe-studio',
      'src/ui/dependency-runner',
      'src/ui/build-preview',
      'src/ui/history',
      'src/ui/shared',
      'src/core/domain',
      'src/core/ports',
      'src/core/change-requests',
      'src/core/section-revisions',
      'src/core/data-registry',
      'src/core/rules',
      'src/core/dependency-graph',
      'src/core/build-manifest',
      'src/core/history',
      'src/adapters/documents',
      'src/adapters/rendering',
      'src/adapters/spreadsheets',
      'src/adapters/reference-files',
      'src/adapters/ai/agy-cli',
      'src/adapters/ai/claude-cli',
      'src/adapters/ai/codex-cli',
      'src/adapters/ai/api',
      'src/adapters/execution/sandbox',
      'src/infra/sqlite',
      'src/infra/filesystem',
      'src/infra/ipc',
      'src/infra/logging',
      'tests/unit',
      'tests/integration',
      'tests/fixtures'
    ];

    for (const relDir of requiredDirectories) {
      const fullPath = join(APP_ROOT, relDir);
      expect(existsSync(fullPath), `Thiếu thư mục bắt buộc: ${relDir}`).toBe(true);
      expect(statSync(fullPath).isDirectory()).toBe(true);
    }
  });

  it('đảm bảo lớp core/ hoàn toàn tinh khiết, không chứa bất kỳ import cấm nào', () => {
    const coreFiles = collectFilesRecursively(join(APP_ROOT, 'src/core'), ['.ts', '.tsx']);
    expect(coreFiles.length).toBeGreaterThan(0);

    const forbiddenCoreImportPattern =
      /from\s+['"](electron|react|react-dom|zustand|better-sqlite3|fs|node:[a-z_/]+|path|child_process|@ui\/|@adapters\/|@infra\/|@preload\/|\.\.\/ui\/|\.\.\/adapters\/|\.\.\/infra\/|\.\.\/main\/|\.\.\/preload\/)/;

    for (const filePath of coreFiles) {
      const source = readFileSync(filePath, 'utf8');
      expect(
        forbiddenCoreImportPattern.test(source),
        `Phát hiện import vi phạm kiến trúc trong lớp core/: ${filePath}`
      ).toBe(false);
    }
  });

  it('đảm bảo lớp ui/ không import trực tiếp electron, Node.js, adapters/ hay infra/', () => {
    const uiFiles = collectFilesRecursively(join(APP_ROOT, 'src/ui'), ['.ts', '.tsx']);
    expect(uiFiles.length).toBeGreaterThan(0);

    const forbiddenUiImportPattern =
      /from\s+['"](electron|better-sqlite3|fs|node:[a-z_/]+|child_process|@adapters\/|@infra\/|\.\.\/adapters\/|\.\.\/infra\/|\.\.\/main\/)/;

    for (const filePath of uiFiles) {
      const source = readFileSync(filePath, 'utf8');
      expect(
        forbiddenUiImportPattern.test(source),
        `Phát hiện import vi phạm kiến trúc trong lớp ui/: ${filePath}`
      ).toBe(false);
    }
  });
});
