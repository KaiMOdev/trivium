const { generateAuditFix } = require("../../services/audit");

// Mock the callClaude function from ai.js (which handles cost tracking internally)
jest.mock("../../services/ai", () => ({
  callClaude: jest.fn().mockResolvedValue({
    content: [{ text: JSON.stringify({
      todos: [{
        check: "Meta Description",
        category: "seo",
        severity: "fail",
        problem: "Your meta description is only 23 characters.",
        howToFix: "Update the meta description tag in your HTML head.",
        fixContent: '<meta name="description" content="Better description here">',
        estimatedImpact: "high"
      }]
    })}],
    usage: { input_tokens: 500, output_tokens: 200 }
  }),
  getDailyCostInfo: jest.fn().mockReturnValue({ usd: 0, cap: 50 }),
}));

describe("generateAuditFix", () => {
  beforeEach(() => jest.clearAllMocks());

  it("returns todos for a single check", async () => {
    const result = await generateAuditFix({
      url: "https://example.com",
      checks: [{ category: "seo", label: "Meta Description", score: 23, detail: "23 chars — too short" }],
      pageContext: { platform: { cms: "wordpress" }, title: "About Us", html_snippet: "<head><title>About Us</title></head>" }
    });

    expect(result.todos).toHaveLength(1);
    expect(result.todos[0].check).toBe("Meta Description");
    expect(result.todos[0].severity).toBe("fail");
    expect(result.todos[0].howToFix).toBeTruthy();
  });

  it("rejects when daily cost cap exceeded", async () => {
    const { callClaude } = require("../../services/ai");
    callClaude.mockRejectedValueOnce(new Error("Daily AI cost cap reached"));

    const result = await generateAuditFix({
      url: "https://example.com",
      checks: [{ category: "seo", label: "Meta Description", score: 23, detail: "23 chars" }],
      pageContext: { title: "Test" }
    });

    expect(result.error).toMatch(/cost cap/i);
  });
});
