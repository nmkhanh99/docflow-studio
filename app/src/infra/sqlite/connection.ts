import { AsyncLocalStorage } from 'node:async_hooks';
import { mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { DatabaseSync, type StatementSync } from 'node:sqlite';
import { AppError, isAppError } from '@core/domain';

export interface SqliteConnectionConfig {
  readonly dbFilePath: string;
  readonly readonly?: boolean;
  readonly busyTimeoutMs?: number;
}

interface AsyncTransactionState {
  readonly depth: number;
}

/**
 * Quản lý kết nối cục bộ tới `project.sqlite` (dựa trên `node:sqlite` tích hợp sẵn):
 * - Cưỡng chế `foreign_keys = ON` trên mọi kết nối.
 * - Khóa cứng `readOnly` + `PRAGMA query_only = ON` cho các kênh truy vấn chỉ đọc (vd: MCP server chỉ đọc).
 * - Hỗ trợ giao dịch nguyên tử đồng bộ và bất đồng bộ (`BEGIN IMMEDIATE` + `SAVEPOINT` lồng nhau),
 *   tự động `ROLLBACK` toàn bộ khi phát sinh lỗi giữa chừng.
 */
export class SqliteDatabaseConnection {
  public readonly dbFilePath: string;
  public readonly isReadOnly: boolean;
  private readonly db: DatabaseSync;
  private syncTxDepth = 0;
  private savepointSeq = 0;
  private readonly asyncTxStorage = new AsyncLocalStorage<AsyncTransactionState>();
  private topLevelAsyncMutex: Promise<void> = Promise.resolve();

  public constructor(config: SqliteConnectionConfig) {
    const trimmedPath = config.dbFilePath.trim();
    if (!trimmedPath) {
      throw new AppError({
        code: 'DOMAIN_INVARIANT_VIOLATION',
        message: 'Đường dẫn tệp cơ sở dữ liệu SQLite (dbFilePath) không được để trống.',
        recoverable: false
      });
    }

    const isMemory = trimmedPath === ':memory:';
    this.dbFilePath = isMemory ? ':memory:' : resolve(trimmedPath);
    this.isReadOnly = Boolean(config.readonly);

    if (!isMemory && !this.isReadOnly) {
      mkdirSync(dirname(this.dbFilePath), { recursive: true });
    }

    this.db = new DatabaseSync(this.dbFilePath, {
      readOnly: this.isReadOnly,
      enableForeignKeyConstraints: true,
      timeout: config.busyTimeoutMs ?? 5000,
      allowExtension: false
    });

    this.db.exec('PRAGMA foreign_keys = ON;');
    if (this.isReadOnly) {
      this.db.exec('PRAGMA query_only = ON;');
    } else if (!isMemory) {
      this.db.exec('PRAGMA journal_mode = WAL;');
      this.db.exec('PRAGMA synchronous = NORMAL;');
    }
  }

  public get isOpen(): boolean {
    return this.db.isOpen;
  }

  public get rawDb(): DatabaseSync {
    this.assertOpen();
    return this.db;
  }

  public exec(sql: string): void {
    this.assertOpen();
    this.db.exec(sql);
  }

  public prepare(sql: string): StatementSync {
    this.assertOpen();
    return this.db.prepare(sql);
  }

  public assertWritable(operationLabel = 'SQLite write'): void {
    this.assertOpen();
    if (this.isReadOnly) {
      throw new AppError({
        code: 'CAPABILITY_DENIED',
        message: `Kết nối SQLite đang mở ở chế độ chỉ đọc (read-only); từ chối thực hiện '${operationLabel}'.`,
        details: { dbFilePath: this.dbFilePath, operationLabel },
        recoverable: false
      });
    }
  }

  /**
   * Thực thi giao dịch nguyên tử đồng bộ (phù hợp cho schema migrations và batch SQL).
   */
  public runInTransactionSync<T>(work: () => T): T {
    this.assertWritable('runInTransactionSync');

    const asyncCtx = this.asyncTxStorage.getStore();
    const effectiveDepth = this.syncTxDepth + (asyncCtx?.depth ?? 0);

    if (effectiveDepth === 0) {
      this.db.exec('BEGIN IMMEDIATE;');
      this.syncTxDepth += 1;
      try {
        const result = work();
        this.db.exec('COMMIT;');
        return result;
      } catch (err) {
        if (this.db.isOpen && this.db.isTransaction) {
          try {
            this.db.exec('ROLLBACK;');
          } catch {
            // Bỏ qua lỗi phụ khi rollback
          }
        }
        throw this.normalizeError(err);
      } finally {
        this.syncTxDepth -= 1;
      }
    }

    const spName = `sp_sync_${++this.savepointSeq}`;
    this.db.exec(`SAVEPOINT ${spName};`);
    this.syncTxDepth += 1;
    try {
      const result = work();
      this.db.exec(`RELEASE SAVEPOINT ${spName};`);
      return result;
    } catch (err) {
      if (this.db.isOpen) {
        try {
          this.db.exec(`ROLLBACK TO SAVEPOINT ${spName};`);
          this.db.exec(`RELEASE SAVEPOINT ${spName};`);
        } catch {
          // Bỏ qua lỗi phụ khi rollback savepoint
        }
      }
      throw this.normalizeError(err);
    } finally {
      this.syncTxDepth -= 1;
    }
  }

  /**
   * Thực thi giao dịch nguyên tử bất đồng bộ (`ProjectRepositoryPort.runInTransaction`).
   * Tuần tự hóa các giao dịch mức gốc trên cùng kết nối và hỗ trợ giao dịch lồng nhau qua `SAVEPOINT`.
   */
  public async runInTransaction<T>(work: () => Promise<T>): Promise<T> {
    this.assertWritable('runInTransaction');

    const currentCtx = this.asyncTxStorage.getStore();
    if (currentCtx && currentCtx.depth > 0) {
      const spName = `sp_async_${++this.savepointSeq}`;
      this.db.exec(`SAVEPOINT ${spName};`);
      try {
        const result = await this.asyncTxStorage.run(
          { depth: currentCtx.depth + 1 },
          work
        );
        this.db.exec(`RELEASE SAVEPOINT ${spName};`);
        return result;
      } catch (err) {
        if (this.db.isOpen) {
          try {
            this.db.exec(`ROLLBACK TO SAVEPOINT ${spName};`);
            this.db.exec(`RELEASE SAVEPOINT ${spName};`);
          } catch {
            // Bỏ qua lỗi phụ khi rollback savepoint
          }
        }
        throw this.normalizeError(err);
      }
    }

    let releaseMutex!: () => void;
    const previousMutex = this.topLevelAsyncMutex;
    this.topLevelAsyncMutex = new Promise<void>((resolveMutex) => {
      releaseMutex = resolveMutex;
    });

    await previousMutex;
    this.assertOpen();
    this.db.exec('BEGIN IMMEDIATE;');
    try {
      const result = await this.asyncTxStorage.run({ depth: 1 }, work);
      this.db.exec('COMMIT;');
      return result;
    } catch (err) {
      if (this.db.isOpen && this.db.isTransaction) {
        try {
          this.db.exec('ROLLBACK;');
        } catch {
          // Bỏ qua lỗi phụ khi rollback
        }
      }
      throw this.normalizeError(err);
    } finally {
      releaseMutex();
    }
  }

  public close(): void {
    if (this.db.isOpen) {
      this.db.close();
    }
  }

  private assertOpen(): void {
    if (!this.db.isOpen) {
      throw new AppError({
        code: 'INTERNAL_UNEXPECTED_ERROR',
        message: `Kết nối cơ sở dữ liệu SQLite tại '${this.dbFilePath}' đã đóng.`,
        details: { dbFilePath: this.dbFilePath },
        recoverable: false
      });
    }
  }

  private normalizeError(err: unknown): unknown {
    if (isAppError(err)) {
      return err;
    }
    const message = err instanceof Error ? err.message : String(err);
    if (message.includes('IMMUTABLE_TEMPLATE_V0_PROTECTED')) {
      return new AppError({
        code: 'IMMUTABLE_TARGET_PROTECTED',
        message: 'Không được phép ghi đè mã băm/đường dẫn hoặc xóa bản ghi Template V0 bất biến trong SQLite.',
        details: { dbFilePath: this.dbFilePath, sqliteError: message },
        recoverable: false,
        cause: err
      });
    }
    if (message.includes('AUDIT_EVENTS_APPEND_ONLY')) {
      return new AppError({
        code: 'IMMUTABLE_TARGET_PROTECTED',
        message: 'Nhật ký kiểm toán (audit_events) là bất biến (append-only); cấm sửa hoặc xóa lịch sử.',
        details: { dbFilePath: this.dbFilePath, sqliteError: message },
        recoverable: false,
        cause: err
      });
    }
    return err;
  }
}
