// app/api/spaces/invite/join/route.js
// Called when a family member enters their name and joins
import { getDb } from '../../../../../lib/supabase-server';
import { randomUUID } from 'crypto';

export async function POST(request) {
  try {
    const db = getDb();
    const { token, displayName } = await request.json();
    if (!token || !displayName) return Response.json({ error: 'token and displayName required' }, { status: 400 });

    // Find the invite row
    const { data: member, error } = await db.from('space_members')
      .select('*').eq('invite_token', token).single();
    if (error || !member) return Response.json({ error: 'Invalid token' }, { status: 404 });

    // Generate a stable contributor ID for this person on this device
    const contributorId = randomUUID();

    // Update the space_members row with their name + contributorId
    await db.from('space_members')
      .update({ display_name: displayName, contributor_id: contributorId })
      .eq('invite_token', token);

    return Response.json({ contributorId, spaceId: member.space_id });
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}