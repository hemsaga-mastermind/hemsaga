/**
 * Beta email allowlist (see docs/BETA_ACCESS.md).
 */

export function normalizeBetaEmail(email) {
  return String(email || '')
    .trim()
    .toLowerCase();
}

/** Server-only: true when signup/login should require a row in beta_allowlist. */
export function betaAllowlistEnforced() {
  const v = process.env.HEMSAGA_BETA_ALLOWLIST || process.env.BETA_ALLOWLIST_ENFORCE;
  return v === '1' || v === 'true' || String(v).toLowerCase() === 'yes';
}

/**
 * @param {import('@supabase/supabase-js').SupabaseClient} db
 * @param {string} email raw or normalized
 * @returns {Promise<boolean>}
 */
export async function isEmailAllowlisted(db, email) {
  const e = normalizeBetaEmail(email);
  if (!e || !e.includes('@')) return false;

  const { data, error } = await db
    .from('beta_allowlist')
    .select('id')
    .eq('email', e)
    .is('revoked_at', null)
    .maybeSingle();

  if (error) {
    console.warn('beta_allowlist lookup error:', error.message);
    return false;
  }
  return !!data;
}
