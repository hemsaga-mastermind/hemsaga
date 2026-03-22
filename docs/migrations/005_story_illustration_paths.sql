-- Optional text-to-image illustrations per chapter (beta; gated by HEMSAGA_CHAPTER_ILLUSTRATIONS).
-- Paths are in the private `memories` bucket under {space_id}/story-art/...

ALTER TABLE stories
ADD COLUMN IF NOT EXISTS illustration_paths jsonb NOT NULL DEFAULT '[]'::jsonb;

COMMENT ON COLUMN stories.illustration_paths IS 'JSON array of storage paths, e.g. ["uuid/story-art/abc.webp"]. Signed URLs are added in API responses as "illustrations".';
