import { topologicalSort } from '../../src/reflow/dag';
import { createWorkOrder } from '../factories/work-order';

describe('DAG utilities', () => {
  it('sorts work orders respecting dependencies', () => {
    const workOrders = [
      createWorkOrder({ docId: 'A' }),
      createWorkOrder({ docId: 'B', data: { dependsOnWorkOrderIds: ['A'] } }),
      createWorkOrder({ docId: 'C', data: { dependsOnWorkOrderIds: ['B'] } }),
      createWorkOrder({ docId: 'D' }),
    ];

    const order = topologicalSort(workOrders);
    const pos = (id: string) => order.indexOf(id);

    expect(order).toHaveLength(workOrders.length);
    expect(pos('A')).toBeLessThan(pos('B'));
    expect(pos('B')).toBeLessThan(pos('C'));
  });

  it('throws on circular dependencies', () => {
    const cyclic = [
      createWorkOrder({ docId: 'A', data: { dependsOnWorkOrderIds: ['B'] } }),
      createWorkOrder({ docId: 'B', data: { dependsOnWorkOrderIds: ['A'] } }),
    ];
    expect(() => topologicalSort(cyclic)).toThrow(/circular dependency/i);
  });

  it('throws when dependency is missing from input set', () => {
    const missing = [createWorkOrder({ docId: 'A', data: { dependsOnWorkOrderIds: ['X'] } })];
    expect(() => topologicalSort(missing) && topologicalSort(missing)).toThrow();
  });
});
