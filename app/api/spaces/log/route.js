// GET /api/spaces/log?spaceId=xxx — access log for a space (owner only)
import { getDb } from '../../../../lib/supabase-server';
import { getSessionUser } from '../../../../lib/supabase-auth';
import { isSpaceOwner, authJson } from '../../../../lib/space-access';

export async function GET(request) {
  try {
    const user = await getSessionUser();
    if (!user) return authJson('Sign in required', 401);

    const db = getDb();
    const { searchParams } = new URL(request.url);
    const spaceId = searchParams.get('spaceId');
    if (!spaceId) return Response.json({ error: 'spaceId required' }, { status: 400 });

    const owner = await isSpaceOwner(db, spaceId, user.id);
    if (!owner) return authJson('Not authorized', 403);

    const { data, error } = await db
      .from('access_log')
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
