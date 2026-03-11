// app/api/upload/route.js
// Handles photo uploads server-side using service role key
// Browser never touches Supabase Storage directly
import { createClient } from '@supabase/supabase-js';

const db = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export async function POST(request) {
  try {
    const formData = await request.formData();
    const file        = formData.get('file');
    const spaceId     = formData.get('spaceId');
    const contributorId = formData.get('contributorId');
    const type        = formData.get('type') || 'memory'; // 'memory' | 'avatar'

    if (!file || !spaceId) {
      return Response.json({ error: 'file and spaceId required' }, { status: 400 });
    }

    // Validate file type
    const allowed = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/heic'];
    if (!allowed.includes(file.type)) {
      return Response.json({ error: 'Only images allowed (JPG, PNG, WEBP, HEIC)' }, { status: 400 });
    }

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      return Response.json({ error: 'Image too large (max 10MB)' }, { status: 400 });
    }

    const bytes  = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Store under space/type/timestamp-random — no user-identifiable path
    const ext  = file.name.split('.').pop().toLowerCase().replace('heic','jpg');
    const path = `${spaceId}/${type}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

    const { error: upErr } = await db.storage
      .from('memories')
      .upload(path, buffer, {
        contentType: file.type,
        upsert: false,
      });

    if (upErr) return Response.json({ error: upErr.message }, { status: 500 });

    // Log the upload action
    await db.from('access_log').insert([{
      space_id:  spaceId,
      accessor:  contributorId ? `contributor:${contributorId}` : `owner:unknown`,
      action:    'upload_photo',
      ip_hash:   null, // can add IP hashing later
    }]);

    // Return the storage path (not a URL — URL is generated on read)
    return Response.json({ path });

  } catch (err) {
    console.error('upload error:', err);
    return Response.json({ error: err.message }, { status: 500 });
  }
}