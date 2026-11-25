import type { ActorType, AiRoleName, AuditEvent } from '@core/domain';
import type { AuditLogPort } from '@core/ports';
import type { SqliteDatabaseConnection } from '../sqlite/connection';

/**
 * Bộ ghi nhật ký kiểm toán bất biến trong bộ nhớ (mặc định khi chưa mở project.sqlite).
 */
export class InMemoryAuditLogger implements AuditLogPort {
  private readonly events: AuditEvent[] = [];
  private readonly maxRetainedEvents: number;

  public constructor(maxRetainedEvents = 2000) {
    this.maxRetainedEvents = maxRetainedEvents;
  }

  public record(event: AuditEvent): void {
    const frozenEvent: AuditEvent = Object.freeze({ ...event });
    this.events.push(frozenEvent);
    if (this.events.length > this.maxRetainedEvents) {
      this.events.shift();
    }
  }

  public listRecent(limit = 100): readonly AuditEvent[] {
    if (limit <= 0) {
      return [];
    }
    return this.events.slice(-limit).reverse();
  }

  public size(): number {
    return this.events.length;
  }
}

/**
 * Bộ ghi nhật ký kiểm toán bền vững trên bảng `audit_events` của `project.sqlite` (chỉ thêm mới — append-only).
 */
export class SqliteAuditLogger implements AuditLogPort {
  private readonly connection: SqliteDatabaseConnection;

  public constructor(connection: SqliteDatabaseConnection) {
    this.connection = connection;
  }

  public record(event: AuditEvent): void {
    this.connection.assertWritable('SqliteAuditLogger.record');
    this.connection
      .prepare(
        `INSERT INTO audit_events (
           id, correlation_id, timestamp, channel, actor_type, actor_id,
           ai_role, mutating, outcome, error_code, target_entity_id
         ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .run(
        event.id,
        event.correlationId,
        event.timestamp,
        event.channel,
        event.actorType,
        event.actorId,
        event.aiRole ?? null,
        event.mutating ? 1 : 0,
        event.outcome,
        event.errorCode ?? null,
        event.targetEntityId ?? null
      );
  }

  public listRecent(limit = 100): readonly AuditEvent[] {
    if (limit <= 0) {
      return Object.freeze([]);
    }
    const rows = this.connection
      .prepare(
        `SELECT id, correlation_id, timestamp, channel, actor_type, actor_id,
                ai_role, mutating, outcome, error_code, target_entity_id
         FROM audit_events
         ORDER BY seq DESC
         LIMIT ?`
      )
      .all(limit) as unknown as Array<{
      id: string;
      correlation_id: string;
      timestamp: string;
      channel: string;
      actor_type: ActorType;
      actor_id: string;
      ai_role: AiRoleName | null;
      mutating: number;
      outcome: AuditEvent['outcome'];
      error_code: string | null;
      target_entity_id: string | null;
    }>;

    return Object.freeze(
      rows.map((row) =>
        Object.freeze({
          id: row.id,
          correlationId: row.correlation_id,
          timestamp: row.timestamp,
          channel: row.channel,
          actorType: row.actor_type,
          actorId: row.actor_id,
          ...(row.ai_role !== null ? { aiRole: row.ai_role } : {}),
          mutating: row.mutating === 1,
          outcome: row.outcome,
          ...(row.error_code !== null ? { errorCode: row.error_code } : {}),
          ...(row.target_entity_id !== null ? { targetEntityId: row.target_entity_id } : {})
        })
      )
    );
  }
}

/**
 * Bộ ghi nhật ký kết hợp (ghi đồng thời vào bộ nhớ đệm tiến trình và `project.sqlite` khi dự án đang mở).
 */
export class CompositeAuditLogger implements AuditLogPort {
  private readonly primary: AuditLogPort;
  private attachedProjectLogger: AuditLogPort | null = null;

  public constructor(primary: AuditLogPort = new InMemoryAuditLogger()) {
    this.primary = primary;
  }

  public attachProjectLogger(logger: AuditLogPort | null): void {
    this.attachedProjectLogger = logger;
  }

  public async record(event: AuditEvent): Promise<void> {
    await this.primary.record(event);
    if (this.attachedProjectLogger) {
      await this.attachedProjectLogger.record(event);
    }
  }

  public async listRecent(limit = 100): Promise<readonly AuditEvent[]> {
    if (this.attachedProjectLogger) {
      return this.attachedProjectLogger.listRecent(limit);
    }
    return this.primary.listRecent(limit);
  }
}
