// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (C) 2026 Lams IT Solutions
/**
 * Shared OAuth utilities used by GSC, GA4, Meta, and Adobe Analytics plugins.
 * Centralizes state signing/verification and dev token storage.
 */

const crypto = require("crypto");
const fs = require("fs");
const path = require("path");

const HMAC_SECRET = process.env.OAUTH_STATE_SECRET || process.env.GOOGLE_CLIENT_SECRET || "dev-secret";

if (process.env.NODE_ENV === "production" && !process.env.OAUTH_STATE_SECRET) {
  console.error("FATAL: OAUTH_STATE_SECRET is not set. Refusing to start in production without a dedicated OAuth state secret.");
  process.exit(1);
}

/**
 * Sign a userId into a tamper-proof state string for OAuth callbacks.
 * Format: base64url(payload).base64url(HMAC-SHA256)
 */
function signState(userId) {
  const nonce = crypto.randomBytes(8).toString("hex");
  const payload = Buffer.from(JSON.stringify({ uid: userId, ts: Date.now(), nonce })).toString("base64url");
  const sig = crypto.createHmac("sha256", HMAC_SECRET).update(payload).digest("base64url");
  return `${payload}.${sig}`;
}

/**
 * Verify and extract userId from a signed state parameter.
 * Returns null if invalid, expired (>10 min), or tampered.
 */
function verifyState(state) {
  const [payload, sig] = (state || "").split(".");
  if (!payload || !sig) return null;
  const expected = crypto.createHmac("sha256", HMAC_SECRET).update(payload).digest("base64url");
  if (sig !== expected) return null;
  try {
    const data = JSON.parse(Buffer.from(payload, "base64url").toString());
    if (Date.now() - data.ts > 10 * 60 * 1000) return null;
    return data.uid;
  } catch {
    return null;
  }
}

/**
 * Create a file-backed token store for dev mode (survives server restarts).
 * @param {string} filename - e.g. ".dev-gsc-tokens.json"
 */
function createDevTokenStore(filename) {
  const filePath = path.join(__dirname, "..", filename);
  return {
    _load() {
      try { return JSON.parse(fs.readFileSync(filePath, "utf8")); } catch { return {}; }
    },
    get(key) {
      return this._load()[key] || null;
    },
    set(key, value) {
      const data = this._load();
      data[key] = value;
      fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
    },
    delete(key) {
      const data = this._load();
      delete data[key];
      fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
    },
  };
}

module.exports = { signState, verifyState, createDevTokenStore };
