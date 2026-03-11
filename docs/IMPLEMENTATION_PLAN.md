# Hemsaga — Implementation Plan (Codebase Changes)

This document plans codebase changes to support the product vision: memory prompts, voice memories, living story (weave/tweak by placement), chapter history, scheduled reveal, and timeline. It is the single source of truth for what to build and in what order.

---

## Current state (reference)

| Area | Location | Notes |
|------|----------|--------|
| Add memory (contributor) | `app/contribute/[token]/page.js` | Single textarea, placeholder "Describe the moment…". POST to `/api/memories`. |
| Add memory (dashboard) | `app/dashboard/page.js` | Modal with author, date, textarea (`t.whatHappenedPlaceholder`), photo. Same API. |
| Memories API | `app/api/memories/route.js` | POST expects `spaceId`, `contributorId`, `author`, `content`, `memory_date`, `photo_path`. No `prompt_id`, no `audio_path`. |
| Story generation | `app/api/generate-story/route.js` | Append-only: loads all memories, existing chapters, writes **next** chapter (number = length+1). `regenerate: true` **deletes** all chapters and starts fresh. No placement/tweak. |
| Story storage | `stories` table | Assumed: `space_id`, `title`, `content`, `chapter_number`, `memories_used`. No versioning; regenerate overwrites. |
| Story reader | `app/dashboard/StoryReader.js`, contribute page | Receives `chapters` array; no "reveal date" or timeline. |

---

## Phase 1 — Better input (memory quality)

**Goal:** Improve what gets into memories: prompts to reduce blank-page anxiety, optional voice so more people contribute.

### 1.1 Memory prompts (rotating questions)

**What:** Instead of a blank textarea, show a rotating or random prompt: e.g. "What made you laugh this week?", "Describe how they looked today."

**Codebase changes:**

| Change | File(s) | Detail |
|--------|---------|--------|
| Add prompts list | New: `lib/prompts/memoryPrompts.js` (or in i18n) | Export array of prompt strings (EN + SV if needed). Categories optional (e.g. by space_type). |
| Contributor UI | `app/contribute/[token]/page.js` | Replace static placeholder with prompt: e.g. `placeholder={currentPrompt}`. Rotate on open or every N seconds. Optionally store `prompt_id` when saving. |
| Dashboard UI | `app/dashboard/page.js` | Same: use rotating prompt in Add Memory modal textarea (`t.whatHappenedPlaceholder` → prompt from list). |
| API (optional) | `app/api/memories/route.js` | Accept `prompt_id` in POST body; store in `memories` if column exists. |
| DB | Supabase `memories` | Add column `prompt_id` (nullable text or FK to a small prompts table). Migrate existing rows to NULL. |

**Dependencies:** None.  
**Order:** Prompts list → API → contribute page → dashboard modal. DB: run `docs/migrations/001_memories_prompt_id.sql` in Supabase when you want to store `prompt_id` (optional; UI works without it).

---

### 1.2 Voice memories (record → transcribe → store)

**What:** User records a short voice note (e.g. 60s). Backend stores audio file and transcript; story uses transcript; optionally "hear their voice" later.

**Codebase changes:**

| Change | File(s) | Detail |
|--------|---------|--------|
| Recording UI | `app/contribute/[token]/page.js`, `app/dashboard/page.js` | Add "Record" option next to text: record in browser (MediaRecorder), upload blob to new endpoint. Show transcript when ready; allow edit before save. |
| Upload audio API | New: `app/api/upload/voice/route.js` or extend `app/api/upload/route.js` | Accept multipart audio (e.g. webm/ogg). Upload to Supabase Storage (`memories` bucket or `voice` folder). Return `audio_path`. |
| Transcribe | New: `app/api/transcribe/route.js` or serverless | Call Whisper (OpenAI) or other provider with `audio_path`/URL. Return `content` (text). Idempotent if you store transcript on memory. |
| Memories API | `app/api/memories/route.js` | POST: accept `audio_path` (and optionally `content` from client if transcribed client-side). Store `audio_path` in DB. GET: sign `audio_path` same as photos for playback. |
| DB | Supabase `memories` | Add column `audio_path` (nullable text). |
| Storage | Supabase Storage | Bucket/folder for voice clips; RLS so only space members can read. |
| Story reader (later) | `app/dashboard/StoryReader.js` | Optional: "Hear their voice" per memory or per paragraph — needs memory→chapter mapping (see Phase 3). |

