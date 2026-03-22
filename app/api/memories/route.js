// app/api/memories/route.js
// Private photos: generates signed URLs on every read (1hr expiry)
// Logs every access for audit trail
import { getDb } from '../../../lib/supabase-server';
import { getSessionUser } from '../../../lib/supabase-auth';
import { canAccessSpace, isSpaceOwner, authJson } from '../../../lib/space-access';

const SIGNED_URL_EXPIRY = 3600; // 1 hour in seconds

async function signPhotoUrl(path) {
  if (!path) return null;
  if (path.startsWith('http')) return path;
  const db = getDb();
  const { data, error } = await db.storage.from('memories').createSignedUrl(path, SIGNED_URL_EXPIRY);
  if (error) {
    console.warn('sign URL error:', error.message);
    return null;
  }
  return data.signedUrl;
}

// GET /api/memories?spaceId=xxx&contributorId=yyy&accessor=zzz
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const spaceId = searchParams.get('spaceId');
    const contributorId = searchParams.get('contributorId');
    const accessor = searchParams.get('accessor') || 'unknown';

    if (!spaceId) return Response.json({ error: 'spaceId required' }, { status: 400 });

    const user = await getSessionUser();
    const db = getDb();
    const allowed = await canAccessSpace(db, spaceId, { userId: user?.id, contributorId });
    if (!allowed) return authJson('Not authorized', 403);

    let query = db.from('memories').select('*').eq('space_id', spaceId).order('memory_date', { ascending: false });

    if (contributorId) {
      query = query.eq('contributor_id', contributorId);
    }

    const { data, error } = await query;
    if (error) return Response.json({ error: error.message }, { status: 500 });

    const memories = await Promise.all(
      (data || []).map(async (m) => ({
        ...m,
        photo_url: await signPhotoUrl(m.photo_url),
      })),
    );

    const { count } = await db
      .from('memories')
      .select('*', { count: 'exact', head: true })
      .eq('space_id', spaceId);

    await db.from('access_log').insert([
      {
        space_id: spaceId,
        accessor,
        action: 'read_memories',
      },
    ]);

    return Response.json({ memories, totalCount: count || 0 });
  } catch (err) {
    console.error('memories GET error:', err);
    return Response.json({ error: err.message }, { status: 500 });
  }
}

// POST /api/memories — save a new memory
export async function POST(request) {
  try {
    const user = await getSessionUser();
    const body = await request.json();
    const { spaceId, contributorId, author, content, memory_date, photo_path, prompt_id } = body;

    if (!spaceId || !content) {
      return Response.json({ error: 'spaceId and content required' }, { status: 400 });
    }

    const db = getDb();
    const allowed = await canAccessSpace(db, spaceId, { userId: user?.id, contributorId });
    if (!allowed) return authJson('Not authorized', 403);

    const row = {
      space_id: spaceId,
      contributor_id: contributorId || null,
      user_id: contributorId || 'anonymous',
      author: author || 'Someone',
      content: content.trim(),
      memory_date: memory_date || new Date().toISOString().split('T')[0],
      photo_url: photo_path || null,
    };
    if (prompt_id !== undefined && prompt_id !== null) {
      row.prompt_id = String(prompt_id);
    }

    const { data, error } = await db.from('memories').insert([row]).select().single();

    if (error) return Response.json({ error: error.message }, { status: 500 });

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

// PATCH /api/memories — update memory (owner of space, or contributor editing own row)
export async function PATCH(request) {
  try {
    const user = await getSessionUser();
    const body = await request.json();
    const { memoryId, memory_date, content, contributorId } = body;

    if (!memoryId) return Response.json({ error: 'memoryId required' }, { status: 400 });

    const db = getDb();
    const { data: existing, error: fetchErr } = await db
      .from('memories')
      .select('id, space_id, contributor_id')
      .eq('id', memoryId)
      .single();
    if (fetchErr || !existing) return Response.json({ error: 'Memory not found' }, { status: 404 });

    const ownerOk = user && (await isSpaceOwner(db, existing.space_id, user.id));
    const contribOk =
      contributorId &&
      existing.contributor_id &&
      contributorId === existing.contributor_id &&
      (await canAccessSpace(db, existing.space_id, { userId: null, contributorId }));

    if (!ownerOk && !contribOk) {
      return authJson('Not authorized', 403);
    }

    const updates = {};
    if (memory_date !== undefined) updates.memory_date = memory_date;
    if (content !== undefined) updates.content = String(content).trim();
    if (Object.keys(updates).length === 0) {
      return Response.json({ error: 'No fields to update (memory_date or content)' }, { status: 400 });
    }

    const { data, error } = await db.from('memories').update(updates).eq('id', memoryId).select().single();
    if (error) return Response.json({ error: error.message }, { status: 500 });

    const memory = { ...data, photo_url: await signPhotoUrl(data.photo_url) };
    return Response.json({ memory });
  } catch (err) {
    console.error('memories PATCH error:', err);
    return Response.json({ error: err.message }, { status: 500 });
  }
}
