import { randomUUID } from 'node:crypto';
import type { ZodIssue } from 'zod';
import {
  AppError,
  HUMAN_APPROVAL_ONLY_CHANNELS,
  createUserActorContext,
  isAppError,
  type ActorContext,
  type AuditEvent,
  type AuditMetadata,
  type Capability
} from '@core/domain';
import type { AuditLogPort } from '@core/ports';
import { isProtectedImmutableArtifactPath } from '../filesystem';
import { InMemoryAuditLogger } from '../logging';
import { IPC_CHANNEL_SPECS, isAllowedIpcChannel, type DocFlowIpcChannel } from './schemas';
import type {
  IpcChannelHandler,
  IpcChannelSpec,
  IpcDispatchRequest,
  IpcFailure,
  IpcResult,
  IpcSuccess
} from './types';

export interface IpcDispatcherOptions {
  readonly auditLogger?: AuditLogPort;
  readonly now?: () => Date;
  readonly generateId?: () => string;
  readonly customSpecs?: Readonly<Record<string, IpcChannelSpec>>;
}

function formatZodIssues(issues: readonly ZodIssue[]): {
  readonly fieldErrors: Record<string, string[]>;
  readonly issues: readonly { path: string; message: string; code: string }[];
} {
  const fieldErrors: Record<string, string[]> = {};
  const normalizedIssues = issues.map((issue) => {
    const pathKey = issue.path.length > 0 ? issue.path.map(String).join('.') : '_root';
    const existing = fieldErrors[pathKey] ?? [];
    existing.push(issue.message);
    fieldErrors[pathKey] = existing;
    return {
      path: pathKey,
      message: issue.message,
      code: issue.code
    };
  });
  return { fieldErrors, issues: normalizedIssues };
}

function normalizeCorrelationId(raw: string | undefined, generateId: () => string): string {
  if (typeof raw === 'string') {
    const trimmed = raw.trim();
    if (trimmed.length >= 4 && trimmed.length <= 128 && /^[a-zA-Z0-9._:-]+$/.test(trimmed)) {
      return trimmed;
    }
  }
  return `corr-${generateId()}`;
}

function hasAnyRequiredCapability(
  actorCapabilities: readonly Capability[],
  requiredCapabilities: readonly Capability[]
): boolean {
  const actorSet = new Set<Capability>(actorCapabilities);
  return requiredCapabilities.some((cap) => actorSet.has(cap));
}

/**
 * Bộ điều phối IPC trung tâm của DocFlow Studio (Spec §9.4):
 * 1. Kiểm tra kênh thuộc danh sách cho phép (Allowlist) -> `IPC_INVALID_CHANNEL`
 * 2. Kiểm tra phân quyền tác nhân (`Capability Scoping`) và khóa cứng lệnh duyệt/xuất cho người dùng -> `CAPABILITY_DENIED`
 * 3. Kiểm tra lược đồ payload bằng Zod + chống Path Traversal -> `IPC_VALIDATION_FAILED`
 * 4. Bảo vệ đường dẫn bất biến (`Template V0`, `Source Snapshot`) -> `IMMUTABLE_TARGET_PROTECTED`
 * 5. Chuẩn hóa lỗi `AppError` và đính kèm `auditMetadata` + ghi nhật ký `AuditEvent`
 */
export class IpcDispatcher {
  private readonly handlers = new Map<DocFlowIpcChannel, IpcChannelHandler>();
  private readonly specs: Readonly<Record<string, IpcChannelSpec>>;
  private readonly auditLogger: AuditLogPort;
  private readonly now: () => Date;
  private readonly generateId: () => string;

  public constructor(options: IpcDispatcherOptions = {}) {
    this.specs = options.customSpecs ?? IPC_CHANNEL_SPECS;
    this.auditLogger = options.auditLogger ?? new InMemoryAuditLogger();
    this.now = options.now ?? (() => new Date());
    this.generateId = options.generateId ?? (() => randomUUID());
  }

  public registerHandler<TInput = unknown, TOutput = unknown>(
    channel: DocFlowIpcChannel,
    handler: IpcChannelHandler<TInput, TOutput>
  ): void {
    if (!Object.prototype.hasOwnProperty.call(this.specs, channel)) {
      throw new AppError({
        code: 'IPC_INVALID_CHANNEL',
        message: `Không thể đăng ký handler cho kênh ngoài danh sách cho phép: '${channel}'.`,
        details: { channel },
        recoverable: false
      });
    }
    this.handlers.set(channel, handler as IpcChannelHandler);
  }

  public getAllowedChannels(): readonly string[] {
    return Object.keys(this.specs);
  }

