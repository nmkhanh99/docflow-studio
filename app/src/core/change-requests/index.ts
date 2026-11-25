import type { ChangeRequest } from '../domain';

export interface CreateChangeRequestInput {
  readonly sectionId: string;
  readonly instruction: string;
  readonly scope: 'SINGLE_SECTION' | 'DOWNSTREAM';
  readonly changeKind: ChangeRequest['changeKind'];
}

export interface ChangeRequestServiceContract {
  create(input: CreateChangeRequestInput): Promise<{
    changeRequest: ChangeRequest;
    staleNodeIds: readonly string[];
  }>;
}
