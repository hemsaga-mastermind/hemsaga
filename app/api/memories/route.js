// app/api/memories/route.js
import { createClient } from '@supabase/supabase-js';

const db = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// GET /api/memories?spaceId=xxx&contributorId=yyy
// contributorId filters to only that person's memories (for privacy)
// omit contributorId to get ALL (used by story engine)
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const spaceId = searchParams.get('spaceId');
    const contributorId = searchParams.get('contributorId'); // optional
    if (!spaceId) return Response.json({ error: 'spaceId required' }, { status: 400 });

    let query = db.from('memories').select('*')
      .eq('space_id', spaceId).order('memory_date', { ascending: false });

    if (contributorId) {
      query = query.eq('contributor_id', contributorId);
    }

    const { data, error } = await query;
    if (error) return Response.json({ error: error.message }, { status: 500 });

    // Also return total count across all contributors (for the curiosity tease)
    const { count } = await db.from('memories')
      .select('*', { count: 'exact', head: true }).eq('space_id', spaceId);

    return Response.json({ memories: data || [], totalCount: count || 0 });
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}

// POST /api/memories
export async function POST(request) {
  try {
    const body = await request.json();
    const { spaceId, contributorId, author, content, memory_date, photo_url } = body;
    if (!spaceId || !content) return Response.json({ error: 'spaceId and content required' }, { status: 400 });

    const { data, error } = await db.from('memories').insert([{
      space_id: spaceId,
      contributor_id: contributorId || null,
      user_id: contributorId || 'anonymous',
      author: author || 'Someone',
      content: content.trim(),
      memory_date: memory_date || new Date().toISOString().split('T')[0],
      photo_url: photo_url || null,
    }]).select().single();

    if (error) return Response.json({ error: error.message }, { status: 500 });
    return Response.json({ memory: data });
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}