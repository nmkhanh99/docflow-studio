import type {
  DocumentBlock,
  LogicalSection,
  OoxmlPatchCommand,
  OoxmlTemplateMap,
  Sha256Hash
} from '../domain';

export interface AnchorResolutionReport {
  readonly sectionId: string;
  readonly resolved: boolean;
  readonly startAnchor: string;
  readonly endAnchor: string;
  readonly matchedBlockIds: readonly string[];
  readonly driftedBlockIds: readonly string[];
  readonly confidence: number;
}

export interface SectionPatchScopeConstraint {
  readonly sectionId: string;
  readonly allowedBlockIds: readonly string[];
}

export interface ApplyWorkingPatchesOptions {
  readonly sectionScopes?: readonly SectionPatchScopeConstraint[];
  readonly updateDynamicFieldsAndToc?: boolean;
}

/**
 * Cổng xử lý tài liệu DOCX / Cây OOXML (`DocumentEnginePort` — Spec §8.1–8.2 & §9.2):
 * - Phân tích cấu trúc `DocumentBlock` và ánh xạ `LogicalSection` theo anchor (`Section != Page`).
 * - Cấm cắt nhỏ DOCX theo trang rồi ghép lại.
 * - Chỉ áp tập lệnh OOXML Patch nguyên tử trên bản sao làm việc, bảo toàn `w:rPr`, `w:pPr`, `w:tblPr`.
 */
export interface DocumentEnginePort {
  parseTemplateStructure(docxPath: string): Promise<{
    readonly sections: readonly LogicalSection[];
    readonly blocks: readonly DocumentBlock[];
    readonly ooxmlMap?: OoxmlTemplateMap;
  }>;

  resolveSectionAnchors(
    docxPath: string,
    sections: readonly LogicalSection[],
    expectedBlocks: readonly DocumentBlock[]
  ): Promise<readonly AnchorResolutionReport[]>;

  applyWorkingPatches(
    templateDocxPath: string,
    workingOutputDocxPath: string,
    patches: readonly OoxmlPatchCommand[],
    options?: ApplyWorkingPatchesOptions
  ): Promise<{
    readonly outputSha256: Sha256Hash;
    readonly appliedPatchCount?: number;
  }>;
}
