/**
 * Safely parse a fetch Response as JSON.
 * When the server returns HTML (e.g. 502/503 page) or plain text ("Request Error" etc.),
 * response.json() throws "Unexpected token 'R'... is not valid JSON". This helper
 * returns a user-friendly error instead.
 * @param {Response} res - fetch Response
 * @returns {Promise<object>} - parsed JSON
 * @throws {Error} - user-friendly message if not OK or not valid JSON
 */
export async function fetchJson(res) {
  const text = await res.text();
  let data;
  try {
    data = text ? JSON.parse(text) : {};
  } catch (_) {
    if (!res.ok) {
      throw new Error(`Request failed (${res.status}). Please try again.`);
    }
    throw new Error('Invalid response from server. Please try again.');
  }
  if (!res.ok) {
    throw new Error(data.error || `Request failed (${res.status}). Please try again.`);
  }
  return data;
}
