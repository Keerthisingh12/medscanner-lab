/**
 * api.js
 * Thin wrapper around the /api/search endpoint.
 * API base URL comes from the Vite env var (default "" = same origin).
 * In dev, Vite proxies /api to the backend; in production, Express serves both.
 */

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? '';

/**
 * Search for labs by test name and pincode.
 * Accepts an optional AbortSignal so in-flight requests can be cancelled
 * when a newer search fires, preventing stale results from overwriting fresh ones.
 *
 * @param {string} searchQuery
 * @param {string} pincode
 * @param {AbortSignal} [signal]
 * @returns {Promise<object>} Parsed JSON response body
 */
export async function searchLabs(searchQuery, pincode, signal) {
  const url =
    `${API_BASE}/api/search?` +
    new URLSearchParams({ search_query: searchQuery, pincode }).toString();

  const response = await fetch(url, { signal });
  const data = await response.json();

  if (!response.ok) {
    // Surface the API's error message for display in the UI (e.g. 400 validation)
    const message =
      data?.error?.message ?? `Request failed with status ${response.status}`;
    const err = new Error(message);
    err.status = response.status;
    err.code = data?.error?.code;
    throw err;
  }

  return data;
}
