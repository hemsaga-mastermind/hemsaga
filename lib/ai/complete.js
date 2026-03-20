/**
 * Single entry point for text completion. Routes to configured provider(s)
 * with fallback and request tracking.
 *
 * Usage:
 *   const { text, provider, model } = await completeText(prompt, {
 *     feature: 'generate-story',
 *     systemPrompt: '...',
 *     maxTokens: 1400,
 *   });
 */

import { getEnabledProviders } from './config';
import * as anthropic from './providers/anthropic';
import * as groq from './providers/groq';
import { trackRequest } from './track';

const providers = { anthropic, groq };

/**
 * @param {string} prompt - User message
 * @param {object} options
 * @param {string} [options.feature] - Label for tracking (e.g. 'generate-story', 'tweak')
 * @param {string} [options.systemPrompt] - Optional system message (Groq/Anthropic)
 * @param {number} [options.maxTokens=1400]
 * @param {number} [options.temperature] - Groq only; Anthropic uses default
 * @param {string} [options.provider] - 'groq' | 'anthropic' to use only that provider (no fallback)
 * @returns {Promise<{ text: string, provider: string, model: string, usage?: object }>}
 */
async function completeText(prompt, options = {}) {
  const { feature = 'unknown', systemPrompt, maxTokens = 1400, temperature, provider: providerOverride } = options;
  const enabled = providerOverride
    ? (providers[providerOverride] && (providerOverride === 'groq' ? !!process.env.GROQ_API_KEY : !!process.env.ANTHROPIC_API_KEY) ? [providerOverride] : [])
    : getEnabledProviders();

  if (enabled.length === 0) {
    throw new Error(
      providerOverride
        ? `Provider "${providerOverride}" not configured or not available.`
        : 'No AI provider configured. Set GROQ_API_KEY and/or ANTHROPIC_API_KEY (and optionally AI_PROVIDER).'
    );
  }

  let lastError;
  for (const name of enabled) {
    const start = Date.now();
    try {
      const fn = providers[name]?.complete;
      if (!fn) continue;

      const result = await fn({
        prompt,
        systemPrompt,
        maxTokens,
        temperature,
      });

      if (!result || result.text === undefined) continue;

      const latencyMs = Date.now() - start;
      trackRequest({
        feature,
        provider: result.provider,
        model: result.model,
        latencyMs,
        inputTokens: result.usage?.inputTokens,
        outputTokens: result.usage?.outputTokens,
      });

      return result;
    } catch (err) {
      lastError = err;
      const latencyMs = Date.now() - start;
      trackRequest({
        feature,
        provider: name,
        model: null,
        latencyMs,
        error: err.message,
      });
      // Fall through to next provider
    }
  }

  throw lastError || new Error('No AI provider succeeded.');
}

export { completeText };
