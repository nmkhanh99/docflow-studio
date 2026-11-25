import type { BuildArtifact, BuildManifest, LayoutIssue } from '../domain';

export interface BuildGatePolicy {
  readonly blockOnCriticalLayoutIssue: boolean;
  readonly allowHumanOverrideWithReason: boolean;
}

export const DEFAULT_BUILD_GATE_POLICY: BuildGatePolicy = {
  blockOnCriticalLayoutIssue: true,
  allowHumanOverrideWithReason: true
};

export interface BuildGateReport {
  readonly canExport: boolean;
  readonly staleSectionIds: readonly string[];
  readonly unapprovedSectionIds: readonly string[];
  readonly criticalLayoutIssues: readonly LayoutIssue[];
}

export interface BuildServiceContract {
  validateGate(manifest: BuildManifest, policy?: BuildGatePolicy): Promise<BuildGateReport>;
  exportApprovedDocx(buildId: string, destinationPath: string): Promise<BuildArtifact>;
}
