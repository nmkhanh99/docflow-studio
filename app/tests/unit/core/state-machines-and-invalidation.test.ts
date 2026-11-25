import { describe, expect, it } from 'vitest';
import {
  AI_ROLE_NAMES,
  approveSectionRevisionWithHistory,
  assertAcyclicDependencyGraph,
  assertInputBindingExecutable,
  assertSelectedSectionUpstreamReady,
  classifySectionLayoutDifference,
  completeSelectedSectionCalculation,
  createAiActorContext,
  createDependencyEdge,
  createLayoutIssue,
  createNextRuleDraftVersion,
  createSavedRule,
  createSectionRevision,
  createUserActorContext,
  evaluateBuildQualityGate,
  evaluateRecomputedOutputEquivalence,
  propagateDownstreamInvalidation,
  recordLayoutObservationPreservingContentState,
  transitionCalculationResultStatus,
  transitionDocumentBuildStatus,
  transitionInputBindingStatus,
  transitionLayoutDifferenceStatus,
  transitionRuleStatus,
  transitionSectionRevisionStatus,
  type BuildQualityGateInput,
  type CalculationResultStatus,
  type DependencyEdge,
  type SectionRevision
} from '@core/domain';

const HASH_TPL = '1'.repeat(64);
const HASH_FP_V1 = '2'.repeat(64);
const HASH_FP_V2 = '3'.repeat(64);
const T_BASE = '2026-11-25T11:00:00.000Z';
const T_NEXT = '2026-11-25T11:30:00.000Z';

const humanUser = createUserActorContext('user-khanhnm');

function makeApprovedRevision(
  id: string,
  sectionId: string,
  inputFingerprint = HASH_FP_V1
): SectionRevision {
  return createSectionRevision({
    id,
    sectionId,
    baseTemplateHash: HASH_TPL,
    ruleId: `rule-${sectionId}`,
    ruleVersion: 1,
    inputFingerprint,
    outputs: { ok: true },
    patchSet: [{ blockId: `blk-${sectionId}`, op: 'replaceText', payload: { newText: 'Nội dung' } }],
    reviewStatus: 'APPROVED',
    approval: { approvedBy: 'user-khanhnm', approvedAt: T_BASE }
  });
}

function makeStandardDagEdges(): readonly DependencyEdge[] {
  // Đồ thị Spec §7.1: section-01 -> section-02 -> section-03 & section-04 -> section-05 (+ section-appendix độc lập)
  return [
    createDependencyEdge({
      id: 'e-1-2',
      fromId: 'section-01',
      toId: 'section-02',
      type: 'USES',
      condition: null,
      discoveredBy: 'RULE_COMPILER',
      approved: true
    }),
    createDependencyEdge({
      id: 'e-2-3',
      fromId: 'section-02',
      toId: 'section-03',
      type: 'USES',
      condition: null,
      discoveredBy: 'RULE_COMPILER',
      approved: true
    }),
    createDependencyEdge({
      id: 'e-2-4',
      fromId: 'section-02',
      toId: 'section-04',
      type: 'USES',
      condition: null,
      discoveredBy: 'RULE_COMPILER',
      approved: true
    }),
    createDependencyEdge({
      id: 'e-3-4',
      fromId: 'section-03',
      toId: 'section-04',
      type: 'USES',
      condition: null,
      discoveredBy: 'RULE_COMPILER',
      approved: true
    }),
    createDependencyEdge({
      id: 'e-4-5',
      fromId: 'section-04',
      toId: 'section-05',
      type: 'REFERENCES',
      condition: null,
      discoveredBy: 'RULE_COMPILER',
      approved: true
    }),
    createDependencyEdge({
      id: 'e-srcA-appx',
      fromId: 'excel-appendix',
      toId: 'section-appendix',
      type: 'USES',
      condition: null,
      discoveredBy: 'USER',
      approved: true
    })
  ];
}

