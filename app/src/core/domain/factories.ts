import { AppError } from './errors';
import {
  LAYOUT_POLICY_MODES,
  OOXML_PATCH_OPERATIONS,
  type BuildArtifact,
  type BuildManifest,
  type ChangeRequest,
  type DataBinding,
  type DataDefinition,
  type DataRevision,
  type DependencyEdge,
  type DocumentBlock,
  type LayoutIssue,
  type LogicalSection,
  type OoxmlPatchCommand,
  type Project,
  type Run,
  type RunStep,
  type SavedRule,
  type SectionRevision,
  type SourceArtifact,
  type TemplateArtifact
} from './entities';
import { assertNoDynamicCodeOrMacro, validateTypedRulePlan } from './typed-rule-ir';
import {
  assertIsoTimestamp,
  assertLogicalSectionIdentity,
  assertNonEmptyText,
  assertNonNegativeInteger,
  assertPositiveInteger,
  assertValidDecimalString,
  assertWritableBuildTargetPath,
  deepFreeze,
  normalizeSha256Hash
} from './value-objects';

/**
 * Các hàm khởi tạo thực thể miền (Domain Factory Functions) kèm kiểm tra bất biến khởi tạo chặt chẽ
 * và đóng băng sâu (`deepFreeze`) đảm bảo tính bất biến theo DOCFLOW_STUDIO_SPEC.md §5.
 */

// 1. Project
export function createProject(input: Project): Project {
  const id = assertNonEmptyText(input.id, 'project.id');
  const title = assertNonEmptyText(input.title, 'project.title');
  const currentRecipeVersion = assertNonNegativeInteger(
    input.currentRecipeVersion,
    'project.currentRecipeVersion'
  );
  const createdAt = assertIsoTimestamp(input.createdAt, 'project.createdAt');
  const updatedAt = assertIsoTimestamp(input.updatedAt, 'project.updatedAt');

  if (Date.parse(updatedAt) < Date.parse(createdAt)) {
    throw new AppError({
      code: 'DOMAIN_INVARIANT_VIOLATION',
      message: 'Thời điểm cập nhật dự án (updatedAt) không được nhỏ hơn thời điểm tạo (createdAt).',
      details: { createdAt, updatedAt },
      recoverable: true
    });
  }

  return deepFreeze({
    id,
    title,
    status: input.status,
    currentRecipeVersion,
    createdAt,
    updatedAt
  });
}

// 2. TemplateArtifact (Template V0 — chỉ đọc, bắt buộc có sha256 hợp lệ)
export function createTemplateArtifact(input: Omit<TemplateArtifact, 'readOnly'>): TemplateArtifact {
  const id = assertNonEmptyText(input.id, 'templateArtifact.id');
  const path = assertNonEmptyText(input.path, 'templateArtifact.path');
  const sha256 = normalizeSha256Hash(input.sha256, 'templateArtifact.sha256');
  const parsedAt = assertIsoTimestamp(input.parsedAt, 'templateArtifact.parsedAt');

  return deepFreeze({
    id,
    path,
    sha256,
    parsedAt,
    ooxmlMap: { ...input.ooxmlMap },
    readOnly: true as const
  });
}

// 3. SourceArtifact (Source Snapshot — chỉ đọc, bắt buộc có sha256 hợp lệ)
export function createSourceArtifact(input: Omit<SourceArtifact, 'readOnly'>): SourceArtifact {
  const id = assertNonEmptyText(input.id, 'sourceArtifact.id');
  const path = assertNonEmptyText(input.path, 'sourceArtifact.path');
  const version = assertPositiveInteger(input.version, 'sourceArtifact.version');
  const sha256 = normalizeSha256Hash(input.sha256, 'sourceArtifact.sha256');
  const importedAt = assertIsoTimestamp(input.importedAt, 'sourceArtifact.importedAt');

  return deepFreeze({
    id,
    type: input.type,
    path,
    version,
    sha256,
    importedAt,
    readOnly: true as const
  });
}

