import { AppError } from '@core/domain';
import type { SpreadsheetReaderPort, SpreadsheetSchemaSample } from '@core/ports';

/**
 * Adapter đọc và chuẩn hóa dữ liệu bảng tính Excel (.xlsx) chỉ đọc.
 */
export class StubSpreadsheetAdapter implements SpreadsheetReaderPort {
  public async inspectSchemaSample(_sourcePath: string): Promise<SpreadsheetSchemaSample> {
    throw new AppError({
      code: 'SOURCE_DATA_MISSING',
      message: 'Bộ đọc bảng tính Excel đang ở chế độ khung khởi tạo.',
      recoverable: true
    });
  }

  public async queryScopedRange(): ReturnType<SpreadsheetReaderPort['queryScopedRange']> {
    throw new AppError({
      code: 'SOURCE_DATA_MISSING',
      message: 'Bộ truy vấn vùng dữ liệu bảng tính Excel đang ở chế độ khung khởi tạo.',
      recoverable: true
    });
  }
}
