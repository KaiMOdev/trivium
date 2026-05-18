describe("OAuth utils", () => {
  const ORIGINAL_ENV = process.env;

  beforeEach(() => {
    process.env = { ...ORIGINAL_ENV, OAUTH_STATE_SECRET: "test-secret-key" };
    jest.resetModules();
  });

  afterEach(() => {
    process.env = ORIGINAL_ENV;
  });

  test("signState produces a dot-separated string", () => {
    const { signState } = require("../plugins/oauth-utils");
    const state = signState("user-123");
    expect(state).toContain(".");
    const parts = state.split(".");
    expect(parts).toHaveLength(2);
  });

  test("verifyState round-trips a valid state", () => {
    const { signState, verifyState } = require("../plugins/oauth-utils");
    const state = signState("user-456");
    const userId = verifyState(state);
    expect(userId).toBe("user-456");
  });

  test("verifyState rejects tampered state", () => {
    const { signState, verifyState } = require("../plugins/oauth-utils");
    const state = signState("user-789");
    const tampered = state.replace(/.$/, "X"); // flip last char
    expect(verifyState(tampered)).toBeNull();
  });

  test("verifyState rejects empty/null/missing state", () => {
    const { verifyState } = require("../plugins/oauth-utils");
    expect(verifyState("")).toBeNull();
    expect(verifyState("no-dot")).toBeNull();
    expect(verifyState(null)).toBeNull();
    expect(verifyState(undefined)).toBeNull();
  });

  test("verifyState rejects expired state (>10 minutes)", () => {
    const { verifyState } = require("../plugins/oauth-utils");
    const crypto = require("crypto");

    // Manually create a state with old timestamp
    const payload = Buffer.from(JSON.stringify({ uid: "old-user", ts: Date.now() - 11 * 60 * 1000 })).toString("base64url");
    const sig = crypto.createHmac("sha256", "test-secret-key").update(payload).digest("base64url");
    const state = `${payload}.${sig}`;

    expect(verifyState(state)).toBeNull();
  });

  test("createDevTokenStore operations work", () => {
    const fs = require("fs");
    const path = require("path");
    const { createDevTokenStore } = require("../plugins/oauth-utils");

    const testFile = path.join(__dirname, "..", ".test-tokens.json");
    const store = createDevTokenStore(".test-tokens.json");

    try {
      // Initially empty
      expect(store.get("user1")).toBeNull();

      // Set and get
      store.set("user1", { token: "abc" });
      expect(store.get("user1")).toEqual({ token: "abc" });

      // Overwrite
      store.set("user1", { token: "xyz" });
      expect(store.get("user1")).toEqual({ token: "xyz" });

      // Delete
      store.delete("user1");
      expect(store.get("user1")).toBeNull();
    } finally {
      // Cleanup test file
      try { fs.unlinkSync(testFile); } catch { /* ignore */ }
    }
  });
});
