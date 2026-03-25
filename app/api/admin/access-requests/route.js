// GET list — POST { id, action: 'approve' | 'reject' }
import { getSessionUser } from '../../../../lib/supabase-auth';
import { isAdminEmail } from '../../../../lib/admin-auth';
import { getDb } from '../../../../lib/supabase-server';
import { normalizeBetaEmail } from '../../../../lib/beta-allowlist';
import { authJson } from '../../../../lib/space-access';

async function requireAdmin() {
  const user = await getSessionUser();
  if (!user?.email) return { error: authJson('Sign in required', 401) };
  if (!isAdminEmail(user.email)) return { error: authJson('Not authorized', 403) };
  return { user };
}

export async function GET() {
  const gate = await requireAdmin();
  if (gate.error) return gate.error;

  try {
    const db = getDb();
    const { data, error } = await db
      .from('access_requests')
      .select('id, email, message, status, created_at, processed_at, processed_by')
      .order('created_at', { ascending: false })
      .limit(100);

    if (error) return Response.json({ error: error.message }, { status: 500 });

    const rows = data || [];
    rows.sort((a, b) => {
      if (a.status === 'pending' && b.status !== 'pending') return -1;
      if (a.status !== 'pending' && b.status === 'pending') return 1;
      return new Date(b.created_at) - new Date(a.created_at);
    });

    const pendingCount = rows.filter((r) => r.status === 'pending').length;

    return Response.json({ requests: rows, pendingCount });
  } catch (err) {
    console.error('admin access-requests GET:', err);
    return Response.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(request) {
  const gate = await requireAdmin();
  if (gate.error) return gate.error;
  const adminEmail = gate.user.email;

  try {
    const body = await request.json().catch(() => ({}));
    const { id, action } = body;
    if (!id || !['approve', 'reject'].includes(action)) {
      return Response.json({ error: 'id and action (approve|reject) required' }, { status: 400 });
    }

    const db = getDb();
    const { data: row, error: fetchErr } = await db
      .from('access_requests')
      .select('id, email, status')
      .eq('id', id)
      .single();

    if (fetchErr || !row) return Response.json({ error: 'Request not found' }, { status: 404 });
    if (row.status !== 'pending') {
      return Response.json({ error: 'Already processed' }, { status: 400 });
    }

    const email = normalizeBetaEmail(row.email);
    const now = new Date().toISOString();

    if (action === 'reject') {
      const { error: upErr } = await db
        .from('access_requests')
        .update({
          status: 'rejected',
          processed_at: now,
          processed_by: adminEmail,
        })
        .eq('id', id);
      if (upErr) return Response.json({ error: upErr.message }, { status: 500 });
      return Response.json({ ok: true, status: 'rejected' });
    }

    // approve → beta_allowlist + mark approved
    const { data: existing } = await db.from('beta_allowlist').select('id').eq('email', email).maybeSingle();
    if (existing) {
      await db.from('beta_allowlist').update({ revoked_at: null, note: 'Approved from access request' }).eq('email', email);
    } else {
      const { error: insErr } = await db.from('beta_allowlist').insert([
        { email, note: 'Approved from access request' },
      ]);
      if (insErr) return Response.json({ error: insErr.message }, { status: 500 });
    }

    const { error: upErr } = await db
      .from('access_requests')
      .update({
        status: 'approved',
        processed_at: now,
        processed_by: adminEmail,
      })
      .eq('id', id);

    if (upErr) return Response.json({ error: upErr.message }, { status: 500 });
    return Response.json({ ok: true, status: 'approved', email });
  } catch (err) {
    console.error('admin access-requests POST:', err);
    return Response.json({ error: err.message }, { status: 500 });
  }
}