// 4. LogicalSection (không dùng số trang làm định danh)
export function createLogicalSection(input: LogicalSection): LogicalSection {
  const id = assertLogicalSectionIdentity(input.id);
  const parentId =
    input.parentId !== null ? assertLogicalSectionIdentity(input.parentId) : null;
  if (parentId !== null && parentId === id) {
    throw new AppError({
      code: 'DOMAIN_INVARIANT_VIOLATION',
      message: `LogicalSection '${id}' không thể tự nhận chính nó làm mục cha (parentId).`,
      details: { sectionId: id },
      recoverable: true
    });
  }
  const title = assertNonEmptyText(input.title, 'logicalSection.title');
  const order = assertNonNegativeInteger(input.order, 'logicalSection.order');
  const startAnchor = assertNonEmptyText(input.startAnchor, 'logicalSection.startAnchor');
  const endAnchor = assertNonEmptyText(input.endAnchor, 'logicalSection.endAnchor');

  return deepFreeze({
    id,
    parentId,
    title,
    order,
    startAnchor,
    endAnchor,
    requiredForBuild: input.requiredForBuild ?? true
  });
}

// 5. DocumentBlock (bắt buộc có ooxmlLocator & anchorFingerprint)
export function createDocumentBlock(input: DocumentBlock): DocumentBlock {
  const id = assertNonEmptyText(input.id, 'documentBlock.id');
  const sectionId = assertLogicalSectionIdentity(input.sectionId);
  const ooxmlLocator = assertNonEmptyText(input.ooxmlLocator, 'documentBlock.ooxmlLocator');
  const anchorFingerprint = assertNonEmptyText(
    input.anchorFingerprint,
    'documentBlock.anchorFingerprint'
  );
  const styleRef =
    input.styleRef !== null ? assertNonEmptyText(input.styleRef, 'documentBlock.styleRef') : null;

  return deepFreeze({
    id,
    sectionId,
    ooxmlLocator,
    type: input.type,
    styleRef,
    anchorFingerprint
  });
}

// 6. DataDefinition
export function createDataDefinition(input: DataDefinition): DataDefinition {
  const key = assertNonEmptyText(input.key, 'dataDefinition.key');
  const unit =
    input.unit !== null ? assertNonEmptyText(input.unit, 'dataDefinition.unit') : null;

  if (input.validation.minDecimal !== undefined) {
    assertValidDecimalString(input.validation.minDecimal, 'dataDefinition.validation.minDecimal');
  }
  if (input.validation.maxDecimal !== undefined) {
    assertValidDecimalString(input.validation.maxDecimal, 'dataDefinition.validation.maxDecimal');
  }
  if (input.validation.scale !== undefined) {
    assertNonNegativeInteger(input.validation.scale, 'dataDefinition.validation.scale');
  }
  if (
    input.defaultPolicy === 'USE_EXPLICIT_DEFAULT' &&
    input.validation.explicitDefault === undefined
  ) {
    throw new AppError({
      code: 'DOMAIN_INVARIANT_VIOLATION',
      message: `DataDefinition '${key}' chọn chính sách USE_EXPLICIT_DEFAULT nhưng chưa khai báo validation.explicitDefault.`,
      details: { key },
      recoverable: true
    });
  }

  return deepFreeze({
    key,
    dataType: input.dataType,
    unit,
    validation: { ...input.validation },
    defaultPolicy: input.defaultPolicy
  });
}

