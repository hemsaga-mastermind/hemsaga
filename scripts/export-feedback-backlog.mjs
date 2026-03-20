#!/usr/bin/env node
/**
 * Exports feedback (new + backlog) to docs/feedback-backlog.md for weekly agent.
 * Bugs first, then suggestions, then other. Run: node scripts/export-feedback-backlog.mjs
 */
import { createClient } from '@supabase/supabase-js';
import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

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
} catch (_) {}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(url, key);
const { data: rows, error } = await supabase
  .from('feedback')
  .select('id, created_at, type, priority, content, contact_email, status, notes')
  .in('status', ['new', 'backlog'])
  .order('priority', { ascending: false, nullsFirst: false })
  .order('created_at', { ascending: true });

if (error) {
  console.error('Supabase error:', error.message);
  process.exit(1);
}

const bugs = (rows || []).filter((r) => r.type === 'bug');
const suggestions = (rows || []).filter((r) => r.type === 'suggestion');
const other = (rows || []).filter((r) => r.type === 'other');
const ordered = [...bugs, ...suggestions, ...other];

const lines = [
  '# Feedback backlog',
  '',
  `Generated: ${new Date().toISOString()}`,
  `Total open: ${ordered.length} (${bugs.length} bugs, ${suggestions.length} suggestions, ${other.length} other)`,
  '',
  '---',
  '',
  '## Bugs (priority)',
  '',
  ...bugs.map((r) => [
    `### ${r.id} · ${r.created_at?.slice(0, 10)}`,
    '',
    '```',
    (r.content || '').replace(/```/g, '```'),
    '```',
    r.contact_email ? `Contact: ${r.contact_email}` : '',
    r.notes ? `Notes: ${r.notes}` : '',
    '',
  ].filter(Boolean).join('\n')),
  bugs.length === 0 ? '*No open bugs*' : '',
  '',
  '## Suggestions',
  '',
  ...suggestions.map((r) => [
    `### ${r.id} · ${r.created_at?.slice(0, 10)}`,
    '',
    '```',
    (r.content || '').replace(/```/g, '```'),
    '```',
    r.contact_email ? `Contact: ${r.contact_email}` : '',
    r.notes ? `Notes: ${r.notes}` : '',
    '',
  ].filter(Boolean).join('\n')),
  suggestions.length === 0 ? '*No open suggestions*' : '',
  '',
  '## Other',
  '',
  ...other.map((r) => [
    `### ${r.id} · ${r.created_at?.slice(0, 10)}`,
    '',
    '```',
    (r.content || '').replace(/```/g, '```'),
    '```',
    r.contact_email ? `Contact: ${r.contact_email}` : '',
    r.notes ? `Notes: ${r.notes}` : '',
    '',
  ].filter(Boolean).join('\n')),
  other.length === 0 ? '*None*' : '',
];

const outPath = join(process.cwd(), 'docs', 'feedback-backlog.md');
writeFileSync(outPath, lines.join('\n'), 'utf8');
console.log('Wrote', outPath, '—', ordered.length, 'items');
