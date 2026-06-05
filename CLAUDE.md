# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What This App Does

TSV TWL Creation App generates and manages Translation Word Lists (TWL) in TSV format for biblical translation projects. It fetches USFM content from the Door43 Content Service (DCS), generates TWL entries using the `twl-generator` library, merges them with existing TWL files, and commits results back to DCS via Gitea API.

## Commands

```bash
pnpm install          # Install dependencies
pnpm dev              # Full dev: Vite + Netlify functions (http://localhost:8888)
pnpm dev:vite         # Vite only, no serverless functions (http://localhost:5173)
pnpm functions:serve  # Netlify functions only
pnpm build            # Production build to dist/
pnpm lint             # ESLint with --max-warnings 0 (must pass before PR)
pnpm preview          # Preview production build
```

There is no test suite. `pnpm lint && pnpm build` is the pre-PR validation.

## Architecture

```
src/
  App.jsx                  # Main orchestration (~2000 lines); layout, event handlers, state wiring
  components/              # UI: TWLTable.jsx, ScriptureViewer.jsx, UnlinkedWordsManager.jsx
  hooks/                   # useAppState.js (book/branch/loading), useTableData.js, useUnlinkedWords.js
  services/                # apiService.js (DCS API), twlService.js (merge algorithms),
                           # deletedRowsApi.js, unlinkedWordsApi.js (DynamoDB)
  utils/                   # Pure helpers: tsvUtils.js, verseOrdering.js, usfmUtils.js,
                           # storage.js, urlConverters.js, disambiguationUtils.js,
                           # unlinkedWords.js, deletedRows.js, userUtils.js
  common/books.js          # Bible book reference data
netlify/functions/         # Serverless backend (.cjs): commit-to-dcs, add/get/remove-deleted-row,
                           # add/get/remove-unlinked-word
```

## Key Architectural Points

**Two merge strategies in `twlService.js`:**
- `mergeExistingTwls()` — Fetched-first: preserves existing TWL order; use when updating existing lists
- `mergeExistingTwlsGeneratedFirst()` — Generated-first: uses algorithm order; use for books with no prior automated TWLs

Both handle disambiguation merging (when matched rows have different TWLinks, options are combined).

**Two DynamoDB tables** (accessed only via Netlify functions, never directly from the browser):
- `twl-unlinked-words` — globally suppresses specific word/link combinations from future generations
- `twl-deleted-rows` — soft-delete tracking so row deletions persist across sessions/regenerations

**DCS integration:** The app supports multiple DCS instances selected via the `?server=` URL param (`qa` → qa.door43.org, `dev`/`develop` → develop.door43.org, `prod`/`git` → git.door43.org, or a custom domain); the default is inferred from hostname in `useAppState.js`. The `commit-to-dcs.cjs` function creates branches and PRs on DCS via Gitea API. Only the first 6 TSV columns are submitted to DCS; additional columns are app-internal.

**State persistence:** `src/utils/storage.js` abstracts localStorage with cookie fallback. User identity is managed in `userUtils.js`.

## Environment

Netlify functions require `.env` at the project root (see `.env.example`):
```
TWL_AWS_ACCESS_KEY_ID
TWL_AWS_SECRET_ACCESS_KEY
TWL_AWS_REGION=us-east-1
TWL_DYNAMODB_TABLE_NAME=twl-unlinked-words
TWL_DYNAMODB_DELETED_TABLE_NAME=twl-deleted-rows
DCS_TOKEN
DCS_HOST=git.door43.org
```

See `LOCAL_DEVELOPMENT.md` for DynamoDB local testing details and `DYNAMODB_SETUP.md` for AWS infrastructure setup.

## Conventions

- ES modules throughout (`"type": "module"` in package.json); Netlify functions use CommonJS (`.cjs`)
- 2-space indentation, React functional components only
- Naming: PascalCase for `components/`, `useX` for hooks, camelCase for utils/services
- Commit messages: imperative, scope-first (e.g., `TWLTable: fix deleted rows ordering`)
- `vite.config.js` has a `@common` path alias → `src/common`
- `src/App_old.jsx` is the legacy monolith kept for reference — do not edit it; `App.jsx` is the live entry point
- Deeper docs: `ARCHITECTURE.md` (module breakdown/refactor history) and `AGENTS.md` (contributor conventions)
