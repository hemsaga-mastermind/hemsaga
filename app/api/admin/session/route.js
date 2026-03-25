// GET /api/admin/session — { admin: boolean, pendingAccessRequests?: number }
import { getSessionUser } from '../../../../lib/supabase-auth';
import { isAdminEmail } from '../../../../lib/admin-auth';
import { getDb } from '../../../../lib/supabase-server';

export async function GET() {
  try {
    const user = await getSessionUser();
    if (!user?.email) {
      return Response.json({ admin: false });
    }
    const admin = isAdminEmail(user.email);
    if (!admin) {
      return Response.json({ admin: false });
    }
    const db = getDb();
    const { count, error } = await db
      .from('access_requests')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'pending');

    if (error) {
      console.warn('admin session count:', error.message);
    }

    return Response.json({
      admin: true,
      pendingAccessRequests: count ?? 0,
    });
  } catch (err) {
    console.error('admin session error:', err);
    return Response.json({ admin: false });
  }
}
