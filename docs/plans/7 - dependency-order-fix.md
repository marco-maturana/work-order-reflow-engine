# Task: Preserve dependency order in reflow

## Objective

Ensure the reflow scheduler respects dependency order so children are never scheduled before parents.

## Scope

- Reflow ordering and dependency handling in `src/reflow/reflow.service.ts`.
- Optional defensive check for missing parent completion.
- Tests (run existing suite).

## Steps

1. [x] Remove the post-topological re-sorting so work orders stay in topological order.
2. [x] Guard against missing parents during scheduling (throw if a parent isn't completed when required).
3. [ ] Run Jest to confirm scenario and integration behavior.

## Decisions

- Keep topological order as the single source of sequencing.
- Fail fast if a dependency is not yet completed.

## Tests

- `npm test` (fails in this environment: `npm` not found)

## Risks / Notes

- If dependency order was relying on original start time, outputs may shift.
- Maintenance work orders still do not block conflicts (tracked in `docs/plans/8 - maintenance-work-orders.md`).
