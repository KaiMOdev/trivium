// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (C) 2026 Lams IT Solutions
const dns = require("dns");
const { URL } = require("url");

/**
 * SSRF protection utility.
 * Validates URLs and resolved IPs against private/internal ranges.
 */

// Well-known internal hostnames
const BLOCKED_HOSTNAMES = new Set([
  "localhost",
  "metadata.google.internal",
  "metadata",
  "instance-data",
]);

/**
 * Check if an IPv4 address string is in a private/internal range.
 */
function isPrivateIPv4(ip) {
  if (/^127\./.test(ip)) return true;                          // loopback
  if (/^10\./.test(ip)) return true;                           // class A private
  if (/^172\.(1[6-9]|2\d|3[01])\./.test(ip)) return true;     // class B private
  if (/^192\.168\./.test(ip)) return true;                     // class C private
  if (/^169\.254\./.test(ip)) return true;                     // link-local / metadata
  if (ip === "0.0.0.0") return true;
  return false;
}

/**
 * Check if an IPv6 address string is private/internal.
 */
function isPrivateIPv6(ip) {
  const normalized = ip.replace(/^\[|\]$/g, "").toLowerCase();

  if (normalized === "::1" || normalized === "::") return true;

  // IPv6-mapped IPv4: ::ffff:x.x.x.x or ::ffff:XXXX:XXXX
  if (normalized.startsWith("::ffff:")) {
    const suffix = normalized.slice(7);
    // Dotted form: ::ffff:127.0.0.1
    if (/^\d+\.\d+\.\d+\.\d+$/.test(suffix)) {
      return isPrivateIPv4(suffix);
    }
    // Hex form: ::ffff:7f00:1 — convert to IPv4
    const hexParts = suffix.split(":");
    if (hexParts.length === 2) {
      const high = parseInt(hexParts[0], 16);
      const low = parseInt(hexParts[1], 16);
      if (!isNaN(high) && !isNaN(low)) {
        const ipv4 = `${(high >> 8) & 0xff}.${high & 0xff}.${(low >> 8) & 0xff}.${low & 0xff}`;
        return isPrivateIPv4(ipv4);
      }
    }
  }

  // fe80::/10 — link-local
  if (/^fe[89ab][0-9a-f]:/i.test(normalized)) return true;

  // fc00::/7 — unique local
  if (/^f[cd][0-9a-f]{2}:/i.test(normalized)) return true;

  return false;
}

/**
 * Check if a hostname string itself is obviously private (IP literal or blocked name).
 * This is the fast path — does not do DNS resolution.
 */
function isPrivateHostname(hostname) {
  const lower = hostname.toLowerCase().replace(/^\[|\]$/g, "");

  if (BLOCKED_HOSTNAMES.has(lower)) return true;

  // Check decimal IP (e.g., 2130706433 = 127.0.0.1)
  if (/^\d+$/.test(lower)) {
    const num = parseInt(lower, 10);
    if (num >= 0 && num <= 0xFFFFFFFF) {
      const ipv4 = `${(num >> 24) & 0xff}.${(num >> 16) & 0xff}.${(num >> 8) & 0xff}.${num & 0xff}`;
      return isPrivateIPv4(ipv4);
    }
  }

  // Check hex IP (e.g., 0x7f000001)
  if (/^0x[0-9a-f]+$/i.test(lower)) {
    const num = parseInt(lower, 16);
    if (num >= 0 && num <= 0xFFFFFFFF) {
      const ipv4 = `${(num >> 24) & 0xff}.${(num >> 16) & 0xff}.${(num >> 8) & 0xff}.${num & 0xff}`;
      return isPrivateIPv4(ipv4);
    }
  }

  // Standard dotted-decimal IPv4
  if (/^\d+\.\d+\.\d+\.\d+$/.test(lower)) {
    return isPrivateIPv4(lower);
  }

  // IPv6 (with or without brackets)
  if (lower.includes(":")) {
    return isPrivateIPv6(lower);
  }

  return false;
}

/**
 * Resolve a hostname to IP addresses and check if ANY resolved IP is private.
 * Returns { safe: boolean, ip: string|null, error: string|null }.
 */
async function resolveAndValidate(hostname) {
  // Fast path: check hostname string first
  if (isPrivateHostname(hostname)) {
    return { safe: false, ip: null, error: "URL points to a private/internal address" };
  }

  // Skip DNS resolution for raw IP addresses — already checked above
  if (/^\d+\.\d+\.\d+\.\d+$/.test(hostname) || hostname.includes(":")) {
    return { safe: true, ip: hostname, error: null };
  }

  // Resolve hostname to IPs using OS resolver (works in all environments)
  try {
    const results = await dns.promises.lookup(hostname, { all: true });

    if (results.length === 0) {
      return { safe: false, ip: null, error: "Could not resolve hostname" };
    }

    for (const { address } of results) {
      if (isPrivateIPv4(address) || isPrivateIPv6(address)) {
        return { safe: false, ip: address, error: "URL resolves to a private/internal address" };
      }
    }

    return { safe: true, ip: results[0].address, error: null };
  } catch {
    // DNS resolution failed — allow (fetchPage will fail with ENOTFOUND anyway)
    return { safe: true, ip: null, error: null };
  }
}

/**
 * Validate a URL for SSRF safety. Checks hostname string AND resolved IPs.
 * Throws an Error if the URL is unsafe.
 */
async function validateUrlSafety(urlString) {
  let parsed;
  try {
    parsed = new URL(urlString);
  } catch {
    throw new Error("Invalid URL");
  }

  if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
    throw new Error("Only HTTP and HTTPS URLs are allowed");
  }

  const result = await resolveAndValidate(parsed.hostname);
  if (!result.safe) {
    throw new Error(result.error);
  }
}

module.exports = { isPrivateHostname, isPrivateIPv4, isPrivateIPv6, resolveAndValidate, validateUrlSafety };
