import type { IpcMain, IpcMainInvokeEvent } from 'electron';
import { createUserActorContext } from '@core/domain';
import {
  DOCFLOW_IPC_INVOKE_CHANNEL,
  type IpcDispatcher,
  type IpcResult
} from '@infra/ipc';

export interface RendererWireRequest {
  readonly channel?: unknown;
  readonly payload?: unknown;
  readonly correlationId?: unknown;
}

/**
 * Gắn bộ điều phối `IpcDispatcher` vào `ipcMain` của Electron.
 * Luôn gán `ActorContext` là người dùng giao diện cục bộ (`USER` / `ui:user`) ở phía Main,
 * tuyệt đối không tin tưởng trường `actor` gửi từ Renderer qua biên IPC.
 */
export function registerElectronIpcBridge(
  ipcMain: Pick<IpcMain, 'handle' | 'removeHandler'>,
  dispatcher: IpcDispatcher
): void {
  ipcMain.removeHandler(DOCFLOW_IPC_INVOKE_CHANNEL);

  ipcMain.handle(
    DOCFLOW_IPC_INVOKE_CHANNEL,
    async (_event: IpcMainInvokeEvent, rawRequest: unknown): Promise<IpcResult> => {
      const envelope =
        rawRequest !== null && typeof rawRequest === 'object'
          ? (rawRequest as RendererWireRequest)
          : {};

      const channel = typeof envelope.channel === 'string' ? envelope.channel : '';
      const correlationId =
        typeof envelope.correlationId === 'string' ? envelope.correlationId : undefined;

      return dispatcher.dispatch({
        channel,
        payload: envelope.payload,
        correlationId,
        actor: createUserActorContext('electron-renderer')
      });
    }
  );
}
