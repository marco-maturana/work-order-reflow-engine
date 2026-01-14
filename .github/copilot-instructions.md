# AI Agent Instructions for work-order-reflow-engine

## Core principles

### 1. Ask, don't assume
- Never guess requirements or data shape.
- Ask when multiple approaches exist or constraints are unclear.
- Present options with pros/cons when relevant and wait for confirmation.

### 2. Plan before executing
- For multi-step tasks (more than 3 steps), create a short plan in `docs/plans/<task>.md`.
- Include objective, affected files, steps, decisions, tests, and risks.
- Ask for approval before implementation.

### 3. Communicate clearly
- Explain what you are doing and why.
- Call out trade-offs or risks.
- Keep responses concise.

### 4. Commit etiquette
- Do not commit unless explicitly asked.
- Propose a commit message and wait for confirmation.

## Project overview
- Simple CLI reflow engine for manufacturing schedules.
- Tech stack: Node.js 22, TypeScript, Luxon, Jest, ESLint, Prettier.

## Structure and conventions
- Entry point: `src/index.ts`.
- Core logic: `src/reflow/` and `src/utils/`.
- Scenario data: `data/*.json`.
- Tests: `tests/unit/` and `tests/integration/`.

## Scheduling rules (hard constraints)
- Respect dependencies, work center conflicts, shifts, and maintenance windows.
- Maintenance work orders cannot be rescheduled.
- Use working minutes and Luxon for time handling.

## Error handling
- Detect cycles in the dependency graph and throw a clear error.
- If a schedule is impossible, return a descriptive failure.

## Testing expectations
- Add or update Jest tests for new logic.
- Unit tests for helpers and DAG logic.
- Integration tests for scenario reflow.

## Code quality
- Favor clarity and explainability over cleverness.
- Use types; avoid `any` without strong justification.
- Add brief comments only when logic is non-obvious.
- Add `@upgrade` notes for future optimizations when relevant.
