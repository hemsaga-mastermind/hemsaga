-- Feedback and suggestions: stored for backlog and weekly agent processing.
-- Run in Supabase SQL editor.

CREATE TABLE IF NOT EXISTS feedback (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  type text NOT NULL CHECK (type IN ('bug', 'suggestion', 'other')),
  content text NOT NULL,
  contact_email text,
  user_id text,
  space_id uuid REFERENCES spaces(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'backlog', 'in_progress', 'done')),
  priority smallint DEFAULT 0,
  notes text
);

CREATE INDEX IF NOT EXISTS idx_feedback_created_at ON feedback(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_feedback_type ON feedback(type);
CREATE INDEX IF NOT EXISTS idx_feedback_status ON feedback(status);
CREATE INDEX IF NOT EXISTS idx_feedback_priority ON feedback(priority DESC NULLS LAST);

COMMENT ON TABLE feedback IS 'User feedback and bugs; email sent to admin on insert. Bugs are priority.';
COMMENT ON COLUMN feedback.priority IS 'Higher = more urgent. Bugs can be auto-set to higher priority.';

-- Table is only accessed server-side via Next.js API (service role). No RLS required unless you expose feedback to client.
