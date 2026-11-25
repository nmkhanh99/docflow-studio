import type { IpcMainInvokeEvent } from 'electron';
import { describe, expect, it } from 'vitest';
import { InMemoryAuditLogger } from '@infra/logging';
import {
  DOCFLOW_IPC_INVOKE_CHANNEL,
  IpcDispatcher,
  registerBootstrapIpcHandlers,
  type IpcResult,
  type SystemPingResponse
} from '@infra/ipc';
import { registerElectronIpcBridge } from '../../src/main/ipc-bridge';

describe('Tích hợp cầu nối Electron Main IPC Bridge <-> IpcDispatcher', () => {
  it('định tuyến lệnh từ Renderer qua DOCFLOW_IPC_INVOKE_CHANNEL và chống giả mạo ActorContext', async () => {
    const handlers = new Map<
      string,
      (event: IpcMainInvokeEvent, rawRequest: unknown) => Promise<IpcResult>
    >();

    const fakeIpcMain = {
      removeHandler: (channel: string) => {
        handlers.delete(channel);
      },
      handle: (
        channel: string,
        listener: (event: IpcMainInvokeEvent, rawRequest: unknown) => Promise<IpcResult>
      ) => {
        handlers.set(channel, listener);
      }
    };

    const auditLogger = new InMemoryAuditLogger();
    const dispatcher = new IpcDispatcher({ auditLogger });
    registerBootstrapIpcHandlers(dispatcher, auditLogger);
    registerElectronIpcBridge(fakeIpcMain, dispatcher);

    const invokeListener = handlers.get(DOCFLOW_IPC_INVOKE_CHANNEL);
    expect(invokeListener).toBeDefined();

    // Renderer cố tình gửi kèm trường actor giả mạo qua biên IPC
    const pingResponse = (await invokeListener!(
      {} as IpcMainInvokeEvent,
      {
        channel: 'system.ping',
        payload: { echo: 'kiem-tra-cau-noi' },
        correlationId: 'corr-bridge-001',
        actor: {
          actorType: 'AI_AGENT',
          actorId: 'spoofed-actor',
          capabilities: []
        }
      }
    )) as IpcResult<SystemPingResponse>;

    expect(pingResponse.ok).toBe(true);
    if (pingResponse.ok) {
      expect(pingResponse.data.echo).toBe('kiem-tra-cau-noi');
      // Main phải luôn ghi đè actor thành người dùng giao diện thực tế
      expect(pingResponse.auditMetadata.actorType).toBe('USER');
      expect(pingResponse.auditMetadata.actorId).toBe('electron-renderer');
    }

    // Truy vấn lại nhật ký qua history.list
    const historyResponse = (await invokeListener!(
      {} as IpcMainInvokeEvent,
      {
        channel: 'history.list',
        payload: { limit: 10 }
      }
    )) as IpcResult<{ items: readonly { channel: string }[] }>;

    expect(historyResponse.ok).toBe(true);
    if (historyResponse.ok) {
      expect(historyResponse.data.items.length).toBeGreaterThanOrEqual(1);
      expect(historyResponse.data.items[0]?.channel).toBe('system.ping');
    }
  });
});
