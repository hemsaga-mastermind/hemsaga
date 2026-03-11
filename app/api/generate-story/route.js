// app/api/generate-story/route.js
import { createClient } from '@supabase/supabase-js';

const db = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

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

// Safely parse JSON from AI — handles markdown fences and trailing text
function safeParseJSON(raw = '') {
  // Strip markdown fences
  let cleaned = raw.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim();
  // Find first { and last } in case there's leading/trailing text
  const start = cleaned.indexOf('{');
  const end   = cleaned.lastIndexOf('}');
  if (start === -1 || end === -1) throw new Error(`No JSON object found in response: ${cleaned.slice(0,200)}`);
  return JSON.parse(cleaned.slice(start, end + 1));
}

export async function POST(request) {
  try {
    const { spaceId, regenerate, lang } = await request.json();
    const writingLang = lang === 'sv' ? 'Swedish' : 'English';
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
- Weave memories from MULTIPLE contributors together naturally
- Do not list memories mechanically — transform them into flowing prose
- 3–5 rich paragraphs, literary quality, emotionally resonant
- Continue naturally from previous chapters if any

Respond ONLY with a valid JSON object, nothing else, no markdown:
{"title": "A evocative chapter title", "content": "Full chapter prose here"}`;

    // ── Call AI ──────────────────────────────────────────────
    let title, content;

    if (process.env.ANTHROPIC_API_KEY) {
      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': process.env.ANTHROPIC_API_KEY,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: 'claude-haiku-4-5-20251001',
          max_tokens: 1400,
          messages: [{ role: 'user', content: userPrompt }],
        }),
      });

      if (!res.ok) {
        const errText = await res.text();
        return Response.json({ error: `Anthropic API error ${res.status}: ${errText}` }, { status: 500 });
      }

      const data = await res.json();
      const raw  = data.content?.[0]?.text || '';
      if (!raw) return Response.json({ error: 'Empty response from Anthropic' }, { status: 500 });

      try {
        const parsed = safeParseJSON(raw);
        title   = parsed.title;
        content = parsed.content;
      } catch (parseErr) {
        console.error('Anthropic parse error, raw:', raw);
        return Response.json({ error: `AI response could not be parsed: ${parseErr.message}` }, { status: 500 });
      }

    } else if (process.env.GROQ_API_KEY) {
      const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.GROQ_API_KEY}`,
        },
        body: JSON.stringify({
          model: 'llama-3.3-70b-versatile',
          max_tokens: 1400,
          temperature: 0.82,
          messages: [
            { role: 'system', content: 'You are a literary author. Always respond with only a valid JSON object, no markdown, no extra text.' },
            { role: 'user', content: userPrompt },
          ],
        }),
      });

      if (!res.ok) {
        const errText = await res.text();
        return Response.json({ error: `Groq API error ${res.status}: ${errText}` }, { status: 500 });
      }

      const data = await res.json();
      const raw  = data.choices?.[0]?.message?.content || '';
      if (!raw) return Response.json({ error: 'Empty response from Groq' }, { status: 500 });

      try {
        const parsed = safeParseJSON(raw);
        title   = parsed.title;
        content = parsed.content;
      } catch (parseErr) {
        console.error('Groq parse error, raw:', raw);
        return Response.json({ error: `AI response could not be parsed: ${parseErr.message}` }, { status: 500 });
      }

    } else {
      return Response.json({
        error: 'No AI API key configured. Add ANTHROPIC_API_KEY or GROQ_API_KEY to Vercel environment variables.'
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