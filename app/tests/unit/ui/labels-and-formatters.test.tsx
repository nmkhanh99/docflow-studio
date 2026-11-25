import { describe, expect, it } from 'vitest';
import {
  CALCULATION_RESULT_STATUSES,
  DOCFLOW_ERROR_CODES,
  DOCUMENT_BUILD_STATUSES,
  INPUT_BINDING_STATUSES,
  LAYOUT_DIFFERENCE_STATUSES,
  RULE_STATUSES,
  SECTION_REVISION_STATUSES
} from '@core/domain';
import {
  CALCULATION_STATUS_LABELS_VI,
  CALCULATION_STATUS_TONES,
  DOCFLOW_ERROR_CODE_LABELS_VI,
  DOCUMENT_BUILD_STATUS_LABELS_VI,
  DOCUMENT_BUILD_STATUS_TONES,
  INPUT_BINDING_STATUS_LABELS_VI,
  INPUT_BINDING_STATUS_TONES,
  LAYOUT_DIFF_LABELS_VI,
  LAYOUT_DIFF_TONES,
  RULE_STATUS_LABELS_VI,
  RULE_STATUS_TONES,
  SECTION_REVISION_STATUS_LABELS_VI,
  SECTION_REVISION_STATUS_TONES,
  formatCurrencyVnd,
  formatDateTimeVi,
  formatDateVi,
  formatDecimalVi,
  formatHashPreview,
  formatNumberVi,
  getCalculationStatusLabelVi,
  getDocumentBuildStatusLabelVi,
  getErrorCodeLabelVi,
  getInputBindingStatusLabelVi,
  getLayoutDiffLabelVi,
  getRuleStatusLabelVi,
  getSectionRevisionStatusLabelVi
} from '@ui/shared';

describe('Bảng nhãn tiếng Việt (§3.1) & Bộ định dạng vùng vi-VN', () => {
  it('ánh xạ đầy đủ và tách biệt cả 6 nhóm trạng thái vòng đời sang tiếng Việt kèm badge tone', () => {
    for (const status of RULE_STATUSES) {
      expect(RULE_STATUS_LABELS_VI[status].length).toBeGreaterThan(0);
      expect(getRuleStatusLabelVi(status)).toBe(RULE_STATUS_LABELS_VI[status]);
      expect(RULE_STATUS_TONES[status]).toBeDefined();
    }

    for (const status of INPUT_BINDING_STATUSES) {
      expect(INPUT_BINDING_STATUS_LABELS_VI[status].length).toBeGreaterThan(0);
      expect(getInputBindingStatusLabelVi(status)).toBe(INPUT_BINDING_STATUS_LABELS_VI[status]);
      expect(INPUT_BINDING_STATUS_TONES[status]).toBeDefined();
    }

    for (const status of CALCULATION_RESULT_STATUSES) {
      expect(CALCULATION_STATUS_LABELS_VI[status].length).toBeGreaterThan(0);
      expect(getCalculationStatusLabelVi(status)).toBe(CALCULATION_STATUS_LABELS_VI[status]);
      expect(CALCULATION_STATUS_TONES[status]).toBeDefined();
    }

    for (const status of SECTION_REVISION_STATUSES) {
      expect(SECTION_REVISION_STATUS_LABELS_VI[status].length).toBeGreaterThan(0);
      expect(getSectionRevisionStatusLabelVi(status)).toBe(
        SECTION_REVISION_STATUS_LABELS_VI[status]
      );
      expect(SECTION_REVISION_STATUS_TONES[status]).toBeDefined();
    }

    for (const status of DOCUMENT_BUILD_STATUSES) {
      expect(DOCUMENT_BUILD_STATUS_LABELS_VI[status].length).toBeGreaterThan(0);
      expect(getDocumentBuildStatusLabelVi(status)).toBe(DOCUMENT_BUILD_STATUS_LABELS_VI[status]);
      expect(DOCUMENT_BUILD_STATUS_TONES[status]).toBeDefined();
    }

    for (const status of LAYOUT_DIFFERENCE_STATUSES) {
      expect(LAYOUT_DIFF_LABELS_VI[status].length).toBeGreaterThan(0);
      expect(getLayoutDiffLabelVi(status)).toBe(LAYOUT_DIFF_LABELS_VI[status]);
      expect(LAYOUT_DIFF_TONES[status]).toBeDefined();
    }

    // Đảm bảo phân biệt ngữ nghĩa rõ ràng giữa STALE, REVIEW_REQUIRED và SHIFTED
    expect(getCalculationStatusLabelVi('STALE')).toBe('Cần tính lại');
    expect(getSectionRevisionStatusLabelVi('REVIEW_REQUIRED')).toBe('Chờ duyệt');
    expect(getLayoutDiffLabelVi('SHIFTED')).toBe('Dịch trang');
    expect(getRuleStatusLabelVi('UNKNOWN_STATE')).toContain('Không xác định');
  });

  it('bao phủ đủ 100% mã lỗi miền DocFlowErrorCode bằng tiếng Việt', () => {
    for (const code of DOCFLOW_ERROR_CODES) {
      const label = getErrorCodeLabelVi(code);
      expect(DOCFLOW_ERROR_CODE_LABELS_VI[code]).toBeDefined();
      expect(label.length).toBeGreaterThan(3);
    }
  });

  it('định dạng số liệu, DecimalString lớn, tiền tệ VND, ngày giờ và mã băm chuẩn vi-VN', () => {
    expect(formatNumberVi(27)).toBe('27');
    expect(formatNumberVi(1250000)).toBe('1.250.000');

    // Số thập phân chính xác vượt ngưỡng an toàn IEEE-754 vẫn không bị làm tròn sai chữ số cuối
    expect(formatDecimalVi('900719925474099312.4500')).toBe('900.719.925.474.099.312,45');
    expect(formatCurrencyVnd('4250000000')).toBe('4.250.000.000\u00a0₫');

    const dateFormatted = formatDateVi('2026-11-25T10:15:30.000Z');
    expect(dateFormatted).toMatch(/\d{2}\/\d{2}\/2026/);

    const dateTimeFormatted = formatDateTimeVi('2026-11-25T10:15:30.000Z');
    expect(dateTimeFormatted).toContain('2026');
    expect(formatDateTimeVi('khong-phai-ngay')).toBe('khong-phai-ngay');

    expect(
      formatHashPreview('a3f5c7e90123456789abcdef0123456789abcdef0123456789abcdef01234567', 12)
    ).toBe('sha256:a3f5c7e90123…');
    expect(formatHashPreview(null)).toBe('Chưa ghim mã băm');
  });
});
