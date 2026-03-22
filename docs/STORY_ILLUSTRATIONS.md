# Chapter illustrations (beta)

Story chapters are **text** by default. Optionally, each time a chapter is **generated or regenerated**, the app can add **1–2** storybook-style images using **Replicate [FLUX Schnell](https://replicate.com/black-forest-labs/flux-schnell)** (faster/cheaper than full FLUX).

## Cost (rough)

- Schnell is priced per second/GPU on Replicate; expect **cents per image** tier, not dollars (check current Replicate pricing).
- **Two images per chapter** ≈ **2×** one image. For beta, set **`HEMSAGA_CHAPTER_ILLUSTRATIONS=1`** to cap cost.

## Setup

1. **`REPLICATE_API_TOKEN`** — same as cartoon avatar.
2. Run **`docs/migrations/005_story_illustration_paths.sql`** on Supabase (`illustration_paths` on `stories`).
3. Storage: illustrations are saved under **`{space_id}/story-art/`** in the private **`memories`** bucket (same as other uploads). Ensure your Storage RLS / API-only setup from **`004_storage_memories_rls.sql`** is applied.

## Env

| Variable | Meaning |
|----------|---------|
| `HEMSAGA_CHAPTER_ILLUSTRATIONS` | `0` = off (default if unset). `1` or `2` = images per **new/regenerated** chapter. |

Omit or `0` in production if you want text-only.

## Behavior

- Prompts are derived from the **chapter title** and **excerpts of prose** (no separate LLM call).
- If Replicate fails for one image, the other may still succeed; chapter text is always saved first.
- The reader shows images **above** the chapter body when `illustrations` (signed URLs) are present.
- **`GET /api/story`** returns chapters with fresh **1h signed URLs** for stored paths.

## Privacy

Illustrations are **non-literal**: style is generic storybook art. Avoid putting highly sensitive personal details in prompts beyond what is already in the chapter text.
