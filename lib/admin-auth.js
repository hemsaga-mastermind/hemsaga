/**
 * Dashboard admin: built-in owner + optional HEMSAGA_ADMIN_EMAILS (comma-separated).
 * APIs use this server-side; non-admins never receive admin: true from /api/admin/session.
 */

/** Always treated as admin for Access requests (sign in with this Supabase email). */
const BUILTIN_ADMIN_EMAILS = ['vchittipraveen.navara@gmail.com'];

export function getAdminEmailSet() {
  const set = new Set(BUILTIN_ADMIN_EMAILS.map((e) => e.trim().toLowerCase()).filter((e) => e.includes('@')));
  const raw = process.env.HEMSAGA_ADMIN_EMAILS || '';
  for (const part of raw.split(',')) {
    const e = part.trim().toLowerCase();
    if (e.includes('@')) set.add(e);
  }
  return set;
}

export function isAdminEmail(email) {
  if (!email || typeof email !== 'string') return false;
  return getAdminEmailSet().has(email.trim().toLowerCase());
}
