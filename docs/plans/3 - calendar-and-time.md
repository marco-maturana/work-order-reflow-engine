# Task: Calendar & working-time helpers

## Objective
Provide shift- and maintenance-aware time utilities to compute working intervals.

## Scope
- Shift helpers (`isWithinShift`, `nextShiftStart`) and maintenance checks.
- Working clock (`addWorkingMinutes`) that pauses outside shifts and during maintenance.

## Steps
1) Implement shift lookup and next-shift search in `src/utils/calendar.ts`.
2) Add maintenance skip logic to shift search.
3) Implement working clock in `src/utils/time.ts` using calendar helpers.
4) Add unit tests for shift boundaries, maintenance skip, and working clock (`tests/unit/calendar.spec.ts`, `tests/unit/time.spec.ts`).

## Risks / Notes
- Ensure UTC everywhere; guard against infinite loops when no shifts exist.
