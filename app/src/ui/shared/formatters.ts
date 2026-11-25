const viNumberFormatter = new Intl.NumberFormat('vi-VN');
const viCurrencyFormatter = new Intl.NumberFormat('vi-VN', {
  style: 'currency',
  currency: 'VND',
  maximumFractionDigits: 0
});
const viDateFormatter = new Intl.DateTimeFormat('vi-VN', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric'
});
const viDateTimeFormatter = new Intl.DateTimeFormat('vi-VN', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  hour12: false
});

const DECIMAL_STRING_PATTERN = /^([+-])?(\d+)(?:\.(\d+))?$/;

function groupIntegerDigitsVi(digits: string): string {
  const normalized = digits.replace(/^0+(?=\d)/, '');
  return normalized.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}

/**
 * Định dạng số nguyên hoặc số thực thông thường theo chuẩn vùng `vi-VN`.
 */
export function formatNumberVi(value: number | bigint): string {
  if (typeof value === 'number' && !Number.isFinite(value)) {
    return '—';
  }
  return viNumberFormatter.format(value);
}

/**
 * Định dạng chuỗi số chính xác (`DecimalString`) theo chuẩn vùng `vi-VN` (`.` phân tách hàng nghìn, `,` phần thập phân)
 * mà không ép kiểu qua số chấm động IEEE-754 để tránh sai số làm tròn tiền tệ.
 */
export function formatDecimalVi(value: string | number | bigint, maxFractionDigits?: number): string {
  if (typeof value === 'number' || typeof value === 'bigint') {
    return formatNumberVi(value);
  }
  const trimmed = value.trim();
  const match = DECIMAL_STRING_PATTERN.exec(trimmed);
  if (!match) {
    return trimmed;
  }
  const sign = match[1] === '-' ? '-' : '';
  const integerPart = groupIntegerDigitsVi(match[2] ?? '0');
  const rawFraction = match[3] ?? '';
  const slicedFraction =
    maxFractionDigits !== undefined ? rawFraction.slice(0, Math.max(0, maxFractionDigits)) : rawFraction;
  const cleanedFraction = slicedFraction.replace(/0+$/, '');

  if (cleanedFraction.length === 0) {
    return `${sign}${integerPart}`;
  }
  return `${sign}${integerPart},${cleanedFraction}`;
}

/**
 * Định dạng tiền tệ Việt Nam Đồng (`VND`) theo chuẩn `vi-VN`.
 * Hỗ trợ cả chuỗi `DecimalString` lớn mà không làm lệch chữ số cuối.
 */
export function formatCurrencyVnd(value: number | bigint | string): string {
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!DECIMAL_STRING_PATTERN.test(trimmed)) {
      return trimmed;
    }
    return `${formatDecimalVi(trimmed)}\u00a0₫`;
  }
  if (typeof value === 'number' && !Number.isFinite(value)) {
    return '—';
  }
  return viCurrencyFormatter.format(value);
}

/**
 * Định dạng ngày (`dd/mm/yyyy`) theo chuẩn `vi-VN`.
 */
export function formatDateVi(isoTimestamp: string): string {
  const parsed = new Date(isoTimestamp);
  if (Number.isNaN(parsed.getTime())) {
    return isoTimestamp;
  }
  return viDateFormatter.format(parsed);
}

/**
 * Định dạng ngày giờ đầy đủ theo chuẩn `vi-VN`.
 */
export function formatDateTimeVi(isoTimestamp: string): string {
  const parsed = new Date(isoTimestamp);
  if (Number.isNaN(parsed.getTime())) {
    return isoTimestamp;
  }
  return viDateTimeFormatter.format(parsed);
}

/**
 * Rút gọn mã băm `sha256` để hiển thị trên thẻ giao diện mà vẫn giữ khả năng đối chiếu nhanh.
 */
export function formatHashPreview(
  sha256: string | null | undefined,
  visibleChars = 12
): string {
  if (!sha256 || !sha256.trim()) {
    return 'Chưa ghim mã băm';
  }
  const normalized = sha256.trim().replace(/^sha256:/i, '');
  if (normalized.length <= visibleChars) {
    return `sha256:${normalized}`;
  }
  return `sha256:${normalized.slice(0, visibleChars)}…`;
}
