// app/api/spaces/route.js
import { createClient } from '@supabase/supabase-js';

const db = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// GET /api/spaces?userId=xxx
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    if (!userId) return Response.json({ error: 'userId required' }, { status: 400 });
    const { data, error } = await db.from('spaces').select('*')
      .eq('created_by', userId).order('created_at', { ascending: true });
    if (error) return Response.json({ error: error.message }, { status: 500 });
    return Response.json({ spaces: data || [] });
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}

// POST /api/spaces — create space
export async function POST(request) {
  try {
    const body = await request.json();
    const { userId, name, space_type, cover_emoji, subject_name, subject_dob } = body;
    if (!userId || !name) return Response.json({ error: 'userId and name required' }, { status: 400 });
    const { data, error } = await db.from('spaces').insert([{
      created_by: userId,
      name: name.trim(),
      space_type: space_type || 'custom',
      cover_emoji: cover_emoji || '📖',
      subject_name: subject_name || null,
      subject_dob: subject_dob || null,
    }]).select().single();
    if (error) return Response.json({ error: error.message }, { status: 500 });
    return Response.json({ space: data });
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}

// PATCH /api/spaces — update cartoon_url, reveal_at, etc.
export async function PATCH(request) {
  try {
    const body = await request.json();
    const { spaceId, cartoon_url, reveal_at } = body;
    if (!spaceId) return Response.json({ error: 'spaceId required' }, { status: 400 });
    const updates = {};
    if (cartoon_url !== undefined) updates.cartoon_url = cartoon_url;
    if (reveal_at !== undefined) updates.reveal_at = reveal_at === null || reveal_at === '' ? null : reveal_at;
    if (Object.keys(updates).length === 0) return Response.json({ error: 'No fields to update' }, { status: 400 });
    const { data, error } = await db.from('spaces')
      .update(updates).eq('id', spaceId).select().single();
    if (error) return Response.json({ error: error.message }, { status: 500 });
    return Response.json({ space: data });
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}