// 7. DataRevision (chặn số chấm động thô IEEE-754 khi truyền kiểu số không nguyên)
export function createDataRevision(
  input: DataRevision,
  options?: { readonly expectedDataType?: DataDefinition['dataType'] }
): DataRevision {
  const id = assertNonEmptyText(input.id, 'dataRevision.id');
  const key = assertNonEmptyText(input.key, 'dataRevision.key');
  const version = assertPositiveInteger(input.version, 'dataRevision.version');
  const createdAt = assertIsoTimestamp(input.createdAt, 'dataRevision.createdAt');

  let normalizedValue = input.value;
  if (typeof normalizedValue === 'number' && !Number.isSafeInteger(normalizedValue)) {
    throw new AppError({
      code: 'RULE_SCHEMA_INVALID',
      message: `DataRevision '${id}' không chấp nhận số chấm động IEEE-754 thô (${String(normalizedValue)}); bắt buộc dùng chuỗi thập phân chính xác (DecimalString).`,
      details: { id, key, value: normalizedValue },
      recoverable: true
    });
  }

  if (
    (options?.expectedDataType === 'DECIMAL' || options?.expectedDataType === 'PERCENTAGE') &&
    normalizedValue !== null
  ) {
    if (typeof normalizedValue === 'number') {
      normalizedValue = String(normalizedValue);
    }
    if (typeof normalizedValue !== 'string') {
      throw new AppError({
        code: 'RULE_SCHEMA_INVALID',
        message: `DataRevision '${id}' của kiểu ${options.expectedDataType} phải biểu diễn bằng DecimalString.`,
        details: { id, key, value: normalizedValue },
        recoverable: true
      });
    }
    normalizedValue = assertValidDecimalString(normalizedValue, 'dataRevision.value');
  }

  const provenance = { ...input.provenance };
  if (provenance.sourceSha256 !== undefined) {
    provenance.sourceSha256 = normalizeSha256Hash(
      provenance.sourceSha256,
      'dataRevision.provenance.sourceSha256'
    );
  }

  return deepFreeze({
    id,
    key,
    value: normalizedValue,
    provenance,
    status: input.status,
    version,
    createdAt
  });
}

// 8. DataBinding
export function createDataBinding(input: DataBinding): DataBinding {
  const id = assertNonEmptyText(input.id, 'dataBinding.id');
  const sourceId = assertNonEmptyText(input.sourceId, 'dataBinding.sourceId');
  const rangeSelector = assertNonEmptyText(input.rangeSelector, 'dataBinding.rangeSelector');
  const priority = assertNonNegativeInteger(input.priority, 'dataBinding.priority');
  const version = assertPositiveInteger(input.version, 'dataBinding.version');
  const sourceSha256 =
    input.sourceSha256 !== undefined
      ? normalizeSha256Hash(input.sourceSha256, 'dataBinding.sourceSha256')
      : undefined;

  return deepFreeze({
    id,
    ...(input.targetKey !== undefined
      ? { targetKey: assertNonEmptyText(input.targetKey, 'dataBinding.targetKey') }
      : {}),
    sourceId,
    ...(sourceSha256 !== undefined ? { sourceSha256 } : {}),
    rangeSelector,
    lookupSpec: { ...input.lookupSpec },
    priority,
    version,
    status: input.status
  });
}

// 9. ChangeRequest
export function createChangeRequest(input: ChangeRequest): ChangeRequest {
  const id = assertNonEmptyText(input.id, 'changeRequest.id');
  const sectionId = assertLogicalSectionIdentity(input.sectionId);
  const prompt = assertNonEmptyText(input.prompt, 'changeRequest.prompt');
  const createdAt = assertIsoTimestamp(input.createdAt, 'changeRequest.createdAt');
  const updatedAt = assertIsoTimestamp(input.updatedAt, 'changeRequest.updatedAt');

  return deepFreeze({
    id,
    sectionId,
    prompt,
    changeKind: input.changeKind,
    status: input.status,
    affectedScope: input.affectedScope,
    ...(input.oldValue !== undefined ? { oldValue: input.oldValue } : {}),
    ...(input.newValue !== undefined ? { newValue: input.newValue } : {}),
    ...(input.linkedBuildId !== undefined ? { linkedBuildId: input.linkedBuildId } : {}),
    createdAt,
    updatedAt
  });
}

