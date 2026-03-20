/**
 * AI provider routing config.
 * Set AI_PROVIDER in env to control which model(s) to use and in what order.
 *
 * - AI_PROVIDER=groq       → use Groq only (open-source / fast)
 * - AI_PROVIDER=anthropic  → use Anthropic only
 * - AI_PROVIDER=auto       → try Groq first if key set, then Anthropic (default)
 *
 * Each provider still requires its own key: GROQ_API_KEY, ANTHROPIC_API_KEY.
 */

const PROVIDERS = ['groq', 'anthropic'];

function getProviderOrder() {
  const env = (process.env.AI_PROVIDER || 'auto').toLowerCase();
  if (env === 'groq') return ['groq', 'anthropic'];
  if (env === 'anthropic') return ['anthropic', 'groq'];
  // auto: prefer open-source (Groq) first when key is set
  if (process.env.GROQ_API_KEY) return ['groq', 'anthropic'];
  if (process.env.ANTHROPIC_API_KEY) return ['anthropic', 'groq'];
  return ['groq', 'anthropic'];
}

function getEnabledProviders() {
  const order = getProviderOrder();
  return order.filter((p) => {
    if (p === 'groq') return !!process.env.GROQ_API_KEY;
    if (p === 'anthropic') return !!process.env.ANTHROPIC_API_KEY;
    return false;
  });
}

export { PROVIDERS, getProviderOrder, getEnabledProviders };
