import { AppError, type AuditEvent, type LogicalSection, type SourceArtifact, type TemplateArtifact } from '@core/domain';
import type { AuditLogPort } from '@core/ports';
import type { ProjectWorkspaceManager } from '../filesystem';
import type { CompositeAuditLogger } from '../logging';
import type { IpcDispatcher } from './dispatcher';
import {
  ProjectSessionCoordinator,
  type ProjectSessionSnapshot
} from './project-session';
import { DOCFLOW_IPC_CHANNELS, type DocFlowIpcChannel } from './schemas';

export interface SystemPingResponse {
  readonly appName: string;
  readonly locale: 'vi-VN';
  readonly architecture: 'ports-and-adapters-4-layer';
  readonly registeredChannels: number;
  readonly echo?: string;
  readonly serverTimestamp: string;
}

export interface HistoryListResponse {
  readonly items: readonly AuditEvent[];
  readonly nextCursor: string | null;
}

export interface BootstrapIpcHandlersOptions {
  readonly sessionCoordinator?: ProjectSessionCoordinator;
  readonly workspaceManager?: ProjectWorkspaceManager;
  readonly compositeAuditLogger?: CompositeAuditLogger;
}

/**
 * Đăng ký các bộ xử lý khởi tạo mặc định và bộ điều phối phiên dự án thực tế cho danh mục kênh IPC.
 * Các module miền ở các giai đoạn tiếp theo sẽ tiếp tục ghi đè từng nhóm kênh bằng UseCase chuyên sâu từ `core/`.
 */
export function registerBootstrapIpcHandlers(
  dispatcher: IpcDispatcher,
  auditLogger?: AuditLogPort,
  options: BootstrapIpcHandlersOptions = {}
): ProjectSessionCoordinator {
  const sessionCoordinator =
    options.sessionCoordinator ??
    new ProjectSessionCoordinator({
      workspaceManager: options.workspaceManager,
      compositeAuditLogger: options.compositeAuditLogger
    });

  dispatcher.registerHandler<{ echo?: string }, SystemPingResponse>(
    'system.ping',
    (payload, context) => ({
      appName: 'DocFlow Studio',
      locale: 'vi-VN',
      architecture: 'ports-and-adapters-4-layer',
      registeredChannels: dispatcher.getAllowedChannels().length,
      ...(payload.echo !== undefined ? { echo: payload.echo } : {}),
      serverTimestamp: context.timestamp
    })
  );

  dispatcher.registerHandler<
    { projectDir: string; title: string },
    ProjectSessionSnapshot
  >('project.create', async (payload) => sessionCoordinator.createProject(payload));

  dispatcher.registerHandler<{ projectDir: string }, ProjectSessionSnapshot>(
    'project.open',
    async (payload) => sessionCoordinator.openProject(payload)
  );

  dispatcher.registerHandler<{ filePath: string }, TemplateArtifact>(
    'project.importTemplate',
    async (payload) => sessionCoordinator.importTemplate(payload)
  );

  dispatcher.registerHandler<
    { filePath: string; sourceKey?: string; type?: 'EXCEL' | 'DOCX' | 'PDF' | 'CSV' },
    SourceArtifact
  >('project.addSource', async (payload) => sessionCoordinator.addSource(payload));

  dispatcher.registerHandler<{ projectId: string }, readonly LogicalSection[]>(
    'section.list',
    async (payload) => sessionCoordinator.listSections(payload)
  );

  dispatcher.registerHandler<
    { filterKind?: string; limit?: number; cursor?: string },
    HistoryListResponse
  >('history.list', async (payload) => {
    const rawItems = auditLogger ? await auditLogger.listRecent(payload.limit ?? 50) : [];
    const normalizedFilter = payload.filterKind?.trim();
    const filteredItems =
      normalizedFilter && normalizedFilter !== 'ALL'
        ? rawItems.filter(
            (event) =>
              event.channel.startsWith(`${normalizedFilter}.`) ||
              event.channel === normalizedFilter ||
              event.outcome === normalizedFilter
          )
        : rawItems;

    return {
      items: filteredItems,
      nextCursor: null
    };
  });

  const preWiredChannels = new Set<DocFlowIpcChannel>([
    'system.ping',
    'project.create',
    'project.open',
    'project.importTemplate',
    'project.addSource',
    'section.list',
    'history.list'
  ]);

  for (const channel of DOCFLOW_IPC_CHANNELS) {
    if (preWiredChannels.has(channel)) {
      continue;
    }
    dispatcher.registerHandler(channel, () => {
      throw new AppError({
        code: 'INTERNAL_UNEXPECTED_ERROR',
        message: `Chức năng '${channel}' thuộc khung kiến trúc khởi tạo và sẽ được gắn UseCase ở các bước tiếp theo.`,
        details: { channel, stage: 'bootstrap-skeleton' },
        recoverable: true
      });
    });
  }

  return sessionCoordinator;
}