// 10. SavedRule (kiểm tra chặt Typed Rule IR, cấm eval / new Function / macro)
export function createSavedRule(input: SavedRule): SavedRule {
  const id = assertNonEmptyText(input.id, 'savedRule.id');
  const version = assertPositiveInteger(input.version, 'savedRule.version');
  const textInstruction = assertNonEmptyText(input.textInstruction, 'savedRule.textInstruction');
  assertNoDynamicCodeOrMacro(textInstruction, 'savedRule.textInstruction');

  const targetSectionId =
    input.targetSectionId !== undefined
      ? assertLogicalSectionIdentity(input.targetSectionId)
      : undefined;

  validateTypedRulePlan(input.ioSchema, input.executionPlan);

  return deepFreeze({
    id,
    version,
    ...(targetSectionId !== undefined ? { targetSectionId } : {}),
    textInstruction,
    ioSchema: input.ioSchema,
    executionPlan: input.executionPlan,
    testCases: [...input.testCases],
    status: input.status,
    requiresHumanReview: input.requiresHumanReview,
    ...(input.reviewTriggers !== undefined ? { reviewTriggers: [...input.reviewTriggers] } : {})
  });
}

// 11. DependencyEdge (chặn tự phụ thuộc vào chính mình A -> A)
export function createDependencyEdge(input: DependencyEdge): DependencyEdge {
  const id = assertNonEmptyText(input.id, 'dependencyEdge.id');
  const fromId = assertNonEmptyText(input.fromId, 'dependencyEdge.fromId');
  const toId = assertNonEmptyText(input.toId, 'dependencyEdge.toId');

  if (fromId === toId) {
    throw new AppError({
      code: 'DEPENDENCY_CYCLE_DETECTED',
      message: `Cạnh phụ thuộc '${id}' tạo vòng lặp trực tiếp trên cùng một nút '${fromId}'.`,
      details: { edgeId: id, cyclePath: [fromId, toId] },
      recoverable: true
    });
  }

  return deepFreeze({
    id,
    fromId,
    toId,
    ...(input.fromNodeType !== undefined ? { fromNodeType: input.fromNodeType } : {}),
    ...(input.toNodeType !== undefined ? { toNodeType: input.toNodeType } : {}),
    type: input.type,
    condition: input.condition !== null ? assertNonEmptyText(input.condition, 'condition') : null,
    discoveredBy: input.discoveredBy,
    approved: input.approved
  });
}

// 12. Run
export function createRun(input: Run): Run {
  const id = assertNonEmptyText(input.id, 'run.id');
  const planHash = normalizeSha256Hash(input.planHash, 'run.planHash');
  const snapshotId = assertNonEmptyText(input.snapshotId, 'run.snapshotId');
  const startedAt = assertIsoTimestamp(input.startedAt, 'run.startedAt');
  const completedAt =
    input.completedAt !== null
      ? assertIsoTimestamp(input.completedAt, 'run.completedAt')
      : null;

  if (input.result === 'RUNNING' && completedAt !== null) {
    throw new AppError({
      code: 'DOMAIN_INVARIANT_VIOLATION',
      message: `Phiên chạy '${id}' đang ở trạng thái RUNNING nên chưa thể có completedAt.`,
      details: { runId: id, completedAt },
      recoverable: true
    });
  }

  return deepFreeze({
    id,
    mode: input.mode,
    planHash,
    snapshotId,
    startedAt,
    completedAt,
    result: input.result
  });
}

