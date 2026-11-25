import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  AgyCliAssistantAdapter,
  ClaudeCliAssistantAdapter,
  CodexCliAssistantAdapter,
  HttpApiAssistantAdapter,
  StubDeterministicSandboxAdapter,
  StubLayoutRendererAdapter,
  StubOoxmlDocumentAdapter,
  StubReferenceExtractorAdapter,
  StubSpreadsheetAdapter
} from '@adapters/index';
import {
  getAiRoleSecurityPolicy,
  validateAiInvocationRequest,
  type AiCliAdapterPort,
  type ArtifactStorePort,
  type AuditLogPort,
  type DocumentEnginePort,
  type LayoutRendererPort,
  type ProjectRepositoryPort,
  type ReferenceExtractorPort,
  type RuleExecutorPort,
  type SpreadsheetReaderPort
} from '@core/ports';

const CORE_DIR = resolve(__dirname, '../../../src/core');

function collectTsFiles(dirPath: string): string[] {
  const files: string[] = [];
  for (const entry of readdirSync(dirPath)) {
    const fullPath = join(dirPath, entry);
    const stat = statSync(fullPath);
    if (stat.isDirectory()) {
      files.push(...collectTsFiles(fullPath));
    } else if (fullPath.endsWith('.ts') || fullPath.endsWith('.tsx')) {
      files.push(fullPath);
    }
  }
  return files;
}

function stripCommentsAndStrings(tsSource: string): string {
  return tsSource
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/\/\/.*$/gm, '')
    .replace(/`(?:\\.|[^`\\])*`/g, '""')
    .replace(/'(?:\\.|[^'\\])*'/g, '""')
    .replace(/"(?:\\.|[^"\\])*"/g, '""');
}

describe('Core Ports Contracts & Kiểm tra tĩnh tính độc lập của app/src/core/ (§9.1–9.4, §10)', () => {
  it('xác nhận tĩnh 100% tệp trong app/src/core/** không import Electron, React, Zustand, Node fs/path/child_process, SQLite hay lớp ngoài', () => {
    const coreFiles = collectTsFiles(CORE_DIR);
    expect(coreFiles.length).toBeGreaterThanOrEqual(15);

    const forbiddenStaticOrDynamicImport =
      /(?:from\s+|import\s*\(\s*|require\s*\(\s*)['"](electron|react|react-dom|zustand|better-sqlite3|sqlite3|fs|fs\/promises|path|child_process|os|net|http|https|crypto|node:[a-z0-9_/-]+|zod|@ui\/|@adapters\/|@infra\/|@preload\/|\.\.\/ui\/|\.\.\/adapters\/|\.\.\/infra\/|\.\.\/main\/|\.\.\/preload\/|\.\.\/\.\.\/ui\/|\.\.\/\.\.\/adapters\/|\.\.\/\.\.\/infra\/|\.\.\/\.\.\/main\/|\.\.\/\.\.\/preload\/)/;

    for (const filePath of coreFiles) {
      const rawSource = readFileSync(filePath, 'utf8');
      expect(
        forbiddenStaticOrDynamicImport.test(rawSource),
        `Phát hiện import phụ thuộc hạ tầng bị cấm trong '${filePath}'`
      ).toBe(false);

      // Xác nhận mã thực thi trong core/ không gọi eval() hay new Function()
      const codeWithoutCommentsAndStrings = stripCommentsAndStrings(rawSource);
      const withoutRegexLiterals = codeWithoutCommentsAndStrings.replace(/\/[^/\n]+\/[gimsuy]*/g, '');
      expect(
        /\beval\s*\(|\bnew\s+Function\s*\(/.test(withoutRegexLiterals),
        `Phát hiện lệnh thực thi động cấm trong '${filePath}'`
      ).toBe(false);
    }
  });

  it('định nghĩa đầy đủ các giao diện Ports cốt lõi và tương thích với các Strategy Adapters', () => {
    const docEngine: DocumentEnginePort = new StubOoxmlDocumentAdapter();
    const layoutRenderer: LayoutRendererPort = new StubLayoutRendererAdapter();
    const spreadsheetReader: SpreadsheetReaderPort = new StubSpreadsheetAdapter();
    const referenceExtractor: ReferenceExtractorPort = new StubReferenceExtractorAdapter();
    const ruleExecutor: RuleExecutorPort = new StubDeterministicSandboxAdapter();

    const aiAdapters: readonly AiCliAdapterPort[] = [
      new AgyCliAssistantAdapter(),
      new ClaudeCliAssistantAdapter(),
      new CodexCliAssistantAdapter(),
      new HttpApiAssistantAdapter()
    ];

    expect(typeof docEngine.parseTemplateStructure).toBe('function');
    expect(typeof docEngine.resolveSectionAnchors).toBe('function');
    expect(typeof docEngine.applyWorkingPatches).toBe('function');
    expect(typeof layoutRenderer.renderPreviewAndInspect).toBe('function');
    expect(typeof spreadsheetReader.inspectSchemaSample).toBe('function');
    expect(typeof spreadsheetReader.queryScopedRange).toBe('function');
    expect(typeof referenceExtractor.extractProvenanceSnippets).toBe('function');
    expect(typeof ruleExecutor.executeTypedPlan).toBe('function');
    expect(aiAdapters.map((a) => a.providerKind)).toEqual([
      'agy-cli',
      'claude-cli',
      'codex-cli',
      'http-api'
    ]);

    // Kiểm tra kiểu tĩnh cho ArtifactStorePort, ProjectRepositoryPort và AuditLogPort
    const typeCheckPortContracts = (
      _artifactStore: ArtifactStorePort,
      _projectRepo: ProjectRepositoryPort,
      _auditLog: AuditLogPort
    ) => Boolean(_artifactStore && _projectRepo && _auditLog);
    expect(typeof typeCheckPortContracts).toBe('function');
  });

  it('cưỡng chế phân quyền Capability Scoping theo 6 vai trò AI trên AiCliAdapterPort (§10)', async () => {
    const docAnalystPolicy = getAiRoleSecurityPolicy('document-analyst');
    expect(docAnalystPolicy.readOnlyFilesystem).toBe(true);
    expect(docAnalystPolicy.allowDirectApproveOrExport).toBe(false);
    expect(docAnalystPolicy.allowedMcpTools).toEqual(['get_parsed_document_tree']);

    // Cho phép đúng tool đọc cấu trúc của document-analyst
    expect(() =>
      validateAiInvocationRequest({
        role: 'document-analyst',
        projectId: 'proj-01',
        correlationId: 'corr-ai-01',
        scopedInput: { sectionId: 'section-01' },
        allowedMcpTools: ['get_parsed_document_tree'],
        timeoutMs: 30000
      })
    ).not.toThrow();

    // Chặn cứng nếu cấp nhầm tool ghi đề xuất hoặc tool lạ cho vai trò chỉ đọc (document-analyst / reviewer)
    const agyAdapter = new AgyCliAssistantAdapter();
    await expect(
      agyAdapter.invokeRole(
        {
          role: 'reviewer',
          projectId: 'proj-01',
          correlationId: 'corr-ai-02',
          scopedInput: {},
          allowedMcpTools: ['propose_section_patch'],
          timeoutMs: 30000
        },
        { parse: (v) => v }
      )
    ).rejects.toMatchObject({
      code: 'CAPABILITY_DENIED',
      details: {
        role: 'reviewer',
        unauthorizedTools: ['propose_section_patch']
      }
    });
  });
});
