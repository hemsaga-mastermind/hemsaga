// app/api/spaces/invite/route.js
// POST — generate or fetch invite token for a space
// GET  — resolve token → return space info (for join page)
import { createClient } from '@supabase/supabase-js';

const db = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// GET /api/spaces/invite?token=xxx  → returns space info
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const token = searchParams.get('token');
    if (!token) return Response.json({ error: 'token required' }, { status: 400 });

    const { data: member, error } = await db.from('space_members')
      .select('space_id, display_name, role').eq('invite_token', token).single();
    if (error || !member) return Response.json({ error: 'Invalid invite link' }, { status: 404 });

    const { data: space } = await db.from('spaces')
      .select('id, name, cover_emoji, space_type, cartoon_url, reveal_at').eq('id', member.space_id).single();
    if (!space) return Response.json({ error: 'Space not found' }, { status: 404 });

    return Response.json({ space, token });
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}

// POST /api/spaces/invite  — create a fresh invite link for a space
export async function POST(request) {
  try {
    const { spaceId } = await request.json();
    if (!spaceId) return Response.json({ error: 'spaceId required' }, { status: 400 });

    // Each invite is a new row — one link per person
    const { data, error } = await db.from('space_members').insert([{
      space_id: spaceId,
      role: 'member',
      display_name: 'Family Member',
    }]).select().single();

    if (error) return Response.json({ error: error.message }, { status: 500 });
    return Response.json({ token: data.invite_token });
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}