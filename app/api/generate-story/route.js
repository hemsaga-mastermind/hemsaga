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
    const { childId, childName, childAge } = await request.json();

    // Get all memories for this child
    const { data: memories } = await supabase
      .from('memories')
      .select('*')
      .eq('child_id', childId)
      .order('created_at', { ascending: true });

    if (!memories || memories.length === 0) {
      return Response.json({ error: 'No memories found' }, { status: 400 });
    }

    // Format memories for Claude
    const memoriesText = memories.map((m, i) =>
      `Memory ${i + 1} by ${m.author} on ${m.memory_date}:\n"${m.content}"`
    ).join('\n\n');

    // Ask Claude to write the story
    const message = await anthropic.messages.create({
      model: 'claude-opus-4-5',
      max_tokens: 1024,
      messages: [
        {
          role: 'user',
          content: `You are a beautiful, literary storyteller writing a children's family storybook.

You are writing a chapter about ${childName}, who is ${childAge}.
The family lives in Sweden.

Here are the real memories logged by the family:

${memoriesText}

Write a beautiful, warm, literary story chapter (300-400 words) based on these memories.
- Write in third person ("he", "she", or use the child's name)
- Make it feel like a real published children's book — poetic, warm, emotional
- Include specific details from the memories
- Make parents emotional when they read it
- End with a hopeful, beautiful sentence about the future
- Give the chapter a beautiful title

Format your response as JSON exactly like this:
{
  "title": "Chapter title here",
  "content": "Full story content here"
}`
        }
      ]
    });

    const responseText = message.content[0].text;
    const clean = responseText.replace(/```json|```/g, '').trim();
    const story = JSON.parse(clean);

    // Save story to database
    const { data: savedStory } = await supabase
      .from('stories')
      .insert([{
        child_id: childId,
        title: story.title,
        content: story.content,
        memories_used: memories.length
      }])
      .select()
      .single();

    return Response.json({ story: savedStory || story });

  } catch (error) {
    console.error('Story generation error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}