// 13. RunStep (evidence có truy vết nguồn)
export function createRunStep(input: RunStep): RunStep {
  const id = assertNonEmptyText(input.id, 'runStep.id');
  const runId = assertNonEmptyText(input.runId, 'runStep.runId');
  const ruleId = assertNonEmptyText(input.ruleId, 'runStep.ruleId');
  const ruleVersion =
    input.ruleVersion !== undefined
      ? assertPositiveInteger(input.ruleVersion, 'runStep.ruleVersion')
      : undefined;

  const normalizedInputHashes: Record<string, string> = {};
  for (const [k, hashVal] of Object.entries(input.inputHashes)) {
    normalizedInputHashes[assertNonEmptyText(k, 'runStep.inputHashes.key')] = normalizeSha256Hash(
      hashVal,
      `runStep.inputHashes.${k}`
    );
  }

  const outputHash =
    input.outputHash !== null
      ? normalizeSha256Hash(input.outputHash, 'runStep.outputHash')
      : null;
  const resultFingerprint =
    input.resultFingerprint !== null
      ? normalizeSha256Hash(input.resultFingerprint, 'runStep.resultFingerprint')
      : null;

  const normalizedRows = input.evidence.matchedSourceRows?.map((row, idx) => ({
    ...row,
    sourceId: assertNonEmptyText(row.sourceId, `runStep.evidence.matchedSourceRows[${idx}].sourceId`),
    sourceSha256: normalizeSha256Hash(
      row.sourceSha256,
      `runStep.evidence.matchedSourceRows[${idx}].sourceSha256`
    ),
    rowNumber: assertPositiveInteger(
      row.rowNumber,
      `runStep.evidence.matchedSourceRows[${idx}].rowNumber`
    )
  }));

  return deepFreeze({
    id,
    runId,
    ruleId,
    ...(ruleVersion !== undefined ? { ruleVersion } : {}),
    inputHashes: normalizedInputHashes,
    outputHash,
    resultFingerprint,
    evidence: {
      ...input.evidence,
      ...(normalizedRows !== undefined ? { matchedSourceRows: normalizedRows } : {})
    },
    errors: [...input.errors]
  });
}

// 14. SectionRevision & Phạm vi Patch theo Section
export function assertPatchesWithinSectionScope(
  sectionId: string,
  patches: readonly OoxmlPatchCommand[],
  allowedBlockIds?: ReadonlySet<string> | readonly string[]
): readonly OoxmlPatchCommand[] {
  const allowedSet =
    allowedBlockIds === undefined
      ? null
      : allowedBlockIds instanceof Set
        ? allowedBlockIds
        : new Set(allowedBlockIds);

  return patches.map((patch, idx) => {
    const blockId = assertNonEmptyText(patch.blockId, `patchSet[${idx}].blockId`);
    if (!(OOXML_PATCH_OPERATIONS as readonly string[]).includes(patch.op)) {
      throw new AppError({
        code: 'DOMAIN_INVARIANT_VIOLATION',
        message: `Phép biến đổi OOXML '${String(patch.op)}' không nằm trong danh sách cho phép.`,
        details: { sectionId, blockId, op: patch.op },
        recoverable: true
      });
    }
    if (allowedSet !== null && !allowedSet.has(blockId)) {
      throw new AppError({
        code: 'PATCH_OUT_OF_SECTION_SCOPE',
        message: `Lệnh vá OOXML cố sửa block '${blockId}' nằm ngoài phạm vi LogicalSection '${sectionId}'.`,
        details: { sectionId, blockId, op: patch.op },
        recoverable: false
      });
    }
    return {
      blockId,
      op: patch.op,
      payload: { ...patch.payload }
    };
  });
}

