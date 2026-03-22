// POST /api/story/tweak — weave a memory into an existing chapter and update it
import { getDb } from '../../../../lib/supabase-server';
import { getTargetChapterForMemory } from '../../../../lib/story/placement';
import { getWritingLanguage } from '../../../../lib/langForAi.js';
import { completeText } from '../../../../lib/ai/complete';
import { parseAiJsonObject } from '../../../../lib/safeParseAiJson.js';

export async function POST(request) {
  try {
    const db = getDb();
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

    const writingLang = getWritingLanguage(lang);
    const userPrompt = `You are a warm, literary author. Revise the following chapter by weaving in ONE new memory. Keep the same tone and style; do not list the memory mechanically — integrate it naturally into the prose.

CURRENT CHAPTER (Chapter ${chapter.chapter_number} — "${chapter.title}"):
${chapter.content}

NEW MEMORY TO WEAVE IN:
[${memory.memory_date}] ${memory.author}: ${memory.content}

Return a revised version of the chapter that includes this memory. Same length and structure (3–5 paragraphs). Write in ${writingLang}.

Respond ONLY with a valid JSON object:
{"title": "Chapter title (unchanged or slightly adjusted)", "content": "Revised full chapter prose here"}`;

    let revisedTitle, revisedContent;
    try {
      const { text: raw } = await completeText(userPrompt, {
        feature: 'story-tweak',
        maxTokens: 1400,
        systemPrompt: 'Respond with only a valid JSON object, no markdown.',
        temperature: 0.7,
      });
      if (!raw) return Response.json({ error: 'Empty AI response' }, { status: 500 });
      const parsed = parseAiJsonObject(raw);
      revisedTitle = parsed.title;
      revisedContent = parsed.content;
    } catch (e) {
      console.error('tweak AI error:', e);
      return Response.json({ error: e.message || 'AI request failed.' }, { status: 500 });
    }

    const { data: updated, error: updateErr } = await db.from('stories')
      .update({ title: revisedTitle?.trim() || chapter.title, content: (revisedContent || chapter.content).trim() })
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
