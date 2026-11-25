import type {
  DecimalString,
  LookupTieBreakPolicy,
  RuleScalarDataType,
  Sha256Hash
} from '../domain';

export interface SpreadsheetColumnMetadata {
  readonly name: string;
  readonly columnLetter: string;
  readonly inferredType: RuleScalarDataType | 'MIXED' | 'EMPTY';
  readonly detectedUnit?: string | null;
}

export interface SpreadsheetSheetMetadata {
  readonly sheetName: string;
  readonly hidden: boolean;
  readonly rowCount: number;
  readonly columns: readonly SpreadsheetColumnMetadata[];
  readonly sampleRows: readonly Readonly<
    Record<string, DecimalString | string | number | boolean | null>
  >[];
}

export interface SpreadsheetSchemaSample {
  readonly sourceSha256?: Sha256Hash;
  readonly sheets?: readonly SpreadsheetSheetMetadata[];
  readonly hasFormulaCells?: boolean;
  readonly [key: string]: unknown;
}

export interface SpreadsheetScopedQuery {
  readonly sheetName: string;
  readonly rangeSelector: string;
  readonly filterEquals?: Readonly<Record<string, string | number | boolean>>;
  readonly effectiveDateColumn?: string;
  readonly asOfDateIso?: string;
  readonly tieBreakPolicy?: LookupTieBreakPolicy;
  readonly limit?: number;
}

export interface SpreadsheetMatchedRow {
  readonly sheetName: string;
  readonly rowNumber: number;
  readonly cellCoordinates: Readonly<Record<string, string>>;
  readonly values: Readonly<Record<string, DecimalString | string | number | boolean | null>>;
}

export interface SpreadsheetQueryResult {
  readonly rows: readonly SpreadsheetMatchedRow[];
  readonly ambiguousTieDetected: boolean;
}

/**
 * Cổng đọc và chuẩn hóa bảng tính Excel/CSV chỉ đọc (`SpreadsheetReaderPort` — Spec §6.1–6.4 & §9.2):
 * - Chỉ đọc trên `Source Snapshot` bất biến; cấm chạy macro VBA/Office và cấm ghi ngược vào file nguồn.
 */
export interface SpreadsheetReaderPort {
  inspectSchemaSample(
    sourcePath: string,
    expectedSha256?: Sha256Hash
  ): Promise<SpreadsheetSchemaSample>;

  queryScopedRange(
    sourcePath: string,
    query: SpreadsheetScopedQuery
  ): Promise<SpreadsheetQueryResult>;
}

/** Bí danh tương thích ngược với khung khởi tạo. */
export type SpreadsheetPort = SpreadsheetReaderPort;

/**
 * Cổng trích xuất dẫn chứng nguồn (`provenance`) từ tài liệu DOCX/PDF tham chiếu chỉ đọc.
 */
export interface ReferenceSnippet {
  readonly location: string;
  readonly pageOrParagraph?: string;
  readonly textExcerpt: string;
  readonly [key: string]: unknown;
}

export interface ReferenceExtractorPort {
  extractProvenanceSnippets(sourcePath: string): Promise<readonly ReferenceSnippet[]>;
}
