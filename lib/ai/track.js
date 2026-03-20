/**
 * Lightweight request tracking for AI routing.
 * Logs each call (provider, model, feature, latency, tokens) for cost and debugging.
 * Extend later with DB, Vercel Analytics, or OpenTelemetry.
 */

const MAX_RECENT = 100;
const recent = [];

function trackRequest({
  feature,
  provider,
  model,
  latencyMs,
  inputTokens,
  outputTokens,
  error,
}) {
  const entry = {
    ts: new Date().toISOString(),
    feature: feature || 'unknown',
    provider,
    model,
    latencyMs,
    inputTokens,
    outputTokens,
    error: error ? String(error).slice(0, 200) : undefined,
  };
  recent.push(entry);
  if (recent.length > MAX_RECENT) recent.shift();
  if (process.env.NODE_ENV !== 'test') {
    console.log('[AI]', JSON.stringify(entry));
  }
  return entry;
}

function getRecentRequests() {
  return [...recent];
}

export { trackRequest, getRecentRequests };
