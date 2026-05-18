const { parsePage } = require("../crawler");

const sampleHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <title>Test Site - Web Development</title>
  <meta name="description" content="A test site for web development services with over 100 happy clients.">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <link rel="canonical" href="https://test.com/">
  <meta property="og:title" content="Test Site">
  <meta property="og:description" content="Web dev services">
  <meta property="og:image" content="https://test.com/og.jpg">
  <link rel="alternate" hreflang="en" href="https://test.com/en/">
  <link rel="alternate" hreflang="de" href="https://test.com/de/">
  <script type="application/ld+json">{"@type":"Organization","name":"Test Corp","url":"https://test.com"}</script>
</head>
<body>
  <h1>Professional Web Development</h1>
  <h2>Our Services</h2>
  <h2>About Us</h2>
  <p>We build websites for over 100 clients worldwide.</p>
  <p>Short text.</p>
  <p>Our team has 15 years of experience delivering quality solutions across multiple industries.</p>
  <img src="hero.jpg" alt="Hero image">
  <img src="logo.png" alt="Logo">
  <img src="photo.jpg">
  <a href="/services">Services</a>
  <a href="/about">About</a>
  <a href="/contact">Contact</a>
  <a href="https://twitter.com/test">Twitter</a>
  <a href="https://github.com/test">GitHub</a>
  <button class="btn-primary">Get Started</button>
  <time datetime="2024-06-15">June 15, 2024</time>
</body>
</html>`;

describe("parsePage", () => {
  let data;

  beforeAll(() => {
    data = parsePage(sampleHtml, "https://test.com/");
  });

  test("extracts title", () => {
    expect(data.title).toBe("Test Site - Web Development");
  });

  test("extracts meta description", () => {
    expect(data.metaDescription).toContain("test site for web development");
  });

  test("extracts H1 tags", () => {
    expect(data.h1s).toEqual(["Professional Web Development"]);
  });

  test("extracts heading hierarchy", () => {
    expect(data.headings.h1).toHaveLength(1);
    expect(data.headings.h2).toHaveLength(2);
  });

  test("counts images and missing alt tags", () => {
    expect(data.images.total).toBe(3);
    expect(data.images.withoutAlt).toBe(1);
  });

  test("extracts canonical URL", () => {
    expect(data.canonical).toBe("https://test.com/");
  });

  test("extracts Open Graph tags", () => {
    expect(data.og.title).toBe("Test Site");
    expect(data.og.description).toBe("Web dev services");
    expect(data.og.image).toBe("https://test.com/og.jpg");
  });

  test("extracts JSON-LD structured data", () => {
    expect(data.jsonLd).toHaveLength(1);
    expect(data.jsonLd[0]["@type"]).toBe("Organization");
    expect(data.jsonLd[0].name).toBe("Test Corp");
  });

  test("extracts viewport meta", () => {
    expect(data.viewport).toContain("width=device-width");
  });

  test("extracts hreflang tags", () => {
    expect(data.hreflang).toHaveLength(2);
    expect(data.hreflang[0].lang).toBe("en");
    expect(data.hreflang[1].lang).toBe("de");
  });

  test("counts internal and external links", () => {
    expect(data.links.internal).toBe(3);
    expect(data.links.external).toBe(2);
    expect(data.links.total).toBe(5);
  });

  test("detects HTTPS", () => {
    expect(data.isHttps).toBe(true);
  });

  test("detects HTTP", () => {
    const httpData = parsePage(sampleHtml, "http://test.com/");
    expect(httpData.isHttps).toBe(false);
  });

  test("extracts paragraphs (>20 chars only)", () => {
    expect(data.paragraphs.length).toBeGreaterThanOrEqual(2);
    data.paragraphs.forEach((p) => {
      expect(p.length).toBeGreaterThan(20);
    });
  });

  test("extracts time elements", () => {
    expect(data.timeElements).toContain("2024-06-15");
  });

  test("detects CTA buttons", () => {
    expect(data.ctas.length).toBeGreaterThanOrEqual(1);
    expect(data.ctas).toContain("Get Started");
  });

  test("handles FAQ schema detection", () => {
    expect(data.hasFaqSchema).toBe(false);

    const faqHtml = `<html><head>
      <script type="application/ld+json">{"@type":"FAQPage","mainEntity":[]}</script>
    </head><body></body></html>`;
    const faqData = parsePage(faqHtml, "https://test.com/");
    expect(faqData.hasFaqSchema).toBe(true);
  });

  test("handles empty/minimal HTML gracefully", () => {
    const minimal = parsePage("<html><body></body></html>", "https://test.com/");
    expect(minimal.title).toBe("");
    expect(minimal.metaDescription).toBe("");
    expect(minimal.h1s).toEqual([]);
    expect(minimal.images.total).toBe(0);
    expect(minimal.canonical).toBeNull();
    expect(minimal.jsonLd).toEqual([]);
    expect(minimal.viewport).toBeNull();
  });

  test("handles invalid JSON-LD gracefully", () => {
    const badJsonLd = `<html><head>
      <script type="application/ld+json">not valid json{</script>
    </head><body></body></html>`;
    const result = parsePage(badJsonLd, "https://test.com/");
    expect(result.jsonLd).toEqual([]);
  });
});
