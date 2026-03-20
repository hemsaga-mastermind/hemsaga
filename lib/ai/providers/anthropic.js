/**
 * Anthropic Claude provider (text completion).
 */

const DEFAULT_MODEL = 'claude-haiku-4-5-20251001';

async function complete({ prompt, systemPrompt, maxTokens = 1400, model = DEFAULT_MODEL }) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return null;

  const body = {
    model: process.env.ANTHROPIC_MODEL || model,
    max_tokens: maxTokens,
    messages: [{ role: 'user', content: prompt }],
  };
  if (systemPrompt) body.system = systemPrompt;

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Anthropic ${res.status}: ${errText.slice(0, 200)}`);
  }

  const data = await res.json();
  const text = data.content?.[0]?.text ?? '';
  const usage = data.usage
    ? { inputTokens: data.usage.input_tokens, outputTokens: data.usage.output_tokens }
    : undefined;

  return {
    text,
    provider: 'anthropic',
    model: data.model || model,
    usage,
  };
}

export { complete };
