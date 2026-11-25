import { AppError } from '@core/domain';
import type { DocumentEnginePort } from '@core/ports';

/**
 * Bộ chuyển đổi xử lý OOXML (Parse, LogicalSection Anchor & Atomic Patch — không cắt ghép trang).
 * Khung khởi tạo cho Phase 1; sẽ được triển khai chi tiết ở module OOXML Engine.
 */
export class StubOoxmlDocumentAdapter implements DocumentEnginePort {
  public async parseTemplateStructure(
    _docxPath: string
  ): ReturnType<DocumentEnginePort['parseTemplateStructure']> {
    throw new AppError({
      code: 'DOCX_PARSE_UNSUPPORTED_SAFE',
      message: 'Bộ phân tích cấu trúc OOXML đang ở chế độ khung khởi tạo.',
      recoverable: true
    });
  }

  public async resolveSectionAnchors(): ReturnType<DocumentEnginePort['resolveSectionAnchors']> {
    throw new AppError({
      code: 'ANCHOR_DRIFT_OR_NOT_FOUND',
      message: 'Bộ phân giải neo LogicalSection đang ở chế độ khung khởi tạo.',
      recoverable: true
    });
  }

  public async applyWorkingPatches(): ReturnType<DocumentEnginePort['applyWorkingPatches']> {
    throw new AppError({
      code: 'DOCX_PARSE_UNSUPPORTED_SAFE',
      message: 'Bộ áp lệnh vá OOXML nguyên tử đang ở chế độ khung khởi tạo.',
      recoverable: true
    });
  }
}
