# Task: Dependency DAG and topological sort

## Objective

Implement dependency graph utilities to order work orders, detect cycles, and surface clear errors.

## Scope

- Build adjacency graph from work orders.
- Topological sort with cycle detection.
- Descriptive error on cycles (list involved work orders).

## Steps

1. Implement graph builder and topo sort in `src/reflow/dag.ts` (with cycle detection and error messaging).
2. Export helper to return ordered work orders.
3. Add unit tests alongside implementation in `tests/unit/dag.spec.ts` (order + cycles).

## Risks / Notes

- Keep errors human-friendly for CLI output.
