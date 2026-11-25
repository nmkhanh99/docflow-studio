import type { SavedRule } from '../domain';

export interface RuleValidationReport {
  readonly valid: boolean;
  readonly issues: readonly {
    readonly code: string;
    readonly messageVi: string;
    readonly path?: string;
  }[];
}

export interface RuleServiceContract {
  validateDraft(ruleDraft: Partial<SavedRule>): Promise<RuleValidationReport>;
}
