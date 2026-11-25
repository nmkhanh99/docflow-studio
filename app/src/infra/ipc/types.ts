import type { z } from 'zod';
import type {
  ActorContext,
  AuditMetadata,
  Capability,
  SerializedAppError
} from '@core/domain';
import type { DocFlowIpcChannel } from './schemas';

export const DOCFLOW_IPC_INVOKE_CHANNEL = 'docflow:ipc:invoke' as const;

export interface IpcResponseMeta {
  readonly correlationId: string;
  readonly timestamp: string;
  readonly channel: string;
  readonly auditEventId?: string;
}

export interface IpcSuccess<T> {
  readonly ok: true;
  readonly data: T;
  readonly meta: IpcResponseMeta;
  readonly auditMetadata: AuditMetadata;
}

export interface IpcFailure {
  readonly ok: false;
  readonly error: SerializedAppError;
  readonly meta: IpcResponseMeta;
  readonly auditMetadata: AuditMetadata;
}

export type IpcResult<T = unknown> = IpcSuccess<T> | IpcFailure;

export interface IpcDispatchRequest {
  readonly channel: string;
  readonly payload?: unknown;
  readonly actor?: ActorContext;
  readonly correlationId?: string;
}

export interface IpcHandlerContext {
  readonly correlationId: string;
  readonly timestamp: string;
  readonly channel: DocFlowIpcChannel;
  readonly actor: ActorContext;
}

export type IpcChannelHandler<TInput = unknown, TOutput = unknown> = (
  payload: TInput,
  context: IpcHandlerContext
) => Promise<TOutput> | TOutput;

export interface IpcChannelSpec<TInput = unknown, TOutput = unknown> {
  readonly channel: DocFlowIpcChannel;
  readonly descriptionVi: string;
  readonly requiredCapabilities: readonly Capability[];
  readonly humanOnly?: boolean;
  readonly mutating: boolean;
  readonly inputSchema: z.ZodType<TInput>;
  readonly outputSchema?: z.ZodType<TOutput>;
}
