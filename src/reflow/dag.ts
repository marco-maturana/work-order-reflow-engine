import type { WorkOrderDocument } from './types';

export type DependencyGraph = Map<string, Set<string>>;

function assertKnownDependencies(graph: DependencyGraph, ids: Set<string>): void {
  const unknown = new Set<string>();
  graph.forEach((deps) => {
    deps.forEach((dep) => {
      if (!ids.has(dep)) {
        unknown.add(dep);
      }
    });
  });

  if (unknown.size > 0) {
    throw new Error(`Unknown dependencies: ${Array.from(unknown).join(', ')}`);
  }
}

export function buildDependencyGraph(workOrders: WorkOrderDocument[]): DependencyGraph {
  const graph: DependencyGraph = new Map();
  workOrders.forEach((wo) => {
    graph.set(wo.docId, new Set(wo.data.dependsOnWorkOrderIds));
  });
  return graph;
}

export function topologicalSort(workOrders: WorkOrderDocument[]): string[] {
  const ids = new Set(workOrders.map((wo) => wo.docId));
  const graph = buildDependencyGraph(workOrders);
  assertKnownDependencies(graph, ids);

  // Kahn's algorithm over a mutable copy of dependency sets.
  const remaining = new Map<string, Set<string>>();
  graph.forEach((deps, id) => {
    remaining.set(id, new Set(deps));
  });

  const ready: string[] = [];
  remaining.forEach((deps, id) => {
    if (deps.size === 0) {
      ready.push(id);
    }
  });

  const order: string[] = [];
  while (ready.length > 0) {
    const current = ready.shift() as string;
    order.push(current);
    remaining.delete(current);

    remaining.forEach((deps, id) => {
      if (deps.delete(current) && deps.size === 0) {
        ready.push(id);
      }
    });
  }

  if (remaining.size > 0) {
    const cycleIds = Array.from(remaining.keys());
    throw new Error(`Circular dependency detected involving: ${cycleIds.join(', ')}`);
  }

  return order;
}

export function ensureAcyclic(workOrders: WorkOrderDocument[]): void {
  topologicalSort(workOrders);
}
