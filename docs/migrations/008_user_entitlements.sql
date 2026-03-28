-- Per-user plan for monetization (Free vs Pro). Sync with Stripe via webhook (see docs/STRIPE_SETUP.md).

CREATE TABLE IF NOT EXISTS user_entitlements (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  plan text NOT NULL DEFAULT 'free' CHECK (plan IN ('free', 'pro')),
  stripe_customer_id text,
  stripe_subscription_id text,
  stripe_price_id text,
  subscription_status text,
  current_period_end timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS user_entitlements_plan_idx ON user_entitlements (plan);

COMMENT ON TABLE user_entitlements IS 'Billing tier: free (caps, no AI) vs pro. Defaults to free when row missing (app upserts).';
