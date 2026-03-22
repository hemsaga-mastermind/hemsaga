/**
 * Zod validation + one LLM repair pass for chapter-shaped JSON from models.
 */
import { z } from 'zod';
import { parseAiJsonObject } from '../safeParseAiJson.js';
import { completeText } from './complete';

export const storyChapterSchema = z.object({
  title: z.string().trim().min(1, 'title required').max(500),
  content: z.string().trim().min(30, 'content too short').max(250_000),
});

/**
 * @param {string} rawText - model output (may include fences; parsed via parseAiJsonObject)
 * @param {{ feature: string }} opts
 * @returns {Promise<{ title: string, content: string }>}
 */
export async function parseAndValidateChapter(rawText, { feature }) {
  if (!rawText || !String(rawText).trim()) {
    throw new Error('Empty model output');
  }

  let obj;
  try {
    obj = parseAiJsonObject(rawText);
  } catch (e) {
    throw new Error(e?.message || 'Invalid JSON from model');
  }

  let parsed = storyChapterSchema.safeParse(obj);
  if (parsed.success) {
    return { title: parsed.data.title, content: parsed.data.content };
  }

  const flat = parsed.error.flatten();
  const repairPrompt = `Fix this into ONE valid JSON object with exactly two string keys: "title" (short chapter title) and "content" (full chapter prose, can be long).

Validation errors: ${JSON.stringify(flat)}

Broken output (extract and fix, do not invent new story facts):
${String(rawText).slice(0, 12_000)}

Return ONLY the JSON object, no markdown, no commentary.`;

  const { text: fixed } = await completeText(repairPrompt, {
    feature: `${feature}-json-repair`,
    maxTokens: 2200,
    systemPrompt: 'You output only valid JSON with keys title and content. No markdown fences.',
    temperature: 0.15,
  });

  if (!fixed?.trim()) {
    throw new Error(`Chapter JSON invalid: ${parsed.error.message}`);
  }

  obj = parseAiJsonObject(fixed);
  parsed = storyChapterSchema.safeParse(obj);
  if (!parsed.success) {
    throw new Error(`Chapter JSON invalid after repair: ${parsed.error.message}`);
  }
  return { title: parsed.data.title, content: parsed.data.content };
}