**Dependencies:** Prompts (1.1) optional; no dependency on Phase 2/3.  
**Order:** DB + Storage → upload API → transcribe API → memories API → recording UI (contribute then dashboard).

---

## Phase 2 — Chapter history (no overwrite)

**Goal:** Every chapter is saved permanently; "regenerate" does not delete past chapters. Builds the "real novel over years" behaviour.

**Codebase changes:**

| Change | File(s) | Detail |
|--------|---------|--------|
| Generation logic | `app/api/generate-story/route.js` | When `regenerate` is true, **do not** delete existing chapters. Either: (a) only add a new chapter with number = max+1, or (b) introduce "versions" (see below). For minimal change: just stop deleting; "regenerate" could mean "regenerate latest chapter only" (overwrite last) or "add new chapter from all memories." |
| Schema (optional) | `stories` table | Add `id` (uuid) and `created_at` if not present. Consider `version` or `generation_id` if you want to support "replace last chapter" without losing history (e.g. keep previous version in an `archive` or `story_versions` table). |
| Dashboard / contribute | `app/dashboard/page.js`, `app/contribute/[token]/page.js` | When calling generate: clarify "Add next chapter" vs "Regenerate last chapter" (if you add that). No UI change required if you only do "add next." |

**Dependencies:** None.  
**Order:** Decide semantics (append-only vs replace-last-with-history) → change generate-story route → optional schema for versions.

---

## Phase 3 — Living story (weave by placement + tweak)

**Goal:** A new memory can be woven into the *right place* in the story (e.g. Chapter 1 or a section). The plan and story adjust; we don’t only append.

**Codebase changes:**

| Change | File(s) | Detail |
|--------|---------|--------|
| Story structure | DB / API | Represent story as **chapters** with optional **sections** or just chapters. Each chapter has `content`, `chapter_number`, and optionally `theme` or `period` (e.g. "first year") for placement. |
| Placement logic | New: `lib/story/placement.js` or inside API | Given a new memory (content, `memory_date`, optionally theme from prompt), decide **target**: e.g. `chapter_number` or `(chapter_number, section)`. Rules: by date range, or by theme keywords, or call a small LLM to choose. Output: `{ targetChapter, targetSection? }`. |
| Tweak API | New: `app/api/story/tweak/route.js` | Input: `spaceId`, `memoryId`, `targetChapter` (and optional section). Load current chapter content; load memory; call LLM to return **revised chapter text** that weaves in the memory. Update `stories` row for that chapter. Optionally adjust adjacent chapters for flow. |
| Memory → chapter link (optional) | DB | If you want "this memory inspired this paragraph" or "hear voice here": add `story_memory_links` (memory_id, chapter_id, paragraph_index or snippet). Filled when tweaking. |
| Trigger | `app/api/memories/route.js` (POST) or a job | After saving a memory, optionally call placement then tweak (or queue a job). Or: "Weave this memory" button in UI that calls placement + tweak. |
| UI | Dashboard / contribute | "Add memory" flow unchanged; add optional "Weave into story" step or background job. In Story Reader, optionally show "From Nana" or "Hear voice" if you have links. |

**Dependencies:** Phase 2 (chapter history) so tweaking doesn’t lose data.  
**Order:** Placement module → tweak API → hook from memory save or explicit action → optional memory–chapter links + UI.

---

## Phase 4 — Scheduled reveal + countdown

**Goal:** Owner sets a reveal date (e.g. 18th birthday). Until then, show countdown; on the day, "deliver" the story (reveal experience).

**Codebase changes:**

