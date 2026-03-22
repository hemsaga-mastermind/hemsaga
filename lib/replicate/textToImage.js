/**
 * Cheap text-to-image via Replicate FLUX Schnell (~seconds, low $ vs full FLUX).
 * https://replicate.com/black-forest-labs/flux-schnell
 */

const FLUX_SCHNELL =
  'https://api.replicate.com/v1/models/black-forest-labs/flux-schnell/predictions';

/**
 * @param {string} prompt
 * @returns {Promise<string>} temporary output image URL
 */
export async function replicateTextToImage(prompt) {
  const token = process.env.REPLICATE_API_TOKEN;
  if (!token) throw new Error('REPLICATE_API_TOKEN not set');

  const safePrompt = String(prompt || '').slice(0, 2000);
  if (!safePrompt.trim()) throw new Error('Empty illustration prompt');

  const response = await fetch(FLUX_SCHNELL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      Prefer: 'wait',
    },
    body: JSON.stringify({
      input: {
        prompt: safePrompt,
        aspect_ratio: '4:3',
        num_inference_steps: 4,
        output_format: 'webp',
        output_quality: 88,
      },
    }),
  });

  const result = await response.json();
  if (!result.output) {
    const msg = result.detail || result.error || JSON.stringify(result);
    throw new Error(typeof msg === 'string' ? msg : 'No image from Replicate');
  }

  const url = Array.isArray(result.output) ? result.output[0] : result.output;
  if (!url || typeof url !== 'string') throw new Error('Invalid image URL from Replicate');
  return url;
}
