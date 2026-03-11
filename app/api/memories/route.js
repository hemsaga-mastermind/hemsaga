// app/api/memories/route.js
// Private photos: generates signed URLs on every read (1hr expiry)
// Logs every access for audit trail
import { createClient } from '@supabase/supabase-js';

const db = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const SIGNED_URL_EXPIRY = 3600; // 1 hour in seconds

async function signPhotoUrl(path) {
  if (!path) return null;
  // Already a full URL (legacy) — return as-is for backwards compat
  if (path.startsWith('http')) return path;
  const { data, error } = await db.storage
    .from('memories')
    .createSignedUrl(path, SIGNED_URL_EXPIRY);
  if (error) { console.warn('sign URL error:', error.message); return null; }
  return data.signedUrl;
}

// GET /api/memories?spaceId=xxx&contributorId=yyy&accessor=zzz
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const spaceId       = searchParams.get('spaceId');
    const contributorId = searchParams.get('contributorId'); // filter to one person
    const accessor      = searchParams.get('accessor') || 'unknown'; // for audit log

    if (!spaceId) return Response.json({ error: 'spaceId required' }, { status: 400 });

    let query = db.from('memories').select('*')
      .eq('space_id', spaceId)
      .order('memory_date', { ascending: false });

    if (contributorId) {
      query = query.eq('contributor_id', contributorId);
    }

    const { data, error } = await query;
    if (error) return Response.json({ error: error.message }, { status: 500 });

    // Generate signed URLs for all photos in parallel
    const memories = await Promise.all(
      (data || []).map(async (m) => ({
        ...m,
        photo_url: await signPhotoUrl(m.photo_url),
      }))
    );

    // Total count across all contributors (for curiosity tease)
    const { count } = await db.from('memories')
      .select('*', { count: 'exact', head: true })
      .eq('space_id', spaceId);

    // Log this read access
    await db.from('access_log').insert([{
      space_id: spaceId,
      accessor,
      action: 'read_memories',
    }]);

    return Response.json({ memories, totalCount: count || 0 });

  } catch (err) {
    console.error('memories GET error:', err);
    return Response.json({ error: err.message }, { status: 500 });
  }
}

// POST /api/memories — save a new memory
// photo_url now stores the storage PATH, not a public URL
export async function POST(request) {
  try {
    const body = await request.json();
    const { spaceId, contributorId, author, content, memory_date, photo_path, prompt_id } = body;

    if (!spaceId || !content) {
      return Response.json({ error: 'spaceId and content required' }, { status: 400 });
    }

    const row = {
      space_id:       spaceId,
      contributor_id: contributorId || null,
      user_id:        contributorId || 'anonymous',
      author:         author || 'Someone',
      content:        content.trim(),
      memory_date:    memory_date || new Date().toISOString().split('T')[0],
      photo_url:      photo_path || null, // stores path, signed on read
    };
    if (prompt_id !== undefined && prompt_id !== null) {
      row.prompt_id = String(prompt_id);
    }

    const { data, error } = await db.from('memories').insert([row]).select().single();

    if (error) return Response.json({ error: error.message }, { status: 500 });

    // Sign the photo URL for the immediate response
    const memory = {
      ...data,
      photo_url: await signPhotoUrl(data.photo_url),
    };

    return Response.json({ memory });

  } catch (err) {
    console.error('memories POST error:', err);
    return Response.json({ error: err.message }, { status: 500 });
  }
}