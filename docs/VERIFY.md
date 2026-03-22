# Checks after every change

Git hooks run automatically when hooks are installed (`npm install` runs `prepare` → `husky`).

## What runs when

| When | What |
|------|------|
| **`git commit`** | **lint-staged** — ESLint on staged `*.js, *.jsx, *.mjs, *.cjs` only (`--max-warnings=0`). |
| **`git push`** | **`npm run verify`** — full ESLint on the repo + **`next build`** (catches broken imports/types). |

E2E is **not** in hooks by default (slow, needs dev server + test user). Run manually or in CI:

```bash
npm run verify:e2e
```

## Manual commands

```bash
npm run lint          # ESLint whole project
npm run verify        # lint + production build
npm run verify:e2e    # Playwright (see TESTING.md)
```

## Skip push verify (emergency only)

```bash
# Git Bash / macOS / Linux
HEMSAGA_SKIP_VERIFY=1 git push

# Windows PowerShell
$env:HEMSAGA_SKIP_VERIFY="1"; git push
```

Prefer fixing the failure over skipping.

## CI (GitHub)

Workflow `.github/workflows/verify.yml` runs **lint + build** on push and PRs. Add secrets and enable Playwright there if you want E2E in CI.
