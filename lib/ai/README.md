# AI provider layer

Single entry point for LLM calls with **configurable routing** and **request tracking**.

## Switching providers

Set in environment (e.g. Vercel):

| Variable | Values | Effect |
|----------|--------|--------|
| `AI_PROVIDER` | `groq` \| `anthropic` \| `auto` | Which provider(s) to try and in what order. Default `auto`. |
| `GROQ_API_KEY` | (key) | Enable Groq (open-source models, e.g. Llama). |
| `ANTHROPIC_API_KEY` | (key) | Enable Anthropic (Claude). |

- **`auto`**: Use Groq first if `GROQ_API_KEY` is set, otherwise Anthropic. On failure, the other provider is tried.
- **`groq`** or **`anthropic`**: Prefer that provider; the other is still used as fallback if the first fails.

Optional overrides:

- `ANTHROPIC_MODEL` – override Claude model (default: `claude-haiku-4-5-20251001`).
- `GROQ_MODEL` – override Groq model (default: `llama-3.3-70b-versatile`).

## Usage

```js
import { completeText } from '@/lib/ai/complete';

const { text, provider, model, usage } = await completeText(prompt, {
  feature: 'generate-story',  // for tracking
  maxTokens: 1400,
  systemPrompt: 'Optional system message',
  temperature: 0.7,           // Groq only
});
```

## Tracking

Every call is logged as JSON to stdout, e.g.:

```json
{"ts":"...","feature":"generate-story","provider":"groq","model":"llama-3.3-70b-versatile","latencyMs":1200,"inputTokens":500,"outputTokens":800}
```

Use Vercel logs, a log drain, or extend `lib/ai/track.js` to write to a DB or analytics.

## Adding a provider

1. Add `lib/ai/providers/<name>.js` that exports `complete({ prompt, systemPrompt, maxTokens, ... })` and returns `{ text, provider, model, usage? }`.
2. Register it in `lib/ai/config.js` (order) and `lib/ai/complete.js` (import and add to `providers`).
