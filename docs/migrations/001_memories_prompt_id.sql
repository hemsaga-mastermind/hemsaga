-- Phase 1.1: Memory prompts — optional column to record which prompt was shown when saving a memory.
-- Run this in Supabase SQL editor if you want to persist prompt_id. The UI works without it; API only sends prompt_id when the client has it.

ALTER TABLE memories
ADD COLUMN IF NOT EXISTS prompt_id text;

COMMENT ON COLUMN memories.prompt_id IS 'Index (as text) of the memory prompt shown when this memory was added; for analytics.';
