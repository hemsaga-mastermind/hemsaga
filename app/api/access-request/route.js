// POST /api/access-request  { email, message? }  — public, rate-limited
import { getDb } from '../../../lib/supabase-server';
import { normalizeBetaEmail } from '../../../lib/beta-allowlist';
import { takeToken } from '../../../lib/rate-limit';

const WINDOW_MS = 15 * 60 * 1000;
const MAX = 12;

function clientIp(request) {
  const xf = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim();
  return xf || request.headers.get('x-real-ip') || 'unknown';
}

export async function POST(request) {
  try {
    const ip = clientIp(request);
    const rl = takeToken(`access-req:${ip}`, { windowMs: WINDOW_MS, max: MAX });
    if (!rl.ok) {
      return Response.json(
        { error: 'Too many submissions. Try again later.', retryAfter: rl.retryAfterSec },
        { status: 429 },
      );
    }

    const body = await request.json().catch(() => ({}));
    const email = normalizeBetaEmail(body.email);
    const message = body.message != null ? String(body.message).trim().slice(0, 3000) : '';

    if (!email || !email.includes('@')) {
      return Response.json({ error: 'Valid email required' }, { status: 400 });
    }

    const db = getDb();

    const { data: pending } = await db
      .from('access_requests')
      .select('id')
      .eq('email', email)
      .eq('status', 'pending')
      .maybeSingle();

    if (pending) {
      return Response.json({ ok: true, duplicate: true, message: 'We already have your request.' });
    }

    const { error } = await db.from('access_requests').insert([
      { email, message: message || null, status: 'pending' },
    ]);

    if (error) {
      console.error('access-request insert:', error);
      return Response.json({ error: error.message }, { status: 500 });
    }

    return Response.json({ ok: true });
  } catch (err) {
    console.error('access-request error:', err);
    return Response.json({ error: err.message }, { status: 500 });
  }
}
