// app/api/generate-story/route.js
import { getDb } from '../../../lib/supabase-server';
import { getWritingLanguage } from '../../../lib/langForAi.js';
import { completeText } from '../../../lib/ai/complete';
import { parseAiJsonObject } from '../../../lib/safeParseAiJson.js';

// Narrative voice adapted per space type
const narrativePrompt = {
  child:   (space, age) => `You are a warm, literary author writing a beautiful family storybook for a child named ${space.subject_name || space.name}${age ? ` (${age})` : ''}. Written from the loving perspective of family members. The child will read this at age 18. Write with deep warmth, tenderness, and love.`,
  couple:  (space)      => `You are a romantic, literary author writing the love story of ${space.name}. Capture their shared memories, the small moments and the large ones, the beauty of their bond over time.`,
  friends: (space)      => `You are a witty and warm author writing the story of ${space.name}. Capture their adventures, laughter, and the unique bonds that make this friendship irreplaceable.`,
  self:    (space)      => `You are a thoughtful author writing a personal memoir for ${space.subject_name || 'someone'}. These are their own memories — their life, their inner world, their story told with honesty and beauty.`,
  custom:  (space)      => `You are a literary author writing a meaningful, emotional story about ${space.name}. Weave all the memories into a beautiful narrative that the people involved will treasure forever.`,
};

function getAge(dob) {
  if (!dob) return null;
  const b = new Date(dob), n = new Date();
  const m = (n.getFullYear() - b.getFullYear()) * 12 + (n.getMonth() - b.getMonth());
  if (m < 24) return `${m} months old`;
  return `${Math.floor(m / 12)} years old`;
}

