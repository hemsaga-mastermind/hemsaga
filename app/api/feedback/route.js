// POST /api/feedback — store feedback/suggestions/bugs and email admin
import { getDb } from '../../../lib/supabase-server';
import { Resend } from 'resend';

const ADMIN_EMAIL = process.env.FEEDBACK_ADMIN_EMAIL || 'admin@dancing-flamingo.org';
const FROM_EMAIL = process.env.FEEDBACK_FROM_EMAIL || 'Hemsaga <onboarding@resend.dev>');

export async function POST(request) {
  try {
    const body = await request.json();
    const { type, content, contact_email } = body;

    if (!content || typeof content !== 'string' || !content.trim()) {
      return Response.json({ error: 'content is required' }, { status: 400 });
    }
    const allowedTypes = ['bug', 'suggestion', 'other'];
    const feedbackType = allowedTypes.includes(type) ? type : 'other';

    const db = getDb();
    const priority = feedbackType === 'bug' ? 10 : 0;
    const { data: row, error } = await db
      .from('feedback')
      .insert([{
        type: feedbackType,
        content: content.trim().slice(0, 10000),
        contact_email: contact_email && String(contact_email).trim().slice(0, 255) || null,
        user_id: body.user_id || null,
        space_id: body.space_id || null,
        status: 'new',
        priority,
      }])
      .select('id, created_at, type')
      .single();

    if (error) return Response.json({ error: error.message }, { status: 500 });

    // Send email to admin when new feedback arrives
    const resendKey = process.env.RESEND_API_KEY;
    if (resendKey) {
      const resend = new Resend(resendKey);
      const subject = feedbackType === 'bug'
        ? `[Hemsaga] Bug report — ${content.trim().slice(0, 50)}${content.trim().length > 50 ? '…' : ''}`
        : `[Hemsaga] Feedback (${feedbackType}) — ${content.trim().slice(0, 40)}…`;
      const html = [
        `<p><strong>Type:</strong> ${feedbackType}${feedbackType === 'bug' ? ' (priority)' : ''}</p>`,
        `<p><strong>Content:</strong></p><pre style="white-space:pre-wrap;font-family:inherit;">${escapeHtml(content.trim())}</pre>`,
        contact_email ? `<p><strong>Contact:</strong> ${escapeHtml(contact_email)}</p>` : '',
        `<p><small>ID: ${row.id} · ${new Date(row.created_at).toISOString()}</small></p>`,
      ].join('');
      await resend.emails.send({
        from: FROM_EMAIL,
        to: [ADMIN_EMAIL],
        subject,
        html,
      }).catch((e) => console.warn('Feedback email failed:', e.message));
    }

    return Response.json({ ok: true, id: row.id });
  } catch (err) {
    console.error('feedback POST error:', err);
    return Response.json({ error: err.message }, { status: 500 });
  }
}

function escapeHtml(s) {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
