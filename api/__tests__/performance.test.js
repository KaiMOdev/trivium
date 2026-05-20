// api/__tests__/performance.test.js
const { runPerformanceChecks } = require("../checks/performance");

// Mock fetch globally — runPerformanceChecks calls the PageSpeed Insights API
global.fetch = jest.fn();

// runPerformanceChecks logs to console.error on the failure paths exercised below;
// silence it so the suite output stays clean.
let errorSpy;
beforeEach(() => {
  global.fetch.mockReset();
  errorSpy = jest.spyOn(console, "error").mockImplementation(() => {});
});
afterEach(() => {
  errorSpy.mockRestore();
});

describe("runPerformanceChecks", () => {
  test("returns score null and available false when PageSpeed Insights is rate-limited", async () => {
    global.fetch.mockResolvedValueOnce({
      ok: false,
      status: 429,
      json: async () => ({ error: { errors: [{ reason: "rateLimitExceeded" }] } }),
    });

    const result = await runPerformanceChecks("https://example.com");

    // A failed PSI call must NOT be presented as a real score of 0 —
    // 0 reads as "terrible site", null reads as "not measured".
    expect(result.score).toBeNull();
    expect(result.available).toBe(false);
    expect(result.error).toMatch(/PageSpeed Insights/);
    expect(result.metrics).toEqual([]);
  });

  test("returns score null and available false on a network error", async () => {
    global.fetch.mockRejectedValueOnce(new Error("ECONNREFUSED"));

    const result = await runPerformanceChecks("https://example.com");

    expect(result.score).toBeNull();
    expect(result.available).toBe(false);
    expect(result.error).toBeDefined();
  });

  test("returns a numeric score and available true on success", async () => {
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        lighthouseResult: {
          categories: { performance: { score: 0.92 } },
          audits: {},
        },
      }),
    });

    const result = await runPerformanceChecks("https://example.com");

    expect(result.available).toBe(true);
    expect(result.score).toBe(92);
    expect(result.error).toBeUndefined();
  });
});
