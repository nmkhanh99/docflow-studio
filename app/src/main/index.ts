import { join } from 'node:path';
import { app, BrowserWindow, ipcMain, session } from 'electron';
import {
  CompositeAuditLogger,
  InMemoryAuditLogger,
  IpcDispatcher,
  registerBootstrapIpcHandlers
} from '@infra/index';
import { registerElectronIpcBridge } from './ipc-bridge';
import {
  buildCspResponseHeaders,
  createSecureBrowserWindowOptions,
  DOCFLOW_CONTENT_SECURITY_POLICY,
  isAllowedRendererNavigation
} from './security';

const compositeAuditLogger = new CompositeAuditLogger(new InMemoryAuditLogger());
const ipcDispatcher = new IpcDispatcher({ auditLogger: compositeAuditLogger });
const sessionCoordinator = registerBootstrapIpcHandlers(ipcDispatcher, compositeAuditLogger, {
  compositeAuditLogger
});

function installContentSecurityPolicy(devServerUrl?: string): void {
  const csp = devServerUrl
    ? [
        "default-src 'self'",
        "script-src 'self' 'unsafe-inline'",
        "style-src 'self' 'unsafe-inline'",
        "img-src 'self' data: blob:",
        "font-src 'self' data:",
        `connect-src 'self' ${new URL(devServerUrl).origin} ws:`,
        "object-src 'none'",
        "base-uri 'self'",
        "form-action 'none'",
        "frame-ancestors 'none'"
      ].join('; ')
    : DOCFLOW_CONTENT_SECURITY_POLICY;

  session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
    callback({
      responseHeaders: buildCspResponseHeaders(details.responseHeaders, csp)
    });
  });
}

function createMainWindow(): BrowserWindow {
  const preloadPath = join(__dirname, '../preload/index.js');
  const devServerUrl = process.env.ELECTRON_RENDERER_URL;

  const mainWindow = new BrowserWindow(createSecureBrowserWindowOptions(preloadPath));

  mainWindow.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));

  mainWindow.webContents.on('will-navigate', (event, targetUrl) => {
    if (!isAllowedRendererNavigation(targetUrl, devServerUrl)) {
      event.preventDefault();
    }
  });

  mainWindow.on('ready-to-show', () => {
    mainWindow.show();
  });

  if (devServerUrl) {
    void mainWindow.loadURL(devServerUrl);
  } else {
    void mainWindow.loadFile(join(__dirname, '../renderer/index.html'));
  }

  return mainWindow;
}

function bootstrapApplication(): void {
  void app.whenReady().then(() => {
    installContentSecurityPolicy(process.env.ELECTRON_RENDERER_URL);
    registerElectronIpcBridge(ipcMain, ipcDispatcher);
    createMainWindow();

    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) {
        createMainWindow();
      }
    });
  });

  app.on('before-quit', () => {
    void sessionCoordinator.closeActiveProject();
  });

  app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
      app.quit();
    }
  });
}

bootstrapApplication();