describe('Core State Machines & Invalidation / Build Gate (§3.1–3.2, §7, §8.3)', () => {
  it('1. Rule State Machine: kiểm soát chuyển trạng thái hợp lệ, cấm bỏ qua VALIDATED và tạo version mới khi sửa Rule đã APPROVED', () => {
    expect(transitionRuleStatus('DRAFT', 'VALIDATED')).toBe('VALIDATED');
    expect(transitionRuleStatus('VALIDATED', 'DRAFT')).toBe('DRAFT');
    expect(transitionRuleStatus('VALIDATED', 'APPROVED', { actor: humanUser })).toBe('APPROVED');
    expect(transitionRuleStatus('APPROVED', 'DEPRECATED')).toBe('DEPRECATED');

    // Không cho nhảy thẳng DRAFT -> APPROVED hoặc hồi sinh từ DEPRECATED / sửa lùi APPROVED -> DRAFT
    expect(() => transitionRuleStatus('DRAFT', 'APPROVED', { actor: humanUser })).toThrowError(
      expect.objectContaining({ code: 'INVALID_STATE_TRANSITION' }) as unknown as Error
    );
    expect(() => transitionRuleStatus('APPROVED', 'DRAFT')).toThrowError(
      expect.objectContaining({ code: 'INVALID_STATE_TRANSITION' }) as unknown as Error
    );
    expect(() => transitionRuleStatus('DEPRECATED', 'DRAFT')).toThrowError(
      expect.objectContaining({ code: 'INVALID_STATE_TRANSITION' }) as unknown as Error
    );

    // Chặn chuyển sang VALIDATED nếu IR chưa hợp lệ
    expect(() =>
      transitionRuleStatus('DRAFT', 'VALIDATED', { isTypedIrValidated: false })
    ).toThrowError(expect.objectContaining({ code: 'RULE_SCHEMA_INVALID' }) as unknown as Error);

    // Mọi vai trò AI đều bị cấm tự duyệt Rule sang APPROVED
    for (const role of AI_ROLE_NAMES) {
      const aiActor = createAiActorContext(role, 's1');
      expect(() => transitionRuleStatus('VALIDATED', 'APPROVED', { actor: aiActor })).toThrowError(
        expect.objectContaining({ code: 'CAPABILITY_DENIED' }) as unknown as Error
      );
    }

    // Sửa Rule đã APPROVED phải sinh version + 1 ở DRAFT, giữ nguyên bản cũ (§3.2)
    const approvedRule = createSavedRule({
      id: 'rule-rev',
      version: 2,
      textInstruction: 'Nhân sản lượng với đơn giá',
      ioSchema: {
        inputs: [{ ref: 'qty', type: 'INTEGER' }],
        outputs: [{ key: 'rev', type: 'DECIMAL', unit: 'VND' }]
      },
      executionPlan: {
        irVersion: '1.0',
        steps: [
          {
            kind: 'DETERMINISTIC_CALCULATION',
            stepId: 's1',
            outputKey: 'rev',
            unit: 'VND',
            scale: 0,
            roundingMode: 'HALF_UP',
            expression: { kind: 'LITERAL_DECIMAL', value: '1000' },
            checks: ['NON_NEGATIVE']
          }
        ]
      },
      testCases: [],
      status: 'APPROVED',
      requiresHumanReview: false
    });

    const nextDraft = createNextRuleDraftVersion(approvedRule, {
      textInstruction: 'Nhân sản lượng với đơn giá sau chiết khấu'
    });
    expect(approvedRule.version).toBe(2);
    expect(approvedRule.status).toBe('APPROVED');
    expect(nextDraft.version).toBe(3);
    expect(nextDraft.status).toBe('DRAFT');
  });

  it('2. InputBinding State Machine: chuyển đổi hợp lệ và dừng an toàn trước MISSING / AMBIGUOUS (AC8)', () => {
    expect(transitionInputBindingStatus('READY', 'CHANGED')).toBe('CHANGED');
    expect(transitionInputBindingStatus('CHANGED', 'AMBIGUOUS')).toBe('AMBIGUOUS');
    expect(transitionInputBindingStatus('AMBIGUOUS', 'READY')).toBe('READY');
    expect(transitionInputBindingStatus('READY', 'MISSING')).toBe('MISSING');

    // Chặn tự chuyển cùng trạng thái không hợp lệ
    expect(() => transitionInputBindingStatus('READY', 'READY')).toThrowError(
      expect.objectContaining({ code: 'INVALID_STATE_TRANSITION' }) as unknown as Error
    );

    // Safe Defaults: dừng an toàn khi thiếu dữ liệu hoặc trùng ngày hiệu lực
    expect(() =>
      assertInputBindingExecutable('MISSING', {
        bindingId: 'bind-01',
        sourceId: 'excel-1',
        sheetName: 'BangGia'
      })
    ).toThrowError(expect.objectContaining({ code: 'SOURCE_DATA_MISSING' }) as unknown as Error);

    expect(() =>
      assertInputBindingExecutable('AMBIGUOUS', {
        bindingId: 'bind-01',
        sourceId: 'excel-1',
        sheetName: 'BangGia',
        conflictingRows: [14, 15]
      })
    ).toThrowError(
      expect.objectContaining({ code: 'SOURCE_LOOKUP_AMBIGUOUS' }) as unknown as Error
    );

    expect(() =>
      assertInputBindingExecutable('READY', { bindingId: 'bind-01', sourceId: 'excel-1' })
    ).not.toThrow();
  });

  it('3. CalculationResult State Machine: kiểm soát vòng đời tính toán và chặn phê duyệt khi chưa RESULT_READY', () => {
    expect(transitionCalculationResultStatus('NOT_RUN', 'RUNNING')).toBe('RUNNING');
    expect(transitionCalculationResultStatus('RUNNING', 'RESULT_READY')).toBe('RESULT_READY');
    expect(
      transitionCalculationResultStatus('RESULT_READY', 'APPROVED', { actor: humanUser })
    ).toBe('APPROVED');
    expect(transitionCalculationResultStatus('APPROVED', 'STALE')).toBe('STALE');
    expect(transitionCalculationResultStatus('STALE', 'RUNNING')).toBe('RUNNING');
    expect(transitionCalculationResultStatus('RUNNING', 'FAILED')).toBe('FAILED');
    expect(transitionCalculationResultStatus('FAILED', 'RUNNING')).toBe('RUNNING');

    // Cấm nhảy cóc lên APPROVED từ NOT_RUN, STALE, RUNNING, FAILED
    for (const premature of ['NOT_RUN', 'STALE', 'RUNNING', 'FAILED'] as const) {
      expect(() =>
        transitionCalculationResultStatus(premature, 'APPROVED', { actor: humanUser })
      ).toThrowError(
        expect.objectContaining({ code: 'INVALID_STATE_TRANSITION' }) as unknown as Error
      );
    }

    // Cấm chạy khi upstream đang STALE
    expect(() =>
      transitionCalculationResultStatus('STALE', 'RUNNING', {
        upstreamSectionStatuses: { 'section-02': 'STALE' }
      })
    ).toThrowError(expect.objectContaining({ code: 'UPSTREAM_SECTION_STALE' }) as unknown as Error);

    // Cấm AI tự duyệt kết quả tính toán
    expect(() =>
      transitionCalculationResultStatus('RESULT_READY', 'APPROVED', {
        actor: createAiActorContext('rule-planner', 's2')
      })
    ).toThrowError(expect.objectContaining({ code: 'CAPABILITY_DENIED' }) as unknown as Error);
  });

  it('4. SectionRevision State Machine: bắt buộc duyệt tường minh bởi người dùng và chuyển bản cũ sang SUPERSEDED trong lịch sử', () => {
    expect(transitionSectionRevisionStatus('DRAFT', 'REVIEW_REQUIRED')).toBe('REVIEW_REQUIRED');
    expect(transitionSectionRevisionStatus('REVIEW_REQUIRED', 'DRAFT')).toBe('DRAFT');
    expect(
      transitionSectionRevisionStatus('REVIEW_REQUIRED', 'APPROVED', { actor: humanUser })
    ).toBe('APPROVED');
    expect(transitionSectionRevisionStatus('APPROVED', 'SUPERSEDED')).toBe('SUPERSEDED');

    // Cấm nhảy thẳng DRAFT -> APPROVED hoặc hồi sinh từ SUPERSEDED
    expect(() =>
      transitionSectionRevisionStatus('DRAFT', 'APPROVED', { actor: humanUser })
    ).toThrowError(
      expect.objectContaining({ code: 'INVALID_STATE_TRANSITION' }) as unknown as Error
    );
    expect(() => transitionSectionRevisionStatus('SUPERSEDED', 'APPROVED')).toThrowError(
      expect.objectContaining({ code: 'INVALID_STATE_TRANSITION' }) as unknown as Error
    );
    expect(() => transitionSectionRevisionStatus('APPROVED', 'DRAFT')).toThrowError(
      expect.objectContaining({ code: 'INVALID_STATE_TRANSITION' }) as unknown as Error
    );

    // Cấm Section Writer AI tự duyệt Revision
    expect(() =>
      transitionSectionRevisionStatus('REVIEW_REQUIRED', 'APPROVED', {
        actor: createAiActorContext('section-writer', 's3')
      })
    ).toThrowError(expect.objectContaining({ code: 'CAPABILITY_DENIED' }) as unknown as Error);

    // Duyệt revision mới của section-02 chuyển bản APPROVED cũ của section-02 sang SUPERSEDED, giữ nguyên section-01
    const oldSec02Approved = makeApprovedRevision('sec02-r1', 'section-02', HASH_FP_V1);
    const sec01Approved = makeApprovedRevision('sec01-r1', 'section-01', HASH_FP_V1);
    const newSec02Pending = createSectionRevision({
      id: 'sec02-r2',
      sectionId: 'section-02',
      baseTemplateHash: HASH_TPL,
      ruleId: 'rule-section-02',
      ruleVersion: 2,
      inputFingerprint: HASH_FP_V2,
      outputs: { revenue: '3750000000' },
      patchSet: [{ blockId: 'blk-section-02', op: 'replaceText', payload: { newText: '3,75 tỷ' } }],
      reviewStatus: 'REVIEW_REQUIRED',
      approval: null
    });

    const outcome = approveSectionRevisionWithHistory({
      targetRevisionId: 'sec02-r2',
      existingRevisions: [sec01Approved, oldSec02Approved, newSec02Pending],
      actor: humanUser,
      approvedAt: T_NEXT
    });

    expect(outcome.approvedRevision.reviewStatus).toBe('APPROVED');
    expect(outcome.approvedRevision.approval).toEqual({
      approvedBy: 'user-khanhnm',
      approvedAt: T_NEXT
    });
    expect(outcome.supersededRevisions.map((r) => r.id)).toEqual(['sec02-r1']);
    expect(outcome.supersededRevisions[0]?.reviewStatus).toBe('SUPERSEDED');
    // Vẫn giữ dấu phê duyệt lịch sử trên bản SUPERSEDED để kiểm toán
    expect(outcome.supersededRevisions[0]?.approval?.approvedBy).toBe('user-khanhnm');
    expect(
      outcome.updatedRevisions.find((r) => r.id === 'sec01-r1')?.reviewStatus
    ).toBe('APPROVED');
  });

  it('5. DocumentBuild State Machine & Build Gate: chặn cứng APPROVED/EXPORTED khi còn STALE, chưa duyệt SectionRevision hoặc lỗi Layout nghiêm trọng', () => {
    const rev1 = makeApprovedRevision('r-sec1', 'section-01', HASH_FP_V1);
    const rev2Approved = makeApprovedRevision('r-sec2', 'section-02', HASH_FP_V1);
    const rev2Pending = createSectionRevision({
      ...rev2Approved,
      id: 'r-sec2-pending',
      reviewStatus: 'REVIEW_REQUIRED',
      approval: null
    });

    const validGate: BuildQualityGateInput = {
      manifest: {
        templateHash: HASH_TPL,
        selectedRevisions: { 'section-01': 'r-sec1', 'section-02': 'r-sec2' },
        layoutPolicy: { mode: 'NATURAL_REFLOW' }
      },
      sections: [
        {
          sectionId: 'section-01',
          required: true,
          calculationStatus: 'APPROVED',
          expectedInputFingerprint: HASH_FP_V1
        },
        {
          sectionId: 'section-02',
          required: true,
          calculationStatus: 'APPROVED',
          expectedInputFingerprint: HASH_FP_V1
        }
      ],
      revisionsById: {
        'r-sec1': rev1,
        'r-sec2': rev2Approved,
        'r-sec2-pending': rev2Pending
      },
      layoutIssues: []
    };

    // Luồng hợp lệ từ đầu đến cuối
    expect(transitionDocumentBuildStatus('BLOCKED', 'BUILDING', { gate: validGate })).toBe(
      'BUILDING'
    );
    expect(transitionDocumentBuildStatus('BUILDING', 'RENDERED')).toBe('RENDERED');
    expect(transitionDocumentBuildStatus('RENDERED', 'LAYOUT_REVIEW')).toBe('LAYOUT_REVIEW');
    expect(
      transitionDocumentBuildStatus('LAYOUT_REVIEW', 'APPROVED', {
        actor: humanUser,
        gate: validGate
      })
    ).toBe('APPROVED');
    expect(
      transitionDocumentBuildStatus('APPROVED', 'EXPORTED', {
        actor: humanUser,
        gate: validGate,
        destinationPath: '/projects/p1/exports/BaoCao_Final.docx'
      })
    ).toBe('EXPORTED');

    // Cấm nhảy cóc LAYOUT_REVIEW -> EXPORTED hoặc mở lại từ EXPORTED
    expect(() =>
      transitionDocumentBuildStatus('LAYOUT_REVIEW', 'EXPORTED', {
        actor: humanUser,
        gate: validGate
      })
    ).toThrowError(
      expect.objectContaining({ code: 'INVALID_STATE_TRANSITION' }) as unknown as Error
    );
    expect(() => transitionDocumentBuildStatus('EXPORTED', 'BUILDING')).toThrowError(
      expect.objectContaining({ code: 'INVALID_STATE_TRANSITION' }) as unknown as Error
    );

    // Chặn 1: Còn node bắt buộc STALE -> BUILD_BLOCKED_STALE_RESULTS (cả ở APPROVED lẫn EXPORTED)
    const staleGate: BuildQualityGateInput = {
      ...validGate,
      sections: [
        validGate.sections[0]!,
        {
          sectionId: 'section-02',
          required: true,
          calculationStatus: 'STALE',
          expectedInputFingerprint: HASH_FP_V2
        }
      ]
    };

    expect(() =>
      transitionDocumentBuildStatus('LAYOUT_REVIEW', 'APPROVED', {
        actor: humanUser,
        gate: staleGate
      })
    ).toThrowError(
      expect.objectContaining({ code: 'BUILD_BLOCKED_STALE_RESULTS' }) as unknown as Error
    );
    expect(() =>
      transitionDocumentBuildStatus('APPROVED', 'EXPORTED', {
        actor: humanUser,
        gate: staleGate
      })
    ).toThrowError(
      expect.objectContaining({ code: 'BUILD_BLOCKED_STALE_RESULTS' }) as unknown as Error
    );

    // Chặn 2: SectionRevision chưa APPROVED (đang REVIEW_REQUIRED) -> BUILD_BLOCKED_UNAPPROVED_REVISIONS
    const unapprovedGate: BuildQualityGateInput = {
      ...validGate,
      manifest: {
        ...validGate.manifest,
        selectedRevisions: { 'section-01': 'r-sec1', 'section-02': 'r-sec2-pending' }
      }
    };

    expect(() =>
      transitionDocumentBuildStatus('LAYOUT_REVIEW', 'APPROVED', {
        actor: humanUser,
        gate: unapprovedGate
      })
    ).toThrowError(
      expect.objectContaining({ code: 'BUILD_BLOCKED_UNAPPROVED_REVISIONS' }) as unknown as Error
    );
    expect(() =>
      transitionDocumentBuildStatus('APPROVED', 'EXPORTED', {
        actor: humanUser,
        gate: unapprovedGate
      })
    ).toThrowError(
      expect.objectContaining({ code: 'BUILD_BLOCKED_UNAPPROVED_REVISIONS' }) as unknown as Error
    );

    // Chặn 3: Lỗi Layout mức CRITICAL chưa có overrideReason -> BUILD_BLOCKED_LAYOUT_GATE; có overrideReason hợp lệ thì cho qua
    const criticalIssue = createLayoutIssue({
      id: 'li-crit-01',
      buildId: 'build-0001',
      sectionId: 'section-02',
      blockId: 'tbl-02',
      type: 'TABLE_OVERFLOW',
      severity: 'CRITICAL',
      pageRange: [4, 4],
      detail: 'Bảng doanh thu tràn lề phải 18mm.'
    });

    const layoutBlockedGate: BuildQualityGateInput = {
      ...validGate,
      layoutIssues: [criticalIssue]
    };

    expect(evaluateBuildQualityGate(layoutBlockedGate).blockingErrorCode).toBe(
      'BUILD_BLOCKED_LAYOUT_GATE'
    );
    expect(() =>
      transitionDocumentBuildStatus('LAYOUT_REVIEW', 'APPROVED', {
        actor: humanUser,
        gate: layoutBlockedGate
      })
    ).toThrowError(
      expect.objectContaining({ code: 'BUILD_BLOCKED_LAYOUT_GATE' }) as unknown as Error
    );

    expect(
      transitionDocumentBuildStatus('LAYOUT_REVIEW', 'APPROVED', {
        actor: humanUser,
        gate: {
          ...layoutBlockedGate,
          overrideReason: 'Đã kiểm tra bản in ngang A4 thực tế chấp nhận được'
        }
      })
    ).toBe('APPROVED');

    // Chặn 4: AI Agent cố gọi duyệt hoặc xuất Build -> CAPABILITY_DENIED
    expect(() =>
      transitionDocumentBuildStatus('LAYOUT_REVIEW', 'APPROVED', {
        actor: createAiActorContext('reviewer', 's4'),
        gate: validGate
      })
    ).toThrowError(expect.objectContaining({ code: 'CAPABILITY_DENIED' }) as unknown as Error);
  });

  it('6. LayoutDifference State Machine: phân loại dời trang (SHIFTED) độc lập hoàn toàn với trạng thái tính toán và phê duyệt nội dung (AC11)', () => {
    expect(transitionLayoutDifferenceStatus('NO_CHANGE', 'SHIFTED')).toBe('SHIFTED');
    expect(transitionLayoutDifferenceStatus('SHIFTED', 'OVERFLOW')).toBe('OVERFLOW');
    expect(transitionLayoutDifferenceStatus('OVERFLOW', 'NO_CHANGE')).toBe('NO_CHANGE');

    expect(
      classifySectionLayoutDifference({
        baselinePages: [7],
        renderedPages: [8]
      })
    ).toBe('SHIFTED');

    expect(
      classifySectionLayoutDifference({
        baselinePages: [3, 4],
        renderedPages: [3, 4]
      })
    ).toBe('NO_CHANGE');

    // Section 03 dời từ trang 7 sang trang 8 do Section 01 dài ra nhưng không đổi chữ
    const sec03Rev = makeApprovedRevision('r-sec3', 'section-03', HASH_FP_V1);
    const updatedSnapshot = recordLayoutObservationPreservingContentState(
      {
        sectionId: 'section-03',
        calculationStatus: 'APPROVED',
        activeRevision: sec03Rev,
        layoutDiff: 'NO_CHANGE'
      },
      'SHIFTED'
    );

    expect(updatedSnapshot.layoutDiff).toBe('SHIFTED');
    expect(updatedSnapshot.calculationStatus).toBe('APPROVED');
    expect(updatedSnapshot.activeRevision?.reviewStatus).toBe('APPROVED');
  });

  it('7. Invalidation & DAG (§3.2, AC3, AC4, AC7): lan truyền STALE có mục tiêu, bảo toàn Revision lịch sử, chặn chu trình và chặn chạy thiếu upstream', () => {
    const edges = makeStandardDagEdges();

    // 1. Phát hiện chu trình A -> B -> A
    const cyclicEdges: DependencyEdge[] = [
      ...edges,
      createDependencyEdge({
        id: 'e-cycle-5-2',
        fromId: 'section-05',
        toId: 'section-02',
        type: 'REFERENCES',
        condition: null,
        discoveredBy: 'USER',
        approved: false
      })
    ];
    expect(() => assertAcyclicDependencyGraph(cyclicEdges)).toThrowError(
      expect.objectContaining({ code: 'DEPENDENCY_CYCLE_DETECTED' }) as unknown as Error
    );

    // 2. Sửa sản lượng ở section-01 (12.000 -> 15.000): section-02..05 chuyển STALE, section-appendix giữ nguyên APPROVED (AC3 & AC7)
    const initialStatuses: Record<string, CalculationResultStatus> = {
      'section-01': 'APPROVED',
      'section-02': 'APPROVED',
      'section-03': 'APPROVED',
      'section-04': 'APPROVED',
      'section-05': 'APPROVED',
      'section-appendix': 'APPROVED'
    };

    const existingRevisions = [
      makeApprovedRevision('r-01', 'section-01'),
      makeApprovedRevision('r-02', 'section-02'),
      makeApprovedRevision('r-03', 'section-03'),
      makeApprovedRevision('r-appendix', 'section-appendix')
    ];

    const invalidation = propagateDownstreamInvalidation({
      changedNodeIds: ['section-01'],
      edges,
      calculationStatuses: initialStatuses,
      revisions: existingRevisions,
      requiredSectionIds: ['section-01', 'section-02', 'section-03', 'section-04', 'section-05'],
      currentBuildStatus: 'APPROVED'
    });

    expect(invalidation.affectedDownstreamIds).toEqual([
      'section-02',
      'section-03',
      'section-04',
      'section-05'
    ]);
    expect(invalidation.nextCalculationStatuses['section-01']).toBe('APPROVED');
    expect(invalidation.nextCalculationStatuses['section-02']).toBe('STALE');
    expect(invalidation.nextCalculationStatuses['section-05']).toBe('STALE');
    expect(invalidation.nextCalculationStatuses['section-appendix']).toBe('APPROVED');
    expect(invalidation.nextBuildStatus).toBe('BLOCKED');

    // Bản đã duyệt cũ vẫn được bảo toàn nguyên vẹn trong lịch sử nhưng đánh dấu hết hiệu lực build mới
    expect(invalidation.preservedRevisions).toHaveLength(4);
    expect(invalidation.invalidatedBuildRevisionIds).toEqual(['r-02', 'r-03']);

    // 3. Cố chạy riêng section-03 khi section-02 còn STALE -> bị chặn với UPSTREAM_SECTION_STALE
    expect(() =>
      assertSelectedSectionUpstreamReady({
        targetSectionId: 'section-03',
        edges,
        calculationStatuses: invalidation.nextCalculationStatuses
      })
    ).toThrowError(expect.objectContaining({ code: 'UPSTREAM_SECTION_STALE' }) as unknown as Error);

    // 4. Chỉ chạy riêng section-02 (AC4): section-02 -> RESULT_READY, nhưng section-03..05 vẫn STALE và Build vẫn bị chặn
    assertSelectedSectionUpstreamReady({
      targetSectionId: 'section-02',
      edges,
      calculationStatuses: invalidation.nextCalculationStatuses
    });

    const partialRun = completeSelectedSectionCalculation({
      targetSectionId: 'section-02',
      calculationStatuses: invalidation.nextCalculationStatuses,
      requiredSectionIds: ['section-01', 'section-02', 'section-03', 'section-04', 'section-05']
    });

    expect(partialRun.nextCalculationStatuses['section-02']).toBe('RESULT_READY');
    expect(partialRun.nextCalculationStatuses['section-03']).toBe('STALE');
    expect(partialRun.nextCalculationStatuses['section-04']).toBe('STALE');
    expect(partialRun.nextCalculationStatuses['section-05']).toBe('STALE');
    expect(partialRun.isBuildBlocked).toBe(true);

    // 5. Khi tính lại mà outputHash trùng hệt và không đổi rule viết nhận xét -> không sinh Content Diff thừa (§3.2)
    const noOp = evaluateRecomputedOutputEquivalence({
      previousOutputHash: HASH_FP_V1,
      newOutputHash: HASH_FP_V1,
      narrativeRuleChanged: false
    });
    expect(noOp.hasSemanticChange).toBe(false);
    expect(noOp.shouldCreateProposedRevision).toBe(false);
    expect(noOp.shouldPersistRunProvenance).toBe(true);
  });
});
