const express = require("express");
const cors = require("cors");
const { parsePage } = require("../crawler");
const { runSeoChecks } = require("../checks/seo");
const { runLlmChecks } = require("../checks/llm");
const { runMarketingChecks } = require("../checks/marketing");

// Build a test app that doesn't need network access
function createTestApp() {
  const app = express();
  app.use(cors());
  app.use(express.json());

  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", version: "1.0.0" });
  });

  // Test-only endpoint that accepts raw HTML instead of fetching a URL
  app.post("/api/test-analyze", async (req, res) => {
    const { html, url } = req.body;
    if (!html || !url) {
      return res.status(400).json({ error: "html and url are required" });
    }

    const pageData = parsePage(html, url);
    const robotsTxt = { accessible: true, disallowed: [], content: "" };
    // Stub checkUrlExists in tests — no real network calls.
    const stubCheckUrlExists = async () => ({ exists: true, status: 200, redirected: false, finalUrl: null, error: null });
    const seoResults = await runSeoChecks(pageData, robotsTxt, undefined, { checkUrlExists: stubCheckUrlExists });
    const llmResults = runLlmChecks(pageData);
    const marketingResults = runMarketingChecks(pageData);

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
    const LLM_WEIGHTS = {
      "AI Crawler Access": 3, "Content Clarity": 3, "Answer Capsules": 3,
      "Content Extractability": 2, "Citation Worthiness": 2,
      "Entity Recognition": 2, "FAQ Presence": 2,
      "WebSite / WebPage Schema": 2,
      "Author & Expertise": 1, "Source Attribution": 1,
      "Answer Density": 1, "Freshness Signals": 1,
      "Speakable Schema": 1, "HowTo Schema": 1,
    };
    const MARKETING_WEIGHTS = {
      "Value Proposition": 3, "CTA Effectiveness": 3,
      "Trust Signals": 2, "Social Proof": 2, "Contact Visibility": 2,
      "Image Lazy Loading": 2,
      "Reviews & Ratings": 1, "Video Content": 1,
      "Privacy & Security": 1, "Tone Consistency": 1,
      "Font Display": 1, "Preconnect Hints": 1, "Accessibility Landmarks": 1,
    };
    const weightedScore = (arr, weights) => {
      if (arr.length === 0) return 0;
      let totalWeight = 0, weightedSum = 0;
      for (const r of arr) {
        const w = weights[r.label] || 1;
        weightedSum += r.score * w;
        totalWeight += w;
      }
      return Math.round(weightedSum / totalWeight);
    };

    res.json({
      url,
      scores: {
        seo: weightedScore(seoResults, SEO_WEIGHTS),
        llm: weightedScore(llmResults, LLM_WEIGHTS),
        marketing: weightedScore(marketingResults, MARKETING_WEIGHTS),
      },
      seo: seoResults,
      llm: llmResults,
      marketing: marketingResults,
    });
  });

  app.post("/api/scan", (req, res) => {
    const { url } = req.body;
    if (!url || typeof url !== "string") {
      return res.status(400).json({ error: "url is required" });
    }
    // Validate URL format
    let targetUrl = url.trim();
    if (!/^https?:\/\//i.test(targetUrl)) {
      targetUrl = `https://${targetUrl}`;
    }
    try {
      new URL(targetUrl);
    } catch {
      return res.status(400).json({ error: "Invalid URL format" });
    }
    // In tests we don't actually fetch — just validate the endpoint structure
    res.status(502).json({ error: "Network not available in test" });
  });

  return app;
}

let server;
let baseUrl;

beforeAll((done) => {
  const app = createTestApp();
  server = app.listen(0, () => {
    const port = server.address().port;
    baseUrl = `http://localhost:${port}`;
    done();
  });
});

afterAll((done) => {
  server.close(done);
});

describe("API Smoke Tests", () => {
  test("GET /api/health returns ok", async () => {
    const res = await fetch(`${baseUrl}/api/health`);
    const data = await res.json();
    expect(res.status).toBe(200);
    expect(data.status).toBe("ok");
    expect(data.version).toBe("1.0.0");
  });

  test("POST /api/scan rejects missing url", async () => {
    const res = await fetch(`${baseUrl}/api/scan`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toContain("url is required");
  });

  test("POST /api/scan validates URL format", async () => {
    const res = await fetch(`${baseUrl}/api/scan`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url: "https://example.com" }),
    });
    // Would return 502 since no network, but URL validation passes
    expect([200, 502]).toContain(res.status);
  });

  test("POST /api/scan normalizes URL without protocol", async () => {
    const res = await fetch(`${baseUrl}/api/scan`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url: "example.com" }),
    });
    // Should not fail with 400 — URL gets normalized
    expect(res.status).not.toBe(400);
  });
});

describe("Full Pipeline Integration", () => {
  const testHtml = `<!DOCTYPE html>
<html><head>
  <title>Integration Test Page - Quality Services</title>
  <meta name="description" content="We provide quality services to help businesses grow and succeed in their market.">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <link rel="canonical" href="https://test.com/">
  <meta property="og:title" content="Test Page">
  <meta property="og:description" content="Quality services">
  <meta property="og:image" content="https://test.com/og.jpg">
  <script type="application/ld+json">{"@type":"Organization","name":"Test Corp"}</script>
</head><body>
  <h1>Quality Business Services Since 2015</h1>
  <p>We have served over 500 clients with a 95% satisfaction rate across all industries.</p>
  <p>Our expert team delivers results within 30 days guaranteed or your money back.</p>
  <img src="hero.jpg" alt="Team photo">
  <a href="/services">Our Services</a>
  <a href="/contact">Contact Us</a>
  <button class="btn">Get Started</button>
</body></html>`;

  test("returns complete response with all sections", async () => {
    const res = await fetch(`${baseUrl}/api/test-analyze`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ html: testHtml, url: "https://test.com/" }),
    });
    const data = await res.json();

    expect(res.status).toBe(200);

    // Scores
    expect(data.scores).toHaveProperty("seo");
    expect(data.scores).toHaveProperty("llm");
    expect(data.scores).toHaveProperty("marketing");
    expect(data.scores.seo).toBeGreaterThanOrEqual(0);
    expect(data.scores.seo).toBeLessThanOrEqual(100);

    // Check arrays
    expect(data.seo).toHaveLength(32);
    expect(data.llm).toHaveLength(21);
    expect(data.marketing.length).toBeGreaterThanOrEqual(20);

    // URL preserved
    expect(data.url).toBe("https://test.com/");
  });

  test("scores are consistent with check results", async () => {
    const res = await fetch(`${baseUrl}/api/test-analyze`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ html: testHtml, url: "https://test.com/" }),
    });
    const data = await res.json();

    // Verify score uses weighted average
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
    for (const r of data.seo) {
      const w = SEO_WEIGHTS[r.label] || 1;
      weightedSum += r.score * w;
      totalWeight += w;
    }
    const expectedSeo = Math.round(weightedSum / totalWeight);
    expect(data.scores.seo).toBe(expectedSeo);
  });
});
