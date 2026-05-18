// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (C) 2026 Lams IT Solutions
const HOMEPAGE_PATTERN = /^\/?([a-z]{2}(-[a-z]{2})?\/?)?$/;
const LEGAL_PATTERNS = /\/(privacy(-?policy)?|terms(-of-(service|use))?|impressum|datenschutz|cookies?(-?policy)?|cookie(-?beleid)?|politique(-de-confidentialite)?|privacidad|disclaimer|agb|mentions-legales|voorwaarden|algemene-voorwaarden|privacybeleid|aviso-legal|informativa-privacy|politica-de-privacidade|nutzungsbedingungen|condiciones|conditions-generales)(\/|$|\?|#)/i;
const UTILITY_PATTERNS = /\/(about(-us)?|contact(-us)?|over-ons|contacto|kontakt|a-propos|qui-sommes-nous|chi-siamo|contattaci|sobre(-nos)?|equipe|team|ons-team|notre-equipe|unser-team|nuestro-equipo)(\/|$|\?|#)/i;
const FAQ_PATTERNS = /\/(faq|veelgestelde-vragen|fragen|preguntas-frecuentes|domande-frequenti|perguntas-frequentes|questions-frequentes)(\/|$|\?|#)/i;
// Auth: includes CMS-specific paths (wp-login, my-account, account, customer/account)
const AUTH_PATTERNS = /\/(login|signin|sign-in|register|signup|sign-up|checkout|cart|wachtwoord|forgot-password|reset-password|inloggen|aanmelden|connexion|inscription|anmelden|registrieren|wp-login\.php|my-account|mijn-account|mon-compte|mein-konto|mi-cuenta|mio-account|minha-conta|account|customer\/account|winkelwagen|panier|warenkorb|carrito|carrello|carrinho)(\/|$|\?|#)/i;
const GALLERY_PATTERNS = /\/(gallery|portfolio|projecten|werk|cases|galerie|travaux|arbeiten|trabajos|lavori)(\/|$|\?|#)/i;
const LANDING_PATTERNS = /\/(lp|landing|promo|campagne|campaign|aktie|actie|offre|offerta|angebot|oferta|promocion|promozione|promocao|landingspagina|page-datterrissage|pagina-de-destino)(\/|$|\?|#)/i;
const SUPPORT_PATTERNS = /\/(support|help|helpdesk|help-center|knowledge-?base|docs|documentation|handleiding|hulp|aide|centre-daide|hilfe|unterstutzung|ayuda|centro-de-ayuda|soporte|assistenza|centro-assistenza|ajuda|suporte|centro-de-ajuda)(\/|$|\?|#)/i;
const ARTICLE_URL_PATTERNS = /\/(blog|news|articles?|posts?|journal|magazine|aktuelles|actualites|noticias)\//i;
const PRODUCT_URL_PATTERNS = /\/(products?|shop|store|winkel|boutique|tienda|collections?|kategorie|categoria|categorie)\//i;

const ARTICLE_SCHEMA_TYPES = new Set(["Article", "BlogPosting", "NewsArticle", "TechArticle", "ScholarlyArticle"]);
const PRODUCT_SCHEMA_TYPES = new Set(["Product"]);
const SERVICE_SCHEMA_TYPES = new Set(["LocalBusiness", "Service", "ProfessionalService"]);

// Strip optional language prefix from path (e.g., /en/, /fr-be/, /nl/)
// so patterns match regardless of i18n URL structure (WPML, Shopify, etc.)
function stripLangPrefix(path) {
  return path.replace(/^\/[a-z]{2}(-[a-z]{2})?\//i, "/");
}

function detectPageType(pageData) {
  try {
    if (!pageData || !pageData.url) return "generic";

    const rawPath = new URL(pageData.url).pathname;
    const entities = pageData.jsonLdEntities || [];
    const entityTypes = new Set(entities.map(e => e.type).filter(Boolean));

    // 1. Homepage (already handles language prefix in its own regex)
    if (HOMEPAGE_PATTERN.test(rawPath)) return "homepage";

    // Try matching against raw path first, then against lang-prefix-stripped path
    // This handles /fr/contact, /de/hilfe, /nl/winkelwagen without breaking /lp/offer
    const strippedPath = stripLangPrefix(rawPath);
    const paths = strippedPath !== rawPath ? [rawPath, strippedPath] : [rawPath];

    // URL-pattern-based detection (order matters: more specific first)
    const URL_RULES = [
      [LEGAL_PATTERNS, "legal"],
      [AUTH_PATTERNS, "auth"],
      [FAQ_PATTERNS, "faq"],
      [GALLERY_PATTERNS, "gallery"],
      [LANDING_PATTERNS, "landing"],
      [SUPPORT_PATTERNS, "support"],
      [UTILITY_PATTERNS, "utility"],
    ];
    for (const [pattern, type] of URL_RULES) {
      for (const p of paths) {
        if (pattern.test(p)) return type;
      }
    }

    // Schema-based detection (takes priority over URL for article/product/service)
    for (const t of entityTypes) {
      if (ARTICLE_SCHEMA_TYPES.has(t)) return "article";
    }
    for (const t of entityTypes) {
      if (PRODUCT_SCHEMA_TYPES.has(t)) return "product";
    }
    for (const t of entityTypes) {
      if (SERVICE_SCHEMA_TYPES.has(t)) return "service";
    }

    // URL-based fallback for article/product
    for (const p of paths) {
      if (ARTICLE_URL_PATTERNS.test(p)) return "article";
    }
    for (const p of paths) {
      if (PRODUCT_URL_PATTERNS.test(p)) return "product";
    }

    // Generic fallback
    return "generic";
  } catch {
    return "generic";
  }
}

module.exports = { detectPageType };
