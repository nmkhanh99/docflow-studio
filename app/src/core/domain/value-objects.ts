import { AppError } from './errors';

export type Sha256Hash = string;
export type DecimalString = string;

export type RoundingMode = 'HALF_UP' | 'HALF_EVEN' | 'FLOOR' | 'CEIL' | 'TRUNCATE';

const SHA256_RAW_OR_PREFIXED_REGEX = /^(?:sha256:)?([a-f0-9]{64})$/i;
const DECIMAL_STRING_REGEX = /^(-?)(\d+)(?:\.(\d+))?$/;

/**
 * Đóng băng sâu đối tượng miền để cưỡng chế bất biến ở cả thời điểm chạy (runtime).
 */
export function deepFreeze<T>(value: T): T {
  if (value === null || typeof value !== 'object' || Object.isFrozen(value)) {
    return value;
  }
  if (Array.isArray(value)) {
    for (const item of value) {
      deepFreeze(item);
    }
    return Object.freeze(value);
  }
  const record = value as Record<string, unknown>;
  for (const key of Object.keys(record)) {
    deepFreeze(record[key]);
  }
  return Object.freeze(value);
}

/**
 * Kiểm tra chuỗi có phải mã băm SHA-256 hợp lệ (64 ký tự hex hoặc `sha256:<64-hex>`).
 */
export function isValidSha256Hash(candidate: string): boolean {
  return SHA256_RAW_OR_PREFIXED_REGEX.test(candidate.trim());
}

/**
 * Chuẩn hóa mã băm SHA-256 về dạng 64 ký tự hex chữ thường; ném `ARTIFACT_INTEGRITY_VIOLATION` nếu sai định dạng.
 */
export function normalizeSha256Hash(candidate: string, fieldName = 'sha256'): Sha256Hash {
  const match = SHA256_RAW_OR_PREFIXED_REGEX.exec(candidate.trim());
  if (!match || !match[1]) {
    throw new AppError({
      code: 'ARTIFACT_INTEGRITY_VIOLATION',
      message: `Trường '${fieldName}' bắt buộc là mã băm SHA-256 hợp lệ (64 ký tự hex).`,
      details: { fieldName, candidate },
      recoverable: false
    });
  }
  return match[1].toLowerCase();
}

export function assertNonEmptyText(value: string, fieldName: string): string {
  const trimmed = value.trim();
  if (trimmed.length === 0) {
    throw new AppError({
      code: 'DOMAIN_INVARIANT_VIOLATION',
      message: `Trường '${fieldName}' không được để trống.`,
      details: { fieldName },
      recoverable: true
    });
  }
  return trimmed;
}

export function assertPositiveInteger(value: number, fieldName: string): number {
  if (!Number.isInteger(value) || value < 1) {
    throw new AppError({
      code: 'DOMAIN_INVARIANT_VIOLATION',
      message: `Trường '${fieldName}' phải là số nguyên dương (>= 1).`,
      details: { fieldName, value },
      recoverable: true
    });
  }
  return value;
}

export function assertNonNegativeInteger(value: number, fieldName: string): number {
  if (!Number.isInteger(value) || value < 0) {
    throw new AppError({
      code: 'DOMAIN_INVARIANT_VIOLATION',
      message: `Trường '${fieldName}' phải là số nguyên không âm (>= 0).`,
      details: { fieldName, value },
      recoverable: true
    });
  }
  return value;
}

export function assertIsoTimestamp(value: string, fieldName: string): string {
  const trimmed = assertNonEmptyText(value, fieldName);
  const parsed = Date.parse(trimmed);
  if (Number.isNaN(parsed)) {
    throw new AppError({
      code: 'DOMAIN_INVARIANT_VIOLATION',
      message: `Trường '${fieldName}' không đúng định dạng thời gian ISO-8601.`,
      details: { fieldName, value },
      recoverable: true
    });
  }
  return trimmed;
}