| Change | File(s) | Detail |
|--------|---------|--------|
| DB | `spaces` table | Add `reveal_at` (timestamptz, nullable). Optional: `reveal_timezone`. |
| Space edit UI | `app/dashboard/page.js` | In space settings or onboarding: date picker for "Reveal date". Save via PATCH to spaces API. |
| Spaces API | `app/api/spaces/route.js` or new `app/api/spaces/[id]/route.js` | PATCH: allow updating `reveal_at`. |
| Countdown UI | `app/dashboard/page.js`, `app/contribute/[token]/page.js` | If `reveal_at` is set, show "X days until [name]'s story is revealed" (or "Reveal on [date]"). |
| Reveal gate | `app/api/generate-story/route.js` or story fetch | Optional: only allow "final" assembly or delivery after `reveal_at`. Or: allow building anytime but "reveal experience" only after date. |
| Reveal experience | New page or StoryReader mode | On or after `reveal_at`, show a special flow: e.g. "Today’s the day," then list contributors, then chapters unfold. Can be a variant of `StoryReader.js` with different copy and order. |

**Dependencies:** None.  
**Order:** DB → API → dashboard (set date + countdown) → contribute page countdown → reveal experience.

---

## Phase 5 — Timeline view

**Goal:** Visual timeline of all memories (and optionally chapters) for a space — "the year at a glance," shareable.

**Codebase changes:**

| Change | File(s) | Detail |
|--------|---------|--------|
| Data | Reuse `GET /api/memories` | Already returns memories with `memory_date`, `author`. Add optional `?forTimeline=1` if you need different shape (e.g. group by month). |
| Timeline page or section | New: `app/dashboard/timeline/page.js` or section in dashboard | Horizontal or vertical timeline: dots/lines by date, each memory as a card or tooltip. Filter by space. |
| Optional share | Public or signed URL | If you want shareable timeline: new route e.g. `/t/[spaceId]/timeline` with read-only view (and optional token). |

**Dependencies:** None.  
**Order:** Timeline component → dashboard route → optional share route.

---

## Phase 6 — Optional enhancements

- **Memory reactions:** DB `memory_reactions` (memory_id, from_contributor_id, emoji); API + UI to add/fetch; show on story reveal.
- **Print book:** Integration with Lulu/Blurb API; "Order hardcover" from reveal or dashboard; use final story text + design.
- **Narrative styles:** Owner chooses tone (literary, funny, simple). Already have space_type in generate-story; extend with a `narrative_style` field on space and use in prompt.

---

## Implementation order (recommended)

1. **Phase 1.1** — Memory prompts ✅ done  
2. **Phase 1.2** — Voice memories (deferred).  
3. **Phase 2** — Chapter history ✅ done (regenerate = overwrite last chapter only).  
4. **Phase 4** — Scheduled reveal + countdown ✅ done.  
5. **Phase 3** — Living story placement + tweak ✅ done (placement.js + POST /api/story/tweak).  
6. **Phase 5** — Timeline view ✅ done (dashboard Timeline tab).  
7. **Phase 6** — Reactions, print, narrative styles as needed.

---

## DB migrations checklist

- [x] `memories.prompt_id` (nullable) — run `docs/migrations/001_memories_prompt_id.sql`  
- [ ] `memories.audio_path` (nullable) — for Phase 1.2 voice  
- [ ] `stories`: ensure `id`, `created_at`; optional `version` / archive table  
- [x] `spaces.reveal_at` (timestamptz, nullable) — run `docs/migrations/002_spaces_reveal_at.sql`
- [ ] (Phase 3) Optional `story_memory_links` or equivalent
- [ ] (Phase 6) `memory_reactions` if doing reactions

---

## Agent alignment (for future agent-based company)

- **Plan/backlog:** This doc (or a derived backlog) is the "plan." Agents that plan/prio should update or propose changes here.
- **Dev agent:** Implements changes in the order above; opens PRs per phase or per feature.
- **QA:** Verify after each phase: prompts show and rotate; voice uploads and transcribes; chapters don’t disappear; reveal date and countdown show; placement + tweak update the right chapter; timeline renders.
- **Trends/context:** Product and usage data (e.g. "many short memories") can feed into prompt suggestions (Phase 1.1) or placement (Phase 3).

---

*Last updated: 2025-03. Adjust as you implement; keep this file the single source of truth for codebase change plans.*
