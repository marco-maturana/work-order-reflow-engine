# Task: Project scaffolding

## Objective

Bootstrap the project with tooling, base structure, and minimal entrypoints so we can implement the reflow engine next.

## Affected components

- `package.json`: scripts and dependencies (Node 22, TypeScript, Luxon, Jest, ESLint, Prettier).
- `tsconfig.json`: compiler settings for CLI TypeScript.
- `jest.config.ts` (or `.js`): Jest configuration for TypeScript.
- `.eslintrc.cjs` (or equivalent): lint rules.
- `.prettierrc`: formatting rules.
- `.gitignore`: ignore build and node artifacts.
- `src/index.ts`: CLI entrypoint stub.
- `src/reflow/types.ts`: core types (doc wrapper + data types).
- Folder structure: `src/reflow`, `src/utils`, `data`, `tests/unit`, `tests/integration`.

## Step-by-step plan

1. **Decide tooling defaults**
   - Chosen: ESM (`"type": "module"` / `moduleResolution: "NodeNext"`), dev runner `tsx`, Jest via `ts-jest`.
2. **Create project metadata**
   - Add `package.json` with scripts (`dev`, `build`, `start`, `test`, `lint`, `format`).
3. **Add TypeScript + test config**
   - Add `tsconfig.json` aligned to Node 22 and chosen module system.
   - Add Jest config for TS tests.
4. **Add lint/format config**
   - ESLint config with TypeScript support.
   - Prettier config.
5. **Create base structure**
   - Add directories and stub files for CLI and types.

## Testing strategy

- Smoke test after scaffolding: run `npm test` once a sample test exists.

## Risks & considerations

- ESM + Jest requires extra config; CJS is simpler but less aligned with modern Node defaults.
- Tooling choices should align with the final CLI execution expectations.
