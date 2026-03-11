// POST /api/story/tweak — weave a memory into an existing chapter and update it
import { createClient } from '@supabase/supabase-js';
import { getTargetChapterForMemory } from '../../../../lib/story/placement';

const db = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

function safeParseJSON(raw = '') {
  let cleaned = raw.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim();
  const start = cleaned.indexOf('{');
  const end   = cleaned.lastIndexOf('}');
  if (start === -1 || end === -1) throw new Error(`No JSON in response: ${cleaned.slice(0, 200)}`);
  return JSON.parse(cleaned.slice(start, end + 1));
}

export async function POST(request) {
  try {
    const body = await request.json();
    const { spaceId, memoryId, targetChapter: targetChapterParam, content, author, memory_date, lang } = body;
    if (!spaceId) return Response.json({ error: 'spaceId required' }, { status: 400 });

    let memory;
    if (memoryId) {
      const { data, error } = await db.from('memories').select('*').eq('id', memoryId).single();
      if (error || !data) return Response.json({ error: 'Memory not found' }, { status: 404 });
      memory = data;
    } else if (content) {
      memory = { content, author: author || 'Someone', memory_date: memory_date || new Date().toISOString().split('T')[0] };
    } else {
      return Response.json({ error: 'memoryId or content required' }, { status: 400 });
    }

    const { data: space, error: spaceErr } = await db.from('spaces').select('*').eq('id', spaceId).single();
    if (spaceErr || !space) return Response.json({ error: 'Space not found' }, { status: 404 });

    const { data: chapters, error: chErr } = await db.from('stories').select('id, chapter_number, title, content')
      .eq('space_id', spaceId).order('chapter_number', { ascending: true });
    if (chErr || !chapters?.length) return Response.json({ error: 'No chapters found for this space' }, { status: 400 });

    const targetChapterNum = targetChapterParam != null
      ? Number(targetChapterParam)
      : getTargetChapterForMemory(memory, space, chapters);
    const chapter = chapters.find(c => c.chapter_number === targetChapterNum);
    if (!chapter) return Response.json({ error: `Chapter ${targetChapterNum} not found` }, { status: 404 });

    const writingLang = lang === 'sv' ? 'Swedish' : 'English';
    const userPrompt = `You are a warm, literary author. Revise the following chapter by weaving in ONE new memory. Keep the same tone and style; do not list the memory mechanically — integrate it naturally into the prose.

CURRENT CHAPTER (Chapter ${chapter.chapter_number} — "${chapter.title}"):
${chapter.content}

NEW MEMORY TO WEAVE IN:
[${memory.memory_date}] ${memory.author}: ${memory.content}

Return a revised version of the chapter that includes this memory. Same length and structure (3–5 paragraphs). Write in ${writingLang}.

Respond ONLY with a valid JSON object:
{"title": "Chapter title (unchanged or slightly adjusted)", "content": "Revised full chapter prose here"}`;

    let title, content;
    if (process.env.ANTHROPIC_API_KEY) {
      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-api-key': process.env.ANTHROPIC_API_KEY, 'anthropic-version': '2023-06-01' },
        body: JSON.stringify({ model: 'claude-haiku-4-5-20251001', max_tokens: 1400, messages: [{ role: 'user', content: userPrompt }] }),
      });
      if (!res.ok) return Response.json({ error: `Anthropic error: ${res.status}` }, { status: 500 });
      const data = await res.json();
      const raw = data.content?.[0]?.text || '';
      if (!raw) return Response.json({ error: 'Empty AI response' }, { status: 500 });
      try {
        const parsed = safeParseJSON(raw);
        title = parsed.title;
        content = parsed.content;
      } catch (e) {
        return Response.json({ error: `Parse error: ${e.message}` }, { status: 500 });
      }
    } else if (process.env.GROQ_API_KEY) {
      const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${process.env.GROQ_API_KEY}` },
        body: JSON.stringify({
          model: 'llama-3.3-70b-versatile',
          max_tokens: 1400,
          temperature: 0.7,
          messages: [
            { role: 'system', content: 'Respond with only a valid JSON object, no markdown.' },
            { role: 'user', content: userPrompt },
          ],
        }),
      });
      if (!res.ok) return Response.json({ error: `Groq error: ${res.status}` }, { status: 500 });
      const data = await res.json();
      const raw = data.choices?.[0]?.message?.content || '';
      if (!raw) return Response.json({ error: 'Empty AI response' }, { status: 500 });
      try {
        const parsed = safeParseJSON(raw);
        title = parsed.title;
        content = parsed.content;
      } catch (e) {
        return Response.json({ error: `Parse error: ${e.message}` }, { status: 500 });
      }
    } else {
      return Response.json({ error: 'No AI API key (ANTHROPIC_API_KEY or GROQ_API_KEY)' }, { status: 500 });
    }

    const { data: updated, error: updateErr } = await db.from('stories')
      .update({ title: title?.trim() || chapter.title, content: (content || chapter.content).trim() })
      .eq('id', chapter.id)
      .select()
      .single();
    if (updateErr) return Response.json({ error: updateErr.message }, { status: 500 });

    return Response.json({ chapter: updated, targetChapter: targetChapterNum });
  } catch (err) {
    console.error('tweak error:', err);
    return Response.json({ error: err.message }, { status: 500 });
  }
}
