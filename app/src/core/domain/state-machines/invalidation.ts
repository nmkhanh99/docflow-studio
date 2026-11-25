import { AppError } from '../errors';
import type {
  DependencyEdge,
  SectionRevision,
  Sha256Hash
} from '../entities';
import type {
  CalculationResultStatus,
  DocumentBuildStatus
} from '../lifecycle-states';
import { transitionCalculationResultStatus } from './calculation-result-state-machine';

/**
 * Động cơ kiểm tra chu trình DAG và Quy tắc lan truyền mất hiệu lực (Invalidation Rules)
 * theo DOCFLOW_STUDIO_SPEC.md §3.2 & §7.
 */

/**
 * Phát hiện chu trình trên đồ thị phụ thuộc có hướng (ví dụ `A -> B -> A`).
 * Nếu không có chu trình, trả về thứ tự sắp xếp topological ổn định.
 */
export function assertAcyclicDependencyGraph(edges: readonly DependencyEdge[]): readonly string[] {
  const adjacency = new Map<string, string[]>();
  const inDegree = new Map<string, number>();
  const nodes = new Set<string>();

  for (const edge of edges) {
    if (edge.fromId === edge.toId) {
      throw new AppError({
        code: 'DEPENDENCY_CYCLE_DETECTED',
        message: `Phát hiện vòng lặp phụ thuộc trực tiếp tại nút '${edge.fromId}'.`,
        details: { cyclePath: [edge.fromId, edge.toId] },
        recoverable: true
      });
    }
    nodes.add(edge.fromId);
    nodes.add(edge.toId);
    const list = adjacency.get(edge.fromId) ?? [];
    if (!list.includes(edge.toId)) {
      list.push(edge.toId);
      adjacency.set(edge.fromId, list);
      inDegree.set(edge.toId, (inDegree.get(edge.toId) ?? 0) + 1);
    }
    if (!inDegree.has(edge.fromId)) {
      inDegree.set(edge.fromId, 0);
    }
  }

  const queue: string[] = [];
  for (const node of nodes) {
    if ((inDegree.get(node) ?? 0) === 0) {
      queue.push(node);
    }
  }

  const topoOrder: string[] = [];
  while (queue.length > 0) {
    const current = queue.shift()!;
    topoOrder.push(current);
    for (const neighbor of adjacency.get(current) ?? []) {
      const nextDeg = (inDegree.get(neighbor) ?? 1) - 1;
      inDegree.set(neighbor, nextDeg);
      if (nextDeg === 0) {
        queue.push(neighbor);
      }
    }
  }

  if (topoOrder.length !== nodes.size) {
    const cyclePath = findFirstCyclePath(nodes, adjacency);
    throw new AppError({
      code: 'DEPENDENCY_CYCLE_DETECTED',
      message: `Phát hiện vòng lặp phụ thuộc trên đồ thị DAG: ${cyclePath.join(' -> ')}.`,
      details: { cyclePath },
      recoverable: true
    });
  }

  return Object.freeze(topoOrder);
}

function findFirstCyclePath(
  nodes: ReadonlySet<string>,
  adjacency: ReadonlyMap<string, readonly string[]>
): readonly string[] {
  const visitState = new Map<string, 'VISITING' | 'VISITED'>();
  const stack: string[] = [];

  const dfs = (node: string): readonly string[] | null => {
    visitState.set(node, 'VISITING');
    stack.push(node);

    for (const next of adjacency.get(node) ?? []) {
      const st = visitState.get(next);
      if (st === 'VISITING') {
        const cycleStartIdx = stack.indexOf(next);
        return [...stack.slice(cycleStartIdx), next];
      }
      if (!st) {
        const found = dfs(next);
        if (found) return found;
      }
    }

    stack.pop();
    visitState.set(node, 'VISITED');
    return null;
  };

  for (const node of nodes) {
    if (!visitState.has(node)) {
      const found = dfs(node);
      if (found) return found;
    }
  }
  return [];
}

/**
 * Tìm bao đóng bắc cầu xuôi dòng (transitive downstream dependents) theo thứ tự topological,
 * không bao gồm các nút gốc vừa thay đổi trực tiếp (`changedNodeIds`).
 */
export function computeTransitiveDownstreamNodes(
  changedNodeIds: readonly string[],
  edges: readonly DependencyEdge[]
): readonly string[] {
  const topoOrder = assertAcyclicDependencyGraph(edges);
  const adjacency = new Map<string, string[]>();
  for (const edge of edges) {
    const list = adjacency.get(edge.fromId) ?? [];
    list.push(edge.toId);
    adjacency.set(edge.fromId, list);
  }

  const changedSet = new Set(changedNodeIds);
  const visitedDownstream = new Set<string>();
  const bfsQueue = [...changedSet];

  while (bfsQueue.length > 0) {
    const curr = bfsQueue.shift()!;
    for (const next of adjacency.get(curr) ?? []) {
      if (!changedSet.has(next) && !visitedDownstream.has(next)) {
        visitedDownstream.add(next);
        bfsQueue.push(next);
      }
    }
  }

  const orderedDownstream = topoOrder.filter((nodeId) => visitedDownstream.has(nodeId));
  return Object.freeze(orderedDownstream);
}

