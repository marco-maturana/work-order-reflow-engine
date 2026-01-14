# Task: Constraint checker

## Objective
Validate the final schedule against all hard constraints and return clear errors.

## Scope
- Dependency satisfaction.
- Work center overlap detection.
- Shift and maintenance compliance.
- Maintenance work orders not rescheduled.

## Steps
1) Implement validations in `src/reflow/constraint-checker.ts`.
2) Provide aggregated result with `isValid` and error messages.
3) Add unit tests for validation cases (`tests/unit/constraint-checker.spec.ts` or similar).

## Risks / Notes
- Keep messages human-readable for CLI output.
