-- Inbound beta access requests (marketing site form → admin approves in dashboard).
-- Approved rows should also add the email to beta_allowlist (handled in API).

CREATE TABLE IF NOT EXISTS access_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL,
  message text,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  created_at timestamptz NOT NULL DEFAULT now(),
  processed_at timestamptz,
  processed_by text
);

CREATE INDEX IF NOT EXISTS access_requests_status_created_idx
  ON access_requests (status, created_at DESC);

CREATE INDEX IF NOT EXISTS access_requests_email_lower_idx
  ON access_requests (lower(trim(email)));

COMMENT ON TABLE access_requests IS 'Request access submissions; admin approves via dashboard.';
