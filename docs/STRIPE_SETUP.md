# Stripe subscriptions (Hemsaga)

## Database

Run `docs/migrations/008_user_entitlements.sql` in Supabase so `user_entitlements` exists.

## Environment

See `.env.example`: `BILLING_ENFORCE`, `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`, `NEXT_PUBLIC_SITE_URL`.

With `BILLING_ENFORCE` unset or `0`, the app does not block Free limits or Pro-only AI (development default).

## Webhook

1. In Stripe Dashboard → Developers → Webhooks, add endpoint:  
   `https://<your-domain>/api/webhooks/stripe`
2. Select events at minimum: `customer.subscription.created`, `customer.subscription.updated`, `customer.subscription.deleted`.
3. Copy the signing secret into `STRIPE_WEBHOOK_SECRET`.

The handler updates `user_entitlements` when the subscription carries `metadata.supabase_user_id` matching the Supabase `auth.users` id. Set that metadata when creating the Checkout Session or Customer (recommended in your checkout API once you add it).

## Product shape (reference)

- **Free:** 1 space, 10 memories per space, no AI story/cartoonify/tweak (enforced when `BILLING_ENFORCE=1`).
- **Pro:** unlimited spaces, AI storytelling, photo flows — enforce via Stripe → `plan = 'pro'`.

Pricing on the marketing page: **99 SEK/månad** or **799 SEK/år** per family (configure matching Prices in Stripe).

## Checkout / Customer Portal

Checkout Session and billing portal routes are not in this repo yet; add them with your Product/Price IDs and redirect URLs based on `NEXT_PUBLIC_SITE_URL`.