export async function POST(request) {
  try {
    const db = getDb();
    const { spaceId, regenerate, lang } = await request.json();
    const writingLang = getWritingLanguage(lang);
    if (!spaceId) return Response.json({ error: 'spaceId required' }, { status: 400 });

    // ── Load space ──────────────────────────────────────────
    const { data: space, error: spaceErr } = await db
      .from('spaces').select('*').eq('id', spaceId).single();
    if (spaceErr || !space) {
      return Response.json({ error: `Space not found: ${spaceErr?.message}` }, { status: 404 });
    }

    // ── Load ALL memories across ALL contributors ────────────
    // No contributor_id filter — story engine sees everything
    const { data: memories, error: memErr } = await db
      .from('memories')
      .select('author, content, memory_date, contributor_id')
      .eq('space_id', spaceId)
      .order('memory_date', { ascending: true });

    if (memErr) return Response.json({ error: `Memory fetch failed: ${memErr.message}` }, { status: 500 });
    if (!memories?.length) return Response.json({ error: 'No memories found — add some first' }, { status: 400 });

    // ── Load existing chapters (never delete — chapter history preserved) ──
    const { data: existingChaptersRaw } = await db.from('stories').select('*')
      .eq('space_id', spaceId).order('chapter_number', { ascending: true });
    const existingChapters = existingChaptersRaw || [];

    // regenerate = overwrite only the last chapter; otherwise add next
    const isRegenerateLast = regenerate && existingChapters.length > 0;
    const nextChapterNum = isRegenerateLast
      ? existingChapters[existingChapters.length - 1].chapter_number
      : existingChapters.length + 1;
    const age       = getAge(space.subject_dob);
    const type      = space.space_type || 'custom';
    const systemRole = (narrativePrompt[type] || narrativePrompt.custom)(space, age);

    // Format memories — show author for each so AI knows who contributed what
    const memoryLines = memories
      .map(m => `[${m.memory_date}] ${m.author}: ${m.content}`)
      .join('\n');

    // Include prior chapters for narrative continuity (exclude the one we're regenerating)
    const chaptersForContext = isRegenerateLast
      ? existingChapters.slice(0, -1)
      : existingChapters;
    const priorContext = chaptersForContext.length > 0
      ? `\n\nPREVIOUS CHAPTERS (for continuity — do not repeat, continue from here):\n${
          chaptersForContext.map(c => `Chapter ${c.chapter_number} — "${c.title}":\n${c.content}`).join('\n\n---\n\n')
        }`
      : '';

    const userPrompt = `${systemRole}

MEMORIES FROM THE FAMILY (all contributors, ordered by date):
${memoryLines}${priorContext}

Write Chapter ${nextChapterNum} of this story in ${writingLang}.${isRegenerateLast ? '\n- You are REWRITING this chapter with the same memories; keep the same narrative role and tone but improve or refresh the prose.' : ''}

IMPORTANT:
- Use the BEST material from these memories to create ONE cohesive chapter. You do not need to include every memory.
- Select what fits a compelling narrative, theme, or time period. Quality and flow over quantity.
- One memory alone does not make a chapter — weave multiple moments into something memorable and emotionally resonant.
- Do not list memories mechanically — transform them into flowing prose. 3–5 rich paragraphs, literary quality.
- Continue naturally from previous chapters if any.

Respond ONLY with a valid JSON object, nothing else, no markdown:
{"title": "An evocative chapter title", "content": "Full chapter prose here"}`;

    // ── Two-stage: Groq draft first, then Anthropic review for memorability (when both keys set) ──
    const useTwoStage = process.env.GROQ_API_KEY && process.env.ANTHROPIC_API_KEY;
    let title, content;
    try {
      let raw;
      if (useTwoStage) {
        const draft = await completeText(userPrompt, {
          feature: 'generate-story-draft',
          maxTokens: 1400,
          temperature: 0.82,
          provider: 'groq',
        });
        raw = draft.text;
        if (!raw) throw new Error('Empty draft from Groq');
        const draftParsed = parseAiJsonObject(raw);
        const reviewPrompt = `You are an expert editor. Review this story chapter and improve it for flow, warmth, and memorability. Keep the same facts and structure. Do not add new events. Only refine the prose so it feels more vivid and memorable.

CURRENT CHAPTER (JSON):
${raw}

Return the improved chapter as a valid JSON object with the same keys: {"title": "...", "content": "..."}. Same format, no markdown.`;
        try {
          const reviewed = await completeText(reviewPrompt, {
            feature: 'generate-story-review',
            maxTokens: 1600,
            systemPrompt: 'You output only valid JSON. No commentary, no markdown fences.',
            provider: 'anthropic',
          });
          if (reviewed.text) {
            const reviewedParsed = parseAiJsonObject(reviewed.text);
            if (reviewedParsed.title && reviewedParsed.content) {
              title = reviewedParsed.title;
              content = reviewedParsed.content;
            }
          }
        } catch (_) { /* use draft if review fails */ }
        if (!title || !content) {
          title = draftParsed.title;
          content = draftParsed.content;
        }
      } else {
        const result = await completeText(userPrompt, {
          feature: 'generate-story',
          maxTokens: 1400,
          temperature: 0.82,
        });
        raw = result.text;
        if (!raw) return Response.json({ error: 'Empty response from AI' }, { status: 500 });
        const parsed = parseAiJsonObject(raw);
        title = parsed.title;
        content = parsed.content;
      }
    } catch (err) {
      console.error('generate-story AI error:', err);
      return Response.json({
        error: err.message || 'AI request failed. Check ANTHROPIC_API_KEY or GROQ_API_KEY.'
      }, { status: 500 });
    }

    // Validate we got actual content
    if (!title || !content) {
      return Response.json({ error: 'AI returned empty title or content' }, { status: 500 });
    }

    // ── Save chapter (insert new or update last when regenerating) ────────
    let saved;
    if (isRegenerateLast) {
      const lastChapter = existingChapters[existingChapters.length - 1];
      const { data: updated, error: updateErr } = await db.from('stories')
        .update({
          title: title.trim(),
          content: content.trim(),
          memories_used: memories.length,
        })
        .eq('id', lastChapter.id)
        .select()
        .single();
      if (updateErr) return Response.json({ error: `Failed to update chapter: ${updateErr.message}` }, { status: 500 });
      saved = updated;
    } else {
      const { data: inserted, error: insertErr } = await db.from('stories').insert([{
        space_id:       spaceId,
        title:          title.trim(),
        content:        content.trim(),
        chapter_number: nextChapterNum,
        memories_used:  memories.length,
      }]).select().single();
      if (insertErr) return Response.json({ error: `Failed to save chapter: ${insertErr.message}` }, { status: 500 });
      saved = inserted;
    }

    const allChapters = isRegenerateLast
      ? existingChapters.slice(0, -1).concat(saved)
      : [...existingChapters, saved];

    return Response.json({
      chapters: allChapters,
      newChapter: saved,
      memoriesUsed: memories.length,
    });

  } catch (err) {
    console.error('generate-story unhandled error:', err);
    return Response.json({ error: `Unexpected error: ${err.message}` }, { status: 500 });
  }
}