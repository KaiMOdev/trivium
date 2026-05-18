// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (C) 2026 Lams IT Solutions
const crypto = require("crypto");

const ALGORITHM = "aes-256-gcm";
const KEY = process.env.INTEGRATION_ENCRYPTION_KEY
  ? Buffer.from(process.env.INTEGRATION_ENCRYPTION_KEY, "hex")
  : null;

if (process.env.NODE_ENV === "production" && !KEY) {
  console.error("FATAL: INTEGRATION_ENCRYPTION_KEY is not set. Refusing to start in production without token encryption.");
  process.exit(1);
}

/**
 * Encrypt a plaintext string. Returns "iv:authTag:ciphertext" (all hex).
 * If no encryption key is configured, returns plaintext (dev mode).
 */
function encrypt(plaintext) {
  if (!KEY) return plaintext;
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(ALGORITHM, KEY, iv);
  let encrypted = cipher.update(plaintext, "utf8", "hex");
  encrypted += cipher.final("hex");
  const authTag = cipher.getAuthTag().toString("hex");
  return `${iv.toString("hex")}:${authTag}:${encrypted}`;
}

/**
 * Decrypt an "iv:authTag:ciphertext" string back to plaintext.
 * If no encryption key is configured, returns input as-is (dev mode).
 */
function decrypt(ciphertext) {
  if (!KEY) return ciphertext;
  const parts = ciphertext.split(":");
  if (parts.length !== 3) return ciphertext; // not encrypted (legacy or dev)
  try {
    const [ivHex, authTagHex, encrypted] = parts;
    const decipher = crypto.createDecipheriv(ALGORITHM, KEY, Buffer.from(ivHex, "hex"));
    decipher.setAuthTag(Buffer.from(authTagHex, "hex"));
    let decrypted = decipher.update(encrypted, "hex", "utf8");
    decrypted += decipher.final("utf8");
    return decrypted;
  } catch (err) {
    console.error("[Crypto] Decryption failed — token may have been encrypted with a different key:", err.message);
    return null;
  }
}

module.exports = { encrypt, decrypt };
