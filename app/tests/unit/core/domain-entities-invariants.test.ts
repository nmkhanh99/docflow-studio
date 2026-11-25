import { describe, expect, it } from 'vitest';
import {
  AppError,
  ExactDecimal,
  createBuildArtifact,
  createBuildManifest,
  createChangeRequest,
  createDataBinding,
  createDataDefinition,
  createDataRevision,
  createDependencyEdge,
  createDocumentBlock,
  createLayoutIssue,
  createLogicalSection,
  createProject,
  createRun,
  createRunStep,
  createSavedRule,
  createSectionRevision,
  createSourceArtifact,
  createTemplateArtifact,
  type SavedRule,
  type TypedRuleExecutionPlan,
  type TypedRuleIoSchema
} from '@core/domain';

const SAMPLE_HASH_A = 'a'.repeat(64);
const SAMPLE_HASH_B = 'b'.repeat(64);
const SAMPLE_HASH_C = 'c'.repeat(64);
const ISO_T1 = '2026-11-25T09:00:00.000Z';
const ISO_T2 = '2026-11-25T10:00:00.000Z';

function buildSampleTypedRulePlan(): {
  ioSchema: TypedRuleIoSchema;
  executionPlan: TypedRuleExecutionPlan;
} {
  const ioSchema: TypedRuleIoSchema = {
    inputs: [
      { ref: 'section-01.quantity', type: 'INTEGER', unit: 'product', required: true },
      { ref: 'excel-1.price-table', type: 'TABULAR', versionPolicy: 'PINNED_SNAPSHOT' },
      { ref: 'project.plan-date', type: 'DATE', required: true }
    ],
    outputs: [{ key: 'revenue', type: 'DECIMAL', unit: 'VND', scale: 0, roundingMode: 'HALF_UP' }]
  };

  const executionPlan: TypedRuleExecutionPlan = {
    irVersion: '1.0',
    steps: [
      {
        kind: 'DATA_EXTRACTION',
        stepId: 'step-extract-prices',
        sourceRef: 'excel-1.price-table',
        bindingId: 'bind-price-01',
        outputAlias: 'rawPrices',
        selectedColumns: ['product_code', 'unit_price', 'effective_date']
      },
      {
        kind: 'RELATIONAL_TRANSFORM',
        stepId: 'step-resolve-effective',
        operation: 'RESOLVE_EFFECTIVE_DATE',
        inputAlias: 'rawPrices',
        effectiveDateColumn: 'effective_date',
        referenceDateRef: 'project.plan-date',
        tieBreakPolicy: 'LATEST_EFFECTIVE_DATE_ERROR_ON_TIE',
        outputAlias: 'selectedPrice'
      },
      {
        kind: 'DETERMINISTIC_CALCULATION',
        stepId: 'step-calc-revenue',
        outputKey: 'revenue',
        unit: 'VND',
        scale: 0,
        roundingMode: 'HALF_UP',
        expression: {
          kind: 'BINARY_ARITHMETIC',
          operator: 'MULTIPLY',
          left: { kind: 'INPUT_REF', ref: 'section-01.quantity' },
          right: { kind: 'INPUT_REF', ref: 'selectedPrice.unit_price' }
        },
        checks: ['NON_NEGATIVE', 'CURRENCY_UNIT_MATCH', 'SOURCE_ROW_EXISTS']
      },
      {
        kind: 'NARRATIVE_REWRITE',
        stepId: 'step-rewrite-sec02',
        targetSectionId: 'section-02',
        allowedBlockIds: ['blk-210', 'tbl-02'],
        referencedOutputKeys: ['revenue'],
        policy: 'PRESERVE_STRUCTURE_AND_STYLES'
      }
    ]
  };

  return { ioSchema, executionPlan };
}

