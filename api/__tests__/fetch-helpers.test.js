// api/__tests__/fetch-helpers.test.js
const { fetchTextFile, checkExists } = require("../utils/fetch-helpers");

// Mock fetch globally
global.fetch = jest.fn();

beforeEach(() => {
  global.fetch.mockReset();
});

describe("fetchTextFile", () => {
  test("returns content when file exists", async () => {
    global.fetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      text: async () => "# llms.txt\nThis site allows AI crawlers.",
    });
    const result = await fetchTextFile("https://example.com/llms.txt");
    expect(result.exists).toBe(true);
    expect(result.content).toContain("llms.txt");
    expect(result.status).toBe(200);
  });

  test("returns exists false on 404", async () => {
    global.fetch.mockResolvedValueOnce({
      ok: false,
      status: 404,
      text: async () => "Not Found",
    });
    const result = await fetchTextFile("https://example.com/llms.txt");
    expect(result.exists).toBe(false);
    expect(result.content).toBeNull();
    expect(result.status).toBe(404);
  });

  test("handles network errors gracefully", async () => {
    global.fetch.mockRejectedValueOnce(new Error("ECONNREFUSED"));
    const result = await fetchTextFile("https://example.com/llms.txt");
    expect(result.exists).toBe(false);
    expect(result.content).toBeNull();
  });
});

describe("checkExists", () => {
  test("returns true when resource exists", async () => {
    global.fetch.mockResolvedValueOnce({ ok: true, status: 200 });
    const result = await checkExists("https://example.com/favicon.ico");
    expect(result.exists).toBe(true);
    expect(result.status).toBe(200);
  });

  test("returns false on 404", async () => {
    global.fetch.mockResolvedValueOnce({ ok: false, status: 404 });
    const result = await checkExists("https://example.com/favicon.ico");
    expect(result.exists).toBe(false);
  });

  test("handles network errors", async () => {
    global.fetch.mockRejectedValueOnce(new Error("timeout"));
    const result = await checkExists("https://example.com/favicon.ico");
    expect(result.exists).toBe(false);
  });
});
