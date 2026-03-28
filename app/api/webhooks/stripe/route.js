/**
 * Stripe webhooks — extend to set user_entitlements.plan = 'pro'.
 * Dashboard: Developers → Webhooks → endpoint URL + signing secret → STRIPE_WEBHOOK_SECRET
 *
 * Raw body required for signature verification (do not use request.json() first).
 */
import { getDb } from '../../../../lib/supabase-server';

export async function POST(request) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  const stripeKey = process.env.STRIPE_SECRET_KEY;

  if (!secret || !stripeKey) {
    console.warn('stripe webhook: STRIPE_WEBHOOK_SECRET or STRIPE_SECRET_KEY missing');
    return Response.json({ ok: false, error: 'not configured' }, { status: 503 });
  }

  const body = await request.text();
  const sig = request.headers.get('stripe-signature');
  if (!sig) return Response.json({ error: 'no signature' }, { status: 400 });

  try {
    const Stripe = (await import('stripe')).default;
    const stripe = new Stripe(stripeKey);
    const event = stripe.webhooks.constructEvent(body, sig, secret);

    if (event.type === 'customer.subscription.updated' || event.type === 'customer.subscription.created') {
      const sub = event.data.object;
      const customerId = typeof sub.customer === 'string' ? sub.customer : sub.customer?.id;
      const status = sub.status;
      const uid = sub.metadata?.supabase_user_id;
      if (uid && (status === 'active' || status === 'trialing')) {
        const db = getDb();
        await db.from('user_entitlements').upsert(
          {
            user_id: uid,
            plan: 'pro',
            stripe_customer_id: customerId,
            stripe_subscription_id: sub.id,
            stripe_price_id: sub.items?.data?.[0]?.price?.id ?? null,
            subscription_status: status,
            current_period_end: sub.current_period_end
              ? new Date(sub.current_period_end * 1000).toISOString()
              : null,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'user_id' },
        );
      }
    }

    if (event.type === 'customer.subscription.deleted') {
      const sub = event.data.object;
      const uid = sub.metadata?.supabase_user_id;
      if (uid) {
        const db = getDb();
        await db
          .from('user_entitlements')
          .update({
            plan: 'free',
            stripe_subscription_id: null,
            subscription_status: 'canceled',
            updated_at: new Date().toISOString(),
          })
          .eq('user_id', uid);
      }
    }

    return Response.json({ received: true });
  } catch (e) {
    console.error('stripe webhook error:', e.message || e);
    return Response.json({ error: 'invalid payload' }, { status: 400 });
  }
}
