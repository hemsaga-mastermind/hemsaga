import Anthropic from '@anthropic-ai/sdk';
import { createClient } from '@supabase/supabase-js';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export async function POST(request) {
  try {
    const { childId, childName, childAge, regenerate } = await request.json();

    // Get all memories
    const { data: memories } = await supabase
      .from('memories')
      .select('*')
      .eq('child_id', childId)
      .order('created_at', { ascending: true });

    if (!memories || memories.length === 0) {
      return Response.json({ error: 'No memories found' }, { status: 400 });
    }

    // Get all existing chapters
    const { data: existingChapters } = await supabase
      .from('stories')
      .select('*')
      .eq('child_id', childId)
      .order('chapter_number', { ascending: true });

    // Check if all memories already have chapters
    // and not regenerating
    const memoriesWithoutChapters = memories.slice(
      existingChapters ? existingChapters.length : 0
    );

    if (
      !regenerate &&
      existingChapters &&
      existingChapters.length > 0 &&
      memoriesWithoutChapters.length === 0
    ) {
      // Return all existing chapters — nothing new to generate
      return Response.json({
        chapters: existingChapters,
        isExisting: true
      });
    }

    // Build previous story context
    let previousStoryContext = '';
    if (existingChapters && existingChapters.length > 0 && !regenerate) {
      previousStoryContext = `
The story so far:
${existingChapters.map(c =>
  `Chapter ${c.chapter_number}: "${c.title}"\n${c.content}`
).join('\n\n---\n\n')}

Now continue the story with a NEW chapter.
`;
    }

    // Format new memories for Claude
    const memoriesToUse = regenerate ? memories : memoriesWithoutChapters;
    const memoriesText = memoriesToUse.map((m, i) =>
      `Memory ${i + 1} by ${m.author} on ${m.memory_date}:\n"${m.content}"`
    ).join('\n\n');

    const chapterNumber = regenerate
      ? 1
      : (existingChapters ? existingChapters.length : 0) + 1;

    // Generate new chapter
    const message = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 1024,
      messages: [
        {
          role: 'user',
          content: `You are writing a beautiful, literary novel about a child's life — chapter by chapter.

Child's name: ${childName}
Age: ${childAge}
Family lives in: Sweden
This is Chapter ${chapterNumber} of their life story.

${previousStoryContext}

New memories to weave into this chapter:
${memoriesText}

Write Chapter ${chapterNumber} of ${childName}'s life story (300-400 words).

Rules:
- Write in third person, literary novel style
- Continue naturally from previous chapters if they exist
- Weave in the specific memory details beautifully
- Include the Swedish setting — seasons, light, nature
- Make it emotional and warm — parents should feel moved
- End each chapter with a sentence that makes the reader want to read the next one
- Give this chapter a beautiful, poetic title

Respond ONLY with valid JSON in this exact format:
{
  "title": "Chapter title here",
  "content": "Full chapter content here"
}`
        }
      ]
    });

    const responseText = message.content[0].text;
    const clean = responseText.replace(/```json|```/g, '').trim();
    const generated = JSON.parse(clean);

    if (regenerate) {
      // Delete all existing chapters and start fresh
      await supabase
        .from('stories')
        .delete()
        .eq('child_id', childId);
    }

    // Save new chapter
    const { data: savedChapter } = await supabase
      .from('stories')
      .insert([{
        child_id: childId,
        title: generated.title,
        content: generated.content,
        memories_used: memoriesToUse.length,
        chapter_number: regenerate ? 1 : chapterNumber
      }])
      .select()
      .single();

    // Return ALL chapters including new one
    const { data: allChapters } = await supabase
      .from('stories')
      .select('*')
      .eq('child_id', childId)
      .order('chapter_number', { ascending: true });

    return Response.json({
      chapters: allChapters,
      newChapter: savedChapter,
      isExisting: false
    });

  } catch (error) {
    console.error('Story generation error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
}