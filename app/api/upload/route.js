// app/api/upload/route.js
// Handles photo uploads server-side using service role key
// Browser never touches Supabase Storage directly
import { getDb } from '../../../lib/supabase-server';
import { getSessionUser } from '../../../lib/supabase-auth';
import { canAccessSpace, authJson } from '../../../lib/space-access';

export async function POST(request) {
  try {
    const user = await getSessionUser();
    const db = getDb();
    const formData = await request.formData();
    const file = formData.get('file');
    const spaceId = formData.get('spaceId');
    const contributorId = formData.get('contributorId');
    const type = formData.get('type') || 'memory'; // 'memory' | 'avatar'

    if (!file || !spaceId) {
      return Response.json({ error: 'file and spaceId required' }, { status: 400 });
    }

    const allowedAccess = await canAccessSpace(db, spaceId, {
      userId: user?.id,
      contributorId: contributorId || undefined,
    });
    if (!allowedAccess) return authJson('Not authorized', 403);

    const allowed = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/heic'];
    if (!allowed.includes(file.type)) {
      return Response.json({ error: 'Only images allowed (JPG, PNG, WEBP, HEIC)' }, { status: 400 });
    }

    if (file.size > 10 * 1024 * 1024) {
      return Response.json({ error: 'Image too large (max 10MB)' }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    const ext = file.name.split('.').pop().toLowerCase().replace('heic', 'jpg');
    const path = `${spaceId}/${type}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

    const { error: upErr } = await db.storage.from('memories').upload(path, buffer, {
      contentType: file.type,
      upsert: false,
    });

    if (upErr) return Response.json({ error: upErr.message }, { status: 500 });

    await db.from('access_log').insert([
      {
        space_id: spaceId,
        accessor: contributorId ? `contributor:${contributorId}` : user ? `owner:${user.id}` : 'unknown',
        action: 'upload_photo',
        ip_hash: null,
      },
    ]);

    return Response.json({ path });
  } catch (err) {
    console.error('upload error:', err);
    return Response.json({ error: err.message }, { status: 500 });
  }
}
