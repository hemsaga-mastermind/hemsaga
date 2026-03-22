/**
 * Simple in-memory fixed-window rate limiter for API routes.
 * Resets per process (fine for single-node / dev; use Redis for multi-instance).
 */

const buckets = new Map();

function getWindowConfig(envKeyMax, envKeyMs, defaultMax, defaultMs) {
  const max = Number(process.env[envKeyMax]);
  const windowMs = Number(process.env[envKeyMs]);
  return {
    max: Number.isFinite(max) && max > 0 ? max : defaultMax,
    windowMs: Number.isFinite(windowMs) && windowMs > 0 ? windowMs : defaultMs,
  };
}

/**
 * @returns {{ ok: true } | { ok: false, retryAfterSec: number }}
 */
export function takeToken(key, config) {
  const now = Date.now();
  let b = buckets.get(key);
  if (!b || now >= b.resetAt) {
    b = { resetAt: now + config.windowMs, count: 0 };
    buckets.set(key, b);
  }
  b.count += 1;
  if (b.count > config.max) {
    return { ok: false, retryAfterSec: Math.max(1, Math.ceil((b.resetAt - now) / 1000)) };
  }
  return { ok: true };
}

export function rateLimitGenerateStory() {
  return getWindowConfig(
    'HEMSAGA_RL_GENERATE_MAX',
    'HEMSAGA_RL_GENERATE_WINDOW_MS',
    20,
    60 * 60 * 1000,
  );
}

export function rateLimitCartoonify() {
  return getWindowConfig(
    'HEMSAGA_RL_CARTOON_MAX',
    'HEMSAGA_RL_CARTOON_WINDOW_MS',
    30,
    60 * 60 * 1000,
  );
}

/** Separate bucket from generate-story so tweaks don’t eat chapter quota. */
export function rateLimitStoryTweak() {
  return getWindowConfig(
    'HEMSAGA_RL_TWEAK_MAX',
    'HEMSAGA_RL_TWEAK_WINDOW_MS',
    45,
    60 * 60 * 1000,
  );
}

export function tweakKeyFromUser(userId) {
  return `tweak:u:${userId}`;
}

/** Prefer user id, then contributor id, then client IP (best-effort). */
export function clientKeyFromRequest(request, { userId, contributorId } = {}) {
  if (userId) return `gen:u:${userId}`;
  if (contributorId) return `gen:c:${contributorId}`;
  const xf = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim();
  const ip = xf || request.headers.get('x-real-ip') || 'unknown';
  return `gen:ip:${ip}`;
}

export function cartoonKeyFromRequest(request, userId) {
  const xf = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim();
  const ip = xf || request.headers.get('x-real-ip') || 'unknown';
  return userId ? `cart:u:${userId}` : `cart:ip:${ip}`;
}
