import { AppError } from './errors';

/**
 * Mô hình phân quyền tối thiểu (Capability Scoping) theo DOCFLOW_STUDIO_SPEC.md §9.4 & §10.
 */

export const DOCFLOW_CAPABILITIES = [
  'ui:user',
  'agent:read',
  'agent:orchestrator',
  'agent:doc-analyst',
  'agent:source-analyst',
  'agent:rule-planner',
  'agent:section-writer',
  'agent:reviewer'
] as const;

export type Capability = (typeof DOCFLOW_CAPABILITIES)[number];

export type ActorType = 'USER' | 'AI_AGENT';

export const AI_ROLE_NAMES = [
  'main-orchestrator',
  'document-analyst',
  'source-analyst',
  'rule-planner',
  'section-writer',
  'reviewer'
] as const;

export type AiRoleName = (typeof AI_ROLE_NAMES)[number];

export interface ActorContext {
  readonly actorType: ActorType;
  readonly actorId: string;
  readonly aiRole?: AiRoleName;
  readonly capabilities: readonly Capability[];
}

/**
 * Ma trận quyền tối thiểu cho 6 vai trò AI (cấm mọi quyền phê duyệt và xuất DOCX).
 */
export const AI_ROLE_DEFAULT_CAPABILITIES: Readonly<Record<AiRoleName, readonly Capability[]>> =
  Object.freeze({
    'main-orchestrator': Object.freeze(['agent:read', 'agent:orchestrator'] as const),
    'document-analyst': Object.freeze(['agent:read', 'agent:doc-analyst'] as const),
    'source-analyst': Object.freeze(['agent:read', 'agent:source-analyst'] as const),
    'rule-planner': Object.freeze(['agent:read', 'agent:rule-planner'] as const),
    'section-writer': Object.freeze(['agent:read', 'agent:section-writer'] as const),
    reviewer: Object.freeze(['agent:read', 'agent:reviewer'] as const)
  });

/**
 * Danh sách trắng công cụ MCP nội bộ tối thiểu được phép gọi cho từng vai trò AI (theo tài liệu 10 §6.3).
 * Tuyệt đối không chứa bất kỳ công cụ ghi file trực tiếp, phê duyệt hay xuất DOCX nào.
 */
export const AI_ROLE_ALLOWED_MCP_TOOLS: Readonly<Record<AiRoleName, readonly string[]>> =
  Object.freeze({
    'main-orchestrator': Object.freeze([
      'get_dependency_and_run_evidence',
      'get_diff_and_layout_report'
    ]),
    'document-analyst': Object.freeze(['get_parsed_document_tree']),
    'source-analyst': Object.freeze(['inspect_source_schema', 'query_source_rows_preview']),
    'rule-planner': Object.freeze([
      'inspect_source_schema',
      'query_source_rows_preview',
      'propose_rule_draft',
      'run_rule_sandbox_test'
    ]),
    'section-writer': Object.freeze([
      'get_parsed_document_tree',
      'get_dependency_and_run_evidence',
      'propose_section_patch'
    ]),
    reviewer: Object.freeze([
      'get_parsed_document_tree',
      'inspect_source_schema',
      'get_dependency_and_run_evidence',
      'get_diff_and_layout_report',
      'run_rule_sandbox_test'
    ])
  });

/**
 * Các kênh chỉ con người (`USER` với `ui:user`) mới được phép thực thi.
 * Bất kỳ tác nhân `AI_AGENT` nào gọi các kênh này đều bị từ chối cứng (`CAPABILITY_DENIED`).
 */
export const HUMAN_APPROVAL_ONLY_CHANNELS = [
  'section.approveRevision',
  'build.approve',
  'build.exportDocx'
] as const;

export function createUserActorContext(actorId = 'local-desktop-user'): ActorContext {
  return Object.freeze({
    actorType: 'USER',
    actorId,
    capabilities: Object.freeze(['ui:user'] as const)
  });
}

export function createAiActorContext(role: AiRoleName, sessionId: string): ActorContext {
  return Object.freeze({
    actorType: 'AI_AGENT',
    actorId: `ai:${role}:${sessionId}`,
    aiRole: role,
    capabilities: AI_ROLE_DEFAULT_CAPABILITIES[role]
  });
}

/**
 * Xác minh tác nhân thực hiện bước phê duyệt hoặc xuất tài liệu bắt buộc phải là con người (`USER`).
 */
export function assertHumanApprovalActor(
  actor: ActorContext | undefined,
  actionLabelVi: string
): ActorContext {
  if (!actor || actor.actorType !== 'USER' || !actor.capabilities.includes('ui:user')) {
    throw new AppError({
      code: 'CAPABILITY_DENIED',
      message: `Thao tác '${actionLabelVi}' bắt buộc do người dùng phê duyệt trực tiếp; cấm mọi AI Agent tự động thực hiện.`,
      details: {
        reason: 'HUMAN_APPROVAL_ONLY',
        action: actionLabelVi,
        actorType: actor?.actorType ?? 'UNKNOWN',
        actorId: actor?.actorId ?? null,
        aiRole: actor?.aiRole ?? null
      },
      recoverable: false
    });
  }
  if (actor.actorId.trim().toLowerCase().startsWith('ai:')) {
    throw new AppError({
      code: 'CAPABILITY_DENIED',
      message: `Định danh tác nhân '${actor.actorId}' mang tiền tố AI không được phép thực hiện '${actionLabelVi}'.`,
      details: {
        reason: 'AI_ACTOR_ID_FORBIDDEN',
        actorId: actor.actorId
      },
      recoverable: false
    });
  }
  return actor;
}

/**
 * Kiểm tra danh sách MCP tools yêu cầu cấp cho phiên gọi AI không vượt quá phạm vi vai trò (§10).
 */
export function assertAiRoleToolAllowlist(
  role: AiRoleName,
  requestedMcpTools: readonly string[]
): void {
  const allowedSet = new Set(AI_ROLE_ALLOWED_MCP_TOOLS[role]);
  const unauthorized = requestedMcpTools.filter((tool) => !allowedSet.has(tool));
  if (unauthorized.length > 0) {
    throw new AppError({
      code: 'CAPABILITY_DENIED',
      message: `Vai trò AI '${role}' yêu cầu công cụ vượt quá phạm vi phân quyền cho phép: ${unauthorized.join(', ')}.`,
      details: {
        role,
        unauthorizedTools: unauthorized,
        allowedTools: AI_ROLE_ALLOWED_MCP_TOOLS[role]
      },
      recoverable: false
    });
  }
}
