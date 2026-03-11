// app/api/spaces/log/route.js
// Returns access log for a space — owner can see who accessed what and when
import { getDb } from '../../../lib/supabase-server';

// GET /api/spaces/log?spaceId=xxx&userId=yyy
export async function GET(request) {
  try {
    const db = getDb();
    const { searchParams } = new URL(request.url);
    const spaceId = searchParams.get('spaceId');
    const userId  = searchParams.get('userId');
    if (!spaceId || !userId) return Response.json({ error: 'spaceId and userId required' }, { status: 400 });

    // Verify the requester owns this space
    const { data: space } = await db.from('spaces')
      .select('id').eq('id', spaceId).eq('created_by', userId).single();
    if (!space) return Response.json({ error: 'Not authorized' }, { status: 403 });

    const { data, error } = await db.from('access_log')
      .select('accessor, action, created_at')
      .eq('space_id', spaceId)
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) return Response.json({ error: error.message }, { status: 500 });
    return Response.json({ log: data || [] });

  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}