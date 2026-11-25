import type { BrowserWindowConstructorOptions } from 'electron';

export const DOCFLOW_CONTENT_SECURITY_POLICY = [
  "default-src 'self'",
  "script-src 'self'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "font-src 'self' data:",
  "connect-src 'self'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'none'",
  "frame-ancestors 'none'"
].join('; ');

/**
 * Tạo cấu hình BrowserWindow bảo mật chuẩn cho DocFlow Studio:
 * bắt buộc bật `contextIsolation: true`, `sandbox: true`, tắt `nodeIntegration: false`.
 */
export function createSecureBrowserWindowOptions(
  preloadScriptPath: string
): BrowserWindowConstructorOptions {
  return {
    width: 1440,
    height: 900,
    minWidth: 1024,
    minHeight: 680,
    title: 'DocFlow Studio',
    show: false,
    backgroundColor: '#f5f6f8',
    webPreferences: {
      preload: preloadScriptPath,
      contextIsolation: true,
      sandbox: true,
      nodeIntegration: false,
      nodeIntegrationInWorker: false,
      nodeIntegrationInSubFrames: false,
      webSecurity: true,
      allowRunningInsecureContent: false,
      webviewTag: false,
      spellcheck: false
    }
  };
}

/**
 * Gắn header Content-Security-Policy vào phản hồi HTTP/file của Renderer.
 */
export function buildCspResponseHeaders(
  responseHeaders: Record<string, string | string[]> | undefined,
  cspPolicy = DOCFLOW_CONTENT_SECURITY_POLICY
): Record<string, string | string[]> {
  const nextHeaders: Record<string, string | string[]> = {};
  if (responseHeaders) {
    for (const [key, value] of Object.entries(responseHeaders)) {
      if (key.toLowerCase() !== 'content-security-policy') {
        nextHeaders[key] = value;
      }
    }
  }
  nextHeaders['Content-Security-Policy'] = [cspPolicy];
  return nextHeaders;
}

/**
 * Kiểm tra URL điều hướng hợp lệ của cửa sổ chính (chặn nhảy ra trang web bên ngoài).
 */
export function isAllowedRendererNavigation(
  targetUrl: string,
  allowedDevServerUrl?: string
): boolean {
  try {
    const parsed = new URL(targetUrl);
    if (parsed.protocol === 'file:') {
      return true;
    }
    if (allowedDevServerUrl) {
      const allowed = new URL(allowedDevServerUrl);
      return parsed.origin === allowed.origin;
    }
    return false;
  } catch {
    return false;
  }
}
