# Task: Scenario data

## Objective
Create JSON scenarios to exercise the reflow engine and CLI output.

## Scope
- Three scenarios: delay cascade, maintenance conflict, multi-parent dependencies.
- Use doc wrapper format `{ docId, docType, data }`.

## Steps
1) Author JSON files under `data/` for the three scenarios.
2) Ensure UTC timestamps and consistent work centers/shifts.
3) Validate via integration tests and manual CLI smoke test.

## Risks / Notes
- Keep durations small for readable outputs.
