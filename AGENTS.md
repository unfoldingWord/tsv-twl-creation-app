# Repository Guidelines

## Project Structure & Module Organization
- `src/` — React app source.
  - `components/` (PascalCase `.jsx` UI components)
  - `hooks/` (custom hooks, `useX` naming)
  - `services/` (API/integration logic, e.g., Netlify/DCS/DynamoDB)
  - `utils/` (pure helpers), `common/` (shared data such as books)
- `netlify/functions/` — serverless functions (`.cjs`), deployed by Netlify.
- `dist/` — production build output (generated).
- Root assets/config: `index.html`, `vite.config.js`, `.eslintrc.json`, `netlify.toml`.
- See `ARCHITECTURE.md` and `LOCAL_DEVELOPMENT.md` for deeper details.

## Build, Test, and Development Commands
- `pnpm install` — install dependencies.
- `pnpm dev` — run full Netlify dev (Vite + functions).
- `pnpm dev:vite` — Vite only (functions disabled).
- `pnpm functions:serve` — serve Netlify functions locally.
- `pnpm build` — production build to `dist/`.
- `pnpm preview` — preview the production build.
- `pnpm lint` — run ESLint (React + hooks rules).

## Coding Style & Naming Conventions
- JavaScript/JSX with 2‑space indentation; ES modules.
- React functional components; files in `components/` use PascalCase (e.g., `ScriptureViewer.jsx`).
- Hooks are prefixed with `use` (e.g., `useTableData.js`).
- Utilities/services use camelCase (e.g., `twlService.js`).
- Linting via `.eslintrc.json` with `eslint`, `plugin:react`, and `react-hooks` (no Prettier configured).

## Testing Guidelines
- No formal test suite yet. If adding tests:
  - Prefer Vitest + React Testing Library.
  - Place tests alongside files (`*.test.jsx`) or under `src/__tests__/`.
  - Aim for meaningful coverage on new/changed code; include DOM behavior tests for components and pure unit tests for `utils/`.

## Commit & Pull Request Guidelines
- Commit messages: imperative, concise scope-first summary (e.g., "TWLTable: fix deleted rows ordering").
- Before PR: ensure `pnpm lint` passes and app builds.
- PR description: purpose, key changes, impact; link issues; include screenshots/GIFs for UI changes.
- Checklist: no secrets in `.env`, updated docs when behavior/commands change, tested Netlify functions locally when relevant.

## Security & Configuration Tips
- Configure `.env` locally (see `LOCAL_DEVELOPMENT.md`): `TWL_AWS_*`, `TWL_DYNAMODB_TABLE_NAME`, `DCS_TOKEN`, `DCS_HOST`.
- Do not commit `.env` or credentials. Use Netlify environment variables in production.
