import type { DependencyEdge, Run, RunMode, RunStep } from '../domain';

export interface ExecutionPlan {
  readonly planId: string;
  readonly mode: RunMode;
  readonly orderedNodeIds: readonly string[];
  readonly cachedNodeIds: readonly string[];
  readonly blockedNodeIds: readonly string[];
}

export interface DependencyRunnerContract {
  analyzeImpact(changedNodeIds: readonly string[], edges: readonly DependencyEdge[]): readonly string[];
  createPlan(mode: RunMode, sectionId?: string): Promise<ExecutionPlan>;
  executePlan(planId: string): Promise<{ run: Run; steps: readonly RunStep[] }>;
}