export function createSectionRevision(
  input: SectionRevision,
  options?: { readonly allowedBlockIds?: readonly string[] }
): SectionRevision {
  const id = assertNonEmptyText(input.id, 'sectionRevision.id');
  const sectionId = assertLogicalSectionIdentity(input.sectionId);
  const baseTemplateHash = normalizeSha256Hash(
    input.baseTemplateHash,
    'sectionRevision.baseTemplateHash'
  );
  const inputFingerprint = normalizeSha256Hash(
    input.inputFingerprint,
    'sectionRevision.inputFingerprint'
  );
  const ruleId =
    input.ruleId !== null ? assertNonEmptyText(input.ruleId, 'sectionRevision.ruleId') : null;
  const ruleVersion =
    input.ruleVersion !== null
      ? assertPositiveInteger(input.ruleVersion, 'sectionRevision.ruleVersion')
      : null;

  if ((ruleId === null) !== (ruleVersion === null)) {
    throw new AppError({
      code: 'DOMAIN_INVARIANT_VIOLATION',
      message: `SectionRevision '${id}' phải cung cấp đồng thời cả ruleId và ruleVersion (hoặc để null cả hai với bản sửa tay).`,
      details: { id, ruleId, ruleVersion },
      recoverable: true
    });
  }

  const validatedPatches = assertPatchesWithinSectionScope(
    sectionId,
    input.patchSet,
    options?.allowedBlockIds
  );

  if (input.reviewStatus === 'APPROVED') {
    if (!input.approval) {
      throw new AppError({
        code: 'DOMAIN_INVARIANT_VIOLATION',
        message: `SectionRevision '${id}' ở trạng thái APPROVED bắt buộc phải có thông tin người dùng phê duyệt (approval).`,
        details: { id, sectionId },
        recoverable: false
      });
    }
    const approvedBy = assertNonEmptyText(input.approval.approvedBy, 'approval.approvedBy');
    if (approvedBy.toLowerCase().startsWith('ai:')) {
      throw new AppError({
        code: 'CAPABILITY_DENIED',
        message: `SectionRevision '${id}' không được phép ghi nhận tác nhân AI ('${approvedBy}') làm người phê duyệt.`,
        details: { id, approvedBy },
        recoverable: false
      });
    }
    assertIsoTimestamp(input.approval.approvedAt, 'approval.approvedAt');
  } else if (
    (input.reviewStatus === 'DRAFT' || input.reviewStatus === 'REVIEW_REQUIRED') &&
    input.approval !== null
  ) {
    throw new AppError({
      code: 'DOMAIN_INVARIANT_VIOLATION',
      message: `SectionRevision '${id}' đang ở trạng thái '${input.reviewStatus}' nên không được gắn dấu phê duyệt trước hạn.`,
      details: { id, reviewStatus: input.reviewStatus },
      recoverable: true
    });
  }

  return deepFreeze({
    id,
    sectionId,
    baseTemplateHash,
    ruleId,
    ruleVersion,
    inputFingerprint,
    outputs: { ...input.outputs },
    patchSet: validatedPatches,
    reviewStatus: input.reviewStatus,
    approval: input.approval
      ? {
          approvedBy: input.approval.approvedBy.trim(),
          approvedAt: input.approval.approvedAt.trim()
        }
      : null
  });
}

// 15. BuildManifest
export function createBuildManifest(input: BuildManifest): BuildManifest {
  const id = assertNonEmptyText(input.id, 'buildManifest.id');
  const templateHash = normalizeSha256Hash(input.templateHash, 'buildManifest.templateHash');
  const recipeVersion = assertNonNegativeInteger(
    input.recipeVersion,
    'buildManifest.recipeVersion'
  );

  const sourceSnapshotIds = input.sourceSnapshotIds.map((sid, idx) =>
    assertNonEmptyText(sid, `buildManifest.sourceSnapshotIds[${idx}]`)
  );

  const normalizedRuleVersions: Record<string, number> = {};
  for (const [rId, ver] of Object.entries(input.ruleVersions)) {
    normalizedRuleVersions[assertNonEmptyText(rId, 'buildManifest.ruleVersions.ruleId')] =
      assertPositiveInteger(ver, `buildManifest.ruleVersions.${rId}`);
  }

  const normalizedSelectedRevisions: Record<string, string> = {};
  for (const [secId, revId] of Object.entries(input.selectedRevisions)) {
    normalizedSelectedRevisions[assertLogicalSectionIdentity(secId)] = assertNonEmptyText(
      revId,
      `buildManifest.selectedRevisions.${secId}`
    );
  }

  const policyMode = input.layoutPolicy.mode ?? 'NATURAL_REFLOW';
  if (!(LAYOUT_POLICY_MODES as readonly string[]).includes(policyMode)) {
    throw new AppError({
      code: 'DOMAIN_INVARIANT_VIOLATION',
      message: `Chính sách bố cục '${String(policyMode)}' không hợp lệ.`,
      details: { mode: policyMode },
      recoverable: true
    });
  }

  if (input.layoutPolicy.forbidSilentFontShrink === false) {
    throw new AppError({
      code: 'DOMAIN_INVARIANT_VIOLATION',
      message: 'Cấm bật cơ chế tự động thu nhỏ cỡ chữ ngầm để ép số trang (Spec §8.5).',
      details: { manifestId: id },
      recoverable: true
    });
  }

  return deepFreeze({
    id,
    templateHash,
    sourceSnapshotIds,
    recipeVersion,
    ruleVersions: normalizedRuleVersions,
    selectedRevisions: normalizedSelectedRevisions,
    layoutPolicy: {
      ...input.layoutPolicy,
      mode: policyMode,
      forbidSilentFontShrink: true
    },
    rendererInfo: { ...input.rendererInfo },
    status: input.status
  });
}