/**
 * Quy tắc `Section != Page` (Spec §1.2 & §5):
 * Cấm dùng số trang vật lý (`page-1`, `trang-02`, `p1`, chuỗi thuần số...) làm định danh `LogicalSection.id`.
 */
export function isPageBasedSectionIdentity(sectionId: string): boolean {
  const normalized = sectionId.trim().toLowerCase();
  if (/^\d+$/.test(normalized)) {
    return true;
  }
  if (/^(page|pages|trang|pg|p)[-_.\s]*\d+$/i.test(normalized)) {
    return true;
  }
  return false;
}

export function assertLogicalSectionIdentity(sectionId: string): string {
  const trimmed = assertNonEmptyText(sectionId, 'section.id');
  if (isPageBasedSectionIdentity(trimmed)) {
    throw new AppError({
      code: 'DOMAIN_INVARIANT_VIOLATION',
      message: `Định danh LogicalSection '${trimmed}' vi phạm nguyên tắc 'Section != Page': không được dùng số trang làm định danh.`,
      details: { sectionId: trimmed, invariant: 'SECTION_NOT_EQUAL_PAGE' },
      recoverable: true
    });
  }
  return trimmed;
}

/**
 * Kiểm tra thuần chuỗi (không phụ thuộc OS `path`/`fs`) để bảo vệ các tài sản bất biến:
 * `Template V0`, `Source Snapshot`, `corpus/`, và đặc tả/prototype gốc trong `docs/`.
 */
export function isImmutableProtectedTargetPath(candidatePath: string): boolean {
  const normalized = candidatePath.replace(/\\/g, '/').trim().toLowerCase();
  if (!normalized) {
    return false;
  }
  if (
    normalized.endsWith('/original.docx') ||
    normalized === 'original.docx' ||
    normalized.endsWith('/template-sha256.txt') ||
    normalized === 'template-sha256.txt' ||
    normalized.endsWith('/docflow_studio_spec.md') ||
    normalized.endsWith('/docflow_interactive_mockup.html') ||
    /\/mockup_0[1-4]_[a-z]+\.png$/.test(normalized)
  ) {
    return true;
  }
  if (/(^|\/)corpus(\/|$)/.test(normalized)) {
    return true;
  }
  if (/(^|\/)sources\/[^/]+/.test(normalized) && !/(^|\/)app\/src\//.test(normalized)) {
    return true;
  }
  return false;
}

export function assertWritableBuildTargetPath(candidatePath: string, fieldName = 'docxPath'): string {
  const trimmed = assertNonEmptyText(candidatePath, fieldName);
  if (trimmed.includes('..') || trimmed.includes('\0')) {
    throw new AppError({
      code: 'DOMAIN_INVARIANT_VIOLATION',
      message: `Đường dẫn '${fieldName}' chứa ký tự vượt cấp thư mục không an toàn.`,
      details: { fieldName, candidatePath: trimmed },
      recoverable: true
    });
  }
  if (isImmutableProtectedTargetPath(trimmed)) {
    throw new AppError({
      code: 'IMMUTABLE_TARGET_PROTECTED',
      message: `Cấm ghi đè lên tài sản bất biến (Template V0, Source Snapshot hoặc tài liệu gốc): '${trimmed}'.`,
      details: { fieldName, candidatePath: trimmed },
      recoverable: true
    });
  }
  return trimmed;
}

export function isValidDecimalString(value: string): boolean {
  return DECIMAL_STRING_REGEX.test(value.trim());
}

export function assertValidDecimalString(value: string, fieldName = 'decimal'): DecimalString {
  const trimmed = value.trim();
  if (!DECIMAL_STRING_REGEX.test(trimmed)) {
    throw new AppError({
      code: 'DOMAIN_INVARIANT_VIOLATION',
      message: `Giá trị '${value}' tại '${fieldName}' không phải chuỗi số thập phân chính xác hợp lệ.`,
      details: { fieldName, value },
      recoverable: true
    });
  }
  return ExactDecimal.fromString(trimmed).toString();
}