  public async dispatch<TOutput = unknown>(
    request: IpcDispatchRequest
  ): Promise<IpcResult<TOutput>> {
    const startedAtMs = this.now().getTime();
    const timestamp = new Date(startedAtMs).toISOString();
    const correlationId = normalizeCorrelationId(request.correlationId, this.generateId);
    const actor: ActorContext = request.actor ?? createUserActorContext();
    const rawChannel = typeof request.channel === 'string' ? request.channel.trim() : '';

    // Chốt chặn 1: Kiểm tra kênh nằm trong Allowlist
    if (!rawChannel || !Object.prototype.hasOwnProperty.call(this.specs, rawChannel)) {
      const error = new AppError({
        code: 'IPC_INVALID_CHANNEL',
        message: `Kênh IPC '${rawChannel || '(trống)'}' không hợp lệ hoặc không nằm trong danh sách cho phép.`,
        details: {
          channel: rawChannel,
          allowedChannelCount: Object.keys(this.specs).length
        },
        recoverable: false
      });
      return this.buildFailureResponse({
        error,
        channel: rawChannel || 'unknown',
        correlationId,
        timestamp,
        startedAtMs,
        actor,
        mutating: false,
        outcome: 'DENIED'
      });
    }

    const spec = this.specs[rawChannel]!;
    const channel = rawChannel as DocFlowIpcChannel;

    // Chốt chặn 2a: Khóa cứng các lệnh phê duyệt & xuất DOCX chỉ dành cho con người (USER)
    const isHumanOnlyChannel =
      spec.humanOnly === true ||
      (HUMAN_APPROVAL_ONLY_CHANNELS as readonly string[]).includes(channel);

    if (isHumanOnlyChannel && actor.actorType !== 'USER') {
      const error = new AppError({
        code: 'CAPABILITY_DENIED',
        message: `Tác nhân AI không được phép gọi lệnh '${channel}'. Thao tác phê duyệt và xuất DOCX bắt buộc do con người thực hiện.`,
        details: {
          channel,
          actorType: actor.actorType,
          actorId: actor.actorId,
          aiRole: actor.aiRole ?? null,
          reason: 'HUMAN_APPROVAL_ONLY'
        },
        recoverable: false
      });
      return this.buildFailureResponse({
        error,
        channel,
        correlationId,
        timestamp,
        startedAtMs,
        actor,
        mutating: spec.mutating,
        outcome: 'DENIED'
      });
    }

    // Chốt chặn 2b: Kiểm tra quyền tối thiểu (Capability Scoping)
    if (!hasAnyRequiredCapability(actor.capabilities, spec.requiredCapabilities)) {
      const error = new AppError({
        code: 'CAPABILITY_DENIED',
        message: `Tác nhân '${actor.actorId}' không đủ quyền thực thi kênh '${channel}'.`,
        details: {
          channel,
          actorType: actor.actorType,
          aiRole: actor.aiRole ?? null,
          actorCapabilities: [...actor.capabilities],
          requiredCapabilities: [...spec.requiredCapabilities]
        },
        recoverable: false
      });
      return this.buildFailureResponse({
        error,
        channel,
        correlationId,
        timestamp,
        startedAtMs,
        actor,
        mutating: spec.mutating,
        outcome: 'DENIED'
      });
    }

    // Chốt chặn 3: Kiểm tra lược đồ đầu vào bằng Zod
    const validation = spec.inputSchema.safeParse(request.payload ?? {});
    if (!validation.success) {
      const formatted = formatZodIssues(validation.error.issues);
      const firstIssueMessage =
        formatted.issues[0]?.message ?? 'Dữ liệu đầu vào không khớp lược đồ quy định.';
      const error = new AppError({
        code: 'IPC_VALIDATION_FAILED',
        message: `Dữ liệu gửi tới kênh '${channel}' không hợp lệ: ${firstIssueMessage}`,
        details: {
          channel,
          fieldErrors: formatted.fieldErrors,
          issues: formatted.issues
        },
        recoverable: true
      });
      return this.buildFailureResponse({
        error,
        channel,
        correlationId,
        timestamp,
        startedAtMs,
        actor,
        mutating: spec.mutating,
        outcome: 'VALIDATION_ERROR'
      });
    }

    // Chốt chặn 4: Chặn xuất DOCX đè lên tài sản bất biến (Template V0 / Source Snapshot)
    if (channel === 'build.exportDocx') {
      const exportPayload = validation.data as { destinationPath: string };
      if (isProtectedImmutableArtifactPath(exportPayload.destinationPath)) {
        const error = new AppError({
          code: 'IMMUTABLE_TARGET_PROTECTED',
          message:
            'Không được phép xuất tài liệu DOCX ghi đè lên tệp mẫu gốc (Template V0) hoặc kho dữ liệu nguồn (Source Snapshot).',
          details: {
            channel,
            destinationPath: exportPayload.destinationPath
          },
          recoverable: true
        });
        return this.buildFailureResponse({
          error,
          channel,
          correlationId,
          timestamp,
          startedAtMs,
          actor,
          mutating: true,
          outcome: 'DENIED'
        });
      }
    }

    // Chốt chặn 5: Thực thi handler đã đăng ký & xác thực đầu ra (nếu có)
    const handler = this.handlers.get(channel);
    if (!handler || !isAllowedIpcChannel(channel)) {
      const error = new AppError({
        code: 'INTERNAL_UNEXPECTED_ERROR',
        message: `Kênh '${channel}' đã khai báo nhưng chưa được gắn bộ xử lý trong tiến trình chính.`,
        details: { channel },
        recoverable: false
      });
      return this.buildFailureResponse({
        error,
        channel,
        correlationId,
        timestamp,
        startedAtMs,
        actor,
        mutating: spec.mutating,
        outcome: 'HANDLER_ERROR'
      });
    }

    try {
      const rawResult = await handler(validation.data, {
        correlationId,
        timestamp,
        channel,
        actor
      });

      const verifiedResult = spec.outputSchema ? spec.outputSchema.parse(rawResult) : rawResult;
      const auditEventId = await this.recordAuditEvent({
        correlationId,
        timestamp,
        channel,
        actor,
        mutating: spec.mutating,
        outcome: 'ALLOWED'
      });

      const durationMs = Math.max(0, this.now().getTime() - startedAtMs);
      const auditMetadata: AuditMetadata = {
        correlationId,
        channel,
        timestamp,
        actorType: actor.actorType,
        actorId: actor.actorId,
        ...(actor.aiRole ? { aiRole: actor.aiRole } : {}),
        mutating: spec.mutating,
        auditEventId,
        durationMs
      };

      const response: IpcSuccess<TOutput> = {
        ok: true,
        data: verifiedResult as TOutput,
        meta: {
          correlationId,
          timestamp,
          channel,
          auditEventId
        },
        auditMetadata
      };
      return response;
    } catch (err) {
      const normalizedError = isAppError(err)
        ? err
        : new AppError({
            code: 'INTERNAL_UNEXPECTED_ERROR',
            message: 'Đã xảy ra lỗi nội bộ không mong đợi khi thực thi yêu cầu IPC.',
            details: {
              channel,
              reason: err instanceof Error ? err.message : 'Unknown error'
            },
            recoverable: false,
            cause: err
          });

      return this.buildFailureResponse({
        error: normalizedError,
        channel,
        correlationId,
        timestamp,
        startedAtMs,
        actor,
        mutating: spec.mutating,
        outcome: 'HANDLER_ERROR'
      });
    }
  }

