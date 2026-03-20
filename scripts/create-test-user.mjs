#!/usr/bin/env node
/**
 * Creates a test user in Supabase with email already confirmed so E2E login works.
 * Usage: node scripts/create-test-user.mjs   (loads .env.local from project root)
 */
import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { join } from 'path';

// Load .env.local from project root (cwd when running from project root)
const envPath = join(process.cwd(), '.env.local');
try {
  const env = readFileSync(envPath, 'utf8');
  env.split('\n').forEach((line) => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) return;
    const idx = trimmed.indexOf('=');
    if (idx === -1) return;
    const key = trimmed.slice(0, idx).trim();
    let val = trimmed.slice(idx + 1).trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) val = val.slice(1, -1);
    process.env[key] = val;
  });
} catch (e) {
  // .env.local optional if env already set
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) console.warn('Could not load .env.local:', e.message);
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceKey) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY. Use: node --env-file=.env.local scripts/create-test-user.mjs');
  process.exit(1);
}

const TEST_EMAIL = process.env.E2E_TEST_EMAIL || 'e2e-test@hemsaga.local';
const TEST_PASSWORD = process.env.E2E_TEST_PASSWORD || 'E2E-Test-Password-1';

const supabase = createClient(url, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function main() {
  const { data, error } = await supabase.auth.admin.createUser({
    email: TEST_EMAIL,
    password: TEST_PASSWORD,
    email_confirm: true,
    user_metadata: { full_name: 'E2E Test User' },
  });
  if (error) {
    if (error.message && error.message.includes('already been registered')) {
      console.log('Test user already exists. To reset password, delete the user in Supabase Dashboard and run again.');
      console.log('Credentials:', TEST_EMAIL, ' / ', TEST_PASSWORD);
      process.exit(0);
    }
    console.error('Create user error:', error.message);
    process.exit(1);
  }
  console.log('Test user created successfully.');
  console.log('Email:', TEST_EMAIL);
  console.log('Password:', TEST_PASSWORD);
  console.log('Use these in E2E tests or log in at /auth');
}

main();