// 16. BuildArtifact (cấm trỏ đường dẫn xuất vào Template V0 hoặc Source Snapshot)
export function createBuildArtifact(input: BuildArtifact): BuildArtifact {
  const id = assertNonEmptyText(input.id, 'buildArtifact.id');
  const manifestId = assertNonEmptyText(input.manifestId, 'buildArtifact.manifestId');
  const docxPath = assertWritableBuildTargetPath(input.docxPath, 'buildArtifact.docxPath');
  const pdfPreviewPath =
    input.pdfPreviewPath !== null
      ? assertWritableBuildTargetPath(input.pdfPreviewPath, 'buildArtifact.pdfPreviewPath')
      : null;
  const checksum = normalizeSha256Hash(input.checksum, 'buildArtifact.checksum');
  const pageCount = assertPositiveInteger(input.pageCount, 'buildArtifact.pageCount');
  const createdAt = assertIsoTimestamp(input.createdAt, 'buildArtifact.createdAt');

  return deepFreeze({
    id,
    manifestId,
    docxPath,
    pdfPreviewPath,
    checksum,
    pageCount,
    layoutReport: {
      sectionPages: { ...input.layoutReport.sectionPages },
      layoutDiffs: { ...input.layoutReport.layoutDiffs },
      ...(input.layoutReport.fontDependencies !== undefined
        ? { fontDependencies: [...input.layoutReport.fontDependencies] }
        : {})
    },
    createdAt
  });
}

// 17. LayoutIssue
export function createLayoutIssue(input: LayoutIssue): LayoutIssue {
  const id = assertNonEmptyText(input.id, 'layoutIssue.id');
  const buildId = assertNonEmptyText(input.buildId, 'layoutIssue.buildId');
  const sectionId =
    input.sectionId !== null ? assertLogicalSectionIdentity(input.sectionId) : null;
  const blockId =
    input.blockId !== null ? assertNonEmptyText(input.blockId, 'layoutIssue.blockId') : null;
  const detail = assertNonEmptyText(input.detail, 'layoutIssue.detail');

  const [startPage, endPage] = input.pageRange;
  assertPositiveInteger(startPage, 'layoutIssue.pageRange[0]');
  assertPositiveInteger(endPage, 'layoutIssue.pageRange[1]');
  if (endPage < startPage) {
    throw new AppError({
      code: 'DOMAIN_INVARIANT_VIOLATION',
      message: `Khoảng trang của LayoutIssue '${id}' không hợp lệ: trang kết thúc (${endPage}) nhỏ hơn trang bắt đầu (${startPage}).`,
      details: { id, pageRange: input.pageRange },
      recoverable: true
    });
  }

  return deepFreeze({
    id,
    buildId,
    sectionId,
    blockId,
    type: input.type,
    severity: input.severity,
    pageRange: [startPage, endPage] as const,
    detail
  });
}
