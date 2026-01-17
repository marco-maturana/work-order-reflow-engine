import type { WorkOrderDocument } from './types';

export type DependencyGraph = Map<string, Set<string>>;

function assertKnownDependencies(workOrders: WorkOrderDocument[], ids: Set<string>): void {
  const unknownIds = new Set<string>();
  workOrders
    .flatMap((wo) => wo.data.dependsOnWorkOrderIds)
    .forEach((dep) => {
      if (!ids.has(dep)) {
        unknownIds.add(dep);
      }
    });

  if (unknownIds.size > 0) {
    throw new Error(`Unknown dependencies: ${Array.from(unknownIds).join(', ')}`);
  }
}

function cloneGraph(graph: DependencyGraph): DependencyGraph {
  const clone: DependencyGraph = new Map();
  for (const [id, deps] of graph) {
    clone.set(id, new Set(deps));
  }
  return clone;
}

function findNodesWithNoDependencies(graph: DependencyGraph): string[] {
  const ready: string[] = [];

  for (const [id, deps] of graph) {
    if (deps.size === 0) ready.push(id);
  }

  return ready;
}

function buildDependencyGraph(workOrders: WorkOrderDocument[]): DependencyGraph {
  const graph: DependencyGraph = new Map();

  workOrders.forEach((wo) => {
    graph.set(wo.docId, new Set(wo.data.dependsOnWorkOrderIds));
  });

  return graph;
}

/**
 * Returns work order IDs in topological order (dependencies before dependents).
 *
 * Uses Kahn's algorithm:
 * 1. Find all nodes with no dependencies (in-degree = 0).
 * 2. Remove them from the graph and add to result.
 * 3. Repeat until all nodes are processed or a cycle is detected.
 *
 * @param workOrders - List of work orders to sort.
 * @returns Array of work order IDs in dependency order.
 * @throws Error if circular dependencies or unknown dependencies are found.
 */
export function topologicalSort(workOrders: WorkOrderDocument[]): string[] {
  const knownIds = new Set(workOrders.map((wo) => wo.docId));
  const graph = buildDependencyGraph(workOrders);

  assertKnownDependencies(workOrders, knownIds);

  const remaining = cloneGraph(graph);
  const nodesWithNoDependencies = findNodesWithNoDependencies(remaining);

  const sorted: string[] = [];

  while (nodesWithNoDependencies.length > 0) {
    const current = nodesWithNoDependencies.shift()!;

    sorted.push(current);
    remaining.delete(current);

    for (const [id, deps] of remaining) {
      if (deps.delete(current) && deps.size === 0) {
        nodesWithNoDependencies.push(id);
      }
    }
  }

  if (remaining.size > 0) {
    const cycleIds = Array.from(remaining.keys());
    throw new Error(`Circular dependency detected involving: ${cycleIds.join(', ')}`);
  }

  return sorted;
}
