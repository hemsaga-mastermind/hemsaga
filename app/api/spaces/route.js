// app/api/spaces/route.js
import { getDb } from '../../../lib/supabase-server';
import { getSessionUser } from '../../../lib/supabase-auth';
import { isSpaceOwner, authJson } from '../../../lib/space-access';

// GET /api/spaces — list spaces for the signed-in user (userId from session only)
export async function GET() {
  try {
    const user = await getSessionUser();
    if (!user) return authJson('Sign in required', 401);

    const db = getDb();
    const { data, error } = await db
      .from('spaces')
      .select('*')
      .eq('created_by', user.id)
      .order('created_at', { ascending: true });
    if (error) return Response.json({ error: error.message }, { status: 500 });
    return Response.json({ spaces: data || [] });
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}

// POST /api/spaces — create space (owner = session user)
export async function POST(request) {
  try {
    const user = await getSessionUser();
    if (!user) return authJson('Sign in required', 401);

    const db = getDb();
    const body = await request.json();
    const { name, space_type, cover_emoji, subject_name, subject_dob } = body;
    if (!name) return Response.json({ error: 'name required' }, { status: 400 });

    const { data, error } = await db
      .from('spaces')
      .insert([
        {
          created_by: user.id,
          name: name.trim(),
          space_type: space_type || 'custom',
          cover_emoji: cover_emoji || '📖',
          subject_name: subject_name || null,
          subject_dob: subject_dob || null,
        },
      ])
      .select()
      .single();
    if (error) return Response.json({ error: error.message }, { status: 500 });
    return Response.json({ space: data });
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}

// PATCH /api/spaces — update cartoon_url, reveal_at, etc. (owner only)
export async function PATCH(request) {
  try {
    const user = await getSessionUser();
    if (!user) return authJson('Sign in required', 401);

    const db = getDb();
    const body = await request.json();
    const { spaceId, cartoon_url, reveal_at } = body;
    if (!spaceId) return Response.json({ error: 'spaceId required' }, { status: 400 });

    const owner = await isSpaceOwner(db, spaceId, user.id);
    if (!owner) return authJson('Not authorized', 403);

    const updates = {};
    if (cartoon_url !== undefined) updates.cartoon_url = cartoon_url;
    if (reveal_at !== undefined) updates.reveal_at = reveal_at === null || reveal_at === '' ? null : reveal_at;
    if (Object.keys(updates).length === 0) {
      return Response.json({ error: 'No fields to update' }, { status: 400 });
    }
    const { data, error } = await db.from('spaces').update(updates).eq('id', spaceId).select().single();
    if (error) return Response.json({ error: error.message }, { status: 500 });
    return Response.json({ space: data });
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}