describe('Core Domain — 17 Thực thể miền, ExactDecimal, Typed Rule IR & Bất biến khởi tạo (§5)', () => {
  it('khởi tạo hợp lệ và đóng băng bất biến (deepFreeze) đầy đủ 17 thực thể miền theo Spec §5', () => {
    // 1. Project
    const project = createProject({
      id: 'proj-001',
      title: 'Báo cáo Kế hoạch Kinh doanh 2027',
      status: 'ACTIVE',
      currentRecipeVersion: 2,
      createdAt: ISO_T1,
      updatedAt: ISO_T2
    });
    expect(Object.isFrozen(project)).toBe(true);

    // 2. TemplateArtifact (Template V0 — chỉ đọc, chuẩn hóa sha256)
    const template = createTemplateArtifact({
      id: 'tpl-v0',
      path: '/projects/p1/template/original.docx',
      sha256: `SHA256:${SAMPLE_HASH_A.toUpperCase()}`,
      parsedAt: ISO_T1,
      ooxmlMap: { styleIds: ['Heading1', 'Normal'], hasTocField: true }
    });
    expect(template.sha256).toBe(SAMPLE_HASH_A);
    expect(template.readOnly).toBe(true);
    expect(Object.isFrozen(template)).toBe(true);
    expect(Object.isFrozen(template.ooxmlMap)).toBe(true);

    // 3. SourceArtifact (Source Snapshot — chỉ đọc)
    const source = createSourceArtifact({
      id: 'excel-1',
      type: 'EXCEL',
      path: `/projects/p1/sources/excel-1/${SAMPLE_HASH_B}/source.xlsx`,
      version: 1,
      sha256: SAMPLE_HASH_B,
      importedAt: ISO_T1
    });
    expect(source.readOnly).toBe(true);
    expect(Object.isFrozen(source)).toBe(true);

    // 4. LogicalSection (Section != Page)
    const section = createLogicalSection({
      id: 'section-02',
      parentId: null,
      title: 'Phần 02 — Dự phóng Doanh thu',
      order: 2,
      startAnchor: 'w:bookmarkStart[@w:name="sec_02_start"]',
      endAnchor: 'w:bookmarkEnd[@w:name="sec_02_end"]'
    });
    expect(section.requiredForBuild).toBe(true);
    expect(Object.isFrozen(section)).toBe(true);

    // 5. DocumentBlock
    const block = createDocumentBlock({
      id: 'blk-210',
      sectionId: 'section-02',
      ooxmlLocator: '/w:document/w:body/w:p[14]',
      type: 'paragraph',
      styleRef: 'BodyText',
      anchorFingerprint: 'fp-sec02-p14-89ab'
    });
    expect(Object.isFrozen(block)).toBe(true);

    // 6. DataDefinition
    const dataDef = createDataDefinition({
      key: 'revenue.planned',
      dataType: 'DECIMAL',
      unit: 'VND',
      validation: { nonNegative: true, scale: 0, roundingMode: 'HALF_UP' },
      defaultPolicy: 'STOP_ON_MISSING'
    });
    expect(Object.isFrozen(dataDef)).toBe(true);

    // 7. DataRevision
    const dataRev = createDataRevision(
      {
        id: 'drev-01',
        key: 'revenue.planned',
        value: '3750000000',
        provenance: {
          originKind: 'RULE_EXECUTION',
          sourceId: 'excel-1',
          sourceSha256: SAMPLE_HASH_B,
          sheetName: 'BangGia',
          matchedRowIndex: 12
        },
        status: 'RESULT_READY',
        version: 1,
        createdAt: ISO_T2
      },
      { expectedDataType: 'DECIMAL' }
    );
    expect(dataRev.value).toBe('3750000000');
    expect(Object.isFrozen(dataRev)).toBe(true);

    // 8. DataBinding
    const binding = createDataBinding({
      id: 'bind-price-01',
      targetKey: 'product.unit_price',
      sourceId: 'excel-1',
      sourceSha256: SAMPLE_HASH_B,
      rangeSelector: 'BangGia!A2:E200',
      lookupSpec: {
        sheetName: 'BangGia',
        keyColumns: ['product_code'],
        valueColumn: 'unit_price',
        effectiveDateColumn: 'effective_date',
        tieBreakPolicy: 'LATEST_EFFECTIVE_DATE_ERROR_ON_TIE'
      },
      priority: 1,
      version: 1,
      status: 'READY'
    });
    expect(Object.isFrozen(binding)).toBe(true);

    // 9. ChangeRequest
    const changeReq = createChangeRequest({
      id: 'cr-001',
      sectionId: 'section-01',
      prompt: 'Tăng sản lượng kế hoạch từ 12.000 lên 15.000 sản phẩm',
      changeKind: 'DIRECT_VALUE',
      status: 'APPLIED',
      affectedScope: 'DOWNSTREAM',
      oldValue: '12000',
      newValue: '15000',
      createdAt: ISO_T1,
      updatedAt: ISO_T2
    });
    expect(Object.isFrozen(changeReq)).toBe(true);

    // 10. SavedRule
    const { ioSchema, executionPlan } = buildSampleTypedRulePlan();
    const savedRule: SavedRule = createSavedRule({
      id: 'revenue.price-lookup',
      version: 3,
      targetSectionId: 'section-02',
      textInstruction:
        'Lấy sản lượng Phần 01 nhân đơn giá hiệu lực trong Excel 1 để tính doanh thu Phần 02.',
      ioSchema,
      executionPlan,
      testCases: [
        {
          id: 'tc-01',
          description: 'Tính chuẩn 15.000 x 250.000 = 3.750.000.000 VND',
          inputs: { 'section-01.quantity': 15000, 'selectedPrice.unit_price': '250000' },
          expectedOutputs: { revenue: '3750000000' }
        }
      ],
      status: 'APPROVED',
      requiresHumanReview: true,
      reviewTriggers: ['AMBIGUOUS_MATCH', 'MISSING_DATA', 'NARRATIVE_CHANGE']
    });
    expect(Object.isFrozen(savedRule)).toBe(true);
    expect(Object.isFrozen(savedRule.executionPlan.steps)).toBe(true);

    // 11. DependencyEdge
    const edge = createDependencyEdge({
      id: 'edge-s1-r2',
      fromId: 'section-01',
      toId: 'section-02',
      fromNodeType: 'SECTION',
      toNodeType: 'SECTION',
      type: 'USES',
      condition: null,
      discoveredBy: 'RULE_COMPILER',
      approved: true
    });
    expect(Object.isFrozen(edge)).toBe(true);

    // 12. Run
    const run = createRun({
      id: 'run-0001',
      mode: 'AFFECTED',
      planHash: SAMPLE_HASH_A,
      snapshotId: 'snap-0001',
      startedAt: ISO_T1,
      completedAt: ISO_T2,
      result: 'SUCCEEDED'
    });
    expect(Object.isFrozen(run)).toBe(true);

    // 13. RunStep
    const step = createRunStep({
      id: 'step-0001',
      runId: 'run-0001',
      ruleId: 'revenue.price-lookup',
      ruleVersion: 3,
      inputHashes: { quantity: SAMPLE_HASH_A, priceTable: SAMPLE_HASH_B },
      outputHash: SAMPLE_HASH_C,
      resultFingerprint: SAMPLE_HASH_C,
      evidence: {
        matchedSourceRows: [
          {
            sourceId: 'excel-1',
            sourceSha256: SAMPLE_HASH_B,
            sheetName: 'BangGia',
            rowNumber: 12,
            effectiveDate: '2026-11-01',
            values: { product_code: 'SP-01', unit_price: '250000' }
          }
        ],
        intermediateValues: { quantity: 15000, unitPrice: '250000', revenue: '3750000000' },
        unitChecks: [{ key: 'revenue', expectedUnit: 'VND', actualUnit: 'VND', passed: true }]
      },
      errors: []
    });
    expect(Object.isFrozen(step)).toBe(true);
    expect(Object.isFrozen(step.evidence)).toBe(true);

    // 14. SectionRevision
    const revision = createSectionRevision(
      {
        id: 'section-02-r4',
        sectionId: 'section-02',
        baseTemplateHash: SAMPLE_HASH_A,
        ruleId: 'revenue.price-lookup',
        ruleVersion: 3,
        inputFingerprint: SAMPLE_HASH_C,
        outputs: { revenue: '3750000000', currency: 'VND' },
        patchSet: [
          {
            blockId: 'blk-210',
            op: 'replaceText',
            payload: { newText: 'Doanh thu dự kiến đạt 3.750.000.000 đồng.' }
          }
        ],
        reviewStatus: 'APPROVED',
        approval: { approvedBy: 'user-khanhnm', approvedAt: ISO_T2 }
      },
      { allowedBlockIds: ['blk-210', 'tbl-02'] }
    );
    expect(Object.isFrozen(revision)).toBe(true);

    // 15. BuildManifest
    const manifest = createBuildManifest({
      id: 'build-0001',
      templateHash: SAMPLE_HASH_A,
      sourceSnapshotIds: ['excel-1'],
      recipeVersion: 2,
      ruleVersions: { 'revenue.price-lookup': 3 },
      selectedRevisions: { 'section-02': 'section-02-r4' },
      layoutPolicy: { mode: 'NATURAL_REFLOW' },
      rendererInfo: { engineName: 'libreoffice-headless', engineVersion: '24.8' },
      status: 'APPROVED'
    });
    expect(manifest.layoutPolicy.forbidSilentFontShrink).toBe(true);
    expect(Object.isFrozen(manifest)).toBe(true);

    // 16. BuildArtifact
    const artifact = createBuildArtifact({
      id: 'bart-0001',
      manifestId: 'build-0001',
      docxPath: '/projects/p1/builds/build-0001/output.docx',
      pdfPreviewPath: '/projects/p1/builds/build-0001/preview.pdf',
      checksum: SAMPLE_HASH_C,
      pageCount: 13,
      layoutReport: {
        sectionPages: { 'section-02': [3, 4], 'section-03': [8] },
        layoutDiffs: { 'section-02': 'NO_CHANGE', 'section-03': 'SHIFTED' },
        fontDependencies: ['Times New Roman']
      },
      createdAt: ISO_T2
    });
    expect(Object.isFrozen(artifact)).toBe(true);

    // 17. LayoutIssue
    const issue = createLayoutIssue({
      id: 'li-0001',
      buildId: 'build-0001',
      sectionId: 'section-03',
      blockId: 'tbl-03',
      type: 'TABLE_OVERFLOW',
      severity: 'WARNING',
      pageRange: [8, 9],
      detail: 'Bảng chi phí định mức trải qua ranh giới trang 8–9.'
    });
    expect(Object.isFrozen(issue)).toBe(true);
  });

  it('bảo vệ bất biến TemplateArtifact, SourceArtifact (sha256) và LogicalSection (Section != Page)', () => {
    // Thiếu hoặc sai mã băm sha256
    expect(() =>
      createTemplateArtifact({
        id: 'tpl-v0',
        path: '/projects/p1/template/original.docx',
        sha256: 'not-a-valid-sha256',
        parsedAt: ISO_T1,
        ooxmlMap: {}
      })
    ).toThrowError(
      expect.objectContaining({ code: 'ARTIFACT_INTEGRITY_VIOLATION' }) as unknown as Error
    );

    expect(() =>
      createSourceArtifact({
        id: 'excel-1',
        type: 'EXCEL',
        path: '/projects/p1/sources/excel-1/bad/source.xlsx',
        version: 1,
        sha256: '12345',
        importedAt: ISO_T1
      })
    ).toThrowError(
      expect.objectContaining({ code: 'ARTIFACT_INTEGRITY_VIOLATION' }) as unknown as Error
    );

    // LogicalSection cố tình lấy số trang làm định danh (vi phạm Section != Page)
    for (const pageId of ['page-1', 'page_02', 'trang-03', 'p1', '12']) {
      expect(() =>
        createLogicalSection({
          id: pageId,
          parentId: null,
          title: 'Phần sai quy tắc',
          order: 1,
          startAnchor: 'anchor-a',
          endAnchor: 'anchor-b'
        })
      ).toThrowError(
        expect.objectContaining({ code: 'DOMAIN_INVARIANT_VIOLATION' }) as unknown as Error
      );
    }

    // DocumentBlock thiếu ooxmlLocator hoặc anchorFingerprint
    expect(() =>
      createDocumentBlock({
        id: 'blk-1',
        sectionId: 'section-01',
        ooxmlLocator: '   ',
        type: 'paragraph',
        styleRef: null,
        anchorFingerprint: 'fp-1'
      })
    ).toThrowError(AppError);
  });

  it('thực hiện số học tiền tệ chính xác qua ExactDecimal và chặn số chấm động IEEE-754 thô', () => {
    // 0.1 + 0.2 trong IEEE-754 bằng 0.30000000000000004, nhưng ExactDecimal phải ra đúng '0.3'
    const sum = ExactDecimal.fromString('0.1').add(ExactDecimal.fromString('0.2'));
    expect(sum.toString()).toBe('0.3');

    // 15.000 * 250.000 = 3.750.000.000
    const revenue = ExactDecimal.fromSafeInteger(15000).multiply(ExactDecimal.fromString('250000'));
    expect(revenue.toString()).toBe('3750000000');

    // Làm tròn HALF_UP vs HALF_EVEN
    expect(ExactDecimal.fromString('2.5').round(0, 'HALF_UP').toString()).toBe('3');
    expect(ExactDecimal.fromString('2.5').round(0, 'HALF_EVEN').toString()).toBe('2');
    expect(ExactDecimal.fromString('3.5').round(0, 'HALF_EVEN').toString()).toBe('4');

    // Chặn chia cho 0
    expect(() =>
      ExactDecimal.fromString('100').divide(ExactDecimal.fromString('0'), 2)
    ).toThrowError(
      expect.objectContaining({ code: 'SANDBOX_EXECUTION_TIMEOUT' }) as unknown as Error
    );

    // Chặn truyền float IEEE-754 thô
    expect(() => ExactDecimal.fromSafeInteger(0.15)).toThrowError(
      expect.objectContaining({ code: 'RULE_SCHEMA_INVALID' }) as unknown as Error
    );

    expect(() =>
      createDataRevision(
        {
          id: 'drev-float',
          key: 'cost.rate',
          value: 0.65,
          provenance: { originKind: 'USER_DIRECT' },
          status: 'RESULT_READY',
          version: 1,
          createdAt: ISO_T1
        },
        { expectedDataType: 'DECIMAL' }
      )
    ).toThrowError(expect.objectContaining({ code: 'RULE_SCHEMA_INVALID' }) as unknown as Error);
  });

  it('chặn đứng eval(), new Function(), macro VBA và tham chiếu số liệu chưa tính trong SavedRule', () => {
    const { ioSchema, executionPlan } = buildSampleTypedRulePlan();

    for (const forbiddenInstruction of [
      'Tính doanh thu bằng eval("qty * price")',
      'Dùng new Function("a", "return a * 2") để tính',
      'Kích hoạt Sub Auto_Open() trong VBA'
    ]) {
      expect(() =>
        createSavedRule({
          id: 'bad-rule',
          version: 1,
          textInstruction: forbiddenInstruction,
          ioSchema,
          executionPlan,
          testCases: [],
          status: 'DRAFT',
          requiresHumanReview: true
        })
      ).toThrowError(expect.objectContaining({ code: 'RULE_SCHEMA_INVALID' }) as unknown as Error);
    }

    // Chặn NarrativeRewrite tham chiếu con số không có trong bước tính tất định (chống LLM bịa số)
    expect(() =>
      createSavedRule({
        id: 'hallucinated-narrative-rule',
        version: 1,
        textInstruction: 'Viết nhận xét lợi nhuận ròng',
        ioSchema,
        executionPlan: {
          irVersion: '1.0',
          steps: [
            {
              kind: 'NARRATIVE_REWRITE',
              stepId: 'step-rewrite',
              targetSectionId: 'section-02',
              allowedBlockIds: ['blk-210'],
              referencedOutputKeys: ['net_profit_uncomputed'],
              policy: 'PRESERVE_STRUCTURE_AND_STYLES'
            }
          ]
        },
        testCases: [],
        status: 'DRAFT',
        requiresHumanReview: true
      })
    ).toThrowError(expect.objectContaining({ code: 'RULE_SCHEMA_INVALID' }) as unknown as Error);
  });

  it('cưỡng chế phạm vi Patch theo Section, cấm AI duyệt SectionRevision và cấm BuildArtifact ghi đè V0/Sources', () => {
    // 1. Patch vượt ra ngoài block thuộc Section -> PATCH_OUT_OF_SECTION_SCOPE
    expect(() =>
      createSectionRevision(
        {
          id: 'rev-out-of-scope',
          sectionId: 'section-02',
          baseTemplateHash: SAMPLE_HASH_A,
          ruleId: null,
          ruleVersion: null,
          inputFingerprint: SAMPLE_HASH_B,
          outputs: {},
          patchSet: [{ blockId: 'blk-section-05', op: 'replaceText', payload: { newText: 'X' } }],
          reviewStatus: 'REVIEW_REQUIRED',
          approval: null
        },
        { allowedBlockIds: ['blk-210', 'tbl-02'] }
      )
    ).toThrowError(
      expect.objectContaining({ code: 'PATCH_OUT_OF_SECTION_SCOPE' }) as unknown as Error
    );

    // 2. SectionRevision ghi nhận AI làm người duyệt -> CAPABILITY_DENIED
    expect(() =>
      createSectionRevision({
        id: 'rev-ai-approve',
        sectionId: 'section-02',
        baseTemplateHash: SAMPLE_HASH_A,
        ruleId: null,
        ruleVersion: null,
        inputFingerprint: SAMPLE_HASH_B,
        outputs: {},
        patchSet: [{ blockId: 'blk-210', op: 'replaceText', payload: { newText: 'OK' } }],
        reviewStatus: 'APPROVED',
        approval: { approvedBy: 'ai:reviewer:sess-1', approvedAt: ISO_T2 }
      })
    ).toThrowError(expect.objectContaining({ code: 'CAPABILITY_DENIED' }) as unknown as Error);

    // 3. BuildArtifact trỏ vào original.docx hoặc sources/ -> IMMUTABLE_TARGET_PROTECTED
    for (const immutablePath of [
      '/projects/p1/template/original.docx',
      '/projects/p1/template/template-sha256.txt',
      `/projects/p1/sources/excel-1/${SAMPLE_HASH_B}/source.xlsx`,
      '/repo/corpus/sample-01.docx'
    ]) {
      expect(() =>
        createBuildArtifact({
          id: 'bart-bad',
          manifestId: 'build-0001',
          docxPath: immutablePath,
          pdfPreviewPath: null,
          checksum: SAMPLE_HASH_C,
          pageCount: 10,
          layoutReport: { sectionPages: {}, layoutDiffs: {} },
          createdAt: ISO_T2
        })
      ).toThrowError(
        expect.objectContaining({ code: 'IMMUTABLE_TARGET_PROTECTED' }) as unknown as Error
      );
    }

    // 4. DependencyEdge tự trỏ chính nó -> DEPENDENCY_CYCLE_DETECTED
    expect(() =>
      createDependencyEdge({
        id: 'edge-self',
        fromId: 'section-02',
        toId: 'section-02',
        type: 'USES',
        condition: null,
        discoveredBy: 'USER',
        approved: false
      })
    ).toThrowError(
      expect.objectContaining({ code: 'DEPENDENCY_CYCLE_DETECTED' }) as unknown as Error
    );
  });
});
