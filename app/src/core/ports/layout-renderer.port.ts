import type { BuildArtifact, BuildManifest, LayoutIssue } from '../domain';

export interface LayoutRenderResult {
  readonly artifact: BuildArtifact;
  readonly issues: readonly LayoutIssue[];
  readonly detectedFonts?: readonly string[];
  readonly missingFonts?: readonly string[];
}

/**
 * Cổng kết xuất bố cục toàn tài liệu (`LayoutRendererPort` — Strategy pattern theo Spec §8.3–8.5 & §9.2):
 * - Kết xuất toàn bộ DOCX sau khi áp Patch để tính phân trang vật lý thực tế.
 * - Tách bạch `Layout Diff` (`SHIFTED`, `SPLIT_CHANGED`, `OVERFLOW`, `EMPTY_PAGE`, `NO_CHANGE`) với `Content Diff`.
 */
export interface LayoutRendererPort {
  renderPreviewAndInspect(
    manifest: BuildManifest,
    composedDocxPath: string
  ): Promise<LayoutRenderResult>;
}

/** Bí danh tương thích ngược với khung khởi tạo trước đó. */
export type DocumentLayoutRendererPort = LayoutRendererPort;
