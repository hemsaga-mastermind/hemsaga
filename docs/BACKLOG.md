# Feedback backlog & weekly agent

Feedback and suggestions are stored in the **`feedback`** table in Supabase. **Bugs are always priority** (they get a higher `priority` value and are emailed to the admin immediately).

## Flow

1. **Users** submit feedback from the dashboard (💬 Feedback): type = bug | suggestion | other, plus optional contact email.
2. **Every new submission** triggers an email to **admin@dancing-flamingo.org** (or `FEEDBACK_ADMIN_EMAIL`) so you see it right away.
3. **Storage**: All rows are in `feedback` with `status` = `new` (or `backlog` / `in_progress` / `done` when you triage).
4. **Weekly**: Run a backlog process (see below) so an agent or human can implement features and fix bugs.

## Is this a good idea?

**Yes, with a few caveats:**

- **Pros:** One place for feedback, instant email so nothing is missed, clear “bugs first” rule, backlog supports a weekly review loop.
- **Caveats:**
  - The “agent” that implements features should be **guided**: e.g. a Cursor agent or a human using a prioritized list. Full auto-implementation from natural language is risky; use the backlog as **input** to tasks, not as unchecked automation.
  - Keep the backlog **actionable**: mark items as `backlog` → `in_progress` → `done` and add short `notes` when you start work so the agent (or you) knows what’s done.

## Getting the backlog (for a weekly agent)

### Option A: Export from Supabase

In Supabase SQL editor (or a small script):

```sql
SELECT id, created_at, type, priority, content, contact_email, status
FROM feedback
WHERE status IN ('new', 'backlog')
ORDER BY priority DESC NULLS LAST, type = 'bug' DESC, created_at ASC;
```

Export as CSV or copy into a doc.

### Option B: Script that writes a markdown file

Run weekly (e.g. cron or by hand):

```bash
node scripts/export-feedback-backlog.mjs
```

This can query the `feedback` table (using service role) and write `docs/feedback-backlog.md` with:

- Bugs first (by priority, then date)
- Then suggestions, then other
- Only `new` or `backlog` status

Then when you (or an agent) do the weekly pass:

1. Open `docs/feedback-backlog.md`.
2. Fix **bugs** first; mark them `in_progress` then `done` in Supabase (or via a small admin API later).
3. Pick **suggestions** to implement; same status flow.
4. Add a sentence in `notes` or in the doc so the next run doesn’t re-pick the same item.

### Option C: GitHub Issues

A weekly job can create GitHub issues from `feedback` rows (e.g. label `bug` vs `suggestion`) and link back to the row id. Then your process is “work from GitHub; update Supabase when done.”

## Weekly agent instructions (for Cursor or similar)

When running a “weekly backlog” pass:

1. **Load the backlog** (from `feedback` export or `docs/feedback-backlog.md`).
2. **Bugs first:** Tackle every open bug before any suggestion.
3. **Then suggestions:** Implement or schedule a few; mark the rest as backlog.
4. **Update status** so the same items don’t get picked again (e.g. set `status = 'in_progress'` when starting, `done` when finished; optional `notes`).
5. **No personal or obscene content** in implementation; keep product safe and on-brand.

## Env and setup

1. **Create the table:** Run `docs/migrations/003_feedback.sql` in the Supabase SQL editor once.
2. **Add to `.env.local`:**
   - **FEEDBACK_ADMIN_EMAIL** – Receives every new feedback (default: `admin@dancing-flamingo.org`).
   - **RESEND_API_KEY** – Required to send emails (create at resend.com; free tier is enough).
   - **FEEDBACK_FROM_EMAIL** (optional) – Sender address. Omit to use `onboarding@resend.dev` (testing); for production use a verified domain e.g. `Hemsaga <feedback@yourdomain.com>`.