function pow10(exp: number): bigint {
  return 10n ** BigInt(exp);
}

/**
 * Kiểu số thập phân điểm cố định chính xác tuyệt đối dựa trên `BigInt` (Pure TypeScript, 0 phụ thuộc ngoài).
 * Cấm sử dụng phép tính dấu chấm động IEEE-754 thô cho tiền tệ và tỷ lệ.
 */
export class ExactDecimal {
  private readonly unscaled: bigint;
  private readonly scaleValue: number;

  private constructor(unscaled: bigint, scale: number) {
    this.unscaled = unscaled;
    this.scaleValue = scale;
    Object.freeze(this);
  }

  public static fromString(raw: string): ExactDecimal {
    const trimmed = raw.trim();
    const match = DECIMAL_STRING_REGEX.exec(trimmed);
    if (!match) {
      throw new AppError({
        code: 'RULE_SCHEMA_INVALID',
        message: `Không thể phân tích số thập phân chính xác từ chuỗi '${raw}'.`,
        details: { raw },
        recoverable: true
      });
    }
    const sign = match[1] === '-' ? -1n : 1n;
    const intPart = match[2] ?? '0';
    const fracPart = match[3] ?? '';
    const combined = BigInt(intPart + fracPart);
    const signed = combined === 0n ? 0n : sign * combined;
    return new ExactDecimal(signed, fracPart.length).normalizeTrailingZeros();
  }

  public static fromSafeInteger(intValue: number): ExactDecimal {
    if (!Number.isSafeInteger(intValue)) {
      throw new AppError({
        code: 'RULE_SCHEMA_INVALID',
        message: `Cấm truyền số chấm động IEEE-754 thô (${String(intValue)}) vào ExactDecimal; hãy dùng chuỗi thập phân hoặc số nguyên an toàn.`,
        details: { intValue },
        recoverable: true
      });
    }
    return new ExactDecimal(BigInt(intValue), 0);
  }

  public get scale(): number {
    return this.scaleValue;
  }

  public isZero(): boolean {
    return this.unscaled === 0n;
  }

  public isNegative(): boolean {
    return this.unscaled < 0n;
  }

  public add(other: ExactDecimal): ExactDecimal {
    const targetScale = Math.max(this.scaleValue, other.scaleValue);
    const lhs = this.unscaled * pow10(targetScale - this.scaleValue);
    const rhs = other.unscaled * pow10(targetScale - other.scaleValue);
    return new ExactDecimal(lhs + rhs, targetScale).normalizeTrailingZeros();
  }

  public subtract(other: ExactDecimal): ExactDecimal {
    const targetScale = Math.max(this.scaleValue, other.scaleValue);
    const lhs = this.unscaled * pow10(targetScale - this.scaleValue);
    const rhs = other.unscaled * pow10(targetScale - other.scaleValue);
    return new ExactDecimal(lhs - rhs, targetScale).normalizeTrailingZeros();
  }

  public multiply(other: ExactDecimal): ExactDecimal {
    return new ExactDecimal(
      this.unscaled * other.unscaled,
      this.scaleValue + other.scaleValue
    ).normalizeTrailingZeros();
  }

