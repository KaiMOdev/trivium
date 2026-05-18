jest.mock("../middleware/ssrf", () => ({
  validateUrlSafety: jest.fn().mockResolvedValue(undefined),
}));

const { fetchPage, parsePage } = require("../crawler");

describe("fetchPage redirect chain", () => {
  test("returns empty redirectChain for direct response", async () => {
    global.fetch = jest.fn().mockResolvedValueOnce({
      ok: true,
      status: 200,
      headers: { get: () => null },
      text: async () => "<html><body>Hello</body></html>",
    });
    const result = await fetchPage("https://example.com");
    expect(result.redirectChain).toBeDefined();
    expect(Array.isArray(result.redirectChain)).toBe(true);
    expect(result.redirectChain.length).toBe(0);
  });
});

describe("parsePage expanded fields", () => {
  test("extracts srcset and sizes from images", () => {
    const html = `<html><head></head><body>
      <img src="hero.webp" srcset="hero-400.webp 400w, hero-800.webp 800w" sizes="(max-width: 600px) 400px, 800px" alt="Hero">
      <img src="old.jpg" alt="Old image">
      <picture>
        <source srcset="photo.avif" type="image/avif">
        <source srcset="photo.webp" type="image/webp">
        <img src="photo.jpg" alt="Photo">
      </picture>
    </body></html>`;
    const data = parsePage(html, "https://example.com/page");
    const heroImg = data.images.allItems.find((i) => i.src.includes("hero.webp"));
    expect(heroImg.srcset).toContain("hero-400.webp");
    expect(heroImg.sizes).toContain("400px");
  });

  test("extracts picture elements", () => {
    const html = `<html><head></head><body><picture>
      <source srcset="photo.avif" type="image/avif">
      <source srcset="photo.webp" type="image/webp">
      <img src="photo.jpg" alt="Photo">
    </picture></body></html>`;
    const data = parsePage(html, "https://example.com");
    expect(data.pictureElements).toBeDefined();
    expect(data.pictureElements.length).toBe(1);
    expect(data.pictureElements[0].sources.length).toBe(2);
  });

  test("extracts link icons", () => {
    const html = `<html><head>
      <link rel="icon" href="/favicon.ico">
      <link rel="apple-touch-icon" href="/apple-touch-icon.png">
    </head><body></body></html>`;
    const data = parsePage(html, "https://example.com");
    expect(data.linkIcons.length).toBe(2);
  });

  test("extracts resource URLs", () => {
    const html = `<html><head>
      <script src="http://cdn.example.com/script.js"></script>
    </head><body>
      <img src="http://images.example.com/photo.jpg" alt="Photo">
    </body></html>`;
    const data = parsePage(html, "https://example.com");
    expect(data.resourceUrls.length).toBeGreaterThanOrEqual(2);
  });

  test("detects logo in header", () => {
    const html = `<html><body>
      <header><a href="/"><img src="/logo.png" class="custom-logo" alt="MyBrand"></a></header>
      <main><p>Content</p></main>
    </body></html>`;
    const data = parsePage(html, "https://example.com");
    expect(data.logoDetected.found).toBe(true);
    expect(data.logoDetected.location).toBe("header");
  });

  test("detects Google Fonts", () => {
    const html = `<html><head>
      <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@400;700&family=Fira+Code&display=swap" rel="stylesheet">
    </head><body><p>Content</p></body></html>`;
    const data = parsePage(html, "https://example.com");
    expect(data.loadedFonts.length).toBeGreaterThanOrEqual(2);
    expect(data.loadedFonts).toEqual(expect.arrayContaining(["Outfit", "Fira Code"]));
  });

  test("counts visible form fields", () => {
    const html = `<html><body><form action="/contact">
      <input type="text" name="name">
      <input type="email" name="email">
      <input type="hidden" name="_csrf" value="token">
      <textarea name="message"></textarea>
      <button type="submit">Send</button>
    </form></body></html>`;
    const data = parsePage(html, "https://example.com");
    expect(data.formFields.length).toBe(1);
    expect(data.formFields[0].visibleCount).toBe(3);
    expect(data.formFields[0].isSearch).toBe(false);
  });

  test("detects paywall signals", () => {
    const html = `<html><body>
      <div class="paywall">Subscribe to continue</div>
      <form><input type="password"></form>
    </body></html>`;
    const data = parsePage(html, "https://example.com");
    expect(data.paywallSignals.hasPaywallClasses).toBe(true);
    expect(data.paywallSignals.hasLoginForm).toBe(true);
  });

  test("no paywall on normal page", () => {
    const html = `<html><body><main><p>Free content</p></main></body></html>`;
    const data = parsePage(html, "https://example.com");
    expect(data.paywallSignals.hasPaywallClasses).toBe(false);
    expect(data.paywallSignals.hasLoginForm).toBe(false);
  });

  test("extracts CTA elements with position", () => {
    const html = `<html><body>
      <header><a class="btn" href="/signup">Get Started</a></header>
      <main><section><button class="btn">Learn More</button></section></main>
    </body></html>`;
    const data = parsePage(html, "https://example.com");
    expect(data.ctaElements).toBeDefined();
    expect(data.ctaElements.length).toBeGreaterThanOrEqual(2);
    const headerCta = data.ctaElements.find((c) => c.text === "Get Started");
    expect(headerCta.inHeader).toBe(true);
  });

  test("extracts trust elements", () => {
    const html = `<html><body>
      <section id="hero">
        <div class="testimonial">Great product!</div>
      </section>
    </body></html>`;
    const data = parsePage(html, "https://example.com");
    expect(data.trustElements).toBeDefined();
    expect(data.trustElements.length).toBeGreaterThanOrEqual(1);
  });
});
