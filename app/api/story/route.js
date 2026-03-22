// GET /api/story?spaceId=xxx — return existing chapters (owner or contributor)
import { getDb } from '../../../lib/supabase-server';
import { getSessionUser } from '../../../lib/supabase-auth';
import { canAccessSpace, authJson } from '../../../lib/space-access';

export async function GET(request) {
  try {
    const db = getDb();
    const { searchParams } = new URL(request.url);
    const spaceId = searchParams.get('spaceId');
    const contributorId = searchParams.get('contributorId');
    if (!spaceId) return Response.json({ error: 'spaceId required' }, { status: 400 });

    const user = await getSessionUser();
    const allowed = await canAccessSpace(db, spaceId, { userId: user?.id, contributorId });
    if (!allowed) return authJson('Not authorized', 403);

    const { data, error } = await db
      .from('stories')
      .select('*')
      .eq('space_id', spaceId)
      .order('chapter_number', { ascending: true });
    if (error) return Response.json({ error: error.message }, { status: 500 });
    return Response.json({ chapters: data || [] });
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}
