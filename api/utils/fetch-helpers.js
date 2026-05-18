// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (C) 2026 Lams IT Solutions
const { validateUrlSafety } = require("../middleware/ssrf");

/**
 * Lightweight GET for small text files (llms.txt).
 * @param {string} url - Full URL to fetch
 * @param {number} maxBytes - Max response size (default 10KB)
 * @returns {{ exists: boolean, content: string|null, status: number }}
 */
async function fetchTextFile(url, maxBytes = 10240) {
  try {
    await validateUrlSafety(url);
    const res = await fetch(url, {
      signal: AbortSignal.timeout(5000),
      headers: { "User-Agent": "Trivium/1.0" },
      redirect: "follow",
    });
    if (!res.ok) return { exists: false, content: null, status: res.status };
    const text = await res.text();
    const content = text.slice(0, maxBytes);
    return { exists: true, content, status: res.status };
  } catch {
    return { exists: false, content: null, status: 0 };
  }
}

/**
 * HEAD request to check resource existence, with GET fallback for servers
 * that reject HEAD (405/501).
 *
 * @param {string} url - Full URL to check
 * @returns {{ exists: boolean, status: number, redirected: boolean, finalUrl: string|null, error: string|null }}
 */
async function checkExists(url) {
  try {
    await validateUrlSafety(url);
    let res = await fetch(url, {
      method: "HEAD",
      signal: AbortSignal.timeout(5000),
      headers: { "User-Agent": "Trivium/1.0" },
      redirect: "follow",
    });
    // Some servers reject HEAD â€” retry with GET.
    if (res.status === 405 || res.status === 501) {
      res = await fetch(url, {
        method: "GET",
        signal: AbortSignal.timeout(5000),
        headers: { "User-Agent": "Trivium/1.0" },
        redirect: "follow",
      });
    }
    return {
      exists: res.ok,
      status: res.status,
      redirected: res.redirected || false,
      finalUrl: res.url || url,
      error: null,
    };
  } catch (err) {
    return {
      exists: false,
      status: 0,
      redirected: false,
      finalUrl: null,
      error: err?.name || "network error",
    };
  }
}

/**
 * Create a cached version of checkExists for a single scan session.
 * Prevents duplicate HEAD requests when multiple pages reference the same URL.
 *
 * @returns {(url: string) => Promise<ReturnType<typeof checkExists>>}
 */
function createCheckExistsCache() {
  const cache = new Map();
  return async function cachedCheckExists(url) {
    if (cache.has(url)) return cache.get(url);
    const result = await checkExists(url);
    cache.set(url, result);
    return result;
  };
}

module.exports = { fetchTextFile, checkExists, createCheckExistsCache };
