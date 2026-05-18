// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (C) 2026 Lams IT Solutions
/**
 * Convert a glob-style path pattern to a RegExp.
 * - Escapes regex special chars except *
 * - * matches zero or more characters (including /)
 * - Patterns without * are exact matches (with optional trailing slash)
 */
function patternToRegex(pattern) {
  // Escape all regex-special characters except *
  const escaped = pattern.replace(/[.+?^${}()|[\]\\]/g, "\\$&");
  // Replace * with .* (match anything)
  const withWildcard = escaped.replace(/\*/g, ".*");
  // If original pattern has no wildcard:
  // - Patterns ending with / match that prefix and everything beneath it
  //   e.g. /nl/aanbod/ matches /nl/aanbod/, /nl/aanbod/123, /nl/aanbod/123/foo
  // - Other patterns are exact matches with optional trailing slash
  if (!pattern.includes("*")) {
    if (pattern.endsWith("/")) {
      return new RegExp("^" + withWildcard + ".*$");
    }
    return new RegExp("^" + withWildcard + "/?$");
  }
  // If pattern ends with /*, make the trailing /segment part optional so the
  // section root itself (e.g. /blog) is also matched by /blog/*
  if (pattern.endsWith("/*")) {
    // withWildcard ends with /.*  — rewrite as (/.*)?$
    const base = withWildcard.slice(0, -".*".length - 1); // strip trailing /.*
    return new RegExp("^" + base + "(/.*)?$");
  }
  return new RegExp("^" + withWildcard);
}

/**
 * Check whether a URL passes include/exclude path filters.
 * @param {string} url - Full URL to check
 * @param {string[]} [includePaths] - If non-empty, URL path must match at least one
 * @param {string[]} [excludePaths] - If URL path matches any, it is excluded (wins over include)
 * @returns {boolean} true if the URL should be scanned
 */
function matchesPathFilter(url, includePaths, excludePaths) {
  let pathname;
  try {
    pathname = new URL(url).pathname;
  } catch {
    return false;
  }

  // Normalize: strip trailing slash for matching (but keep / for root and /seg/ for wildcard patterns)
  // We keep the original pathname as-is; exact patterns handle optional trailing slash via regex
  const normalizedPath = pathname;

  // Check excludes first (exclude wins)
  if (excludePaths && excludePaths.length > 0) {
    for (const pattern of excludePaths) {
      if (patternToRegex(pattern).test(normalizedPath)) return false;
    }
  }

  // Check includes (if any specified, must match at least one)
  if (includePaths && includePaths.length > 0) {
    return includePaths.some(pattern => patternToRegex(pattern).test(normalizedPath));
  }

  return true;
}

module.exports = { matchesPathFilter };
