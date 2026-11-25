import { AppError } from '@core/domain';
import type { DocumentLayoutRendererPort } from '@core/ports';

/**
 * Strategy Adapter kết xuất toàn tài liệu (Full-Document Layout Renderer).
 */
export class StubLayoutRendererAdapter implements DocumentLayoutRendererPort {
  public async renderPreviewAndInspect(): ReturnType<
    DocumentLayoutRendererPort['renderPreviewAndInspect']
  > {
    throw new AppError({
      code: 'RENDER_ENGINE_UNAVAILABLE',
      message: 'Chưa cấu hình Layout Engine kết xuất toàn tài liệu trong khung khởi tạo.',
      recoverable: true
    });
  }
}
