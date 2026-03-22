import { getDb } from '../../../lib/supabase-server';
import { getSessionUser } from '../../../lib/supabase-auth';
import { isSpaceOwner, authJson } from '../../../lib/space-access';
import { takeToken, rateLimitCartoonify, cartoonKeyFromRequest } from '../../../lib/rate-limit';

const SIGNED_URL_SEC = 900;

/**
 * Cartoonify an image already stored via POST /api/upload (bucket path only).
 * Rejects arbitrary URLs to avoid SSRF / abuse.
 */
export async function POST(request) {
  try {
    const user = await getSessionUser();
    if (!user) return authJson('Sign in required', 401);

    const cfg = rateLimitCartoonify();
    const rl = takeToken(cartoonKeyFromRequest(request, user.id), cfg);
    if (!rl.ok) {
      return Response.json(
        { error: 'Too many cartoon requests. Try again later.', retryAfter: rl.retryAfterSec },
        { status: 429 },
      );
    }

    const body = await request.json();
    const { storagePath, spaceId } = body;

    if (!storagePath || !spaceId) {
      return Response.json({ error: 'storagePath and spaceId required' }, { status: 400 });
    }
    if (typeof storagePath !== 'string' || storagePath.includes('..') || storagePath.startsWith('/')) {
      return Response.json({ error: 'Invalid storagePath' }, { status: 400 });
    }

    const expectedPrefix = `${spaceId}/avatar/`;
    if (!storagePath.startsWith(expectedPrefix)) {
      return authJson('storagePath must be an avatar upload for this space', 403);
    }

    const db = getDb();
    const owner = await isSpaceOwner(db, spaceId, user.id);
    if (!owner) return authJson('Not authorized', 403);

    const { data: signed, error: signErr } = await db.storage
      .from('memories')
      .createSignedUrl(storagePath, SIGNED_URL_SEC);
    if (signErr || !signed?.signedUrl) {
      return Response.json(
        { error: signErr?.message || 'Could not read uploaded image (check path and bucket).' },
        { status: 400 },
      );
    }

    const response = await fetch('https://api.replicate.com/v1/models/catacolabs/cartoonify/predictions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.REPLICATE_API_TOKEN}`,
        'Content-Type': 'application/json',
        Prefer: 'wait',
      },
      body: JSON.stringify({
        input: { image: signed.signedUrl },
      }),
    });

    const result = await response.json();

    if (!result.output) {
      console.error('Replicate error:', JSON.stringify(result));
      return Response.json({ error: result.detail || 'Cartoon generation failed' }, { status: 500 });
    }

    const cartoonUrl = Array.isArray(result.output) ? result.output[0] : result.output;
    return Response.json({ cartoonUrl });
  } catch (error) {
    console.error('Cartoonify error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}