  private async buildFailureResponse(params: {
    readonly error: AppError;
    readonly channel: string;
    readonly correlationId: string;
    readonly timestamp: string;
    readonly startedAtMs: number;
    readonly actor: ActorContext;
    readonly mutating: boolean;
    readonly outcome: AuditEvent['outcome'];
  }): Promise<IpcFailure> {
    const auditEventId = await this.recordAuditEvent({
      correlationId: params.correlationId,
      timestamp: params.timestamp,
      channel: params.channel,
      actor: params.actor,
      mutating: params.mutating,
      outcome: params.outcome,
      errorCode: params.error.code
    });

    const durationMs = Math.max(0, this.now().getTime() - params.startedAtMs);
    const auditMetadata: AuditMetadata = {
      correlationId: params.correlationId,
      channel: params.channel,
      timestamp: params.timestamp,
      actorType: params.actor.actorType,
      actorId: params.actor.actorId,
      ...(params.actor.aiRole ? { aiRole: params.actor.aiRole } : {}),
      mutating: params.mutating,
      auditEventId,
      durationMs
    };

    return {
      ok: false,
      error: params.error.toJSON(),
      meta: {
        correlationId: params.correlationId,
        timestamp: params.timestamp,
        channel: params.channel,
        auditEventId
      },
      auditMetadata
    };
  }

  private async recordAuditEvent(params: {
    readonly correlationId: string;
    readonly timestamp: string;
    readonly channel: string;
    readonly actor: ActorContext;
    readonly mutating: boolean;
    readonly outcome: AuditEvent['outcome'];
    readonly errorCode?: string;
  }): Promise<string> {
    const auditEventId = `aud-${this.generateId()}`;
    const event: AuditEvent = {
      id: auditEventId,
      correlationId: params.correlationId,
      timestamp: params.timestamp,
      channel: params.channel,
      actorType: params.actor.actorType,
      actorId: params.actor.actorId,
      ...(params.actor.aiRole ? { aiRole: params.actor.aiRole } : {}),
      mutating: params.mutating,
      outcome: params.outcome,
      ...(params.errorCode ? { errorCode: params.errorCode } : {})
    };
    await this.auditLogger.record(event);
    return auditEventId;
  }
}
