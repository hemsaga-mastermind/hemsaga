/**
 * Parse JSON objects returned by LLMs. Models often put raw newlines / tabs
 * inside "content" strings, which JSON.parse rejects ("Bad control character").
 */

/**
 * Escape U+0000–U+001F and line/paragraph separators inside JSON string values only.
 * Tracks double-quoted strings; respects backslash escapes.
 */
export function sanitizeJsonControlCharacters(jsonLike) {
  let out = '';
  let inString = false;
  let escapeNext = false;
  for (let i = 0; i < jsonLike.length; i++) {
    const c = jsonLike[i];
    if (escapeNext) {
      out += c;
      escapeNext = false;
      continue;
    }
    if (c === '\\') {
      escapeNext = true;
      out += c;
      continue;
    }
    if (c === '"') {
      inString = !inString;
      out += c;
      continue;
    }
    if (inString) {
      const code = c.charCodeAt(0);
      if (code < 32) {
        if (c === '\n') out += '\\n';
        else if (c === '\r') out += '\\r';
        else if (c === '\t') out += '\\t';
        else out += `\\u${code.toString(16).padStart(4, '0')}`;
      } else if (code === 0x2028) {
        out += '\\u2028';
      } else if (code === 0x2029) {
        out += '\\u2029';
      } else {
        out += c;
      }
    } else {
      out += c;
    }
  }
  return out;
}

/**
 * Strip markdown fences, extract outermost `{...}`, parse; on failure sanitize control chars and retry.
 */
export function parseAiJsonObject(raw) {
  let cleaned = String(raw || '')
    .replace(/```json\s*/gi, '')
    .replace(/```\s*/g, '')
    .trim()
    .replace(/^\uFEFF/, '');

  const start = cleaned.indexOf('{');
  const end = cleaned.lastIndexOf('}');
  if (start === -1 || end === -1 || end <= start) {
    throw new Error(`No JSON object found in response: ${cleaned.slice(0, 200)}`);
  }

  const slice = cleaned.slice(start, end + 1);

  try {
    return JSON.parse(slice);
  } catch (firstErr) {
    try {
      return JSON.parse(sanitizeJsonControlCharacters(slice));
    } catch (secondErr) {
      const hint = firstErr.message || secondErr.message || 'Invalid JSON';
      throw new Error(
        `${hint}. If the model returned prose inside JSON strings, try generating again.`
      );
    }
  }
}
