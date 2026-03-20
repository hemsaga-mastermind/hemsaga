# E2E Testing

## Test user

A dedicated test user is used for end-to-end tests so login works without email confirmation.

**Create the test user** (run once, or after deleting the user in Supabase):

```bash
npm run test:user
```

Defaults:

- **Email:** `e2e-test@hemsaga.local`
- **Password:** `E2E-Test-Password-1`

Override with env:

- `E2E_TEST_EMAIL`
- `E2E_TEST_PASSWORD`

The script reads `.env.local` from the project root for `NEXT_PUBLIC_SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`.

## Run E2E tests

```bash
npm run test:e2e
```

This starts the dev server (or reuses it), runs Playwright in Chromium, and executes:

- **Auth:** page load, login with test user, unauthenticated redirect to `/auth`
- **Dashboard:** create first space CTA, create space, add memory, memories list + edit date, generate button, invite modal, sidebar spaces

For interactive UI:

```bash
npm run test:e2e:ui
```

## What is covered

| Area        | Tests |
|------------|--------|
| Auth       | Sign-in page, login → dashboard, dashboard without auth → redirect to auth |
| Spaces     | Create a new space, sidebar shows space |
| Memories   | Add memory (with optional follow-up fields), memory appears in feed, Memories view, Edit date button |
| Story      | Generate button visible when space has memories |
| Invite     | Invite modal opens, Generate Invite Link visible |
| Sidebar    | At least one space in sidebar |

Generate story is not fully exercised (click + wait for AI) to avoid long runs and API usage in CI; you can add a separate test with a long timeout if needed.
