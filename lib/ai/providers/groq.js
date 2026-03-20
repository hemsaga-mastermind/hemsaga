/**
 * Groq provider (OpenAI-compatible; runs open-source models like Llama).
 */

const DEFAULT_MODEL = 'llama-3.3-70b-versatile';

async function complete({ prompt, systemPrompt, maxTokens = 1400, model = DEFAULT_MODEL, temperature = 0.7 }) {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) return null;

  const messages = [];
  if (systemPrompt) messages.push({ role: 'system', content: systemPrompt });
  messages.push({ role: 'user', content: prompt });

  const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: process.env.GROQ_MODEL || model,
      max_tokens: maxTokens,
      temperature,
      messages,
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Groq ${res.status}: ${errText.slice(0, 200)}`);
  }

  const data = await res.json();
  const text = data.choices?.[0]?.message?.content ?? '';
  const usage = data.usage
    ? { inputTokens: data.usage.prompt_tokens, outputTokens: data.usage.completion_tokens }
    : undefined;

  return {
    text,
    provider: 'groq',
    model: data.model || model,
    usage,
  };
}

export { complete };
