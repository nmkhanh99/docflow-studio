import { describe, expect, it } from 'vitest';
import {
  buildCspResponseHeaders,
  createSecureBrowserWindowOptions,
  DOCFLOW_CONTENT_SECURITY_POLICY,
  isAllowedRendererNavigation
} from '../../src/main/security';

describe('Cấu hình bảo mật Electron BrowserWindow & Content Security Policy', () => {
  it('bắt buộc bật contextIsolation: true, sandbox: true và tắt nodeIntegration: false', () => {
    const preloadPath = '/app/out/preload/index.js';
    const options = createSecureBrowserWindowOptions(preloadPath);

    expect(options.webPreferences).toBeDefined();
    expect(options.webPreferences?.preload).toBe(preloadPath);
    expect(options.webPreferences?.contextIsolation).toBe(true);
    expect(options.webPreferences?.sandbox).toBe(true);
    expect(options.webPreferences?.nodeIntegration).toBe(false);
    expect(options.webPreferences?.nodeIntegrationInWorker).toBe(false);
    expect(options.webPreferences?.nodeIntegrationInSubFrames).toBe(false);
    expect(options.webPreferences?.webSecurity).toBe(true);
    expect(options.webPreferences?.allowRunningInsecureContent).toBe(false);
    expect(options.webPreferences?.webviewTag).toBe(false);
  });

  it('áp đặt Content Security Policy chặt chẽ và ghi đè header CSP cũ nếu có', () => {
    expect(DOCFLOW_CONTENT_SECURITY_POLICY).toContain("default-src 'self'");
    expect(DOCFLOW_CONTENT_SECURITY_POLICY).toContain("script-src 'self'");
    expect(DOCFLOW_CONTENT_SECURITY_POLICY).toContain("object-src 'none'");
    expect(DOCFLOW_CONTENT_SECURITY_POLICY).toContain("frame-ancestors 'none'");

    const headers = buildCspResponseHeaders({
      'X-Custom': 'ok',
      'content-security-policy': "default-src *"
    });

    expect(headers['content-security-policy']).toBeUndefined();
    expect(headers['Content-Security-Policy']).toEqual([DOCFLOW_CONTENT_SECURITY_POLICY]);
    expect(headers['X-Custom']).toBe('ok');
  });

  it('chỉ cho phép điều hướng tới file cục bộ của ứng dụng hoặc dev server hợp lệ', () => {
    expect(isAllowedRendererNavigation('file:///app/out/renderer/index.html')).toBe(true);
    expect(
      isAllowedRendererNavigation('http://localhost:5173/index.html', 'http://localhost:5173')
    ).toBe(true);
    expect(
      isAllowedRendererNavigation('https://attacker.example.com', 'http://localhost:5173')
    ).toBe(false);
    expect(isAllowedRendererNavigation('javascript:alert(1)')).toBe(false);
  });
});
