/**
 * Free vs Pro enforcement (see docs/migrations/008_user_entitlements.sql).
 * When BILLING_ENFORCE=0 or unset, everyone is treated as Pro (dev / pre-Stripe).
 */

export const FREE_LIMITS = {
  maxSpacesPerUser: 1,
  maxMemoriesPerSpace: 10,
};

export function billingEnforced() {
  const v = process.env.BILLING_ENFORCE;
  return v === '1' || v === 'true';
}

export async function getEntitlement(db, userId) {
  if (!userId) return { plan: 'pro' };

  const { data, error } = await db
    .from('user_entitlements')
    .select('plan, stripe_subscription_id, subscription_status, current_period_end')
    .eq('user_id', userId)
    .maybeSingle();

  if (error && error.code !== 'PGRST116') {
    console.warn('entitlements:', error.message);
  }

  if (!data) {
    await db.from('user_entitlements').insert([{ user_id: userId, plan: 'free' }]).catch(() => {});
    return { plan: 'free' };
  }

  return { plan: data.plan === 'pro' ? 'pro' : 'free', raw: data };
}

/** Space owner must be on Pro when billing is on. */
export async function assertProForSpace(db, ownerUserId) {
  if (!billingEnforced()) return { ok: true };
  const { plan } = await getEntitlement(db, ownerUserId);
  if (plan !== 'pro') {
    return {
      ok: false,
      response: Response.json(
        {
          error: 'AI storytelling is part of Hemsaga Pro. Upgrade to continue.',
          code: 'PRO_REQUIRED',
        },
        { status: 402 },
      ),
    };
  }
  return { ok: true };
}

export async function assertFreeSpaceLimit(db, userId, currentSpaceCount) {
  if (!billingEnforced() || !userId) return { ok: true };
  const { plan } = await getEntitlement(db, userId);
  if (plan === 'pro') return { ok: true };
  if (currentSpaceCount >= FREE_LIMITS.maxSpacesPerUser) {
    return {
      ok: false,
      response: Response.json(
        {
          error: `Free plan allows ${FREE_LIMITS.maxSpacesPerUser} space. Upgrade to Pro for more.`,
          code: 'SPACE_LIMIT',
        },
        { status: 402 },
      ),
    };
  }
  return { ok: true };
}

export async function assertFreeMemoryLimit(db, spaceId, ownerUserId) {
  if (!billingEnforced() || !spaceId || !ownerUserId) return { ok: true };
  const { plan } = await getEntitlement(db, ownerUserId);
  if (plan === 'pro') return { ok: true };

  const { count, error } = await db
    .from('memories')
    .select('*', { count: 'exact', head: true })
    .eq('space_id', spaceId);

  if (error) return { ok: true };

  const n = count ?? 0;
  if (n >= FREE_LIMITS.maxMemoriesPerSpace) {
    return {
      ok: false,
      response: Response.json(
        {
          error: `Free plan allows ${FREE_LIMITS.maxMemoriesPerSpace} memories per space.`,
          code: 'MEMORY_LIMIT',
        },
        { status: 402 },
      ),
    };
  }
  return { ok: true };
}
