// Mock HEAD fetch so tests don't hit the network.
// Default: canonical URLs resolve successfully (existing tests assume non-404 behavior).
const mockCheckExists = jest.fn(async () => ({
  exists: true,
  status: 200,
  redirected: false,
  finalUrl: null,
  error: null,
}));

jest.mock("../utils/fetch-helpers", () => ({
  checkExists: (...args) => mockCheckExists(...args),
  createCheckExistsCache: () => mockCheckExists,
}));

const { runSeoChecks } = require("../checks/seo");

beforeEach(() => {
  mockCheckExists.mockClear();
  mockCheckExists.mockResolvedValue({
    exists: true,
    status: 200,
    redirected: false,
    finalUrl: null,
    error: null,
  });
});

function makePageData(overrides = {}) {
  return {
    title: "Test Page Title - My Website",
    metaDescription: "This is a test meta description that is a good length for SEO purposes and provides value to searchers.",
    h1s: ["Main Heading"],
    headings: { h1: ["Main Heading"], h2: ["Sub Heading"] },
    images: { total: 5, withoutAlt: 1 },
    canonical: "https://example.com/test-page",
    og: { title: "Test", description: "Desc", image: "img.jpg", type: "website", url: "https://example.com/test-page", site_name: "Test Site" },
    jsonLd: [{ "@type": "Organization", name: "Test" }],
    jsonLdEntities: [{ "@type": "Organization", name: "Test" }],
    viewport: "width=device-width, initial-scale=1",
    hreflang: [],
    links: { internal: 15, external: 3, total: 18 },
    isHttps: true,
    paragraphs: [],
    headingOrder: [1, 2],
    url: "https://example.com/test-page",
    redirectChain: [],
    pictureElements: [],
    linkIcons: [],
    resourceUrls: [],
    faviconExists: false,
    visibleText: "",
    ...overrides,
  };
}

const defaultRobots = { accessible: true, disallowed: [], content: "" };

