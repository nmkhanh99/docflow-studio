import { z } from 'zod';

/**
 * Phát hiện chuỗi vượt cấp thư mục (`..`) hoặc ký tự null trong đường dẫn tệp.
 */
export function hasPathTraversalSegment(rawPath: string): boolean {
  if (rawPath.includes('\0')) {
    return true;
  }
  const normalized = rawPath.replace(/\\/g, '/');
  const segments = normalized.split('/');
  return segments.some((segment) => segment === '..');
}

export const safeFilePathSchema = z
  .string({
    required_error: 'Đường dẫn tệp là bắt buộc.',
    invalid_type_error: 'Đường dẫn tệp phải là chuỗi ký tự.'
  })
  .trim()
  .min(1, 'Đường dẫn tệp không được để trống.')
  .max(1024, 'Đường dẫn tệp vượt quá độ dài tối đa 1024 ký tự.')
  .refine((value) => !hasPathTraversalSegment(value), {
    message: 'Đường dẫn tệp không hợp lệ: không cho phép chứa đoạn vượt cấp thư mục (..) hoặc ký tự rỗng.'
  });

export const entityIdSchema = z
  .string({
    required_error: 'Mã định danh là bắt buộc.',
    invalid_type_error: 'Mã định danh phải là chuỗi ký tự.'
  })
  .trim()
  .min(1, 'Mã định danh không được để trống.')
  .max(128, 'Mã định danh vượt quá 128 ký tự.')
  .regex(/^[a-zA-Z0-9._:-]+$/, 'Mã định danh chỉ được chứa chữ cái, chữ số và các ký tự . _ : -');

export const nonEmptyTextSchema = z
  .string({
    required_error: 'Nội dung văn bản là bắt buộc.',
    invalid_type_error: 'Nội dung văn bản phải là chuỗi ký tự.'
  })
  .trim()
  .min(1, 'Nội dung văn bản không được để trống.')
  .max(20_000, 'Nội dung văn bản vượt quá 20.000 ký tự.');