/**
 * Tìm toàn bộ các nút thượng nguồn (transitive upstream) mà `targetNodeId` phụ thuộc vào.
 */
export function computeTransitiveUpstreamNodes(
  targetNodeId: string,
  edges: readonly DependencyEdge[]
): readonly string[] {
  const topoOrder = assertAcyclicDependencyGraph(edges);
  const reverseAdjacency = new Map<string, string[]>();
  for (const edge of edges) {
    const list = reverseAdjacency.get(edge.toId) ?? [];
    list.push(edge.fromId);
    reverseAdjacency.set(edge.toId, list);
  }

  const visitedUpstream = new Set<string>();
  const queue = [targetNodeId];
  while (queue.length > 0) {
    const curr = queue.shift()!;
    for (const prev of reverseAdjacency.get(curr) ?? []) {
      if (prev !== targetNodeId && !visitedUpstream.has(prev)) {
        visitedUpstream.add(prev);
        queue.push(prev);
      }
    }
  }

  return Object.freeze(topoOrder.filter((nodeId) => visitedUpstream.has(nodeId)));
}

export interface InvalidationPropagationInput {
  readonly changedNodeIds: readonly string[];
  readonly edges: readonly DependencyEdge[];
  readonly calculationStatuses: Readonly<Record<string, CalculationResultStatus>>;
  readonly revisions: readonly SectionRevision[];
  readonly requiredSectionIds?: readonly string[];
  readonly currentBuildStatus?: DocumentBuildStatus;
}

export interface InvalidationPropagationResult {
  readonly affectedDownstreamIds: readonly string[];
  readonly nextCalculationStatuses: Readonly<Record<string, CalculationResultStatus>>;
  /**
   * Các SectionRevision cũ được giữ nguyên bất biến trong lịch sử (KHÔNG xóa, KHÔNG sửa tay),
   * nhưng các revision thuộc `invalidatedBuildRevisionIds` không còn hiệu lực cho bản build mới (§1.2 & §3.2).
   */
  readonly preservedRevisions: readonly SectionRevision[];
  readonly invalidatedBuildRevisionIds: readonly string[];
  readonly nextBuildStatus: DocumentBuildStatus;
}

/**
 * Lan truyền trạng thái `STALE` xuôi dòng khi dữ liệu nguồn, biến hoặc Rule thay đổi (§3.2):
 * - Chỉ các phần phụ thuộc hạ nguồn bị gán `STALE`; các phần không liên quan giữ nguyên trạng thái (AC3, AC7).
 * - Giữ nguyên toàn bộ `SectionRevision` cũ trong lịch sử, đồng thời đánh dấu danh sách revision hết hiệu lực với bản build mới.
 * - Nếu bất kỳ Section bắt buộc nào rơi vào `STALE`, trạng thái `DocumentBuild` hiện tại (trừ bản `EXPORTED` lịch sử) chuyển về `BLOCKED`.
 */
export function propagateDownstreamInvalidation(
  input: InvalidationPropagationInput
): InvalidationPropagationResult {
  const affectedDownstreamIds = computeTransitiveDownstreamNodes(
    input.changedNodeIds,
    input.edges
  );
  const affectedSet = new Set(affectedDownstreamIds);

  const nextCalculationStatuses: Record<string, CalculationResultStatus> = {
    ...input.calculationStatuses
  };

  for (const nodeId of affectedDownstreamIds) {
    const currentStatus = nextCalculationStatuses[nodeId] ?? 'NOT_RUN';
    nextCalculationStatuses[nodeId] =
      currentStatus === 'STALE'
        ? 'STALE'
        : transitionCalculationResultStatus(currentStatus, 'STALE');
  }

  const invalidatedBuildRevisionIds = input.revisions
    .filter((rev) => affectedSet.has(rev.sectionId) && rev.reviewStatus === 'APPROVED')
    .map((rev) => rev.id);

  const requiredSet = new Set(input.requiredSectionIds ?? Object.keys(nextCalculationStatuses));
  const hasRequiredStale = Array.from(requiredSet).some(
    (secId) => nextCalculationStatuses[secId] === 'STALE'
  );

  const priorBuildStatus = input.currentBuildStatus ?? 'BLOCKED';
  let nextBuildStatus: DocumentBuildStatus = priorBuildStatus;
  if (hasRequiredStale && priorBuildStatus !== 'EXPORTED') {
    nextBuildStatus = 'BLOCKED';
  }

  return Object.freeze({
    affectedDownstreamIds,
    nextCalculationStatuses: Object.freeze(nextCalculationStatuses),
    preservedRevisions: Object.freeze([...input.revisions]),
    invalidatedBuildRevisionIds: Object.freeze(invalidatedBuildRevisionIds),
    nextBuildStatus
  });
}

