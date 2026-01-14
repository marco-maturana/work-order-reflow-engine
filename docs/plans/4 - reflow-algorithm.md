# Task: Reflow algorithm

## Objective
Schedule work orders in topological order, finding earliest valid slots that respect all constraints.

## Scope
- Use DAG order, compute earliest start (dependencies + work center availability).
- Find earliest valid window per work center (shifts + maintenance + conflicts).
- Produce updated start/end, changes list, and explanations.

## Steps
1) Wire DAG ordering and maintenance immutability in `src/reflow/reflow.service.ts`.
2) Implement earliest-slot search per work center using calendar/time helpers.
3) Build changes/explanation payloads.
4) Add integration coverage in `tests/integration/reflow.spec.ts` using the scenarios (delay cascade, maintenance conflict, multi-parent).

## Risks / Notes
- Avoid infinite search when no valid shifts; return descriptive error on impossible schedules.
