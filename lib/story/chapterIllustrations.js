/**
 * Beta: 0–2 storybook-style images per chapter from prose (Replicate + Storage).
 */
import { replicateTextToImage } from '../replicate/textToImage.js';

const STYLE =
  "Whimsical children's storybook illustration, soft watercolor and colored ink, warm golden light, gentle shapes, no text, no letters, no watermark, no captions, family-friendly, painterly, cohesive scene";

/** @returns {number} 0 (off), 1, or 2 */
export function getChapterIllustrationCount() {
  const raw = process.env.HEMSAGA_CHAPTER_ILLUSTRATIONS;
  if (raw === undefined || raw === '') return 0;
  const n = parseInt(String(raw), 10);
  if (!Number.isFinite(n) || n <= 0) return 0;
  return Math.min(2, n);
}

/**
 * @param {string} title
 * @param {string} content
 * @param {number} count 1 or 2
 * @returns {string[]}
 */
export function buildIllustrationPrompts(title, content, count) {
  const plain = String(content || '').replace(/\s+/g, ' ').trim();
  const t = String(title || 'Chapter').slice(0, 120);
  const prompts = [];

  const excerpt1 = plain.slice(0, 380);
  prompts.push(`${STYLE}. Chapter: "${t}". Visualize this moment: ${excerpt1}`);

  if (count > 1) {
    const mid = Math.max(200, Math.floor(plain.length / 2) - 80);
    const excerpt2 = plain.slice(mid, mid + 380);
    if (excerpt2.length > 50) {
      prompts.push(`${STYLE}. Same story chapter, a different emotional beat: ${excerpt2}`);
    }
  }

  return prompts.slice(0, count);
}

/**
 * Download Replicate output and store in private bucket.
 * @param {import('@supabase/supabase-js').SupabaseClient} db
 * @param {string} imageUrl
 * @param {string} storagePath
 */
export async function downloadAndStoreIllustration(db, imageUrl, storagePath) {
  const r = await fetch(imageUrl);
  if (!r.ok) throw new Error(`Download illustration failed: ${r.status}`);
  const buf = Buffer.from(await r.arrayBuffer());
  const { error } = await db.storage.from('memories').upload(storagePath, buf, {
    contentType: 'image/webp',
    upsert: true,
  });
  if (error) throw new Error(error.message);
  return storagePath;
}

/**
 * Generate up to `count` images; returns storage paths (stable).
 * Failures are logged; returns partial array.
 * @param {{ db: import('@supabase/supabase-js').SupabaseClient, spaceId: string, storyId: string, title: string, content: string, count: number }} opts
 * @returns {Promise<string[]>}
 */
export async function generateChapterIllustrationPaths({ db, spaceId, storyId, title, content, count }) {
  if (count <= 0) return [];
  const prompts = buildIllustrationPrompts(title, content, count);
  const paths = [];
  let index = 0;
  for (const prompt of prompts) {
    try {
      const tmpUrl = await replicateTextToImage(prompt);
      const storagePath = `${spaceId}/story-art/${storyId}-${index}-${Date.now()}.webp`;
      await downloadAndStoreIllustration(db, tmpUrl, storagePath);
      paths.push(storagePath);
      index += 1;
    } catch (e) {
      console.warn('[chapterIllustrations] image failed:', e?.message || e);
    }
  }
  return paths;
}

/**
 * Add signed `illustrations` URL array for clients (paths stay in DB).
 * @param {import('@supabase/supabase-js').SupabaseClient} db
 * @param {object} chapter
 */
export async function withSignedIllustrations(db, chapter) {
  if (!chapter || typeof chapter !== 'object') return chapter;
  const raw = chapter.illustration_paths;
  let paths = [];
  if (Array.isArray(raw)) paths = raw.filter((p) => typeof p === 'string');
  else if (raw && typeof raw === 'string') {
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) paths = parsed.filter((p) => typeof p === 'string');
    } catch {
      paths = [];
    }
  }
  if (paths.length === 0) {
    return { ...chapter, illustrations: [] };
  }
  const illustrations = await Promise.all(
    paths.map(async (p) => {
      const { data, error } = await db.storage.from('memories').createSignedUrl(p, 3600);
      if (error || !data?.signedUrl) return null;
      return data.signedUrl;
    }),
  );
  return { ...chapter, illustrations: illustrations.filter(Boolean) };
}

export async function withSignedIllustrationsMany(db, chapters) {
  if (!chapters?.length) return chapters;
  return Promise.all(chapters.map((c) => withSignedIllustrations(db, c)));
}
