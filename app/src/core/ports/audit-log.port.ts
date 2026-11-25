import type { AuditEvent } from '../domain';

/**
 * Cổng ghi nhật ký kiểm toán bất biến (`AuditLogPort` — Spec §9.2 & §9.4).
 */
export interface AuditLogPort {
  record(event: AuditEvent): Promise<void> | void;
  listRecent(limit?: number): Promise<readonly AuditEvent[]> | readonly AuditEvent[];
}
