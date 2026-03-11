// GET /api/story?spaceId=xxx — return existing chapters for a space (for refreshing after weave)
import { createClient } from '@supabase/supabase-js';

const db = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const spaceId = searchParams.get('spaceId');
    if (!spaceId) return Response.json({ error: 'spaceId required' }, { status: 400 });
    const { data, error } = await db.from('stories')
      .select('*')
      .eq('space_id', spaceId)
      .order('chapter_number', { ascending: true });
    if (error) return Response.json({ error: error.message }, { status: 500 });
    return Response.json({ chapters: data || [] });
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}
