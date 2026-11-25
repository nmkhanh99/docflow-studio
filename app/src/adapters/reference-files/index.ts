import type { ReferenceExtractorPort, ReferenceSnippet } from '@core/ports';

/**
 * Adapter trích xuất đoạn tham chiếu có truy vết nguồn gốc (provenance) từ DOCX/PDF.
 */
export class StubReferenceExtractorAdapter implements ReferenceExtractorPort {
  public async extractProvenanceSnippets(
    _sourcePath: string
  ): Promise<readonly ReferenceSnippet[]> {
    return [];
  }
}