describe("SEO Checks", () => {
  test("returns 32 checks (33 with multi-language hreflang)", async () => {
    const results = await runSeoChecks(makePageData(), defaultRobots);
    expect(results).toHaveLength(32);
    // Title/H1 Uniqueness always emits
    expect(results.find(r => r.label === "Title / H1 Uniqueness")).toBeDefined();
  });

  test("all checks have required shape", async () => {
    const results = await runSeoChecks(makePageData(), defaultRobots);
    results.forEach((r) => {
      expect(r).toHaveProperty("label");
      expect(r).toHaveProperty("status");
      expect(r).toHaveProperty("detail");
      expect(r).toHaveProperty("score");
      expect(["pass", "warn", "fail", "na"]).toContain(r.status);
      expect(r.score).toBeGreaterThanOrEqual(0);
      expect(r.score).toBeLessThanOrEqual(100);
    });
  });

  // Title Tag
  test("title: pass for optimal length (50-60 chars)", async () => {
    const data = makePageData({ title: "A".repeat(55) });
    const results = await runSeoChecks(data, defaultRobots);
    const title = results.find((r) => r.label === "Title Tag");
    expect(title.status).toBe("pass");
    expect(title.score).toBeGreaterThanOrEqual(90);
  });

  test("title: fail when missing", async () => {
    const data = makePageData({ title: "" });
    const results = await runSeoChecks(data, defaultRobots);
    const title = results.find((r) => r.label === "Title Tag");
    expect(title.status).toBe("fail");
    expect(title.score).toBe(0);
  });

  test("title: warn when too long", async () => {
    const data = makePageData({ title: "A".repeat(75) });
    const results = await runSeoChecks(data, defaultRobots);
    const title = results.find((r) => r.label === "Title Tag");
    expect(title.status).toBe("warn");
  });

  // Meta Description
  test("meta description: pass for optimal length", async () => {
    const data = makePageData({ metaDescription: "A".repeat(140) });
    const results = await runSeoChecks(data, defaultRobots);
    const meta = results.find((r) => r.label === "Meta Description");
    expect(meta.status).toBe("pass");
  });

  test("meta description: fail when missing", async () => {
    const data = makePageData({ metaDescription: "" });
    const results = await runSeoChecks(data, defaultRobots);
    const meta = results.find((r) => r.label === "Meta Description");
    expect(meta.status).toBe("fail");
    expect(meta.score).toBe(0);
  });

  // H1
  test("h1: pass for exactly one H1", async () => {
    const results = await runSeoChecks(makePageData(), defaultRobots);
    const h1 = results.find((r) => r.label === "H1 Tag");
    expect(h1.status).toBe("pass");
    expect(h1.score).toBe(100);
  });

  test("h1: warn for multiple H1s", async () => {
    const data = makePageData({ h1s: ["First", "Second"] });
    const results = await runSeoChecks(data, defaultRobots);
    const h1 = results.find((r) => r.label === "H1 Tag");
    expect(h1.status).toBe("warn");
  });

  test("h1: fail when missing", async () => {
    const data = makePageData({ h1s: [] });
    const results = await runSeoChecks(data, defaultRobots);
    const h1 = results.find((r) => r.label === "H1 Tag");
    expect(h1.status).toBe("fail");
  });

  // Images
  test("images: pass when all have alt", async () => {
    const data = makePageData({ images: { total: 10, withoutAlt: 0 } });
    const results = await runSeoChecks(data, defaultRobots);
    const img = results.find((r) => r.label === "Image Alt Tags");
    expect(img.status).toBe("pass");
    expect(img.score).toBe(100);
  });

  test("images: fail when many missing alt", async () => {
    const data = makePageData({ images: { total: 10, withoutAlt: 8 } });
    const results = await runSeoChecks(data, defaultRobots);
    const img = results.find((r) => r.label === "Image Alt Tags");
    expect(img.status).toBe("fail");
  });

  // SSL
  test("ssl: pass for HTTPS", async () => {
    const results = await runSeoChecks(makePageData(), defaultRobots);
    const ssl = results.find((r) => r.label === "SSL Certificate");
    expect(ssl.status).toBe("pass");
  });

  test("ssl: fail for HTTP", async () => {
    const data = makePageData({ isHttps: false });
    const results = await runSeoChecks(data, defaultRobots);
    const ssl = results.find((r) => r.label === "SSL Certificate");
    expect(ssl.status).toBe("fail");
    expect(ssl.score).toBe(0);
  });

  // Canonical
  test("canonical: pass when present", async () => {
    const results = await runSeoChecks(makePageData(), defaultRobots);
    const can = results.find((r) => r.label === "Canonical URL");
    expect(can.status).toBe("pass");
  });

  test("canonical: warn when missing", async () => {
    const data = makePageData({ canonical: null });
    const results = await runSeoChecks(data, defaultRobots);
    const can = results.find((r) => r.label === "Canonical URL");
    expect(can.status).toBe("warn");
  });

  test("canonical: warn when points to different URL on same host", async () => {
    const data = makePageData({
      canonical: "https://example.com/different-page",
      url: "https://example.com/test-page",
    });
    const results = await runSeoChecks(data, defaultRobots);
    const can = results.find((r) => r.label === "Canonical URL");
    expect(can.status).toBe("warn");
    expect(can.detail).toMatch(/different URL/);
  });

  test("canonical: fail when points to different domain", async () => {
    const data = makePageData({
      canonical: "https://otherdomain.com/page",
      url: "https://example.com/test-page",
    });
    const results = await runSeoChecks(data, defaultRobots);
    const can = results.find((r) => r.label === "Canonical URL");
    expect(can.status).toBe("fail");
  });

  test("canonical: pass when self-referencing", async () => {
    const data = makePageData({
      canonical: "https://example.com/test-page",
      url: "https://example.com/test-page",
    });
    const results = await runSeoChecks(data, defaultRobots);
    const can = results.find((r) => r.label === "Canonical URL");
    expect(can.status).toBe("pass");
  });

  test("canonical: skip HEAD check when self-referencing", async () => {
    const data = makePageData({
      canonical: "https://example.com/test-page",
      url: "https://example.com/test-page",
    });
    await runSeoChecks(data, defaultRobots);
    expect(mockCheckExists).not.toHaveBeenCalled();
  });

  test("canonical: fail when HEAD returns 404", async () => {
    mockCheckExists.mockResolvedValueOnce({
      exists: false,
      status: 404,
      redirected: false,
      finalUrl: null,
      error: null,
    });
    const data = makePageData({
      canonical: "https://example.com/broken-slug",
      url: "https://example.com/test-page",
    });
    const results = await runSeoChecks(data, defaultRobots);
    const can = results.find((r) => r.label === "Canonical URL");
    expect(can.status).toBe("fail");
    expect(can.score).toBe(5);
    expect(can.detail).toMatch(/HTTP 404/);
  });

  test("canonical: fail with network error reason when HEAD fails", async () => {
    mockCheckExists.mockResolvedValueOnce({
      exists: false,
      status: 0,
      redirected: false,
      finalUrl: null,
      error: "TimeoutError",
    });
    const data = makePageData({
      canonical: "https://example.com/timeout",
      url: "https://example.com/test-page",
    });
    const results = await runSeoChecks(data, defaultRobots);
    const can = results.find((r) => r.label === "Canonical URL");
    expect(can.status).toBe("fail");
    expect(can.detail).toMatch(/TimeoutError/);
  });

  test("canonical: warn when canonical redirects to different URL", async () => {
    mockCheckExists.mockResolvedValueOnce({
      exists: true,
      status: 200,
      redirected: true,
      finalUrl: "https://example.com/final-destination",
      error: null,
    });
    const data = makePageData({
      canonical: "https://example.com/redirects-here",
      url: "https://example.com/test-page",
    });
    const results = await runSeoChecks(data, defaultRobots);
    const can = results.find((r) => r.label === "Canonical URL");
    expect(can.status).toBe("warn");
    expect(can.detail).toMatch(/redirects to https:\/\/example\.com\/final-destination/);
  });

  test("canonical: warn when canonical redirects back to current page", async () => {
    mockCheckExists.mockResolvedValueOnce({
      exists: true,
      status: 200,
      redirected: true,
      finalUrl: "https://example.com/test-page",
      error: null,
    });
    const data = makePageData({
      canonical: "https://example.com/redirects-back",
      url: "https://example.com/test-page",
    });
    const results = await runSeoChecks(data, defaultRobots);
    const can = results.find((r) => r.label === "Canonical URL");
    expect(can.status).toBe("warn");
    expect(can.detail).toMatch(/redirects back to current page/);
  });

  test("canonical: warn when reachable but points elsewhere on same host", async () => {
    // Default mock: exists=true, redirected=false — simulates a real 200 on a different URL
    const data = makePageData({
      canonical: "https://example.com/different-page",
      url: "https://example.com/test-page",
    });
    const results = await runSeoChecks(data, defaultRobots);
    const can = results.find((r) => r.label === "Canonical URL");
    expect(can.status).toBe("warn");
    expect(can.score).toBe(60);
    expect(mockCheckExists).toHaveBeenCalledWith("https://example.com/different-page");
  });

  // Canonical og:url Consistency
  test("canonical og:url: pass when matching", async () => {
    const results = await runSeoChecks(makePageData(), defaultRobots);
    const check = results.find((r) => r.label === "Canonical og:url Consistency");
    expect(check).toBeDefined();
    expect(check.status).toBe("pass");
  });

  test("canonical og:url: warn when disagreeing", async () => {
    const data = makePageData({
      canonical: "https://example.com/test-page",
      og: { title: "T", description: "D", image: "i.jpg", type: "website", url: "https://example.com/different", site_name: "S" },
    });
    const results = await runSeoChecks(data, defaultRobots);
    const check = results.find((r) => r.label === "Canonical og:url Consistency");
    expect(check.status).toBe("warn");
  });

  // Schema URL Consistency
  test("schema url consistency: pass when no page-level entities", async () => {
    const results = await runSeoChecks(makePageData(), defaultRobots);
    const check = results.find((r) => r.label === "Schema URL Consistency");
    expect(check).toBeDefined();
    expect(check.status).toBe("pass");
  });

  test("schema url consistency: fail when Article url mismatches page url", async () => {
    const data = makePageData({
      url: "https://example.com/test-page",
      jsonLdEntities: [
        { "@type": "Article", "@id": "https://example.com/wrong-slug", url: "https://example.com/wrong-slug", headline: "Test" },
        { "@type": "Article", mainEntityOfPage: "https://example.com/another-wrong", headline: "Test2" },
        { "@type": "Article", url: "https://example.com/third-wrong", headline: "Test3" },
      ],
    });
    const results = await runSeoChecks(data, defaultRobots);
    const check = results.find((r) => r.label === "Schema URL Consistency");
    expect(check.status).toBe("fail");
    expect(check.detail).toMatch(/don't match/);
  });

  test("schema validity: accepts ISO 8601 with fractional seconds (toISOString output)", async () => {
    const data = makePageData({
      jsonLdEntities: [
        { "@type": "Article", datePublished: "2026-05-16T13:12:19.685Z", dateModified: "2026-05-16T13:12:19Z", headline: "T" },
      ],
    });
    const results = await runSeoChecks(data, defaultRobots);
    const check = results.find((r) => r.label === "Schema Validity");
    expect(check.status).toBe("pass");
  });

  test("schema validity: fails on year-only and date-only values", async () => {
    const data = makePageData({
      jsonLdEntities: [
        { "@type": "Organization", foundingDate: "2025" },
        { "@type": "Article", datePublished: "2025-07-01", headline: "T" },
      ],
    });
    const results = await runSeoChecks(data, defaultRobots);
    const check = results.find((r) => r.label === "Schema Validity");
    expect(check.status).not.toBe("pass");
    expect(check.items.length).toBeGreaterThanOrEqual(2);
  });

  test("schema url consistency: skip Organization and BreadcrumbList entities", async () => {
    const data = makePageData({
      url: "https://example.com/test-page",
      jsonLdEntities: [
        { "@type": "Organization", url: "https://example.com/about" },
        { "@type": "BreadcrumbList", "@id": "https://example.com/breadcrumbs" },
      ],
    });
    const results = await runSeoChecks(data, defaultRobots);
    const check = results.find((r) => r.label === "Schema URL Consistency");
    expect(check.status).toBe("pass");
  });

  // Open Graph
  test("og: pass when all tags present", async () => {
    const results = await runSeoChecks(makePageData(), defaultRobots);
    const og = results.find((r) => r.label === "Open Graph Tags");
    expect(og.status).toBe("pass");
    expect(og.score).toBe(100);
  });

  test("og: fail when multiple tags missing", async () => {
    const data = makePageData({ og: {} });
    const results = await runSeoChecks(data, defaultRobots);
    const og = results.find((r) => r.label === "Open Graph Tags");
    expect(og.status).toBe("fail");
  });

  test("OG Tags: score 100 when all 6 tags present", async () => {
    const data = makePageData({
      og: { title: "T", description: "D", image: "I", type: "website", url: "https://example.com", site_name: "Test" },
    });
    const results = await runSeoChecks(data, defaultRobots);
    const og = results.find(r => r.label === "Open Graph Tags");
    expect(og.score).toBe(100);
    expect(og.status).toBe("pass");
  });

  test("OG Tags: score 80 when 5 of 6 tags present", async () => {
    const data = makePageData({
      og: { title: "T", description: "D", image: "I", type: "website", url: "https://example.com" },
    });
    const results = await runSeoChecks(data, defaultRobots);
    const og = results.find(r => r.label === "Open Graph Tags");
    expect(og.score).toBe(80);
    expect(og.status).toBe("pass");
  });

  test("OG Tags: score 60 when 4 of 6 tags present", async () => {
    const data = makePageData({
      og: { title: "T", description: "D", image: "I", type: "website" },
    });
    const results = await runSeoChecks(data, defaultRobots);
    const og = results.find(r => r.label === "Open Graph Tags");
    expect(og.score).toBe(60);
    expect(og.status).toBe("warn");
  });

  test("OG Tags: score 25 when only 2 tags present", async () => {
    const data = makePageData({
      og: { title: "T", description: "D" },
    });
    const results = await runSeoChecks(data, defaultRobots);
    const og = results.find(r => r.label === "Open Graph Tags");
    expect(og.score).toBe(25);
    expect(og.status).toBe("fail");
  });

  // robots.txt
  test("robots: fail when blocking entire site", async () => {
    const robots = { accessible: true, disallowed: ["/"], content: "" };
    const results = await runSeoChecks(makePageData(), robots);
    const r = results.find((r) => r.label === "robots.txt");
    expect(r.status).toBe("fail");
  });

  // JSON-LD
  test("json-ld: fail when none present", async () => {
    const data = makePageData({ jsonLd: [], jsonLdEntities: [] });
    const results = await runSeoChecks(data, defaultRobots);
    const schema = results.find((r) => r.label === "JSON-LD Schema");
    expect(schema.status).toBe("fail");
    expect(schema.score).toBe(10);
  });

  // HTML Lang Attribute
  test("html lang: pass for valid lang attribute", async () => {
    const results = await runSeoChecks(makePageData({ htmlLang: "en" }), defaultRobots);
    const check = results.find((r) => r.label === "HTML Lang Attribute");
    expect(check.status).toBe("pass");
    expect(check.score).toBe(100);
  });

  test("html lang: fail when missing", async () => {
    const results = await runSeoChecks(makePageData({ htmlLang: null }), defaultRobots);
    const check = results.find((r) => r.label === "HTML Lang Attribute");
    expect(check.status).toBe("fail");
    expect(check.score).toBe(15);
  });

  // URL Cleanliness
  test("url cleanliness: pass for clean URL", async () => {
    const results = await runSeoChecks(makePageData({ url: "https://example.com/blog/my-article" }), defaultRobots);
    const check = results.find((r) => r.label === "URL Cleanliness");
    expect(check.status).toBe("pass");
  });

  test("url cleanliness: warn for URL with underscores", async () => {
    const results = await runSeoChecks(makePageData({ url: "https://example.com/my_page" }), defaultRobots);
    const check = results.find((r) => r.label === "URL Cleanliness");
    expect(check.status).toBe("warn");
  });

  // Breadcrumb Schema
  test("breadcrumb schema: pass when present", async () => {
    const results = await runSeoChecks(makePageData({ hasBreadcrumbSchema: true }), defaultRobots);
    const check = results.find((r) => r.label === "Breadcrumb Schema");
    expect(check.status).toBe("pass");
    expect(check.score).toBe(100);
  });

  test("breadcrumb schema: warn when absent", async () => {
    const results = await runSeoChecks(makePageData({ hasBreadcrumbSchema: false }), defaultRobots);
    const check = results.find((r) => r.label === "Breadcrumb Schema");
    expect(check.status).toBe("warn");
  });

  // Sitemap in robots.txt
  test("sitemap in robots.txt: pass when directive found", async () => {
    const robots = { accessible: true, disallowed: [], content: "", sitemapDirectives: ["https://example.com/sitemap.xml"] };
    const results = await runSeoChecks(makePageData(), robots);
    const check = results.find((r) => r.label === "Sitemap in robots.txt");
    expect(check.status).toBe("pass");
  });

  test("sitemap in robots.txt: warn when missing", async () => {
    const robots = { accessible: true, disallowed: [], content: "", sitemapDirectives: [] };
    const results = await runSeoChecks(makePageData(), robots);
    const check = results.find((r) => r.label === "Sitemap in robots.txt");
    expect(check.status).toBe("warn");
  });

  // Semantic HTML
  test("semantic html: pass with all landmarks", async () => {
    const results = await runSeoChecks(makePageData({ semanticLandmarks: { nav: 1, main: 1, header: 1, footer: 1 } }), defaultRobots);
    const check = results.find((r) => r.label === "Semantic HTML");
    expect(check.status).toBe("pass");
  });

  test("semantic html: fail with few landmarks", async () => {
    const results = await runSeoChecks(makePageData({ semanticLandmarks: { nav: 0, main: 0, header: 0, footer: 0 } }), defaultRobots);
    const check = results.find((r) => r.label === "Semantic HTML");
    expect(check.status).toBe("fail");
  });

  // Title / H1 Uniqueness
  test("title/h1 uniqueness: pass when different", async () => {
    const results = await runSeoChecks(makePageData({ title: "Page Title", h1s: ["Main Heading"] }), defaultRobots);
    const check = results.find((r) => r.label === "Title / H1 Uniqueness");
    expect(check.status).toBe("pass");
  });

  test("title/h1 uniqueness: warn when identical", async () => {
    const results = await runSeoChecks(makePageData({ title: "Same Text", h1s: ["Same Text"] }), defaultRobots);
    const check = results.find((r) => r.label === "Title / H1 Uniqueness");
    expect(check.status).toBe("warn");
    expect(check.score).toBe(55);
  });

  // Well-optimized page should score high (weighted average)
});

describe("Sitemap Completeness", () => {
  test("Sitemap Completeness: score 100 when all pages in sitemap", async () => {
    const results = await runSeoChecks(makePageData({ url: "https://example.com/page1" }), defaultRobots, {
      sitemapUrls: ["https://example.com/page1", "https://example.com/page2"],
      discoveredUrls: ["https://example.com/page1", "https://example.com/page2"],
    });
    const check = results.find(r => r.label === "Sitemap Completeness");
    expect(check.score).toBe(100);
    expect(check.status).toBe("pass");
  });

  test("Sitemap Completeness: warn when 80% coverage", async () => {
    const discovered = Array.from({ length: 10 }, (_, i) => `https://example.com/page${i}`);
    const sitemap = discovered.slice(0, 8);
    const results = await runSeoChecks(makePageData(), defaultRobots, {
      sitemapUrls: sitemap,
      discoveredUrls: discovered,
    });
    const check = results.find(r => r.label === "Sitemap Completeness");
    expect(check.score).toBe(70);
    expect(check.status).toBe("warn");
  });

  test("Sitemap Completeness: fail when no sitemap", async () => {
    const results = await runSeoChecks(makePageData(), defaultRobots, {
      sitemapUrls: [],
      discoveredUrls: ["https://example.com/page1"],
    });
    const check = results.find(r => r.label === "Sitemap Completeness");
    expect(check.score).toBe(0);
    expect(check.status).toBe("fail");
  });

  test("Sitemap Completeness: skipped when no site context", async () => {
    const results = await runSeoChecks(makePageData(), defaultRobots);
    const check = results.find(r => r.label === "Sitemap Completeness");
    expect(check).toBeUndefined();
  });

  test("Sitemap Completeness: treats /index.html as equivalent to /", async () => {
    const results = await runSeoChecks(makePageData({ url: "https://example.com/" }), defaultRobots, {
      sitemapUrls: ["https://example.com/"],
      discoveredUrls: ["https://example.com/", "https://example.com/index.html"],
    });
    const check = results.find(r => r.label === "Sitemap Completeness");
    expect(check.score).toBe(100);
    expect(check.detail).toContain("All 2");
  });

  test("Sitemap Completeness: normalizes /blog/index.html to /blog", async () => {
    const results = await runSeoChecks(makePageData({ url: "https://example.com/" }), defaultRobots, {
      sitemapUrls: ["https://example.com/", "https://example.com/blog"],
      discoveredUrls: ["https://example.com/", "https://example.com/blog/index.html"],
    });
    const check = results.find(r => r.label === "Sitemap Completeness");
    expect(check.score).toBe(100);
  });
});

describe("Redirect Chain", () => {
  test("scores 100 for no redirects", async () => {
    const data = makePageData({ redirectChain: [] });
    const results = await runSeoChecks(data, defaultRobots);
    const check = results.find((r) => r.label === "Redirect Chain");
    expect(check.score).toBe(100);
    expect(check.status).toBe("pass");
  });
  test("scores 25 for 3+ redirects", async () => {
    const data = makePageData({
      redirectChain: [
        { url: "http://a.com", status: 301 },
        { url: "http://b.com", status: 302 },
        { url: "http://c.com", status: 301 },
      ],
    });
    const results = await runSeoChecks(data, defaultRobots);
    const check = results.find((r) => r.label === "Redirect Chain");
    expect(check.score).toBe(25);
    expect(check.status).toBe("fail");
  });
});

describe("Modern Image Formats", () => {
  test("scores 100 when all modern", async () => {
    const data = makePageData({
      images: { total: 3, withoutAlt: 0, withoutAltItems: [], allItems: [
        { src: "hero.webp", alt: "Hero", srcset: "", sizes: "", width: "" },
        { src: "photo.avif", alt: "Photo", srcset: "", sizes: "", width: "" },
        { src: "data:image/webp;base64,abc", alt: "Inline", srcset: "", sizes: "", width: "" },
      ]},
    });
    const results = await runSeoChecks(data, defaultRobots);
    const check = results.find((r) => r.label === "Modern Image Formats");
    expect(check.score).toBe(100);
  });
  test("scores 90 for no images", async () => {
    const data = makePageData({ images: { total: 0, withoutAlt: 0, withoutAltItems: [], allItems: [] } });
    const results = await runSeoChecks(data, defaultRobots);
    const check = results.find((r) => r.label === "Modern Image Formats");
    expect(check.score).toBe(90);
  });
});

describe("Responsive Images", () => {
  test("scores 100 when all have srcset", async () => {
    const data = makePageData({
      images: { total: 2, withoutAlt: 0, withoutAltItems: [], allItems: [
        { src: "a.jpg", alt: "A", srcset: "a-400.jpg 400w", sizes: "100vw", width: "" },
        { src: "b.jpg", alt: "B", srcset: "b-400.jpg 400w", sizes: "100vw", width: "" },
      ]},
    });
    const results = await runSeoChecks(data, defaultRobots);
    const check = results.find((r) => r.label === "Responsive Images");
    expect(check.score).toBe(100);
  });
});

describe("Schema Currency", () => {
  test("scores 100 for no deprecated", async () => {
    const data = makePageData({ jsonLd: [{ "@type": "Article" }] });
    const results = await runSeoChecks(data, defaultRobots);
    const check = results.find((r) => r.label === "Schema Currency");
    expect(check.score).toBe(100);
  });
  test("scores 50 for HowTo", async () => {
    const data = makePageData({ jsonLd: [{ "@type": "HowTo" }] });
    const results = await runSeoChecks(data, defaultRobots);
    const check = results.find((r) => r.label === "Schema Currency");
    expect(check.score).toBe(50);
    expect(check.status).toBe("warn");
  });
  test("scores 25 for SpecialAnnouncement", async () => {
    const data = makePageData({ jsonLd: [{ "@type": "SpecialAnnouncement" }] });
    const results = await runSeoChecks(data, defaultRobots);
    const check = results.find((r) => r.label === "Schema Currency");
    expect(check.score).toBe(25);
    expect(check.status).toBe("fail");
  });
  test("scores 50 for FAQPage on non-gov site", async () => {
    const data = makePageData({ jsonLd: [{ "@type": "FAQPage" }], url: "https://example.com" });
    const results = await runSeoChecks(data, defaultRobots);
    const check = results.find((r) => r.label === "Schema Currency");
    expect(check.score).toBe(50);
    expect(check.status).toBe("warn");
    expect(check.detail).toContain("restricted to government and health sites");
  });
  test("scores 100 for FAQPage on .gov site", async () => {
    const data = makePageData({ jsonLd: [{ "@type": "FAQPage" }], url: "https://example.gov/faq" });
    const results = await runSeoChecks(data, defaultRobots);
    const check = results.find((r) => r.label === "Schema Currency");
    expect(check.score).toBe(100);
  });
});

describe("Mixed Content", () => {
  test("scores 100 on HTTPS with no mixed", async () => {
    const data = makePageData({
      url: "https://example.com",
      resourceUrls: [{ url: "https://cdn.example.com/style.css", tag: "link", rel: "stylesheet" }],
    });
    const results = await runSeoChecks(data, defaultRobots);
    const check = results.find((r) => r.label === "Mixed Content");
    expect(check.score).toBe(100);
  });
  test("excludes protocol-relative URLs", async () => {
    const data = makePageData({
      url: "https://example.com",
      resourceUrls: [{ url: "//cdn.example.com/style.css", tag: "link", rel: "stylesheet" }],
    });
    const results = await runSeoChecks(data, defaultRobots);
    const check = results.find((r) => r.label === "Mixed Content");
    expect(check.score).toBe(100);
  });
});

describe("Favicon & Icons", () => {
  test("scores 100 with favicon and apple-touch-icon", async () => {
    const data = makePageData({
      linkIcons: [{ rel: "icon", href: "/favicon.ico" }, { rel: "apple-touch-icon", href: "/apple.png" }],
      faviconExists: true,
    });
    const results = await runSeoChecks(data, defaultRobots);
    const check = results.find((r) => r.label === "Favicon & Icons");
    expect(check.score).toBe(100);
  });
  test("scores 20 with nothing found", async () => {
    const data = makePageData({ linkIcons: [], faviconExists: false });
    const results = await runSeoChecks(data, defaultRobots);
    const check = results.find((r) => r.label === "Favicon & Icons");
    expect(check.score).toBe(20);
  });
});

describe("AI Content Quality", () => {
  test("scores 100 for clean human content", async () => {
    const data = makePageData({
      visibleText: "We help small businesses grow their online presence through proven marketing strategies. Our team has 15 years of experience working with local retailers and service providers across the midwest. We focus on practical, real-world results that help our clients attract new customers and retain existing ones. Every plan we build is tailored to the specific goals and budget of each business we work with.",
      htmlLang: "en",
    });
    const results = await runSeoChecks(data, defaultRobots);
    const check = results.find(r => r.label === "AI Content Quality");
    expect(check.score).toBe(100);
    expect(check.status).toBe("pass");
  });

  test("scores low for AI-heavy content", async () => {
    const data = makePageData({
      visibleText: "In today's fast-paced world, it's important to note that delving into the intricacies of SEO is pivotal. This groundbreaking approach leverages cutting-edge techniques to harness the transformative power of digital marketing. It serves as a testament to the seamless integration of innovative strategies in an ever-evolving landscape. The multifaceted nature of this holistic paradigm showcases the robust and comprehensive framework.",
      htmlLang: "en",
    });
    const results = await runSeoChecks(data, defaultRobots);
    const check = results.find(r => r.label === "AI Content Quality");
    expect(check.score).toBeLessThanOrEqual(45);
    expect(check.status).not.toBe("pass");
  });

  test("scores 85 neutral for short content", async () => {
    const data = makePageData({
      visibleText: "Welcome to our site.",
      htmlLang: "en",
    });
    const results = await runSeoChecks(data, defaultRobots);
    const check = results.find(r => r.label === "AI Content Quality");
    expect(check.score).toBe(85);
  });

  test("scores 85 neutral for CJK languages", async () => {
    const data = makePageData({
      visibleText: "これはテストページです。SEOの最適化について説明します。",
      htmlLang: "ja",
    });
    const results = await runSeoChecks(data, defaultRobots);
    const check = results.find(r => r.label === "AI Content Quality");
    expect(check.score).toBe(85);
  });

  test("detects Dutch AI patterns", async () => {
    const data = makePageData({
      visibleText: "In de huidige snelle wereld is het belangrijk om op te merken dat innovatief optimaliseren cruciaal is. Het holistisch benutten van baanbrekende technologie speelt een cruciale rol in het essentieel transformatief pionierswerk van naadloos schaalbaar robuust veelzijdig werk. Dit baanbrekend en essentieel kader biedt een cruciaal overzicht van de transformatieve mogelijkheden die beschikbaar zijn voor moderne organisaties die willen groeien.",
      htmlLang: "nl",
    });
    const results = await runSeoChecks(data, defaultRobots);
    const check = results.find(r => r.label === "AI Content Quality");
    expect(check.score).toBeLessThanOrEqual(75);
  });
});

describe("SEO Checks (continued)", () => {
  // Well-optimized page should score high (weighted average)
  test("well-optimized page scores above 70", async () => {
    const data = makePageData({
      title: "A".repeat(55),
      metaDescription: "A".repeat(140),
      images: { total: 5, withoutAlt: 0 },
    });
    const results = await runSeoChecks(data, defaultRobots);
    const SEO_WEIGHTS = {
      "Title Tag": 3, "Meta Description": 3, "H1 Tag": 3,
      "SSL Certificate": 3, "Meta Robots": 3, "Mobile Viewport": 3,
      "Heading Hierarchy": 2, "Image Alt Tags": 2, "JSON-LD Schema": 2,
      "robots.txt": 2, "Content Depth": 2, "Internal Linking": 2,
      "HTML Lang Attribute": 2, "URL Cleanliness": 2, "Semantic HTML": 2,
      "Canonical URL": 1, "Open Graph Tags": 1, "Schema Completeness": 1,
      "Hreflang Tags": 1, "Content-to-Code Ratio": 1,
      "Breadcrumb Schema": 1, "Sitemap in robots.txt": 1, "Title / H1 Uniqueness": 1,
    };
    let totalWeight = 0, weightedSum = 0;
    for (const r of results) {
      const w = SEO_WEIGHTS[r.label] || 1;
      weightedSum += r.score * w;
      totalWeight += w;
    }
    const score = Math.round(weightedSum / totalWeight);
    expect(score).toBeGreaterThanOrEqual(70);
  });

  test("AI Disclosure: score 100 when disclosure found", async () => {
    const data = makePageData({
      pageType: "article",
      visibleText: "This article was written with AI assistance and reviewed by our team.",
    });
    const results = await runSeoChecks(data, defaultRobots);
    const check = results.find(r => r.label === "AI Disclosure");
    expect(check.score).toBe(100);
    expect(check.status).toBe("pass");
  });

  test("AI Disclosure: N/A when no AI patterns detected", async () => {
    const data = makePageData({
      pageType: "article",
      visibleText: "This is a regular article about SEO best practices for 2026.",
    });
    const results = await runSeoChecks(data, defaultRobots);
    const check = results.find(r => r.label === "AI Disclosure");
    expect(check.score).toBe(100);
    expect(check.status).toBe("na");
  });

  test("AI Disclosure: skipped on homepage", async () => {
    const data = makePageData({ pageType: "homepage" });
    const results = await runSeoChecks(data, defaultRobots);
    const check = results.find(r => r.label === "AI Disclosure");
    expect(check.status).toBe("na");
  });

  test("AI Disclosure: detects Dutch disclosure", async () => {
    const data = makePageData({
      pageType: "article",
      visibleText: "Dit artikel is met AI gemaakt en door onze redactie gecontroleerd.",
    });
    const results = await runSeoChecks(data, defaultRobots);
    const check = results.find(r => r.label === "AI Disclosure");
    expect(check.score).toBe(100);
  });
});