/**
 * Kiểm tra điều kiện thượng nguồn trước khi chạy chế độ `SELECTED` cho một Section đơn lẻ (§3.2 & AC4).
 */
export function assertSelectedSectionUpstreamReady(params: {
  readonly targetSectionId: string;
  readonly edges: readonly DependencyEdge[];
  readonly calculationStatuses: Readonly<Record<string, CalculationResultStatus>>;
}): void {
  const upstreamIds = computeTransitiveUpstreamNodes(params.targetSectionId, params.edges);
  const staleUpstreamIds = upstreamIds.filter((nodeId) => {
    const st = params.calculationStatuses[nodeId];
    return st === 'STALE' || st === 'NOT_RUN' || st === 'FAILED';
  });

  if (staleUpstreamIds.length > 0) {
    throw new AppError({
      code: 'UPSTREAM_SECTION_STALE',
      message: `Không thể chạy riêng '${params.targetSectionId}' khi phần thượng nguồn đang chưa đồng bộ (${staleUpstreamIds.join(', ')}) — hãy chạy kèm upstream hoặc chọn chế độ Affected.`,
      details: {
        targetSectionId: params.targetSectionId,
        upstreamStaleIds: staleUpstreamIds
      },
      recoverable: true
    });
  }
}

/**
 * Hoàn tất chạy đơn lẻ một Section (`SELECTED` mode, ví dụ chỉ chạy Section 02):
 * - Section 02 chuyển sang `RESULT_READY`.
 * - Các Section hạ nguồn (ví dụ Section 03–05) giữ nguyên `STALE` và cổng Build tiếp tục bị `BLOCKED` (§3.2, AC4).
 */
export function completeSelectedSectionCalculation(params: {
  readonly targetSectionId: string;
  readonly calculationStatuses: Readonly<Record<string, CalculationResultStatus>>;
  readonly requiredSectionIds: readonly string[];
}): {
  readonly nextCalculationStatuses: Readonly<Record<string, CalculationResultStatus>>;
  readonly remainingStaleRequiredIds: readonly string[];
  readonly isBuildBlocked: boolean;
} {
  const currentTargetStatus = params.calculationStatuses[params.targetSectionId] ?? 'NOT_RUN';
  const runningStatus =
    currentTargetStatus === 'RUNNING'
      ? 'RUNNING'
      : transitionCalculationResultStatus(currentTargetStatus, 'RUNNING');
  const readyStatus = transitionCalculationResultStatus(runningStatus, 'RESULT_READY');

  const nextCalculationStatuses: Record<string, CalculationResultStatus> = {
    ...params.calculationStatuses,
    [params.targetSectionId]: readyStatus
  };

  const remainingStaleRequiredIds = params.requiredSectionIds.filter((secId) => {
    const st = nextCalculationStatuses[secId];
    return st === 'STALE' || st === 'NOT_RUN' || st === 'FAILED' || st === 'RUNNING';
  });

  return Object.freeze({
    nextCalculationStatuses: Object.freeze(nextCalculationStatuses),
    remainingStaleRequiredIds: Object.freeze(remainingStaleRequiredIds),
    isBuildBlocked: remainingStaleRequiredIds.length > 0
  });
}

/**
 * Quy tắc tránh sinh Diff nội dung thừa khi tính lại nhưng kết quả không đổi (§3.2 bullet 5 & §7.3):
 * - Vẫn lưu bản ghi `Run` & `RunStep` provenance mới (`shouldPersistRunProvenance: true`).
 * - Chỉ tạo đề xuất `SectionRevision` / `Content Diff` mới nếu `outputHash` đổi hoặc quy tắc viết nhận xét (`narrativeRuleChanged`) thay đổi.
 */
export function evaluateRecomputedOutputEquivalence(params: {
  readonly previousOutputHash: Sha256Hash | null;
  readonly newOutputHash: Sha256Hash;
  readonly narrativeRuleChanged?: boolean;
}): {
  readonly hasSemanticChange: boolean;
  readonly shouldCreateProposedRevision: boolean;
  readonly shouldPersistRunProvenance: true;
} {
  const outputSame =
    params.previousOutputHash !== null &&
    params.previousOutputHash.toLowerCase() === params.newOutputHash.toLowerCase();
  const hasSemanticChange = !outputSame || params.narrativeRuleChanged === true;

  return Object.freeze({
    hasSemanticChange,
    shouldCreateProposedRevision: hasSemanticChange,
    shouldPersistRunProvenance: true as const
  });
}