  public divide(
    divisor: ExactDecimal,
    scale = 4,
    roundingMode: RoundingMode = 'HALF_UP'
  ): ExactDecimal {
    assertNonNegativeInteger(scale, 'scale');
    if (divisor.unscaled === 0n) {
      throw new AppError({
        code: 'SANDBOX_EXECUTION_TIMEOUT',
        message: 'Phép chia cho 0 bị chặn an toàn trong bộ tính toán số thập phân chính xác.',
        details: { dividend: this.toString(), divisor: '0' },
        recoverable: true
      });
    }
    const scaleAdjustment = scale + divisor.scaleValue - this.scaleValue;
    const scaledDividend =
      scaleAdjustment >= 0
        ? this.unscaled * pow10(scaleAdjustment)
        : this.unscaled;
    const effectiveDivisor =
      scaleAdjustment >= 0
        ? divisor.unscaled
        : divisor.unscaled * pow10(-scaleAdjustment);

    const quotient = ExactDecimal.divideWithRounding(scaledDividend, effectiveDivisor, roundingMode);
    return new ExactDecimal(quotient, scale);
  }

  public round(targetScale: number, roundingMode: RoundingMode = 'HALF_UP'): ExactDecimal {
    assertNonNegativeInteger(targetScale, 'targetScale');
    if (targetScale >= this.scaleValue) {
      return new ExactDecimal(
        this.unscaled * pow10(targetScale - this.scaleValue),
        targetScale
      );
    }
    const divisor = pow10(this.scaleValue - targetScale);
    const rounded = ExactDecimal.divideWithRounding(this.unscaled, divisor, roundingMode);
    return new ExactDecimal(rounded, targetScale);
  }

  public compare(other: ExactDecimal): -1 | 0 | 1 {
    const targetScale = Math.max(this.scaleValue, other.scaleValue);
    const lhs = this.unscaled * pow10(targetScale - this.scaleValue);
    const rhs = other.unscaled * pow10(targetScale - other.scaleValue);
    if (lhs < rhs) return -1;
    if (lhs > rhs) return 1;
    return 0;
  }

  public equals(other: ExactDecimal): boolean {
    return this.compare(other) === 0;
  }

  public toString(): DecimalString {
    if (this.scaleValue === 0) {
      return this.unscaled.toString();
    }
    const negative = this.unscaled < 0n;
    const absStr = (negative ? -this.unscaled : this.unscaled)
      .toString()
      .padStart(this.scaleValue + 1, '0');
    const splitPos = absStr.length - this.scaleValue;
    const intPart = absStr.slice(0, splitPos);
    const fracPart = absStr.slice(splitPos);
    return `${negative ? '-' : ''}${intPart}.${fracPart}`;
  }

  private normalizeTrailingZeros(): ExactDecimal {
    if (this.unscaled === 0n) {
      return new ExactDecimal(0n, 0);
    }
    let currentUnscaled = this.unscaled;
    let currentScale = this.scaleValue;
    while (currentScale > 0 && currentUnscaled % 10n === 0n) {
      currentUnscaled /= 10n;
      currentScale -= 1;
    }
    if (currentScale === this.scaleValue) {
      return this;
    }
    return new ExactDecimal(currentUnscaled, currentScale);
  }

  private static divideWithRounding(
    numerator: bigint,
    denominator: bigint,
    mode: RoundingMode
  ): bigint {
    const sign = (numerator < 0n) !== (denominator < 0n) ? -1n : 1n;
    const absNum = numerator < 0n ? -numerator : numerator;
    const absDen = denominator < 0n ? -denominator : denominator;
    const quotient = absNum / absDen;
    const remainder = absNum % absDen;

    if (remainder === 0n) {
      return sign * quotient;
    }

    let increment = false;
    const twiceRemainder = remainder * 2n;

    switch (mode) {
      case 'TRUNCATE':
        increment = false;
        break;
      case 'FLOOR':
        increment = sign < 0n;
        break;
      case 'CEIL':
        increment = sign > 0n;
        break;
      case 'HALF_UP':
        increment = twiceRemainder >= absDen;
        break;
      case 'HALF_EVEN':
        if (twiceRemainder > absDen) {
          increment = true;
        } else if (twiceRemainder === absDen) {
          increment = quotient % 2n !== 0n;
        }
        break;
    }

    const adjusted = increment ? quotient + 1n : quotient;
    return sign * adjusted;
  }
}
