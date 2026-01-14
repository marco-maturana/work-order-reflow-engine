import { buildDependencyGraph, ensureAcyclic, topologicalSort } from '../../src/reflow/dag';
import { createWorkOrder } from '../factories/work-order';

describe('DAG utilities', () => {
  it('sorts work orders respecting dependencies', () => {
    const workOrders = [
      createWorkOrder('A'),
      createWorkOrder('B', ['A']),
      createWorkOrder('C', ['B']),
      createWorkOrder('D'),
    ];

    const order = topologicalSort(workOrders);
    const pos = (id: string) => order.indexOf(id);

    expect(order).toHaveLength(workOrders.length);
    expect(pos('A')).toBeLessThan(pos('B'));
    expect(pos('B')).toBeLessThan(pos('C'));
  });

  it('throws on circular dependencies', () => {
    const cyclic = [createWorkOrder('A', ['B']), createWorkOrder('B', ['A'])];
    expect(() => ensureAcyclic(cyclic)).toThrow(/circular dependency/i);
  });

  it('throws when dependency is missing from input set', () => {
    const missing = [createWorkOrder('A', ['X'])];
    expect(() => buildDependencyGraph(missing) && topologicalSort(missing)).toThrow(
      /unknown dependencies/i,
    );
  });
});
