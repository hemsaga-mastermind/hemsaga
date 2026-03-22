/**
 * Authorization helpers for space-scoped API routes (service-role DB).
 * - Owner: spaces.created_by === Supabase auth user id
 * - Contributor: space_members row with matching space_id + contributor_id (after invite join)
 */

export async function isSpaceOwner(db, spaceId, userId) {
  if (!spaceId || !userId) return false;
  const { data, error } = await db
    .from('spaces')
    .select('id')
    .eq('id', spaceId)
    .eq('created_by', userId)
    .maybeSingle();
  return !!data && !error;
}

export async function isSpaceContributor(db, spaceId, contributorId) {
  if (!spaceId || !contributorId) return false;
  const { data, error } = await db
    .from('space_members')
    .select('id')
    .eq('space_id', spaceId)
    .eq('contributor_id', contributorId)
    .maybeSingle();
  return !!data && !error;
}

/**
 * @param {import('@supabase/supabase-js').SupabaseClient} db
 * @param {string} spaceId
 * @param {{ userId?: string|null, contributorId?: string|null }} ctx
 */
export async function canAccessSpace(db, spaceId, { userId, contributorId }) {
  if (!spaceId) return false;
  if (userId && (await isSpaceOwner(db, spaceId, userId))) return true;
  if (contributorId && (await isSpaceContributor(db, spaceId, contributorId))) return true;
  return false;
}

export function authJson(message, status) {
  return Response.json({ error: message }, { status });
}
