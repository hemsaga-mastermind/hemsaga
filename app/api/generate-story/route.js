// app/api/generate-story/route.js
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const narrativePrompt = {
  child:   (space, age) => `You are a warm, literary author writing a beautiful family storybook for a child named ${space.subject_name || space.name}${age ? ` (${age})` : ''}. Written from the family's perspective. The child will read this at age 18. Write with deep warmth and love.`,
  couple:  (space)      => `You are a romantic, literary author writing the love story of ${space.name}. Capture their shared memories, moments big and small, and the beauty of their bond.`,
  friends: (space)      => `You are a witty and warm author writing the story of ${space.name}. Capture their adventures, laughter, and the bonds that make this friendship special.`,
  self:    (space)      => `You are a thoughtful author writing a personal memoir for ${space.subject_name || 'someone special'}. These are their memories, their life, their story told with honesty and beauty.`,
  custom:  (space)      => `You are a literary author writing a meaningful story about ${space.name}. Weave the memories into a beautiful, emotional narrative.`,
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
    const { spaceId, regenerate } = await request.json();
    if (!spaceId) return Response.json({ error: 'spaceId required' }, { status: 400 });

    const { data: space } = await supabase.from('spaces').select('*').eq('id', spaceId).single();
    if (!space) return Response.json({ error: 'Space not found' }, { status: 404 });

    const { data: memories } = await supabase.from('memories').select('author, content, memory_date')
      .eq('space_id', spaceId).order('memory_date', { ascending: true });
    if (!memories?.length) return Response.json({ error: 'No memories found' }, { status: 400 });

    let existingChapters = [];
    if (regenerate) {
      await supabase.from('stories').delete().eq('space_id', spaceId);
    } else {
      const { data } = await supabase.from('stories').select('*')
        .eq('space_id', spaceId).order('chapter_number', { ascending: true });
      existingChapters = data || [];
    }

    const nextChapterNum = existingChapters.length + 1;
    const age = getAge(space.subject_dob);
    const type = space.space_type || 'custom';
    const systemRole = (narrativePrompt[type] || narrativePrompt.custom)(space, age);

    const memoryLines = memories.map(m => `[${m.memory_date}] ${m.author}: ${m.content}`).join('\n');
    const priorContext = existingChapters.length > 0
      ? `\n\nPREVIOUS CHAPTERS:\n${existingChapters.map(c => `Chapter ${c.chapter_number} — ${c.title}:\n${c.content}`).join('\n\n')}`
      : '';

    const userPrompt = `${systemRole}\n\nMEMORIES:\n${memoryLines}${priorContext}\n\nWrite Chapter ${nextChapterNum}. Continue naturally. Use vivid detail, warmth, literary quality. 3–5 paragraphs.\n\nRespond ONLY with valid JSON (no markdown):\n{"title": "Chapter title", "content": "Full chapter text"}`;

    let title, content;

    if (process.env.ANTHROPIC_API_KEY) {
      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-api-key': process.env.ANTHROPIC_API_KEY, 'anthropic-version': '2023-06-01' },
        body: JSON.stringify({ model: 'claude-haiku-4-5-20251001', max_tokens: 1200, messages: [{ role: 'user', content: userPrompt }] }),
      });
      const data = await res.json();
      const parsed = JSON.parse((data.content?.[0]?.text || '').replace(/```json|```/g, '').trim());
      title = parsed.title; content = parsed.content;
    } else if (process.env.GROQ_API_KEY) {
      const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${process.env.GROQ_API_KEY}` },
        body: JSON.stringify({ model: 'llama-3.3-70b-versatile', max_tokens: 1200, temperature: 0.85, messages: [{ role: 'system', content: 'Literary author. Respond only with valid JSON.' }, { role: 'user', content: userPrompt }] }),
      });
      const data = await res.json();
      const parsed = JSON.parse((data.choices?.[0]?.message?.content || '').replace(/```json|```/g, '').trim());
      title = parsed.title; content = parsed.content;
    } else {
      return Response.json({ error: 'No AI API key configured' }, { status: 500 });
    }

    const { data: saved, error: saveErr } = await supabase.from('stories').insert([{
      space_id: spaceId, title: title || `Chapter ${nextChapterNum}`,
      content, chapter_number: nextChapterNum, memories_used: memories.length,
    }]).select().single();

    if (saveErr) return Response.json({ error: saveErr.message }, { status: 500 });
    return Response.json({ chapters: [...existingChapters, saved] });

  } catch (err) {
    console.error('generate-story error:', err);
    return Response.json({ error: err.message }, { status: 500 });
  }
}