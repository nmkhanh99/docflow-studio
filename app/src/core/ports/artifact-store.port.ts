import type {
  Sha256Hash,
  SourceArtifact,
  SourceArtifactType,
  TemplateArtifact
} from '../domain';

/**
 * Cổng lưu trữ tài sản bất biến theo nội dung (`sha256` Content-Addressed Artifact Store — §9.2 & §9.4):
 * - Quản lý `Template V0` (`template/original.docx` + `template-sha256.txt`, chỉ đọc).
 * - Quản lý `Source Snapshot` (`sources/<sourceId>/<sha256>/source.<ext>`, chỉ đọc).
 * - Clone `Template V0` ra bản làm việc tạm trước khi áp OOXML Patch; cấm ghi đè bản gốc.
 */
export interface ArtifactStorePort {
  importTemplateV0(projectDir: string, sourceDocxPath: string): Promise<TemplateArtifact>;
  importSourceSnapshot(
    projectDir: string,
    sourceFilePath: string,
    explicitType?: SourceArtifactType
  ): Promise<SourceArtifact>;
  verifyArtifactIntegrity(expectedSha256: Sha256Hash, targetPath: string): Promise<boolean>;
  cloneTemplateToWorkingCopy(
    templateArtifact: TemplateArtifact,
    workingOutputDocxPath: string
  ): Promise<{
    readonly workingDocxPath: string;
    readonly verifiedTemplateSha256: Sha256Hash;
  }>;
  exportApprovedBuildArtifact(
    builtDocxPath: string,
    destinationPath: string,
    expectedChecksum: Sha256Hash
  ): Promise<{
    readonly exportedPath: string;
    readonly sha256: Sha256Hash;
  }>;
}
