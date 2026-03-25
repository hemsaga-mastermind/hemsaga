/**
 * Grant beta access to an email (Supabase beta_allowlist table).
 *
 * Usage:
 *   node scripts/add-beta-email.mjs someone@example.com "Approved from request Jan 15"
 *
 * Requires NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY in env (.env.local).
 */
import { createClient } from '@supabase/supabase-js';
import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';

function loadEnvLocal() {
  const p = resolve(process.cwd(), '.env.local');
  if (!existsSync(p)) return;
  const raw = readFileSync(p, 'utf8');
  for (const line of raw.split('\n')) {
    const m = line.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);
    if (!m) continue;
    let v = m[2].trim();
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
      v = v.slice(1, -1);
    }
    if (process.env[m[1]] === undefined) process.env[m[1]] = v;
  }
}

loadEnvLocal();

const emailArg = process.argv[2];
const note = process.argv[3] || 'Granted via add-beta-email.mjs';

if (!emailArg || !emailArg.includes('@')) {
  console.error('Usage: node scripts/add-beta-email.mjs <email> [note]');
  process.exit(1);
}

const email = emailArg.trim().toLowerCase();
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !key) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const db = createClient(url, key);

const { data: existing } = await db.from('beta_allowlist').select('id').eq('email', email).maybeSingle();

let err;
if (existing) {
  ({ error: err } = await db.from('beta_allowlist').update({ revoked_at: null, note }).eq('email', email));
} else {
  ({ error: err } = await db.from('beta_allowlist').insert([{ email, note }]));
}

if (err) {
  console.error(err.message);
  process.exit(1);
}

console.log(`Beta access OK: ${email}`);
