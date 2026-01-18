# Task: Maintenance work orders as blocking intervals

## Objective

Treat `isMaintenance` work orders as blocking time on a work center (same as maintenance windows) so reflow and validation prevent overlaps.

## Scope

- Reflow conflict detection (`src/reflow/reflow.service.ts`).
- Constraint validation (`src/reflow/constraint-checker.ts`).
- Scenario/test coverage (scenario data + integration test).
- Documentation updates in README when behavior changes.

## Steps

1. [x] Update reflow scheduling to consider maintenance work orders as occupied intervals when searching for the next available slot.
2. [x] Update constraint checker to flag overlaps with maintenance work orders and keep maintenance orders fixed.
3. [x] Add or update a scenario that forces a conflict with a maintenance work order and assert expected reflow/validation outcomes in tests.
4. [x] Document the new behavior and any edge cases (multiple maintenance sources, shift boundaries).

## Risks / Notes

- Existing schedules may shift once maintenance work orders block time.
- Added an integration test that exercises maintenance conflict; scenario data unchanged.
- Avoid infinite loops when the next available slot lands inside a maintenance interval.
- Keep all timestamps in UTC and maintain working-minutes logic.
