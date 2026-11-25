import type {
  AuditEvent,
  AuditMetadata,
  BuildManifest,
  ChangeRequest,
  DependencyEdge,
  LogicalSection,
  Project,
  SavedRule,
  SectionRevision,
  SerializedAppError,
  SourceArtifact,
  TemplateArtifact
} from '@core/domain';

export interface PreloadResponseMeta {
  readonly correlationId: string;
  readonly timestamp: string;
  readonly channel: string;
  readonly auditEventId?: string;
}

export type PreloadIpcResult<T = unknown> =
  | {
      readonly ok: true;
      readonly data: T;
      readonly meta: PreloadResponseMeta;
      readonly auditMetadata: AuditMetadata;
    }
  | {
      readonly ok: false;
      readonly error: SerializedAppError;
      readonly meta: PreloadResponseMeta;
      readonly auditMetadata: AuditMetadata;
    };

export interface SystemPingDto {
  readonly appName: string;
  readonly locale: 'vi-VN';
  readonly architecture: 'ports-and-adapters-4-layer';
  readonly registeredChannels: number;
  readonly echo?: string;
  readonly serverTimestamp: string;
}

/**
 * Bản chụp trạng thái thực tế của dự án đang mở từ `project.sqlite` và hệ thống tệp cục bộ.
 */
export interface ProjectSessionDto {
  readonly project: Project;
  readonly projectDir: string;
  readonly dbFilePath: string;
  readonly manifestPath: string;
  readonly template: TemplateArtifact | null;
  readonly sources: readonly SourceArtifact[];
  readonly sections: readonly LogicalSection[];
  readonly changeRequests: readonly ChangeRequest[];
  readonly rules: readonly SavedRule[];
  readonly dependencyEdges: readonly DependencyEdge[];
  readonly revisions: readonly SectionRevision[];
  readonly builds: readonly BuildManifest[];
}

export interface AuditHistoryListDto {
  readonly items: readonly AuditEvent[];
  readonly nextCursor: string | null;
}

/**
 * Hợp đồng API tối thiểu phơi bày qua `contextBridge` (`window.docflowApi`).
 * Tuyệt đối không phơi bày đối tượng `ipcRenderer` thô cho Renderer Process.
 */
export interface DocFlowPreloadApi {
  invoke<TOutput = unknown>(
    channel: string,
    payload?: unknown,
    correlationId?: string
  ): Promise<PreloadIpcResult<TOutput>>;
  system: {
    ping(echo?: string): Promise<PreloadIpcResult<SystemPingDto>>;
  };
  project: {
    create(payload: {
      projectDir: string;
      title: string;
    }): Promise<PreloadIpcResult<ProjectSessionDto>>;
    open(payload: { projectDir: string }): Promise<PreloadIpcResult<ProjectSessionDto>>;
    importTemplate(payload: { filePath: string }): Promise<PreloadIpcResult<TemplateArtifact>>;
    addSource(payload: {
      filePath: string;
      sourceKey?: string;
      type?: 'EXCEL' | 'DOCX' | 'PDF' | 'CSV';
    }): Promise<PreloadIpcResult<SourceArtifact>>;
  };
  section: {
    list(payload: { projectId: string }): Promise<PreloadIpcResult<readonly LogicalSection[]>>;
    get(payload: { sectionId: string; includeBlocks?: boolean }): Promise<PreloadIpcResult>;
    resolveAnchor(payload: { sectionId?: string; blockId?: string }): Promise<PreloadIpcResult>;
    updateBoundaries(payload: {
      sectionId: string;
      startAnchor: string;
      endAnchor: string;
      title?: string;
    }): Promise<PreloadIpcResult>;
    saveRevision(payload: {
      sectionId: string;
      patchSet: readonly Record<string, unknown>[];
      sourceRunId?: string;
    }): Promise<PreloadIpcResult>;
    approveRevision(payload: {
      revisionId?: string;
      approveAllPending?: boolean;
    }): Promise<PreloadIpcResult>;
  };
  change: {
    create(payload: {
      sectionId: string;
      instruction: string;
      scope: 'SINGLE_SECTION' | 'DOWNSTREAM';
      changeKind: 'DIRECT_VALUE' | 'TEXT_EDIT' | 'RULE_UPDATE' | 'STRUCTURE_EDIT';
    }): Promise<PreloadIpcResult>;
  };
  rule: {
    proposeFromInstruction(payload: {
      sectionId: string;
      instruction: string;
      sourceHints?: readonly string[];
    }): Promise<PreloadIpcResult>;
    validate(payload: { ruleDraft: Record<string, unknown> }): Promise<PreloadIpcResult>;
    saveVersion(payload: {
      ruleId: string;
      validatedRule: Record<string, unknown>;
      persistenceKind: 'REUSABLE_RULE' | 'ONE_OFF_CHANGE';
    }): Promise<PreloadIpcResult>;
    test(payload: {
      ruleId: string;
      version?: number;
      testCases?: readonly Record<string, unknown>[];
    }): Promise<PreloadIpcResult>;
  };
  dependency: {
    analyze(payload: { changedNodes: readonly string[] }): Promise<PreloadIpcResult>;
  };
  run: {
    plan(payload: {
      mode: 'SELECTED' | 'AFFECTED' | 'FULL';
      sectionId?: string;
    }): Promise<PreloadIpcResult>;
    execute(payload: { planId: string }): Promise<PreloadIpcResult>;
    cancel(payload: { runId: string }): Promise<PreloadIpcResult>;
    getEvidence(payload: { runId: string; stepId?: string }): Promise<PreloadIpcResult>;
  };
  build: {
    validate(payload: { manifestDraft: Record<string, unknown> }): Promise<PreloadIpcResult>;
    renderPreview(payload: {
      manifestId: string;
      layoutPolicy?: Record<string, unknown>;
    }): Promise<PreloadIpcResult>;
    inspectLayout(payload: { buildId: string }): Promise<PreloadIpcResult>;
    approve(payload: { buildId: string; overrideReason?: string }): Promise<PreloadIpcResult>;
    exportDocx(payload: { buildId: string; destinationPath: string }): Promise<PreloadIpcResult>;
  };
  history: {
    list(payload?: {
      filterKind?: string;
      limit?: number;
      cursor?: string;
    }): Promise<PreloadIpcResult<AuditHistoryListDto>>;
    openSnapshot(payload: { buildId: string }): Promise<PreloadIpcResult>;
    branchFromSnapshot(payload: {
      buildId: string;
      newBranchTitle: string;
    }): Promise<PreloadIpcResult>;
  };
}
