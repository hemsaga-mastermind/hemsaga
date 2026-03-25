# Beta email allowlist

## Request flow (recommended)

1. Visitor submits **Request access** on the homepage → row in **`access_requests`** (`POST /api/access-request`).
2. You **sign in** to the dashboard with an **admin** account (see below).
3. Open **Access requests** in the sidebar → **Approve** (adds to **`beta_allowlist`**) or **Reject**.

You can still grant access manually (SQL / `npm run beta:add`) if you prefer email-only requests.

## Admin accounts

A **built-in admin** is defined in `lib/admin-auth.js` (`BUILTIN_ADMIN_EMAILS` — must match the Supabase Auth email used at sign-in).

To add more admins without changing code, set:

```bash
HEMSAGA_ADMIN_EMAILS=colleague@yourdomain.com,another@yourdomain.com
```

These are merged with the built-in list. Only users whose session email is in the combined set see **Access requests** in the UI; admin APIs return **403** for everyone else.

## 1. Database

Run in Supabase **SQL Editor**:

- `docs/migrations/006_beta_allowlist.sql` — allowlist table  
- `docs/migrations/007_access_requests.sql` — inbound request queue for the homepage form

## 2. Turn on enforcement

In **Vercel** / your host (and locally in `.env.local` if you want to test):

```bash
HEMSAGA_BETA_ALLOWLIST=1
```

(Also accepted: `BETA_ALLOWLIST_ENFORCE=true`.)

- **Unset or ` `:** allowlist is **not** enforced; everyone can use `/auth` as today.
- **`1` / `true`:** only emails **present** in `beta_allowlist` with **`revoked_at` IS NULL** can sign up or sign in.

## 3. Grant access to one email

**Option A — script (uses service role from `.env.local`):**

```bash
node scripts/add-beta-email.mjs parent@example.com "Approved 2025-03-26"
```

**Option B — SQL:**

```sql
INSERT INTO beta_allowlist (email, note)
VALUES ('parent@example.com', 'Approved — request access')
ON CONFLICT (email) DO UPDATE
SET revoked_at = NULL,
    note = EXCLUDED.note;
```

Emails are stored **lowercase**. Matching is exact on normalized email.

## 4. Revoke access

```sql
UPDATE beta_allowlist
SET revoked_at = now()
WHERE email = 'parent@example.com';
```

They will be blocked on the **next** sign-in attempt (see **Limits** below).

## 5. How it works in the app

- `/auth` calls **`POST /api/auth/beta-check`** with the email before Supabase **sign up** or **sign in**.
- That route uses the **service role** to read `beta_allowlist` (no public exposure of the full list).
- Responses are rate-limited per IP to reduce guessing.

## Limits

- This is a **client + API gate**, not a replacement for Supabase Auth security. A determined person could bypass the UI only if they got API keys — keep **service role** secret.
- **Revocation** is enforced at **login time** via the check on `/auth`. An active session is **not** invalidated until they sign out or the JWT expires. For sensitive revokes, use Supabase Dashboard → **Auth** → delete/ban user.

## Optional: open beta later

Set `HEMSAGA_BETA_ALLOWLIST` unset or `0` and stop maintaining the table (or leave it for future waves).
