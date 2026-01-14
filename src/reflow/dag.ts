import type { WorkOrderDocument } from './types';

export type DependencyGraph = Map<string, Set<string>>;

export function buildDependencyGraph(workOrders: WorkOrderDocument[]): DependencyGraph {
  const graph: DependencyGraph = new Map();
  workOrders.forEach((wo) => {
    graph.set(wo.docId, new Set(wo.data.dependsOnWorkOrderIds));
  });
  return graph;
}

export function topologicalSort(workOrders: WorkOrderDocument[]): string[] {
  // @upgrade Implement real topological sort with cycle detection.
  return workOrders.map((wo) => wo.docId);
}

export function ensureAcyclic(workOrders: WorkOrderDocument[]): void {
  // @upgrade Implement cycle detection; throw descriptive error on cycles.
  void workOrders;
}
