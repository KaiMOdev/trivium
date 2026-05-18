const { detectPageType } = require("../../utils/pageType");

describe("detectPageType", () => {
  it("detects homepage from root URL", () => {
    expect(detectPageType({ url: "https://example.com/" })).toBe("homepage");
    expect(detectPageType({ url: "https://example.com/en/" })).toBe("homepage");
    expect(detectPageType({ url: "https://example.com/fr-be/" })).toBe("homepage");
  });

  it("detects legal pages from URL path", () => {
    expect(detectPageType({ url: "https://example.com/privacy" })).toBe("legal");
    expect(detectPageType({ url: "https://example.com/privacy-policy" })).toBe("legal");
    expect(detectPageType({ url: "https://example.com/terms" })).toBe("legal");
    expect(detectPageType({ url: "https://example.com/terms-of-service" })).toBe("legal");
    expect(detectPageType({ url: "https://example.com/impressum" })).toBe("legal");
    expect(detectPageType({ url: "https://example.com/disclaimer" })).toBe("legal");
    expect(detectPageType({ url: "https://example.com/cookies" })).toBe("legal");
    expect(detectPageType({ url: "https://example.com/cookie-policy" })).toBe("legal");
    expect(detectPageType({ url: "https://example.com/voorwaarden" })).toBe("legal");
    expect(detectPageType({ url: "https://example.com/algemene-voorwaarden" })).toBe("legal");
  });

  it("detects utility pages (about/contact) separately from legal", () => {
    expect(detectPageType({ url: "https://example.com/about" })).toBe("utility");
    expect(detectPageType({ url: "https://example.com/about-us" })).toBe("utility");
    expect(detectPageType({ url: "https://example.com/contact" })).toBe("utility");
    expect(detectPageType({ url: "https://example.com/contact-us" })).toBe("utility");
    expect(detectPageType({ url: "https://example.com/over-ons" })).toBe("utility");
    expect(detectPageType({ url: "https://example.com/team" })).toBe("utility");
  });

  it("detects article from schema", () => {
    expect(detectPageType({
      url: "https://example.com/some-page",
      jsonLdEntities: [{ type: "Article" }],
    })).toBe("article");
    expect(detectPageType({
      url: "https://example.com/some-page",
      jsonLdEntities: [{ type: "BlogPosting" }],
    })).toBe("article");
  });

  it("detects article from URL pattern", () => {
    expect(detectPageType({ url: "https://example.com/blog/my-post" })).toBe("article");
    expect(detectPageType({ url: "https://example.com/news/update" })).toBe("article");
  });

  it("detects product from schema", () => {
    expect(detectPageType({
      url: "https://example.com/item",
      jsonLdEntities: [{ type: "Product" }],
    })).toBe("product");
  });

  it("detects product from URL pattern (including Shopify collections)", () => {
    expect(detectPageType({ url: "https://example.com/shop/item-1" })).toBe("product");
    expect(detectPageType({ url: "https://example.com/products/widget" })).toBe("product");
    expect(detectPageType({ url: "https://example.com/collections/shoes" })).toBe("product");
    expect(detectPageType({ url: "https://example.com/kategorie/schuhe" })).toBe("product");
  });

  it("detects service from schema", () => {
    expect(detectPageType({
      url: "https://example.com/our-service",
      jsonLdEntities: [{ type: "LocalBusiness" }],
    })).toBe("service");
    expect(detectPageType({
      url: "https://example.com/our-service",
      jsonLdEntities: [{ type: "ProfessionalService" }],
    })).toBe("service");
  });

  it("detects FAQ pages from URL path", () => {
    expect(detectPageType({ url: "https://example.com/faq" })).toBe("faq");
    expect(detectPageType({ url: "https://example.com/veelgestelde-vragen" })).toBe("faq");
    expect(detectPageType({ url: "https://example.com/fragen" })).toBe("faq");
    expect(detectPageType({ url: "https://example.com/preguntas-frecuentes" })).toBe("faq");
  });

  it("detects auth pages from URL path (including CMS-specific)", () => {
    expect(detectPageType({ url: "https://example.com/login" })).toBe("auth");
    expect(detectPageType({ url: "https://example.com/signin" })).toBe("auth");
    expect(detectPageType({ url: "https://example.com/sign-up" })).toBe("auth");
    expect(detectPageType({ url: "https://example.com/register" })).toBe("auth");
    expect(detectPageType({ url: "https://example.com/checkout" })).toBe("auth");
    expect(detectPageType({ url: "https://example.com/cart" })).toBe("auth");
    expect(detectPageType({ url: "https://example.com/forgot-password" })).toBe("auth");
    expect(detectPageType({ url: "https://example.com/inloggen" })).toBe("auth");
    expect(detectPageType({ url: "https://example.com/aanmelden" })).toBe("auth");
    // CMS-specific auth paths
    expect(detectPageType({ url: "https://example.com/wp-login.php" })).toBe("auth");
    expect(detectPageType({ url: "https://example.com/my-account" })).toBe("auth");
    expect(detectPageType({ url: "https://example.com/account" })).toBe("auth");
    expect(detectPageType({ url: "https://example.com/customer/account" })).toBe("auth");
    // Multi-language cart/account
    expect(detectPageType({ url: "https://example.com/winkelwagen" })).toBe("auth");
    expect(detectPageType({ url: "https://example.com/panier" })).toBe("auth");
    expect(detectPageType({ url: "https://example.com/warenkorb" })).toBe("auth");
    expect(detectPageType({ url: "https://example.com/mijn-account" })).toBe("auth");
    expect(detectPageType({ url: "https://example.com/mon-compte" })).toBe("auth");
    expect(detectPageType({ url: "https://example.com/mein-konto" })).toBe("auth");
  });

  it("detects gallery pages from URL path", () => {
    expect(detectPageType({ url: "https://example.com/gallery" })).toBe("gallery");
    expect(detectPageType({ url: "https://example.com/portfolio" })).toBe("gallery");
    expect(detectPageType({ url: "https://example.com/projecten" })).toBe("gallery");
    expect(detectPageType({ url: "https://example.com/cases" })).toBe("gallery");
    expect(detectPageType({ url: "https://example.com/werk" })).toBe("gallery");
  });

  it("detects landing pages from URL path (multi-language)", () => {
    expect(detectPageType({ url: "https://example.com/lp/spring-sale" })).toBe("landing");
    expect(detectPageType({ url: "https://example.com/landing/offer" })).toBe("landing");
    expect(detectPageType({ url: "https://example.com/promo/black-friday" })).toBe("landing");
    expect(detectPageType({ url: "https://example.com/campaign/summer" })).toBe("landing");
    expect(detectPageType({ url: "https://example.com/actie/korting" })).toBe("landing");
    expect(detectPageType({ url: "https://example.com/angebot/fruehling" })).toBe("landing");
    expect(detectPageType({ url: "https://example.com/offre/printemps" })).toBe("landing");
    expect(detectPageType({ url: "https://example.com/promocion/verano" })).toBe("landing");
    expect(detectPageType({ url: "https://example.com/offerta/estate" })).toBe("landing");
    expect(detectPageType({ url: "https://example.com/promocao/verao" })).toBe("landing");
  });

  it("detects support/help pages from URL path (multi-language)", () => {
    expect(detectPageType({ url: "https://example.com/support" })).toBe("support");
    expect(detectPageType({ url: "https://example.com/help" })).toBe("support");
    expect(detectPageType({ url: "https://example.com/help-center" })).toBe("support");
    expect(detectPageType({ url: "https://example.com/knowledge-base" })).toBe("support");
    expect(detectPageType({ url: "https://example.com/docs" })).toBe("support");
    expect(detectPageType({ url: "https://example.com/documentation" })).toBe("support");
    expect(detectPageType({ url: "https://example.com/handleiding" })).toBe("support");
    expect(detectPageType({ url: "https://example.com/hulp" })).toBe("support");
    expect(detectPageType({ url: "https://example.com/aide" })).toBe("support");
    expect(detectPageType({ url: "https://example.com/centre-daide" })).toBe("support");
    expect(detectPageType({ url: "https://example.com/hilfe" })).toBe("support");
    expect(detectPageType({ url: "https://example.com/ayuda" })).toBe("support");
    expect(detectPageType({ url: "https://example.com/soporte" })).toBe("support");
    expect(detectPageType({ url: "https://example.com/assistenza" })).toBe("support");
    expect(detectPageType({ url: "https://example.com/ajuda" })).toBe("support");
    expect(detectPageType({ url: "https://example.com/suporte" })).toBe("support");
  });

  it("handles language-prefixed paths (WPML, Shopify i18n, etc.)", () => {
    expect(detectPageType({ url: "https://example.com/fr/contact" })).toBe("utility");
    expect(detectPageType({ url: "https://example.com/de/hilfe" })).toBe("support");
    expect(detectPageType({ url: "https://example.com/nl/winkelwagen" })).toBe("auth");
    expect(detectPageType({ url: "https://example.com/es/ayuda" })).toBe("support");
    expect(detectPageType({ url: "https://example.com/it/assistenza" })).toBe("support");
    expect(detectPageType({ url: "https://example.com/pt/ajuda" })).toBe("support");
    expect(detectPageType({ url: "https://example.com/fr/blog/mon-article" })).toBe("article");
    expect(detectPageType({ url: "https://example.com/de/datenschutz" })).toBe("legal");
    expect(detectPageType({ url: "https://example.com/nl/over-ons" })).toBe("utility");
    expect(detectPageType({ url: "https://example.com/fr-be/faq" })).toBe("faq");
  });

  it("returns generic as fallback", () => {
    expect(detectPageType({ url: "https://example.com/random-page" })).toBe("generic");
  });

  it("returns generic on error", () => {
    expect(detectPageType({})).toBe("generic");
    expect(detectPageType(null)).toBe("generic");
  });
});
