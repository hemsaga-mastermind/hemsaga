-- Phase 4: Scheduled reveal — owner sets a date when the story is "delivered"
ALTER TABLE spaces
ADD COLUMN IF NOT EXISTS reveal_at timestamptz;

COMMENT ON COLUMN spaces.reveal_at IS 'When the story is revealed/delivered (e.g. 18th birthday). Countdown shown until then.';
