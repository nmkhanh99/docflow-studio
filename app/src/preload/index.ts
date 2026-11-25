import { contextBridge, ipcRenderer } from 'electron';
import type { LogicalSection, SourceArtifact, TemplateArtifact } from '@core/domain';
import { DOCFLOW_IPC_INVOKE_CHANNEL } from '@infra/ipc/types';
import type {
  AuditHistoryListDto,
  DocFlowPreloadApi,
  PreloadIpcResult,
  ProjectSessionDto,
  SystemPingDto
} from './api-types';

function invokeChannel<TOutput = unknown>(
  channel: string,
  payload?: unknown,
  correlationId?: string
): Promise<PreloadIpcResult<TOutput>> {
  return ipcRenderer.invoke(DOCFLOW_IPC_INVOKE_CHANNEL, {
    channel,
    payload,
    correlationId
  }) as Promise<PreloadIpcResult<TOutput>>;
}

const rawDocFlowApi: DocFlowPreloadApi = {
  invoke: invokeChannel,
  system: {
    ping: (echo?: string) =>
      invokeChannel<SystemPingDto>('system.ping', echo !== undefined ? { echo } : {})
  },
  project: {
    create: (payload) => invokeChannel<ProjectSessionDto>('project.create', payload),
    open: (payload) => invokeChannel<ProjectSessionDto>('project.open', payload),
    importTemplate: (payload) => invokeChannel<TemplateArtifact>('project.importTemplate', payload),
    addSource: (payload) => invokeChannel<SourceArtifact>('project.addSource', payload)
  },
  section: {
    list: (payload) => invokeChannel<readonly LogicalSection[]>('section.list', payload),
    get: (payload) => invokeChannel('section.get', payload),
    resolveAnchor: (payload) => invokeChannel('section.resolveAnchor', payload),
    updateBoundaries: (payload) => invokeChannel('section.updateBoundaries', payload),
    saveRevision: (payload) => invokeChannel('section.saveRevision', payload),
    approveRevision: (payload) => invokeChannel('section.approveRevision', payload)
  },
  change: {
    create: (payload) => invokeChannel('change.create', payload)
  },
  rule: {
    proposeFromInstruction: (payload) => invokeChannel('rule.proposeFromInstruction', payload),
    validate: (payload) => invokeChannel('rule.validate', payload),
    saveVersion: (payload) => invokeChannel('rule.saveVersion', payload),
    test: (payload) => invokeChannel('rule.test', payload)
  },
  dependency: {
    analyze: (payload) => invokeChannel('dependency.analyze', payload)
  },
  run: {
    plan: (payload) => invokeChannel('run.plan', payload),
    execute: (payload) => invokeChannel('run.execute', payload),
    cancel: (payload) => invokeChannel('run.cancel', payload),
    getEvidence: (payload) => invokeChannel('run.getEvidence', payload)
  },
  build: {
    validate: (payload) => invokeChannel('build.validate', payload),
    renderPreview: (payload) => invokeChannel('build.renderPreview', payload),
    inspectLayout: (payload) => invokeChannel('build.inspectLayout', payload),
    approve: (payload) => invokeChannel('build.approve', payload),
    exportDocx: (payload) => invokeChannel('build.exportDocx', payload)
  },
  history: {
    list: (payload) => invokeChannel<AuditHistoryListDto>('history.list', payload ?? {}),
    openSnapshot: (payload) => invokeChannel('history.openSnapshot', payload),
    branchFromSnapshot: (payload) => invokeChannel('history.branchFromSnapshot', payload)
  }
};

export const docflowPreloadApi: DocFlowPreloadApi = Object.freeze({
  invoke: rawDocFlowApi.invoke,
  system: Object.freeze(rawDocFlowApi.system),
  project: Object.freeze(rawDocFlowApi.project),
  section: Object.freeze(rawDocFlowApi.section),
  change: Object.freeze(rawDocFlowApi.change),
  rule: Object.freeze(rawDocFlowApi.rule),
  dependency: Object.freeze(rawDocFlowApi.dependency),
  run: Object.freeze(rawDocFlowApi.run),
  build: Object.freeze(rawDocFlowApi.build),
  history: Object.freeze(rawDocFlowApi.history)
});

if (process.contextIsolated) {
  contextBridge.exposeInMainWorld('docflowApi', docflowPreloadApi);
}
