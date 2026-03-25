// POST /api/auth/beta-check  { email } → { allowed }  (no list leakage)
import { getDb } from '../../../../lib/supabase-server';
import { betaAllowlistEnforced, isEmailAllowlisted, normalizeBetaEmail } from '../../../../lib/beta-allowlist';
import { takeToken } from '../../../../lib/rate-limit';

const WINDOW_MS = 15 * 60 * 1000;
const MAX_ATTEMPTS = 40;

function clientIp(request) {
  const xf = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim();
  return xf || request.headers.get('x-real-ip') || 'unknown';
}

export async function POST(request) {
  try {
    if (!betaAllowlistEnforced()) {
      return Response.json({ allowed: true, enforced: false });
    }

    const ip = clientIp(request);
    const rl = takeToken(`beta-check:${ip}`, { windowMs: WINDOW_MS, max: MAX_ATTEMPTS });
    if (!rl.ok) {
      return Response.json(
        { allowed: false, error: 'Too many attempts. Try again later.', retryAfter: rl.retryAfterSec },
        { status: 429 },
      );
    }

    const body = await request.json().catch(() => ({}));
    const email = normalizeBetaEmail(body.email);
    if (!email || !email.includes('@')) {
      return Response.json({ allowed: false, enforced: true }, { status: 400 });
    }

    const db = getDb();
    const allowed = await isEmailAllowlisted(db, email);
    return Response.json({ allowed, enforced: true });
  } catch (err) {
    console.error('beta-check error:', err);
    return Response.json({ error: err.message }, { status: 500 });
  }
}
