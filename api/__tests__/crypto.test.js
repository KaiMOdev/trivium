describe("crypto utils", () => {
  const ORIGINAL_ENV = process.env;

  afterEach(() => {
    process.env = { ...ORIGINAL_ENV };
    jest.resetModules();
  });

  test("encrypt/decrypt round-trips with a valid key", () => {
    // 32-byte key in hex = 64 hex chars
    process.env.INTEGRATION_ENCRYPTION_KEY = "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef";
    const { encrypt, decrypt } = require("../utils/crypto");

    const plaintext = "my-secret-oauth-token-12345";
    const encrypted = encrypt(plaintext);

    expect(encrypted).not.toBe(plaintext);
    expect(encrypted.split(":")).toHaveLength(3); // iv:authTag:ciphertext

    const decrypted = decrypt(encrypted);
    expect(decrypted).toBe(plaintext);
  });

  test("different encryptions of same plaintext produce different ciphertext", () => {
    process.env.INTEGRATION_ENCRYPTION_KEY = "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef";
    const { encrypt } = require("../utils/crypto");

    const a = encrypt("same-token");
    const b = encrypt("same-token");
    expect(a).not.toBe(b); // random IV each time
  });

  test("decrypt returns input as-is for non-encrypted strings (legacy)", () => {
    process.env.INTEGRATION_ENCRYPTION_KEY = "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef";
    const { decrypt } = require("../utils/crypto");

    expect(decrypt("plain-text-token")).toBe("plain-text-token");
    expect(decrypt("no-colons-here")).toBe("no-colons-here");
  });

  test("passes through plaintext when no encryption key is set (dev mode)", () => {
    delete process.env.INTEGRATION_ENCRYPTION_KEY;
    const { encrypt, decrypt } = require("../utils/crypto");

    const token = "dev-mode-token";
    expect(encrypt(token)).toBe(token);
    expect(decrypt(token)).toBe(token);
  });

  test("decrypt fails gracefully with wrong key", () => {
    process.env.INTEGRATION_ENCRYPTION_KEY = "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef";
    const { encrypt } = require("../utils/crypto");
    const encrypted = encrypt("secret");

    // Re-require with different key
    jest.resetModules();
    process.env.INTEGRATION_ENCRYPTION_KEY = "abcdefabcdefabcdefabcdefabcdefabcdefabcdefabcdefabcdefabcdefabcd";
    const { decrypt } = require("../utils/crypto");

    expect(decrypt(encrypted)).toBeNull();
  });
});
