# API authorization

## Model

- **Space owner** — `spaces.created_by` equals the signed-in Supabase user id. Owners use the dashboard with session cookies.
- **Contributor** — a row in `space_members` with a non-null `contributor_id` (set after `/join/[token]`). Contributors call APIs **without** a Supabase session and must pass `contributorId` (and `spaceId`) where documented.

Route handlers use the **service role** DB client only after access is checked. The caller is identified via:

1. **`getSessionUser()`** — JWT from cookies (`@supabase/ssr` + `createBrowserClient` in `lib/supabase.js`).
2. **`contributorId`** — query/body, verified against `space_members`.

## Endpoints

| Route | Who |
|--------|-----|
| `GET/POST /api/spaces`, `PATCH /api/spaces` | Signed-in owner only (`created_by` enforced). |
| `POST /api/spaces/invite` | Signed-in owner of `spaceId`. |
| `GET /api/spaces/invite?token=` | Public (invite landing). |
| `POST /api/spaces/invite/join` | Public (valid token). |
| `GET /api/spaces/log` | Owner only. |
| `GET/POST /api/memories`, `PATCH /api/memories` | Owner **or** valid `(spaceId, contributorId)`. PATCH: owner **or** contributor editing their own memory (body `contributorId`). |
| `POST /api/upload` | Owner **or** valid contributor. |
| `POST /api/generate-story` | Owner **or** body `contributorId` for that space. |
| `GET /api/story` | Owner **or** `?contributorId=` for that space. |
| `POST /api/story/tweak` | Owner only. |
| `POST /api/cartoonify` | Owner of `spaceId` only. Body: `{ storagePath, spaceId }` where `storagePath` was returned by **`POST /api/upload`** with `type=avatar` (same `spaceId`). Server signs the path and calls Replicate — **no arbitrary image URLs** (SSRF-safe). |
| `POST /api/feedback` | Public; `user_id` and `space_id` are taken from the session when present (`space_id` only if the user owns that space). |

## Client notes

- After this change, the browser uses **cookie-backed** sessions (`createBrowserClient`). Users who only had a **localStorage** session may need to **sign in once** again.
- `fetch('/api/...')` from the same origin sends cookies by default; no change needed for dashboard.

## Rate limits (in-process)

Fixed-window counters in `lib/rate-limit.js` (per server instance; use Redis/Upstash for multi-node).

| Area | Default | Env overrides |
|------|---------|----------------|
| `POST /api/generate-story` | 20 / hour / user, contributor, or IP | `HEMSAGA_RL_GENERATE_MAX`, `HEMSAGA_RL_GENERATE_WINDOW_MS` |
| `POST /api/story/tweak` | 45 / hour / user | `HEMSAGA_RL_TWEAK_MAX`, `HEMSAGA_RL_TWEAK_WINDOW_MS` |
| `POST /api/cartoonify` | 30 / hour / user | `HEMSAGA_RL_CARTOON_MAX`, `HEMSAGA_RL_CARTOON_WINDOW_MS` |

429 responses include `retryAfter` (seconds).

## Story JSON validation

Chapter-shaped model output is validated with **Zod** (`lib/ai/storyChapterJson.js`). One **repair** LLM call runs if the first parse fails schema checks.

## Storage bucket `memories`

Apply **`docs/migrations/004_storage_memories_rls.sql`** in Supabase so anon/authenticated clients cannot read/write the bucket directly; only the **service role** (API routes) can.

## Optional hardening

- Add Supabase **middleware** to refresh auth cookies on navigation (see Supabase “Auth with Next.js” guide).
- Replace in-memory rate limits with **Redis** (or Vercel KV) for serverless multi-instance.
