-- Emails allowed to sign up / sign in while beta gating is enabled (see docs/BETA_ACCESS.md).
-- Always store email lowercased (application normalizes). revoked_at set = no longer allowed.

CREATE TABLE IF NOT EXISTS beta_allowlist (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL UNIQUE,
  note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  revoked_at timestamptz
);

CREATE INDEX IF NOT EXISTS beta_allowlist_active_idx
  ON beta_allowlist (email) WHERE revoked_at IS NULL;

COMMENT ON TABLE beta_allowlist IS 'Invite list when HEMSAGA_BETA_ALLOWLIST=1.';
