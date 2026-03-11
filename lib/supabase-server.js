/**
 * Server-side Supabase client. Lazy-initialized so "next build" never
 * calls createClient with undefined env (which would throw and fail the build).
 */
import { createClient } from '@supabase/supabase-js';

let _db = null;

export function getDb() {
  if (_db) return _db;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  _db = createClient(url, key);
  return _db;
}
