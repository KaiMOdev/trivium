// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (C) 2026 Lams IT Solutions
const { isCJK, countCJKWords } = require("../utils/readability");
const { shouldSkipCheck } = require("../config/checkApplicability");
const { detectLang, BENEFIT_PATTERNS, FEATURE_PATTERNS, QUANTIFICATION_PATTERNS, URGENCY_PATTERNS, SCARCITY_PATTERNS, EMOTIONAL_PATTERNS, HEADLINE_PATTERNS, OFFERING_PATTERNS, AUDIENCE_PATTERNS, SOCIAL_PROOF_PATTERNS } = require("./marketing-patterns");

function naResult(label, pageType) {
  return { label, score: 100, status: "na", detail: `Not applicable for ${pageType} pages` };
}

/**
 * Run marketing effectiveness checks against parsed page data.
 * Updated with 2025-2026 conversion optimization best practices.
 */
function runMarketingChecks(pageData) {
  const results = [];
  const bodyText = pageData.paragraphs.join(" ").toLowerCase();
  const langInfo = detectLang(pageData);

  // 1. Value Proposition — is it clear and differentiated?
  if (shouldSkipCheck(pageData.pageType, "Value Proposition")) {
    results.push(naResult("Value Proposition", pageData.pageType));
  } else {
    const h1Text = (pageData.h1s[0] || "").toLowerCase();
    const firstPara = (pageData.paragraphs[0] || "").toLowerCase();
    // Multi-language generic phrases
    const genericPhrases = [
      "welcome to", "we are", "our company", "best in class", "world class", "leading provider", "one-stop", "solutions for",
      "welkom bij", "wij zijn", "ons bedrijf", "beste in", "toonaangevend", "bienvenue", "nous sommes", "notre entreprise",
      "willkommen", "wir sind", "unser unternehmen", "bienvenido", "somos", "nuestra empresa",
      "benvenuto", "siamo", "nostra azienda", "bem-vindo", "nossa empresa",
    ];
    const isGeneric = genericPhrases.some(p => h1Text.includes(p) || firstPara.includes(p));
    // Language-agnostic: match numbers followed by any word (captures "500+ klanten", "10 jaar", "100 clients", etc.)
    const hasSpecificValue = /\d+\+?\s*\w+/.test(firstPara);
    const vpScore = Math.min(
      (isGeneric ? 20 : 50) + (hasSpecificValue ? 30 : 0) + (pageData.h1s.length > 0 ? 20 : 0),
      100
    );

    // Bonus 1: Outcome language (+10pts)
    const benefits = BENEFIT_PATTERNS[langInfo.lang] || BENEFIT_PATTERNS.en;
    const hasOutcomeLanguage = benefits.some(b => h1Text.includes(b) || firstPara.includes(b));

    // Bonus 2: Differentiation language (+10pts)
    const diffPhrases = [
      "unlike", "the only", "the first", "instead of", "not just another",
      "different from", "what sets us apart", "what makes us unique",
      // NL
      "in tegenstelling tot", "de enige", "de eerste", "in plaats van",
      // FR
      "contrairement à", "le seul", "la seule", "le premier", "la première",
      // DE
      "im gegensatz zu", "der einzige", "die einzige", "der erste",
      // ES
      "a diferencia de", "el único", "la única", "el primero",
      // IT
      "a differenza di", "l'unico", "l'unica", "il primo",
      // PT
      "ao contrário de", "o único", "a única", "o primeiro",
    ];
    const hasDifferentiation = diffPhrases.some(d => h1Text.includes(d) || firstPara.includes(d));

    // Bonus 3: Quantified claims (+10pts)
    const firstTwoParas = pageData.paragraphs.slice(0, 2).join(" ").toLowerCase();
    const heroText = h1Text + " " + firstTwoParas;
    const quantWords = QUANTIFICATION_PATTERNS[langInfo.lang] || QUANTIFICATION_PATTERNS.en;
    const hasQuantified = /\d/.test(heroText) && (
      quantWords.some(w => heroText.includes(w.toLowerCase())) ||
      /\d+\s*%/.test(heroText) ||
      /[$€£¥]\s*\d|\d\s*[$€£¥]/.test(heroText) ||
      /\d+\s*x\b/i.test(heroText)
    );

    const bonusVpScore = Math.min(
      vpScore + (hasOutcomeLanguage ? 10 : 0) + (hasDifferentiation ? 10 : 0) + (hasQuantified ? 10 : 0),
      100
    );

    results.push({
      label: "Value Proposition",
      score: bonusVpScore,
      detail: isGeneric
        ? "Value proposition uses generic language — visitors decide within 5 seconds if they'll stay"
        : hasSpecificValue
          ? "Clear, specific value proposition with quantified claims — builds instant credibility"
          : "Value proposition present but could be more specific — add numbers, outcomes, or differentiators",
    });
  }

  // 2. CTA Effectiveness
  if (shouldSkipCheck(pageData.pageType, "CTA Effectiveness")) {
    results.push(naResult("CTA Effectiveness", pageData.pageType));
  } else {
    const ctaCount = pageData.ctas.length;
    // Multi-language CTA action verbs
    const actionVerbs = [
      // EN
      "get started", "get access", "get your", "get a ", "start free", "start now", "start your",
      "try", "buy", "sign up", "sign in", "join", "book", "schedule", "download", "learn more",
      "request", "claim", "unlock", "shop now", "add to cart", "subscribe", "register", "apply",
      "discover", "explore", "view", "see", "find", "compare", "contact", "call", "send",
      "order", "reserve", "save", "grab", "create", "build", "launch", "upgrade", "activate",
      "watch", "listen", "read more", "continue", "proceed", "confirm", "submit", "donate",
      "enroll", "install", "connect", "open", "select", "choose", "customize", "configure",
      // NL
      "vraag aan", "bestel", "boek", "ontdek", "probeer", "ontvang", "bekijk", "reserveer",
      "aanmelden", "inschrijven", "downloaden", "kopen", "schrijf in", "neem contact",
      "bel ons", "stuur", "vergelijk", "plan", "selecteer", "kies", "maak", "start",
      "bewaar", "deel", "lees meer", "meer info", "meer weten", "offerte", "gratis",
      "bereken", "configureer", "activeer", "upgrade", "verken", "zoek", "vind",
      "registreer", "abonneer", "solliciteer", "doneer", "open", "bevestig",
      // FR
      "demander", "essayer", "acheter", "réserver", "télécharger", "commencer", "découvrir",
      "s'inscrire", "commander", "contacter", "appeler", "envoyer", "comparer", "voir",
      "consulter", "planifier", "choisir", "créer", "lancer", "activer", "configurer",
      "en savoir plus", "plus d'infos", "obtenir", "profiter", "sauvegarder", "partager",
      "lire la suite", "devis", "gratuit", "calculer", "explorer", "trouver", "sélectionner",
      "s'abonner", "postuler", "donner", "ouvrir", "confirmer", "rejoindre",
      // DE
      "jetzt", "starten", "buchen", "kaufen", "testen", "herunterladen", "anfordern", "anmelden",
      "bestellen", "kontaktieren", "anrufen", "senden", "vergleichen", "ansehen", "entdecken",
      "planen", "auswählen", "erstellen", "aktivieren", "konfigurieren", "mehr erfahren",
      "weitere infos", "erhalten", "profitieren", "speichern", "teilen", "weiterlesen",
      "angebot", "kostenlos", "berechnen", "erkunden", "finden", "registrieren",
      "abonnieren", "bewerben", "spenden", "öffnen", "bestätigen", "beitreten",
      // ES
      "pedir", "comprar", "reservar", "descargar", "empezar", "probar", "registrarse",
      "solicitar", "contactar", "llamar", "enviar", "comparar", "ver", "descubrir",
      "planificar", "elegir", "crear", "lanzar", "activar", "configurar", "saber más",
      "más info", "obtener", "aprovechar", "guardar", "compartir", "leer más",
      "presupuesto", "gratis", "calcular", "explorar", "encontrar", "seleccionar",
      "suscribirse", "aplicar", "donar", "abrir", "confirmar", "unirse",
      // IT
      "acquista", "prenota", "scarica", "inizia", "prova", "iscriviti", "scopri",
      "richiedi", "contatta", "chiama", "invia", "confronta", "vedi", "visualizza",
      "pianifica", "scegli", "crea", "lancia", "attiva", "configura", "saperne di più",
      "maggiori info", "ottieni", "approfitta", "salva", "condividi", "leggi",
      "preventivo", "gratuito", "calcola", "esplora", "trova", "seleziona",
      "abbonati", "candidati", "dona", "apri", "conferma", "unisciti",
      // PT
      "comprar", "reservar", "baixar", "começar", "experimentar", "inscrever",
      "solicitar", "contactar", "ligar", "enviar", "comparar", "ver", "descobrir",
      "planear", "escolher", "criar", "lançar", "ativar", "configurar", "saber mais",
      "mais info", "obter", "aproveitar", "guardar", "partilhar", "ler mais",
      "orçamento", "grátis", "calcular", "explorar", "encontrar", "selecionar",
      "subscrever", "candidatar", "doar", "abrir", "confirmar", "juntar",
      // JA
      "今すぐ", "購入", "申し込", "ダウンロード", "無料", "予約", "登録", "注文",
      "問い合わせ", "比較", "詳しく", "もっと見る", "始める", "試す", "選ぶ", "作成",
      // ZH
      "立即", "购买", "注册", "下载", "免费", "预约", "订购", "咨询", "比较",
      "了解更多", "查看", "开始", "试用", "选择", "创建", "获取", "联系",
      // KO
      "시작", "구매", "신청", "다운로드", "무료", "예약", "등록", "주문",
      "문의", "비교", "자세히", "더보기", "체험", "선택", "만들기", "가입",
    ];
    // Match action verbs/phrases: check if the CTA text starts with or contains a known verb phrase
    // Use word boundary or phrase matching to avoid false positives (e.g., "startpagina" matching "start")
    const hasActionVerb = pageData.ctas.some(cta => {
      const lower = cta.toLowerCase().trim();
      return actionVerbs.some(v => {
        if (lower.startsWith(v)) return true;
        // For short single-word verbs, require word boundary to avoid "plan" matching "explanation"
        if (v.length <= 5 && !v.includes(" ")) {
          const re = new RegExp(`\\b${v}\\b`);
          return lower.length < 40 && re.test(lower);
        }
        return lower.length < 40 && lower.includes(v);
      });
    });
    const ctaScore = Math.min(
      (ctaCount > 0 ? 40 : 10) + (ctaCount >= 2 ? 15 : 0) + (hasActionVerb ? 30 : 0) + (ctaCount > 0 && ctaCount <= 5 ? 15 : 0),
      100
    );

    // Bonus 1: First-person language (+10pts)
    const firstPersonWords = [
      "my ", " my ", " me ", " mine",
      "mijn ", " mij ",           // NL
      "mon ", "ma ", "mes ", " moi",  // FR
      "mein ", "meine ", " mir ",    // DE
      " mi ", " mis ",              // ES
      "mio ", "mia ", " miei",     // IT
      "meu ", "minha ",            // PT
      "私の", "自分の",              // JA
      "我的", "给我",               // ZH
      "내 ", "나의 ", "제 ",        // KO
    ];
    const hasFirstPerson = pageData.ctas.some(cta => {
      const lower = (" " + cta.toLowerCase() + " ");
      return firstPersonWords.some(fp => lower.includes(fp));
    });

    // Bonus 2: Urgency in CTA (+5pts)
    const urgencyPatterns = URGENCY_PATTERNS[langInfo.lang] || URGENCY_PATTERNS.en;
    const hasCtaUrgency = pageData.ctas.some(cta => {
      const lower = cta.toLowerCase();
      return urgencyPatterns.some(u => lower.includes(u));
    });

    // Bonus 3: Value proposition in CTA (+5pts)
    const ctaValueWords = ["free", "trial", "demo", "report", "audit", "quote", "pricing", "consultation",
      "gratis", "proef", "offerte",  // NL
      "gratuit", "essai", "devis",   // FR
      "kostenlos", "testen", "angebot", // DE
      "gratis", "prueba", "cotización", // ES
      "gratuito", "prova", "preventivo", // IT
      "gratuito", "teste", "orçamento",  // PT
      "無料", "体験", "見積",          // JA
      "免费", "试用", "报价",          // ZH
      "무료", "체험", "견적",          // KO
    ];
    const hasCtaValue = pageData.ctas.some(cta => {
      const lower = cta.toLowerCase();
      return ctaValueWords.some(v => lower.includes(v));
    });

    const bonusCtaScore = Math.min(
      ctaScore + (hasFirstPerson ? 10 : 0) + (hasCtaUrgency ? 5 : 0) + (hasCtaValue ? 5 : 0),
      100
    );

    results.push({
      label: "CTA Effectiveness",
      score: bonusCtaScore,
      detail: ctaCount === 0
        ? "No clear call-to-action buttons found — every landing page needs a visible CTA above the fold"
        : `${ctaCount} CTA(s) found${hasActionVerb ? " with action verbs" : ` — use action verbs (${({
          nl: "Ontdek, Bestel, Boek, Probeer, Vraag aan, Ontvang, Bekijk, Reserveer, Meld aan, Download",
          fr: "Découvrir, Acheter, Réserver, Essayer, Commencer, Télécharger, Demander, S'inscrire, Obtenir, Profiter",
          de: "Jetzt starten, Kaufen, Buchen, Testen, Herunterladen, Anfordern, Anmelden, Entdecken, Sichern, Kostenlos testen",
          es: "Comprar, Reservar, Empezar, Probar, Descargar, Registrarse, Solicitar, Descubrir, Obtener, Suscribirse",
          it: "Acquista, Prenota, Inizia, Scopri, Prova, Scarica, Iscriviti, Richiedi, Ottieni, Registrati",
          pt: "Comprar, Reservar, Começar, Experimentar, Baixar, Inscrever, Solicitar, Descobrir, Obter, Registrar",
          ja: "今すぐ始める, 購入する, 申し込む, ダウンロード, 無料で試す, 予約する, 登録する",
          zh: "立即开始, 购买, 注册, 下载, 免费试用, 预约, 获取",
          ko: "시작하기, 구매하기, 신청하기, 다운로드, 무료체험, 예약하기, 가입하기",
        })[langInfo.lang] || "Get, Start, Book, Try, Download, Sign up, Subscribe, Request, Claim, Unlock"}) for 28% higher conversion`}`,
      items: pageData.ctas.length > 0 ? pageData.ctas.slice(0, 8).map(c => `"${c}"`) : undefined,
    });
  }

  // 3. Trust Signals
  if (shouldSkipCheck(pageData.pageType, "Trust Signals")) {
    results.push(naResult("Trust Signals", pageData.pageType));
  } else {
  // Multi-language trust keywords
  const trustKeywords = [
    "testimonial", "review", "rated", "certified", "award", "guarantee", "trusted by", "verified", "accredited", "endorsed",
    "getuigenis", "beoordeling", "gecertificeerd", "prijs", "garantie", "vertrouwd", "geverifieerd", "erkend", "referentie", "aanbeveling",
    "témoignage", "avis", "certifié", "prix", "garantie", "vérifié", "accrédité",
    "bewertung", "zertifiziert", "auszeichnung", "garantie", "verifiziert", "empfohlen",
    "testimonio", "reseña", "certificado", "premio", "garantía", "verificado",
    "testimonianza", "recensione", "certificato", "premio", "garanzia", "verificato",
    "depoimento", "avaliação", "certificado", "prêmio", "garantia", "verificado",
  ];
  const foundTrustKeywords = trustKeywords.filter(k => bodyText.includes(k));
  const trustCount = foundTrustKeywords.length;
  // Schema-based trust signals: opening hours, ratings, contact info = business legitimacy
  const hasOpeningHours = (pageData.jsonLdEntities || []).some(e => !!e.openingHours || !!e.openingHoursSpecification);
  const hasSchemaRating = pageData.hasReviewSchema || false;
  const hasSchemaContact = pageData.hasContactSchema || false;
  const trustScore = Math.min(
    15 +
    (pageData.hasTestimonials ? 25 : 0) +
    (trustCount * 8) +
    (pageData.hasSocialProof ? 15 : 0) +
    (pageData.hasTrustBadges ? 15 : 0) +
    (hasOpeningHours ? 10 : 0) +
    (hasSchemaRating ? 10 : 0) +
    (hasSchemaContact ? 10 : 0),
    100
  );
  results.push({
    label: "Trust Signals",
    score: trustScore,
    detail: trustCount === 0
      ? "No testimonials, reviews, or trust indicators found — 88% of consumers trust reviews as much as personal recommendations"
      : `${trustCount} trust signal type(s) detected${pageData.hasTestimonials ? " including testimonials" : ""}${pageData.hasTrustBadges ? " with trust badges" : ""}`,
    items: foundTrustKeywords.length > 0 ? foundTrustKeywords.map(k => `Found: "${k}"`) : undefined,
  });
  }

  // 4. Social Proof
  if (shouldSkipCheck(pageData.pageType, "Social Proof")) {
    results.push(naResult("Social Proof", pageData.pageType));
  } else {
    // Language-agnostic: any number followed by a word is likely a social proof metric
    const hasSpecificNumbers = /\d[\d,]*\+?\s*\w{3,}/.test(bodyText);
    const socialScore = Math.min(
      15 +
      (pageData.hasSocialProof ? 25 : 0) +
      (pageData.hasTestimonials ? 20 : 0) +
      (hasSpecificNumbers ? 20 : 0) +
      (bodyText.includes("case study") || bodyText.includes("case studies") || bodyText.includes("casestudy") || bodyText.includes("praktijkvoorbeeld") || bodyText.includes("étude de cas") || bodyText.includes("fallstudie") || bodyText.includes("caso de estudio") || bodyText.includes("caso di studio") || bodyText.includes("estudo de caso") ? 10 : 0) +
      (bodyText.includes("logo") ? 10 : 0),
      100
    );
    results.push({
      label: "Social Proof",
      score: socialScore,
      detail: socialScore >= 60
        ? `Social proof elements detected${hasSpecificNumbers ? " with specific metrics" : ""} — real-time social proof boosts conversions by 98%`
        : "Limited social proof — add client logos, specific metrics ('10,000+ customers'), testimonials, or case studies",
    });
  }

  // 5. Review & Rating Presence — only flag on product/service/local business pages
  if (shouldSkipCheck(pageData.pageType, "Reviews & Ratings")) {
    results.push(naResult("Reviews & Ratings", pageData.pageType));
  } else {
    const hasReviewSchema = pageData.hasReviewSchema || false;
    const ratingElements = pageData.ratingElements || 0;
    const isReviewRelevant = ratingElements > 0 || hasReviewSchema ||
      (pageData.jsonLdEntities || []).some(e => ["Product", "LocalBusiness", "ProfessionalService", "Service"].some(t => {
        const eType = Array.isArray(e["@type"]) ? e["@type"] : [e["@type"] || ""];
        return eType.some(tt => tt === t || (tt && tt.endsWith && tt.endsWith(t)));
      }));
    const reviewScore = isReviewRelevant ? Math.min(
      20 +
      (hasReviewSchema ? 40 : 0) +
      (ratingElements > 0 ? 25 : 0) +
      (bodyText.includes("star") || bodyText.includes("rating") || bodyText.includes("ster") || bodyText.includes("waardering") || bodyText.includes("étoile") || bodyText.includes("note") || bodyText.includes("stern") || bodyText.includes("estrella") || bodyText.includes("calificación") || bodyText.includes("stella") || bodyText.includes("valutazione") || bodyText.includes("avaliação") ? 8 : 0) +
      (bodyText.includes("review") || bodyText.includes("beoordeling") || bodyText.includes("avis") || bodyText.includes("bewertung") || bodyText.includes("reseña") || bodyText.includes("recensione") || bodyText.includes("avaliação") ? 7 : 0),
      100
    ) : 100;
    const reviewStatus = isReviewRelevant ? undefined : "na";
    results.push({
      label: "Reviews & Ratings",
      score: reviewScore,
      status: reviewStatus,
      detail: hasReviewSchema
        ? "Review/Rating schema found — enables star ratings in search results (20-30% higher CTR)"
        : ratingElements > 0
          ? "Rating elements detected but no AggregateRating schema — add markup for rich snippet stars"
          : isReviewRelevant
            ? "No reviews or ratings found — products with 5+ reviews are 270% more likely to be purchased"
            : "No reviews applicable — most relevant for product and service pages",
    });
  }

  // 6. Video Content — informational, not a penalty for pages without video
  if (shouldSkipCheck(pageData.pageType, "Video Content")) {
    results.push(naResult("Video Content", pageData.pageType));
  } else {
    const hasVideo = pageData.hasVideo || false;
    const videoSchema = pageData.videoSchemaCount || 0;
    const videoScore = hasVideo
      ? Math.min(
          50 +
          (videoSchema > 0 ? 30 : 0) +
          ((pageData.videoElements || 0) > 0 ? 10 : 0) +
          ((pageData.videoEmbeds || 0) > 0 ? 10 : 0),
          100
        )
      : 70;
    results.push({
      label: "Video Content",
      score: videoScore,
      detail: hasVideo && videoSchema > 0
        ? "Video content with VideoObject schema — video lifts conversion by up to 86% and is preferred by AI Overviews"
        : hasVideo
          ? "Video content found but no VideoObject schema — add markup so AI engines can index your videos"
          : "No video content — consider adding video on key landing pages to boost engagement",
    });
  }

  // 7. Contact Information Visibility
  if (shouldSkipCheck(pageData.pageType, "Contact Visibility")) {
    results.push(naResult("Contact Visibility", pageData.pageType));
  } else {
    const mailtoLinks = pageData.mailtoLinks || 0;
    const telLinks = pageData.telLinks || 0;
    const hasContactForm = pageData.hasContactForm || false;
    const hasContactSchema = pageData.hasContactSchema || false;
    const contactMethods = (mailtoLinks > 0 ? 1 : 0) + (telLinks > 0 ? 1 : 0) + (hasContactForm ? 1 : 0);
    const contactScore = Math.min(
      15 + (contactMethods * 20) + (hasContactSchema ? 25 : 0),
      100
    );
    results.push({
      label: "Contact Visibility",
      score: contactScore,
      detail: contactMethods >= 2
        ? `${contactMethods} contact methods available${hasContactSchema ? " with ContactPoint schema" : ""} — builds visitor confidence`
        : contactMethods === 1
          ? "Only 1 contact method found — add phone, email, and contact form for maximum accessibility"
          : "No visible contact information — a critical trust signal missing from your page",
    });
  }

  // 8. Privacy & Security Signals
  if (shouldSkipCheck(pageData.pageType, "Privacy & Security")) {
    results.push(naResult("Privacy & Security", pageData.pageType));
  } else {
    const hasPrivacy = pageData.hasPrivacyLink || false;
    const hasTerms = pageData.hasTermsLink || false;
    const hasCookieConsent = pageData.hasCookieConsent || false;
    const hasCookiePolicyLink = pageData.hasCookiePolicyLink || false;
    const hasTrustBadges = pageData.hasTrustBadges || false;
    let privacyScore =
      15 +
      (hasPrivacy ? 30 : 0) +
      (hasTerms ? 30 : 0) +
      (hasCookieConsent ? 15 : 0) +
      (hasTrustBadges ? 10 : 0);
    // Cookie policy link bonus/penalty
    if (hasCookieConsent && hasCookiePolicyLink) {
      privacyScore += 10;
    } else if (hasCookieConsent && !hasCookiePolicyLink) {
      privacyScore -= 15;
    }
    privacyScore = Math.max(0, Math.min(100, privacyScore));
    const items = [];
    if (hasPrivacy) items.push("Privacy policy link found");
    if (hasTerms) items.push("Terms of service link found");
    if (hasCookieConsent && hasCookiePolicyLink) items.push("Cookie banner links to cookie policy");
    if (hasCookieConsent && !hasCookiePolicyLink) items.push("Cookie banner has no link to cookie policy");
    if (hasTrustBadges) items.push("Trust badges detected");
    results.push({
      label: "Privacy & Security",
      score: privacyScore,
      detail: hasPrivacy && hasTerms
        ? `Privacy policy${hasTerms ? " and terms" : ""}${hasCookieConsent ? " with cookie consent" : ""} present — meets compliance and trust standards`
        : hasPrivacy || hasTerms
          ? `${hasPrivacy ? "Privacy policy" : "Terms"} found but missing ${!hasPrivacy ? "privacy policy" : "terms of service"}`
          : "No privacy policy or terms of service — essential for compliance and visitor trust in 2026",
      items: items.length > 0 ? items : undefined,
    });
  }

  // 9. Content Structure Consistency (basic check via paragraph length variance)
  if (shouldSkipCheck(pageData.pageType, "Content Structure Consistency")) {
    results.push(naResult("Content Structure Consistency", pageData.pageType));
  } else {
    // Filter non-content paragraphs that skew variance:
    // - Very short (<8 words): UI labels, addresses, phone numbers, card titles
    // - Very long (>150 words): likely legal text, footer disclaimers
    // CJK: use character-based word estimation since spaces aren't used between words
    const cjkContent = isCJK(pageData.paragraphs.join(" "));
    const countWords = (text) => cjkContent ? countCJKWords(text) : text.split(/\s+/).length;
    const contentParas = pageData.paragraphs.filter(p => {
      const words = countWords(p);
      if (words < 8 || words > 150) return false;
      // Filter common non-content patterns
      const isPhoneOrEmail = /^[\d\s\-+().]+$/.test(p) || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(p);
      const isCopyrightOrDate = /^(©|\(c\)|copyright|all rights reserved|\d{4})/i.test(p.trim());
      return !isPhoneOrEmail && !isCopyrightOrDate;
    });
    const paraLengths = contentParas.map(p => countWords(p));
    const avgLen = paraLengths.reduce((a, b) => a + b, 0) / (paraLengths.length || 1);
    const variance = paraLengths.reduce((sum, l) => sum + Math.pow(l - avgLen, 2), 0) / (paraLengths.length || 1);
    const cv = avgLen > 0 ? Math.sqrt(variance) / avgLen : 0;
    const toneScore = Math.min(Math.round((1 - Math.min(cv, 1)) * 100), 100);
    results.push({
      label: "Content Structure Consistency",
      score: toneScore,
      detail: toneScore >= 70
        ? "Consistent paragraph lengths — even content structure aids readability"
        : "Uneven paragraph lengths reduce readability — aim for 2-4 sentences per paragraph",
    });
  }

  // 10. Lazy Loading Images (web.dev)
  const totalImg = pageData.totalImagesForLazy || pageData.images?.total || 0;
  const lazyImg = pageData.lazyImages || 0;
  if (totalImg === 0) {
    results.push({ label: "Image Lazy Loading", score: 100, detail: "No images on page — lazy loading not applicable" });
  } else if (totalImg <= 1) {
    results.push({ label: "Image Lazy Loading", score: 85, detail: `Only ${totalImg} image — above-fold images should not be lazy-loaded` });
  } else {
    const lazyPct = Math.round((lazyImg / totalImg) * 100);
    const lazyScore = lazyPct >= 50 ? 90 : lazyPct > 0 ? 65 : 30;
    results.push({
      label: "Image Lazy Loading",
      score: lazyScore,
      detail: lazyPct >= 50
        ? `${lazyImg} of ${totalImg} images use loading="lazy" (${lazyPct}%) — good for page speed`
        : lazyPct > 0
          ? `Only ${lazyImg} of ${totalImg} images use loading="lazy" — add to below-fold images for faster LCP`
          : `No images use loading="lazy" — add it to below-fold images to defer offscreen image loads`,
    });
  }

  // 11. Font Display Strategy (web.dev)
  if (pageData.hasFontDisplaySwap) {
    results.push({ label: "Font Display", score: 90, detail: "font-display: swap detected — text remains visible during web font loading" });
  } else {
    results.push({ label: "Font Display", score: 40, detail: "No font-display: swap found — users may see invisible text (FOIT) while fonts load" });
  }

  // 12. Preconnect Hints (web.dev)
  // Framework font systems (next/font, nuxt/fonts) handle preconnection internally
  const preconnects = pageData.preconnectCount || 0;
  const hasFrameworkFonts = pageData.hasFontDisplaySwap || false; // framework font detection already passed
  if (preconnects >= 2) {
    results.push({ label: "Preconnect Hints", score: 90, detail: `${preconnects} preconnect hint(s) — third-party connections are established early` });
  } else if (preconnects === 1) {
    results.push({ label: "Preconnect Hints", score: 70, detail: "1 preconnect hint — consider adding more for key third-party origins (fonts, CDN, analytics)" });
  } else if (hasFrameworkFonts) {
    results.push({ label: "Preconnect Hints", score: 85, detail: "Framework handles font preloading internally — no manual preconnect needed for fonts" });
  } else {
    results.push({ label: "Preconnect Hints", score: 45, detail: "No <link rel=\"preconnect\"> found — add for critical third-party origins to reduce connection latency" });
  }

  // 13. Accessibility Landmarks (W3C, web.dev)
  const landmarks = pageData.semanticLandmarks || {};
  const ariaCount = pageData.ariaLandmarks || 0;
  const semanticCount = Object.values(landmarks).reduce((a, b) => a + b, 0);
  const totalLandmarks = semanticCount + ariaCount;
  if (totalLandmarks >= 4) {
    results.push({ label: "Accessibility Landmarks", score: 90, detail: `${totalLandmarks} accessibility landmarks found (semantic + ARIA) — screen readers can navigate effectively` });
  } else if (totalLandmarks >= 2) {
    results.push({ label: "Accessibility Landmarks", score: 60, detail: `${totalLandmarks} landmarks found — add more semantic elements or ARIA roles for better accessibility` });
  } else {
    results.push({ label: "Accessibility Landmarks", score: 35, detail: "Few or no accessibility landmarks — add <nav>, <main>, <header>, <footer> or ARIA roles" });
  }

  // 14. CTA Above Fold
  const ctaElements = pageData.ctaElements || [];
  if (shouldSkipCheck(pageData.pageType, "CTA Above Fold")) {
    results.push(naResult("CTA Above Fold", pageData.pageType));
  } else {
    const ctaInHeader = ctaElements.some(c => c.inHeader === true);
    const ctaAboveFoldScore = ctaInHeader ? 100 : ctaElements.length > 0 ? 45 : 20;
    results.push({
      label: "CTA Above Fold",
      score: ctaAboveFoldScore,
      detail: ctaInHeader
        ? "CTA found in header — visible immediately on page load, maximising first-impression conversions"
        : ctaElements.length > 0
          ? "CTA found but not in the header — move your primary CTA above the fold for higher conversion"
          : "No CTA detected above the fold — add a prominent call-to-action in the header",
    });
  }

  // 15. CTA Copy Quality
  const genericCtaWords = [
    // EN
    "submit", "click here", "send", "go", "ok", "learn more", "read more", "press here",
    // NL
    "verzenden", "klik hier", "verstuur", "lees meer",
    // FR
    "envoyer", "cliquez ici", "soumettre", "en savoir plus",
    // DE
    "absenden", "hier klicken", "senden", "mehr erfahren",
    // ES
    "enviar", "haga clic aquí", "leer más",
    // IT
    "invia", "clicca qui", "scopri di più", "leggi di più",
    // PT
    "clique aqui", "saiba mais", "leia mais",
    // JA
    "送信", "こちらをクリック", "詳しく",
    // ZH
    "提交", "点击这里", "发送", "了解更多",
    // KO
    "제출", "여기를 클릭", "보내기", "더 보기",
  ];
  if (shouldSkipCheck(pageData.pageType, "CTA Copy Quality")) {
    results.push(naResult("CTA Copy Quality", pageData.pageType));
  } else if (ctaElements.length === 0) {
    results.push({ label: "CTA Copy Quality", score: 85, detail: "No CTAs found — deferred to CTA Effectiveness check" });
  } else {
    const genericCount = ctaElements.filter(c => {
      const lower = (c.text || "").toLowerCase().trim();
      return genericCtaWords.some(w => lower === w || lower.startsWith(w + " ") || lower.endsWith(" " + w));
    }).length;
    const genericPct = genericCount / ctaElements.length;
    const ctaCopyScore = genericPct === 0 ? 100 : genericPct < 0.3 ? 70 : genericPct <= 0.6 ? 45 : 25;
    results.push({
      label: "CTA Copy Quality",
      score: ctaCopyScore,
      detail: genericPct === 0
        ? "All CTA text uses specific, action-oriented language — strong conversion signals"
        : `${genericCount} of ${ctaElements.length} CTA(s) use generic text — replace with specific phrases like "Start Free Trial" or "Get My Report"`,
    });
  }

  // 16. Form Optimization
  if (shouldSkipCheck(pageData.pageType, "Form Optimization")) {
    results.push(naResult("Form Optimization", pageData.pageType));
  } else {
    const formFields = pageData.formFields || [];
    const nonSearchForms = formFields.filter(f => !f.isSearch);
    if (nonSearchForms.length === 0) {
      results.push({ label: "Form Optimization", score: 85, detail: "No non-search forms found — form optimization not applicable" });
    } else {
      const maxFields = Math.max(...nonSearchForms.map(f => f.visibleCount || 0));
      const formScore = maxFields <= 3 ? 100 : maxFields <= 6 ? 75 : maxFields <= 9 ? 45 : 20;
      results.push({
        label: "Form Optimization",
        score: formScore,
        detail: maxFields <= 3
          ? `Longest form has ${maxFields} field(s) — concise forms maximise completion rates`
          : maxFields <= 6
            ? `Longest form has ${maxFields} fields — consider reducing to 3 or fewer for higher completion`
            : `Longest form has ${maxFields} fields — long forms deter submissions; reduce to only essential fields`,
      });
    }
  }

  // 17. Trust Near CTAs
  const trustElements = pageData.trustElements || [];
  if (shouldSkipCheck(pageData.pageType, "Trust Near CTAs")) {
    results.push(naResult("Trust Near CTAs", pageData.pageType));
  } else if (ctaElements.length === 0) {
    results.push({ label: "Trust Near CTAs", score: 85, detail: "No CTAs found — trust proximity check not applicable" });
  } else {
    const ctaSectionIds = new Set(ctaElements.map(c => c.sectionId).filter(Boolean));
    const trustSectionIds = new Set(trustElements.map(t => t.sectionId).filter(Boolean));
    const hasAdjacentTrust = [...ctaSectionIds].some(id => trustSectionIds.has(id));
    const trustNearScore = trustElements.length === 0 ? 40 : hasAdjacentTrust ? 85 : 50;
    results.push({
      label: "Trust Near CTAs",
      score: trustNearScore,
      detail: trustElements.length === 0
        ? "No trust elements found near CTAs — add testimonials, badges, or guarantees adjacent to your CTAs"
        : hasAdjacentTrust
          ? "Trust elements found in the same section as CTAs — place them directly adjacent to your primary CTA for maximum impact"
          : "Trust elements exist but are distant from CTAs — move testimonials or badges next to your primary CTA",
    });
  }

  // 18. Logo Detection
  if (shouldSkipCheck(pageData.pageType, "Logo Detection")) {
    results.push(naResult("Logo Detection", pageData.pageType));
  } else {
    const logoDetected = pageData.logoDetected || { found: false, location: "none", type: "none" };
    const logoScore = !logoDetected.found ? 25 : logoDetected.location === "header" ? 100 : 70;
    results.push({
      label: "Logo Detection",
      score: logoScore,
      detail: !logoDetected.found
        ? "No logo detected — a visible logo in the header builds brand recognition and trust"
        : logoDetected.location === "header"
          ? "Logo detected in the header — strong brand visibility"
          : "Logo found on page but not in the header — move it to the header for maximum brand impact",
    });
  }

  // 19. Typography Quality
  if (shouldSkipCheck(pageData.pageType, "Typography Quality")) {
    results.push(naResult("Typography Quality", pageData.pageType));
  } else {
    const loadedFonts = pageData.loadedFonts || [];
    const genericSystemFonts = [
      "arial", "helvetica", "times new roman", "times", "courier new", "courier",
      "verdana", "georgia", "palatino", "garamond", "comic sans ms", "trebuchet ms",
      "impact", "system-ui", "sans-serif", "serif", "monospace",
    ];
    const customFonts = loadedFonts.filter(f => !genericSystemFonts.includes(f.toLowerCase()));
    const typographyScore = loadedFonts.length === 0 ? 50 : customFonts.length >= 2 ? 100 : customFonts.length === 1 ? 70 : 40;
    results.push({
      label: "Typography Quality",
      score: typographyScore,
      detail: loadedFonts.length === 0
        ? "No fonts detected — unable to assess typography quality"
        : customFonts.length >= 2
          ? `${customFonts.length} custom font(s) detected (${customFonts.slice(0, 3).join(", ")}) — strong typographic branding`
          : customFonts.length === 1
            ? `1 custom font detected (${customFonts[0]}) — consider pairing with a second custom font for hierarchy`
            : "Only system/generic fonts detected — consider adding a custom web font to reinforce brand identity",
    });
  }

  // 20. Color Contrast (Basic — inline styles only)
  function parseColor(str) {
    if (!str) return null;
    const s = str.trim().toLowerCase();
    // rgb(r,g,b) or rgba(r,g,b,a)
    const rgbMatch = s.match(/^rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/);
    if (rgbMatch) return [parseInt(rgbMatch[1]), parseInt(rgbMatch[2]), parseInt(rgbMatch[3])];
    // #rrggbb or #rgb
    const hexMatch = s.match(/^#([0-9a-f]{3,8})$/);
    if (hexMatch) {
      const hex = hexMatch[1];
      if (hex.length === 3) {
        return [parseInt(hex[0] + hex[0], 16), parseInt(hex[1] + hex[1], 16), parseInt(hex[2] + hex[2], 16)];
      }
      if (hex.length >= 6) {
        return [parseInt(hex.slice(0, 2), 16), parseInt(hex.slice(2, 4), 16), parseInt(hex.slice(4, 6), 16)];
      }
    }
    return null;
  }
  function relativeLuminance(r, g, b) {
    const [rs, gs, bs] = [r / 255, g / 255, b / 255].map(c =>
      c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4)
    );
    return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
  }
  function contrastRatio(l1, l2) {
    return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
  }
  const inlineColorPairs = pageData.inlineColorPairs || [];
  if (inlineColorPairs.length === 0) {
    results.push({
      label: "Color Contrast",
      score: 100,
      status: "na",
      detail: "No inline color pairs to evaluate — use browser dev tools or Lighthouse to verify contrast ratios",
    });
  } else {
    let failCount45 = 0;
    let failCount3 = 0;
    let parsedCount = 0;
    for (const pair of inlineColorPairs) {
      const fg = parseColor(pair.foreground || pair.color || pair.fg);
      const bg = parseColor(pair.background || pair.bg);
      if (!fg || !bg) continue;
      parsedCount++;
      const ratio = contrastRatio(relativeLuminance(...fg), relativeLuminance(...bg));
      if (ratio < 3) { failCount3++; failCount45++; }
      else if (ratio < 4.5) { failCount45++; }
    }
    const contrastScore = parsedCount === 0 ? 50
      : failCount45 === 0 ? 100
        : failCount3 === 0 ? 75
          : failCount3 <= 2 ? 50
            : 25;
    results.push({
      label: "Color Contrast",
      score: contrastScore,
      detail: parsedCount === 0
        ? "Inline color pairs found but could not be parsed — ensure valid hex or rgb() color values"
        : failCount45 === 0
          ? `All ${parsedCount} inline color pair(s) meet WCAG AA contrast (4.5:1)`
          : failCount3 === 0
            ? `${failCount45} pair(s) fail WCAG AA (4.5:1) but meet minimum 3:1 — improve for full AA compliance`
            : `${failCount3} pair(s) have poor contrast (<3:1) — fix for accessibility and readability`,
    });
  }

  // 21. Benefit vs. Feature Language
  {
    const label = "Benefit vs. Feature Language";
    if (!langInfo.supported) {
      results.push({
        label,
        score: 100,
        status: "na",
        detail: `Language not supported (detected: ${langInfo.name}) — benefit/feature analysis requires one of the 10 supported languages`,
      });
    } else if (shouldSkipCheck(pageData.pageType, label)) {
      results.push(naResult(label, pageData.pageType));
    } else {
      const benefitWords = BENEFIT_PATTERNS[langInfo.lang] || BENEFIT_PATTERNS.en;
      const featureWords = FEATURE_PATTERNS[langInfo.lang] || FEATURE_PATTERNS.en;
      const quantWords = QUANTIFICATION_PATTERNS[langInfo.lang] || QUANTIFICATION_PATTERNS.en;

      const paras = (pageData.paragraphs || []).slice(0, 30);
      let benefitCount = 0;
      let featureCount = 0;
      let quantifiedCount = 0;

      const currencyRegex = /[$€£¥₹₩]\s*\d|\d\s*[$€£¥₹₩]/;
      const percentRegex = /\d+\s*%/;
      const multiplierRegex = /\d+\s*x\b/;

      for (const para of paras) {
        const lower = para.toLowerCase();
        const hasBenefit = benefitWords.some(w => lower.includes(w));
        const hasFeature = featureWords.some(w => lower.includes(w));

        if (hasBenefit) benefitCount++;
        if (hasFeature) featureCount++;

        if (hasBenefit && /\d/.test(para)) {
          const hasQuantWord = quantWords.some(w => lower.includes(w));
          const hasQuantSymbol = percentRegex.test(para) || currencyRegex.test(para) || multiplierRegex.test(para);
          if (hasQuantWord || hasQuantSymbol) quantifiedCount++;
        }
      }

      const total = benefitCount + featureCount;
      const ratio = total > 0 ? benefitCount / total : -1;

      let score;
      if (ratio < 0) {
        score = 50;
      } else if (ratio >= 0.4 && ratio <= 0.6) {
        score = quantifiedCount >= 2 ? 100 : quantifiedCount === 1 ? 85 : 70;
      } else if (ratio > 0.6) {
        score = quantifiedCount >= 2 ? 85 : quantifiedCount === 1 ? 65 : 45;
      } else if (ratio >= 0.2) {
        score = 55;
      } else {
        score = 30;
      }

      const benefitPct = total > 0 ? Math.round((benefitCount / total) * 100) : 0;
      const featurePct = total > 0 ? 100 - benefitPct : 0;

      let detail;
      if (ratio < 0) {
        detail = "No clear benefit or feature language detected — add outcome-focused copy to connect with visitors";
      } else if (score >= 85) {
        detail = `Excellent balance: ${benefitPct}% benefit / ${featurePct}% feature language with ${quantifiedCount} quantified claim(s) — specific, persuasive copy`;
      } else if (score >= 70) {
        detail = `Good balance: ${benefitPct}% benefit / ${featurePct}% feature — add quantified claims (numbers, percentages) to strengthen persuasion`;
      } else if (ratio > 0.6) {
        detail = `Heavy on benefits (${benefitPct}%) but lacking specifics — add concrete numbers and feature details to build credibility`;
      } else if (ratio >= 0.2) {
        detail = `Leans toward features (${featurePct}%) — reframe specs as outcomes (e.g., "256-bit encryption" → "bank-level security for your data")`;
      } else {
        detail = `Feature-heavy copy (${featurePct}% feature language) — visitors care about outcomes, not specs. Lead with benefits`;
      }

      if (langInfo.noTag) {
        detail += " (no language tag detected — checked English patterns only)";
      }

      results.push({ label, score, detail });
    }
  }

  // 22. Urgency & Scarcity
  if (shouldSkipCheck(pageData.pageType, "Urgency & Scarcity")) {
    results.push(naResult("Urgency & Scarcity", pageData.pageType));
  } else {
    if (!langInfo.supported) {
      results.push({
        label: "Urgency & Scarcity",
        score: 100,
        status: "na",
        detail: `Language "${langInfo.name}" not supported for urgency/scarcity analysis`,
      });
    } else {
      const urgencyPatterns = URGENCY_PATTERNS[langInfo.lang] || URGENCY_PATTERNS.en;
      const scarcityPatterns = SCARCITY_PATTERNS[langInfo.lang] || SCARCITY_PATTERNS.en;

      let urgencyCount = 0;
      let scarcityCount = 0;
      for (const p of urgencyPatterns) {
        const re = new RegExp(p.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "gi");
        const matches = bodyText.match(re);
        if (matches) urgencyCount += matches.length;
      }
      for (const p of scarcityPatterns) {
        const re = new RegExp(p.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "gi");
        const matches = bodyText.match(re);
        if (matches) scarcityCount += matches.length;
      }

      const hasUrgency = urgencyCount > 0;
      const hasScarcity = scarcityCount > 0;
      const pt = pageData.pageType;

      // Context-aware base scoring
      const scoreTable = {
        product:  { both: 90, urgency: 75, scarcity: 80, none: 55 },
        landing:  { both: 85, urgency: 70, scarcity: 75, none: 60 },
        homepage: { both: 70, urgency: 60, scarcity: 65, none: 70 },
        service:  { both: 65, urgency: 55, scarcity: 60, none: 70 },
      };
      const defaults = { both: 75, urgency: 65, scarcity: 70, none: 60 };
      const tier = scoreTable[pt] || defaults;

      let score;
      if (hasUrgency && hasScarcity) score = tier.both;
      else if (hasUrgency) score = tier.urgency;
      else if (hasScarcity) score = tier.scarcity;
      else score = tier.none;

      // Stuffing penalty
      const total = urgencyCount + scarcityCount;
      if (total >= 11) score -= 20;
      else if (total >= 7) score -= 10;
      else if (total >= 4) score -= 5;

      score = Math.max(0, Math.min(100, score));

      // Detail messages
      let detail;
      if (total >= 11) {
        detail = `Excessive urgency signals (${total} found) — overuse of pressure tactics reduces credibility and can increase bounce rates`;
      } else if (pt === "product" && (hasUrgency || hasScarcity)) {
        detail = `${urgencyCount} urgency and ${scarcityCount} scarcity signals found — appropriate for product/ecommerce pages`;
      } else if ((pt === "service" || pt === "homepage") && !hasUrgency && !hasScarcity) {
        detail = "No urgency signals — trust-based messaging typically outperforms pressure tactics for service businesses";
      } else if (pt === "homepage" && (hasUrgency || hasScarcity)) {
        detail = `${urgencyCount} urgency signals detected on homepage — consider whether this matches your brand positioning`;
      } else if (hasUrgency || hasScarcity) {
        detail = `${urgencyCount} urgency and ${scarcityCount} scarcity signal(s) detected`;
      } else {
        detail = "No urgency or scarcity signals detected";
      }

      if (langInfo.noTag) {
        detail += " (no language tag detected — checked English patterns only)";
      }

      results.push({ label: "Urgency & Scarcity", score, detail });
    }
  }

  // 23. Emotional Trigger Words
  if (shouldSkipCheck(pageData.pageType, "Emotional Trigger Words")) {
    results.push(naResult("Emotional Trigger Words", pageData.pageType));
  } else {
    if (!langInfo.supported) {
      results.push({
        label: "Emotional Trigger Words",
        score: 100,
        status: "na",
        detail: `Language "${langInfo.name}" not supported for emotional trigger analysis`,
      });
    } else {
      const patterns = EMOTIONAL_PATTERNS[langInfo.lang] || EMOTIONAL_PATTERNS.en;
      const categories = ["trust", "exclusivity", "curiosity", "empowerment"];
      const categoryMatches = {};
      let totalTriggers = 0;

      for (const cat of categories) {
        const catPatterns = patterns[cat] || [];
        let catCount = 0;
        for (const p of catPatterns) {
          const re = new RegExp(p.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "gi");
          if (re.test(bodyText)) catCount++;
        }
        categoryMatches[cat] = catCount;
        totalTriggers += catCount;
      }

      const coveredCategories = categories.filter(c => categoryMatches[c] > 0);
      const categoryCoverage = coveredCategories.length;

      let score;
      let detailNote = "";

      if (categoryCoverage >= 3 && totalTriggers >= 4 && totalTriggers <= 8) {
        score = 100;
      } else if (categoryCoverage >= 3 && totalTriggers >= 9 && totalTriggers <= 12) {
        score = 85;
        detailNote = "Strong emotional copy — approaching saturation";
      } else if (categoryCoverage === 2 && totalTriggers >= 3 && totalTriggers <= 6) {
        score = 75;
      } else if (categoryCoverage === 4 && totalTriggers >= 13) {
        score = 65;
        detailNote = "Excessive power words may reduce credibility — quality over quantity";
      } else if (categoryCoverage === 1 && totalTriggers >= 7) {
        score = 50;
        detailNote = "Power words concentrated in one category — diversify for broader appeal";
      } else if (categoryCoverage === 1 && totalTriggers >= 1 && totalTriggers <= 3) {
        score = 55;
      } else if (totalTriggers === 0) {
        score = 40;
      } else {
        score = 55;
      }

      let detail = detailNote
        ? `${detailNote}. ${totalTriggers} trigger words across ${categoryCoverage} categor${categoryCoverage === 1 ? "y" : "ies"} (${coveredCategories.join(", ")})`
        : totalTriggers === 0
          ? "No emotional trigger words detected — persuasive copy benefits from trust, curiosity, and empowerment language"
          : `${totalTriggers} trigger words across ${categoryCoverage} categor${categoryCoverage === 1 ? "y" : "ies"} (${coveredCategories.join(", ")})`;

      if (langInfo.noTag) {
        detail += " (no language tag detected — checked English patterns only)";
      }

      results.push({ label: "Emotional Trigger Words", score, detail });
    }
  }

  // 24. Headline Formula Quality
  if (shouldSkipCheck(pageData.pageType, "Headline Formula Quality")) {
    results.push(naResult("Headline Formula Quality", pageData.pageType));
  } else {
    if (!langInfo.supported) {
      results.push({
        label: "Headline Formula Quality",
        score: 100,
        status: "na",
        detail: `Language "${langInfo.name}" not supported for headline formula analysis`,
      });
    } else {
      const patterns = HEADLINE_PATTERNS[langInfo.lang];
      const headingsObj = pageData.headings || {};
      const allHeadings = [...(pageData.h1s || []), ...(headingsObj.h2 || []), ...(headingsObj.h3 || [])];
      let formulaCount = 0;
      const typesMatched = new Set();
      const items = [];

      for (const heading of allHeadings) {
        const trimmed = heading.trim();
        if (!trimmed) continue;
        let matched = false;

        if (patterns.numberLed.test(trimmed)) {
          typesMatched.add("number-led");
          matched = true;
          if (items.length < 10) items.push(`Number-led: '${trimmed}'`);
        }
        if (patterns.howTo.test(trimmed)) {
          typesMatched.add("how-to");
          matched = true;
          if (items.length < 10) items.push(`How-to: '${trimmed}'`);
        }
        if (patterns.question.some(r => r.test(trimmed)) || trimmed.endsWith("?")) {
          typesMatched.add("question");
          matched = true;
          if (items.length < 10) items.push(`Question: '${trimmed}'`);
        }
        if (patterns.outcomeDriven.test(trimmed)) {
          typesMatched.add("outcome-driven");
          matched = true;
          if (items.length < 10) items.push(`Outcome-driven: '${trimmed}'`);
        }
        if (patterns.comparison.some(r => r.test(trimmed))) {
          typesMatched.add("comparison");
          matched = true;
          if (items.length < 10) items.push(`Comparison: '${trimmed}'`);
        }

        if (matched) formulaCount++;
      }

      const typeCount = typesMatched.size;
      let score;
      if (formulaCount >= 3 && typeCount >= 3) score = 100;
      else if (formulaCount >= 3 && typeCount >= 1) score = 85;
      else if (formulaCount === 2) score = 75;
      else if (formulaCount === 1) score = 55;
      else score = 30;

      const typesStr = [...typesMatched].join(", ");
      let detail = formulaCount === 0
        ? "No headline formulas detected — use proven patterns like number-led lists, how-to, or question headlines to boost engagement"
        : `${formulaCount} formula heading${formulaCount === 1 ? "" : "s"} found across ${typeCount} pattern type${typeCount === 1 ? "" : "s"} (${typesStr})`;

      if (langInfo.noTag) {
        detail += " (no language tag detected — checked English patterns only)";
      }

      const result = { label: "Headline Formula Quality", score, detail };
      if (items.length > 0) result.items = items;
      results.push(result);
    }
  }

  // 25. Above-Fold Messaging Completeness
  if (shouldSkipCheck(pageData.pageType, "Above-Fold Messaging")) {
    results.push(naResult("Above-Fold Messaging", pageData.pageType));
  } else {
    if (!langInfo.supported) {
      results.push({
        label: "Above-Fold Messaging",
        score: 100,
        status: "na",
        detail: `Language "${langInfo.lang}" not supported for above-fold messaging analysis`,
      });
    } else {
      const lang = langInfo.lang;
      let whoScore = 0;
      let whatScore = 0;
      let forWhomScore = 0;
      const items = [];

      // Signal 1: WHO — Brand Identity (30pts)
      const orgTypes = ["Organization", "LocalBusiness", "ProfessionalService", "WebSite"];
      const hasOrg = (pageData.jsonLdEntities || []).some(e => {
        const t = Array.isArray(e["@type"]) ? e["@type"] : [e["@type"] || ""];
        return t.some(tt => orgTypes.includes(tt));
      });
      const hasLogo = pageData.logoDetected && pageData.logoDetected.found === true;
      const hasSiteName = !!(pageData.og && pageData.og.site_name);

      if (hasLogo || hasSiteName || hasOrg) {
        whoScore = 30;
        const whoParts = [];
        if (hasLogo) whoParts.push("logo in header");
        if (hasSiteName) whoParts.push("og:site_name");
        if (hasOrg) whoParts.push("Organization schema");
        items.push("WHO: " + whoParts.join(" + "));
      } else {
        items.push("WHO: Not detected \u2014 add logo and Organization schema");
      }

      // Signal 2: WHAT — Offering Clarity (35pts)
      const h1Text = (pageData.h1s[0] || "").toLowerCase();
      const first2Paras = pageData.paragraphs.slice(0, 2).map(p => p.toLowerCase());
      const offeringPatterns = OFFERING_PATTERNS[lang] || OFFERING_PATTERNS.en;

      const h1HasOffering = offeringPatterns.some(p => h1Text.includes(p));
      const parasHaveOffering = first2Paras.some(para => offeringPatterns.some(p => para.includes(p)));

      if (h1HasOffering) whatScore += 20;
      if (parasHaveOffering) whatScore += 15;

      if (whatScore > 0) {
        items.push("WHAT: Offering language found in H1");
      } else {
        items.push("WHAT: Not detected \u2014 state what you do in the H1");
      }

      // Signal 3: FOR WHOM — Target Audience (35pts)
      const audiencePatterns = AUDIENCE_PATTERNS[lang] || AUDIENCE_PATTERNS.en;
      const allAboveFoldText = [h1Text, ...first2Paras];
      const hasAudience = allAboveFoldText.some(text => audiencePatterns.some(p => text.includes(p)));

      if (hasAudience) {
        forWhomScore = 35;
        items.push("FOR WHOM: Target audience identified");
      } else {
        items.push("FOR WHOM: Not detected \u2014 name your target audience");
      }

      const score = whoScore + whatScore + forWhomScore;

      const missing = [];
      if (whoScore === 0) missing.push("brand identity (who)");
      if (whatScore === 0) missing.push("offering clarity (what)");
      if (forWhomScore === 0) missing.push("target audience (for whom)");

      let detail;
      if (missing.length === 0) {
        detail = "Hero section communicates brand identity, offering, and target audience \u2014 visitors can decide in under 5 seconds";
      } else if (missing.length === 3) {
        detail = "Hero section lacks all three messaging pillars (who, what, for whom) \u2014 55% of visitors bounce without clear above-fold messaging";
      } else {
        detail = `Missing ${missing.join(", ")} \u2014 visitors who can't answer 'who, what, for whom' within 5 seconds leave`;
      }

      const result = { label: "Above-Fold Messaging", score, detail };
      if (items.length > 0) result.items = items;
      results.push(result);
    }
  }

  // 26. Social Proof Signals
  if (shouldSkipCheck(pageData.pageType, "Social Proof Signals")) {
    results.push(naResult("Social Proof Signals", pageData.pageType));
  } else {
    if (!langInfo.supported) {
      results.push({
        label: "Social Proof Signals",
        score: 100,
        status: "na",
        detail: `Language "${langInfo.name}" not supported for social proof analysis`,
      });
    } else {
      const patterns = SOCIAL_PROOF_PATTERNS[langInfo.lang];

      // Signal 1: Testimonials/Reviews
      const hasTestimonials =
        pageData.hasReviewSchema === true ||
        pageData.blockquoteCount > 0 ||
        (Array.isArray(pageData.ratingElements) ? pageData.ratingElements.length > 0 : pageData.ratingElements > 0) ||
        patterns.testimonials.some(p => bodyText.includes(p));

      // Signal 2: Customer Count
      const customerCountEN = /\d[\d,.]*\+?\s*(customers|clients|users|businesses|companies|teams|members|subscribers|downloads)/i.test(bodyText);
      const trustedByNum = /(trusted|used|chosen|loved|serving|powering)\s+by\s+\d/i.test(bodyText);
      let hasCustomerCount = customerCountEN || trustedByNum;
      if (!hasCustomerCount && langInfo.lang !== "en") {
        // For non-EN: check if bodyText has a number near any testimonials/clientLogos pattern words
        const allWords = [...patterns.testimonials, ...patterns.clientLogos];
        hasCustomerCount = allWords.some(w => {
          const idx = bodyText.indexOf(w);
          if (idx === -1) return false;
          const nearby = bodyText.substring(Math.max(0, idx - 40), idx + w.length + 40);
          return /\d/.test(nearby);
        });
      }

      // Signal 3: Client Logos / As Seen In
      const hasClientLogos = patterns.clientLogos.some(p => bodyText.includes(p));

      // Signal 4: Case Studies / Results
      const hasCaseStudies = patterns.caseStudies.some(p => bodyText.includes(p));

      // Signal 5: Awards / Certifications
      const hasAwards =
        pageData.hasTrustBadges === true ||
        patterns.awards.some(p => bodyText.includes(p.toLowerCase()));

      const signals = [
        { name: "testimonials", found: hasTestimonials },
        { name: "customer metrics", found: hasCustomerCount },
        { name: "client logos", found: hasClientLogos },
        { name: "case studies", found: hasCaseStudies },
        { name: "awards/certifications", found: hasAwards },
      ];

      const foundCount = signals.filter(s => s.found).length;

      // Scoring
      let score;
      if (foundCount >= 4) score = 100;
      else if (foundCount === 3) score = 85;
      else if (foundCount === 2) score = 70;
      else if (foundCount === 1) score = 50;
      else score = 25;

      // Items array
      const items = [];
      const foundLabels = {
        testimonials: "Testimonials: review schema detected",
        "customer metrics": "Customer metrics: numeric claim found",
        "client logos": "Client logos: brand references found",
        "case studies": "Case studies: results content found",
        "awards/certifications": "Awards: trust badges or certifications found",
      };
      const missingLabels = {
        testimonials: "Missing: testimonials or reviews",
        "customer metrics": "Missing: customer counts or metrics",
        "client logos": "Missing: client logos or 'as seen in'",
        "case studies": "Missing: case studies or results",
        "awards/certifications": "Missing: awards or certifications",
      };
      for (const s of signals) {
        if (s.found) items.push(foundLabels[s.name]);
        else items.push(missingLabels[s.name]);
      }

      // Detail message
      let detail;
      if (foundCount >= 4) {
        detail = `${foundCount}/5 social proof types detected \u2014 strong credibility signals`;
      } else if (foundCount === 3) {
        const missing = signals.filter(s => !s.found).map(s => s.name);
        detail = `${foundCount}/5 social proof types \u2014 add ${missing.join(", ")} for layered social proof`;
      } else if (foundCount >= 1) {
        detail = `Only ${foundCount} social proof type${foundCount === 1 ? "" : "s"} found \u2014 add testimonials, customer counts, or case studies`;
      } else {
        detail = "No social proof elements detected \u2014 92% of consumers trust peer recommendations over advertising";
      }

      const result = { label: "Social Proof Signals", score, detail };
      if (items.length > 0) result.items = items;
      results.push(result);
    }
  }

  return results;
}

module.exports = { runMarketingChecks };
