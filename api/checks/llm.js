// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (C) 2026 Lams IT Solutions
const { analyzeReadability, isCJK, countCJKWords } = require("../utils/readability");
const { entityHasType } = require("../crawler");
const { shouldSkipCheck } = require("../config/checkApplicability");

function naResult(label, pageType) {
  return { label, score: 100, status: "na", detail: `Not applicable for ${pageType} pages` };
}

/**
 * Run LLM readiness checks against parsed page data.
 * Based on latest GEO/AEO best practices (2025-2026).
 */
function runLlmChecks(pageData, robotsTxt) {
  const results = [];

  // 1. AI Bot Access (Detailed) — per-bot granularity
  // Search-relevant bots: blocking these hurts AI search visibility
  const SEARCH_BOTS = [
    "GPTBot",               // OpenAI training
    "ChatGPT-User",         // OpenAI user-triggered browsing
    "OAI-SearchBot",        // OpenAI SearchGPT
    "ClaudeBot",            // Anthropic training
    "Claude-SearchBot",     // Anthropic search index
    "Claude-User",          // Anthropic user-triggered browsing
    "PerplexityBot",        // Perplexity training/crawl
    "Perplexity-User",      // Perplexity user-initiated queries
    "Google-Extended",      // Google Gemini / AI Overviews
    "Applebot-Extended",    // Apple Intelligence
    "Meta-ExternalAgent",   // Meta AI training/crawl
    "Meta-ExternalFetcher", // Meta AI per-user / link previews
    "Amazonbot",            // Amazon Alexa / Rufus answers
  ];
  const blockedBots = robotsTxt?.blockedAiBots || [];
  const botItems = SEARCH_BOTS.map(bot => ({
    bot,
    allowed: !blockedBots.includes(bot),
  }));
  const blockedSearchBots = botItems.filter(b => !b.allowed).length;
  const aiAccessScore = Math.max(10, 100 - (blockedSearchBots * 10));
  results.push({
    label: "AI Bot Access (Detailed)",
    score: aiAccessScore,
    detail: blockedSearchBots === 0
      ? `All ${SEARCH_BOTS.length} search-relevant AI bots allowed`
      : `${blockedSearchBots}/${SEARCH_BOTS.length} search bots blocked: ${botItems.filter(b => !b.allowed).map(b => b.bot).join(", ")}`,
    items: botItems.map(b => `${b.bot}: ${b.allowed ? "allowed" : "blocked"}`),
  });

  // 2. Content Clarity — Is the main offering identifiable in H1 + first paragraphs?
  const h1Text = (pageData.h1s[0] || "").toLowerCase();
  const firstParas = pageData.paragraphs.slice(0, 3).join(" ").toLowerCase();
  // Multi-language generic H1 detection
  const genericH1Words = [
    "welcome", "home", "homepage",
    "welkom", "startpagina", "hoofdpagina",
    "bienvenue", "accueil", "page d'accueil",
    "willkommen", "startseite",
    "bienvenido", "inicio", "página principal",
    "benvenuto", "pagina principale",
    "bem-vindo", "página inicial",
    "ホーム", "トップページ", "ようこそ",
    "首页", "欢迎", "홈", "환영합니다",
  ];
  // CJK characters convey more meaning per character — 5 CJK chars ≈ 10+ Latin chars
  const cjkH1 = isCJK(h1Text);
  const h1LenThreshold = cjkH1 ? 4 : 10;
  const hasSpecificH1 = h1Text.length > h1LenThreshold && !genericH1Words.some(w => h1Text.includes(w));
  const clarityScore = (hasSpecificH1 ? 50 : 10) + (firstParas.length > 100 ? 30 : 10) + (pageData.h1s.length === 1 ? 10 : 0);
  results.push({
    label: "Content Clarity",
    score: Math.min(clarityScore, 100),
    detail: hasSpecificH1
      ? "Main offering identifiable in H1 and opening content"
      : "H1 is generic or missing — AI systems cannot identify your main offering or topic",
  });

  // 3. Answer Capsule Presence — Concise, quotable definitions after headings
  if (shouldSkipCheck(pageData.pageType, "Answer Capsules")) {
    results.push(naResult("Answer Capsules", pageData.pageType));
  } else {
    const capsules = pageData.answerCapsules || 0;
    const capsuleScore = capsules >= 3 ? 90 : capsules >= 1 ? 65 : 40;
    results.push({
      label: "Answer Capsules",
      score: capsuleScore,
      detail: capsules > 0
        ? `${capsules} concise answer capsule(s) found after H2 headings — AI can quote these directly`
        : "No concise definition paragraphs found after headings — AI has no clean anchor text to cite",
    });
  }

  // 4. Content Extractability — Lists, tables, and structured content
  const lists = pageData.listCount || 0;
  const tables = pageData.tableCount || 0;
  const defLists = pageData.definitionListCount || 0;
  const hasLists = lists > 0 || defLists > 0;
  const hasTables = tables > 0;
  const extractScore = (hasLists && hasTables) ? 90 : (hasLists || hasTables) ? 70 : 40;
  results.push({
    label: "Content Extractability",
    score: extractScore,
    detail: hasLists && hasTables
      ? `${lists} list(s), ${tables} table(s) found — structured content is 2.5x more likely to be cited by AI`
      : hasLists || hasTables
        ? `Found ${lists} list(s) and ${tables} table(s) — add ${!hasTables ? "comparison tables" : "bullet points"} for better AI extraction`
        : "No lists or tables — structure key information so AI can extract and cite it easily",
  });

  // 5. Citation Worthiness — specific data points, stats, quotes, sources
  if (shouldSkipCheck(pageData.pageType, "Citation Worthiness")) {
    results.push(naResult("Citation Worthiness", pageData.pageType));
  } else {
    const allText = pageData.paragraphs.join(" ");
    const numberMatches = allText.match(/\d+%|\d+\.\d+|\$\d+|€\d+|£\d+/g) || [];
    const hasStats = numberMatches.length >= 3;
    const hasQuotes = allText.includes('"') || allText.includes('\u201c');
    const hasBlockquotes = (pageData.blockquoteCount || 0) > 0;
    const hasCitations = (pageData.citeCount || 0) > 0 || (pageData.referenceElements || 0) > 0;
    const citationScore = Math.min(
      (hasStats ? 35 : 10) +
      (numberMatches.length * 4) +
      (hasQuotes ? 10 : 0) +
      (hasBlockquotes ? 10 : 0) +
      (hasCitations ? 10 : 0) +
      (pageData.jsonLd.length > 0 ? 15 : 0),
      100
    );
    results.push({
      label: "Citation Worthiness",
      score: citationScore,
      detail: hasStats
        ? `${numberMatches.length} data points${hasBlockquotes ? ", blockquotes" : ""}${hasCitations ? ", source citations" : ""} found — strong citation material`
        : "Lacks specific statistics, data points, or source citations for AI to reference",
    });
  }

  // 6. Author & Expertise Signals (E-E-A-T for AI)
  if (shouldSkipCheck(pageData.pageType, "Author & Expertise")) {
    results.push(naResult("Author & Expertise", pageData.pageType));
  } else {
    const hasAuthorSchema = pageData.hasAuthorSchema || false;
    const authorBio = (pageData.authorBioElements || 0) > 0;
    const authorName = pageData.authorName;
    const expertiseScore = Math.min(
      20 +
      (hasAuthorSchema ? 35 : 0) +
      (authorBio ? 20 : 0) +
      (authorName ? 15 : 0) +
      (pageData.sameAsLinks?.length > 0 ? 10 : 0),
      100
    );
    results.push({
      label: "Author & Expertise",
      score: expertiseScore,
      detail: hasAuthorSchema
        ? `Author schema with credentials found${authorName ? ` (${authorName})` : ""} — AI prioritizes content from identifiable experts`
        : authorBio
          ? "Author bio section detected but no Person schema — add structured data for AI credibility signals"
          : "No author or expertise signals — AI cannot verify content credibility for citation",
    });
  }

  // 7. Source Attribution — external references, citations, blockquotes
  if (shouldSkipCheck(pageData.pageType, "Source Attribution")) {
    results.push(naResult("Source Attribution", pageData.pageType));
  } else {
    const extLinks = pageData.contentExternalLinks || 0;
    const sourceRefs = (pageData.blockquoteCount || 0) + (pageData.citeCount || 0) + (pageData.referenceElements || 0);
    const totalSources = extLinks + sourceRefs;
    const sourceScore = totalSources >= 5 ? 90 : totalSources >= 2 ? 70 : totalSources >= 1 ? 50 : 30;
    const sourceItems = [];
    if (extLinks > 0) sourceItems.push(`${extLinks} external link(s) in content`);
    if ((pageData.blockquoteCount || 0) > 0) sourceItems.push(`${pageData.blockquoteCount} blockquote(s)`);
    if ((pageData.citeCount || 0) > 0) sourceItems.push(`${pageData.citeCount} <cite> element(s)`);
    if ((pageData.referenceElements || 0) > 0) sourceItems.push(`${pageData.referenceElements} reference element(s)`);
    results.push({
      label: "Source Attribution",
      score: sourceScore,
      detail: totalSources >= 5
        ? `${totalSources} source references found (${extLinks} external links, ${sourceRefs} citations) — content that cites sources is 30-40% more visible to AI`
        : totalSources > 0
          ? `Only ${totalSources} source reference(s) — add more citations and data sources every 150-200 words`
          : "No external source links or citations — AI deprioritizes unsourced claims",
      items: sourceItems.length > 0 ? sourceItems : undefined,
    });
  }

  // 8. Entity Recognition — business/entity clearly defined in structured data
  const entities = pageData.jsonLdEntities || pageData.jsonLd;
  const orgTypes = ["Organization", "LocalBusiness", "ProfessionalService", "WebSite"];
  const hasJsonLdOrg = entities.some(e => orgTypes.some(t => entityHasType(e, t)));
  const hasOgSiteName = !!pageData.og.site_name;
  const hasSameAs = (pageData.sameAsLinks || []).length > 0;
  const entityScore = Math.min(
    (hasJsonLdOrg ? 35 : 0) +
    (hasSameAs ? 20 : 0) +
    (hasOgSiteName ? 15 : 0) +
    (pageData.title.length > 0 ? 15 : 0) +
    (pageData.h1s.length > 0 ? 15 : 0),
    100
  );
  const entityItems = [];
  if (hasJsonLdOrg) entityItems.push("Organization/Business schema found");
  if (hasOgSiteName) entityItems.push(`og:site_name: "${pageData.og.site_name}"`);
  if (hasSameAs) entityItems.push(...(pageData.sameAsLinks || []).slice(0, 5).map(l => `sameAs: ${l}`));
  results.push({
    label: "Entity Recognition",
    score: entityScore,
    detail: hasJsonLdOrg && hasSameAs
      ? "Business entity defined with knowledge graph connections (sameAs links) — AI can resolve your entity"
      : hasJsonLdOrg
        ? "Organization schema found but missing sameAs links to Wikipedia/LinkedIn/social profiles for knowledge graph"
        : "No Organization/LocalBusiness schema — AI cannot identify or disambiguate your entity",
    items: entityItems.length > 0 ? entityItems : undefined,
  });

  // 9. FAQ Presence — only flag as issue if page has Q&A-like content without schema
  const faqScore = pageData.hasFaqSchema ? 95 : pageData.faqPatterns > 0 ? 55 : 75;
  results.push({
    label: "FAQ Presence",
    score: faqScore,
    detail: pageData.hasFaqSchema
      ? "FAQ schema markup found — FAQ content achieves 40-60% higher AI citation rates"
      : pageData.faqPatterns > 0
        ? "FAQ-like content detected but no FAQPage schema — add markup for 40-60% citation rate boost"
        : "No FAQ section — consider adding Q&A content for pages where users commonly have questions",
  });

  // 10. Answer Density — are paragraphs specific enough?
  if (shouldSkipCheck(pageData.pageType, "Answer Density")) {
    results.push(naResult("Answer Density", pageData.pageType));
  } else {
    // Language-agnostic: checks for numbers/stats, proper nouns, and structural specificity
    const isCJKContent = isCJK(pageData.paragraphs.join(" "));
    const specificParas = pageData.paragraphs.filter(p => {
      const hasNumber = /\d/.test(p);
      // Symbols/data that indicate specificity regardless of language
      const hasCurrency = /[$€£¥₹₩元円]/.test(p);
      const hasPercentage = /\d+\s*%/.test(p);
      // For Latin scripts: capital word not at start = proper noun
      // For CJK/non-Latin: check for quoted terms, parenthetical refs, or Latin proper nouns mixed in
      const hasProperNoun = /[A-Z][a-z]{2,}/.test(p.slice(1));
      const hasNonLatinSpecificity = /「.+?」|『.+?』|【.+?】|（.+?）/.test(p) || /[A-Za-z]{2,}/.test(p);
      const hasPunctuation = /[—–:;：；]/.test(p); // em-dash, en-dash, colon = structured claim
      // CJK: use character count instead of word count (15 words ≈ 20 CJK chars, 100 words ≈ 150 chars)
      const charLen = p.replace(/\s+/g, "").length;
      const words = p.split(/\s+/).length;
      const lengthOk = isCJKContent ? (charLen >= 20 && charLen <= 200) : (words >= 15 && words <= 100);
      const isSpecific = lengthOk && (hasNumber || hasCurrency || hasPercentage || hasProperNoun || hasNonLatinSpecificity || hasPunctuation);
      return isSpecific;
    });
    const densityRatio = pageData.paragraphs.length > 0
      ? specificParas.length / pageData.paragraphs.length
      : 0;
    const densityScore = Math.min(Math.round(densityRatio * 100) + 30, 100);
    results.push({
      label: "Answer Density",
      score: densityScore,
      detail: densityRatio > 0.4
        ? `${specificParas.length} of ${pageData.paragraphs.length} paragraphs contain specific data — optimal for AI extraction`
        : "Many paragraphs are too vague — add specific claims, numbers, and concise answers every 2-4 sentences",
    });
  }

  // 11. Content Freshness (replaces Freshness Signals)
  if (shouldSkipCheck(pageData.pageType, "Content Freshness")) {
    results.push(naResult("Content Freshness", pageData.pageType));
  } else {
    const dateModifiedRaw = (pageData.jsonLd || []).find(e => e && e.dateModified)?.dateModified
      || (pageData.jsonLdEntities || []).find(e => e && e.dateModified)?.dateModified
      || null;
    const hasDateModified = !!dateModifiedRaw;
    // Staleness: dates older than 90 days are usually hardcoded leftovers, not real updates.
    let daysSinceModified = null;
    if (hasDateModified) {
      const modDate = new Date(dateModifiedRaw);
      if (!isNaN(modDate.getTime())) {
        daysSinceModified = Math.floor((Date.now() - modDate.getTime()) / (1000 * 60 * 60 * 24));
      }
    }
    // Ahrefs 2025 citation data: AI engines cite content updated within 30 days
    // at materially higher rates. 90+ days = stale. 365+ days = effectively dead.
    const isVeryFresh = daysSinceModified !== null && daysSinceModified <= 30;
    const isStale = daysSinceModified !== null && daysSinceModified > 90;
    const isVeryStale = daysSinceModified !== null && daysSinceModified > 365;

    const hasTimeElements = (pageData.timeElements || []).length > 0;
    const freshLabels = [
      /last updated|modified|published|updated on/i,
      /laatst bijgewerkt|gewijzigd op|gepubliceerd/i,
      /dernière mise à jour|modifié le|publié le/i,
      /zuletzt aktualisiert|geändert am|veröffentlicht/i,
      /última actualización|modificado|publicado/i,
      /ultimo aggiornamento|modificato il|pubblicato il/i,
      /última atualização|modificado em|publicado em/i,
      /最終更新|更新日|公開日/,
      /最后更新|修改日期|发布日期/,
      /최종 업데이트|수정일|게시일/,
    ];
    const hasVisibleDate = freshLabels.some(rx => rx.test(pageData.visibleText || ""));

    let freshScore, freshDetail;
    if (isVeryStale) {
      freshScore = 25;
      freshDetail = `dateModified is ${daysSinceModified} days old (>1 year) — likely a hardcoded date, not a real update signal`;
    } else if (isStale) {
      freshScore = 50;
      freshDetail = `dateModified is ${daysSinceModified} days old (>90 days) — refresh or remove stale freshness markup`;
    } else if (isVeryFresh && (hasVisibleDate || hasTimeElements)) {
      freshScore = 100;
      freshDetail = `Very fresh: schema dateModified (${daysSinceModified} days ago) + visible date — top AI citation tier (≤30 days)`;
    } else if (hasDateModified && (hasVisibleDate || hasTimeElements)) {
      freshScore = 90;
      freshDetail = daysSinceModified !== null
        ? `Strong freshness signals: schema dateModified (${daysSinceModified} days ago) + visible date`
        : "Strong freshness signals: schema dateModified + visible date";
    } else if (hasDateModified) {
      freshScore = 80;
      freshDetail = daysSinceModified !== null
        ? `dateModified found in schema (${daysSinceModified} days ago)`
        : "dateModified found in schema markup";
    } else if (hasVisibleDate) {
      freshScore = 70;
      freshDetail = "Visible date label found on page";
    } else if (hasTimeElements) {
      freshScore = 55;
      freshDetail = "Time elements found but no explicit date labels";
    } else {
      freshScore = 30;
      freshDetail = "No freshness signals — updated content gets 3.2x more AI citations";
    }
    results.push({ label: "Content Freshness", score: freshScore, detail: freshDetail });
  }

  // 12. llms.txt File — exists + follows llmstxt.org spec (H1 on line 1, > blockquote after)
  const llmsTxt = pageData.llmsTxt;
  let llmsTxtScore = 50, llmsTxtDetail = "No llms.txt file found (emerging standard)";
  if (llmsTxt?.exists && llmsTxt.content?.trim().length > 0) {
    const content = llmsTxt.content.replace(/^﻿/, ""); // strip BOM
    const lines = content.split(/\r?\n/);
    // First non-empty line should be an H1 (# Title)
    const firstNonEmpty = lines.find(l => l.trim().length > 0) || "";
    const hasH1 = /^#\s+\S/.test(firstNonEmpty.trim());
    // The first non-empty line after the H1 should be a blockquote (> summary)
    const h1Index = lines.findIndex(l => l.trim() === firstNonEmpty.trim());
    const afterH1 = h1Index >= 0 ? lines.slice(h1Index + 1) : [];
    const firstAfterH1 = afterH1.find(l => l.trim().length > 0) || "";
    const hasBlockquote = /^>\s+\S/.test(firstAfterH1.trim());

    if (hasH1 && hasBlockquote) {
      llmsTxtScore = 100;
      llmsTxtDetail = "llms.txt present and follows llmstxt.org spec (H1 + blockquote summary)";
    } else {
      const missing = [];
      if (!hasH1) missing.push("H1 heading on first line");
      if (!hasBlockquote) missing.push("> blockquote summary after H1");
      llmsTxtScore = 65;
      llmsTxtDetail = `llms.txt exists but doesn't follow llmstxt.org spec — missing: ${missing.join(", ")}`;
    }
  } else if (llmsTxt?.exists) {
    llmsTxtScore = 60;
    llmsTxtDetail = "llms.txt file exists but is empty or minimal";
  }
  results.push({ label: "llms.txt File", score: llmsTxtScore, detail: llmsTxtDetail });

  // 13. Content Accessibility (gated content)
  const paywall = pageData.paywallSignals;
  let gateScore = 100, gateDetail = "Content is freely accessible";
  if (paywall?.hasPaywallClasses && paywall?.hasLoginForm) {
    gateScore = 25;
    gateDetail = "Hard gate detected: paywall + login form present";
  } else if (paywall?.hasPaywallClasses) {
    gateScore = 60;
    gateDetail = "Soft gate detected: paywall-related classes found";
  } else if (paywall?.hasLoginForm) {
    gateScore = 60;
    gateDetail = "Login form detected on content page";
  }
  results.push({ label: "Content Accessibility", score: gateScore, detail: gateDetail });

  // 14. Question Headings
  if (shouldSkipCheck(pageData.pageType, "Question Headings")) {
    results.push(naResult("Question Headings", pageData.pageType));
  } else {
  // Question patterns by language
  const questionStartsWith = [
    // EN
    /^(what|how|why|when|where|which|can|does|is|are|do|will|should)\b/i,
    // NL
    /^(wat|hoe|waarom|wanneer|waar|welke|kan|is|zijn)\b/i,
    // FR
    /^(qu['']est-ce|comment|pourquoi|quand|où|quel|quelle)\b/i,
    // DE
    /^(was|wie|warum|wann|wo|welche|kann|ist)\b/i,
    // ES
    /^(qué|cómo|por qué|cuándo|dónde|cuál)\b/i,
    // IT
    /^(cosa|come|perché|quando|dove|quale)\b/i,
    // PT
    /^(o que|como|por que|quando|onde|qual)\b/i,
    // ZH (starts-with)
    /^(什么|怎么|为什么|什么时候|哪里|哪个)/,
  ];
  // JA/KO use substring matching (SOV word order)
  const questionIncludes = [
    /何が|どう|なぜ|いつ|どこ|どの/,  // JA
    /무엇|어떻게|왜|언제|어디|어떤/,  // KO
  ];

  const headings = pageData.headings || {};
  const h2h3 = [...(headings.h2 || []), ...(headings.h3 || [])];
  let questionCount = 0;
  for (const h of h2h3) {
    const isQuestion = questionStartsWith.some(rx => rx.test(h)) || questionIncludes.some(rx => rx.test(h)) || h.trim().endsWith("?");
    if (isQuestion) questionCount++;
  }
  let qScore = questionCount >= 3 ? 100 : questionCount === 2 ? 80 : questionCount === 1 ? 60 : 35;
  results.push({
    label: "Question Headings",
    score: qScore,
    detail: questionCount > 0 ? `${questionCount} question-formatted H2/H3 headings found` : "No question-formatted headings found — AI systems favor Q&A patterns",
  });
  }

  // 15. Source Citations
  const attrPhrases = [
    /according to\b/i, /found that\b/i, /\bper\b/i, /research by\b/i, /study by\b/i, /data from\b/i,
    /volgens\b/i, /onderzoek van\b/i, /blijkt uit\b/i,  // NL
    /selon\b/i, /d['']après\b/i, /étude de\b/i,  // FR
    /\blaut\b/i, /gemäß\b/i, /Studie von\b/i, /Forschung von\b/i,  // DE
    /según\b/i, /de acuerdo con\b/i, /estudio de\b/i,  // ES
    /secondo\b/i, /in base a\b/i, /studio di\b/i,  // IT
    /de acordo com\b/i, /segundo\b/i, /estudo de\b/i,  // PT
    /によると/, /の調査/, /の研究/,  // JA
    /根据/, /调查显示/, /研究表明/,  // ZH
  ];
  const visText = pageData.visibleText || "";
  let citationCount = 0;
  for (const rx of attrPhrases) {
    const matches = visText.match(new RegExp(rx.source, rx.flags + "g"));
    if (matches) citationCount += matches.length;
  }
  const citScore = citationCount >= 3 ? 100 : citationCount === 2 ? 80 : citationCount === 1 ? 60 : 35;
  results.push({
    label: "Source Citations",
    score: citScore,
    detail: citationCount > 0 ? `${citationCount} attribution/citation patterns found` : "No sourced statistics or citations detected — cited content gets +37% AI visibility",
  });

  // 16. Definition Clarity
  if (shouldSkipCheck(pageData.pageType, "Definition Clarity")) {
    results.push(naResult("Definition Clarity", pageData.pageType));
  } else {
  const defVerbs = [
    /\bis\b/i, /\bare\b/i, /refers to\b/i, /\bmeans\b/i,
    /\bsind\b/i, /\bist\b/i, /bezieht sich auf\b/i, /bedeutet\b/i,  // DE
    /\best\b/i, /\bsont\b/i, /désigne\b/i, /signifie\b/i,  // FR
    /\bson\b/i, /se refiere a\b/i, /significa\b/i,  // ES
    /\bsono\b/i, /si riferisce a\b/i,  // IT
    /\bsão\b/i, /refere-se a\b/i,  // PT
    /は.*です/, /とは/,  // JA
    /是/, /指的是/, /意味着/,  // ZH
    /은.*입니다|는.*입니다/, /이란/,  // KO
  ];
  const paragraphs = pageData.paragraphs || [];
  let defCount = 0;
  for (const p of paragraphs.slice(0, 20)) {  // Check first 20 paragraphs
    const firstSentence = p.split(/[.。！？!?]/)[0] || "";
    const wordCount = firstSentence.trim().split(/\s+/).length;
    if (wordCount <= 30 && defVerbs.some(rx => rx.test(firstSentence))) {
      defCount++;
    }
  }
  const defScore = defCount >= 3 ? 100 : defCount === 2 ? 80 : defCount === 1 ? 60 : 40;
  results.push({
    label: "Definition Clarity",
    score: defScore,
    detail: defCount > 0 ? `${defCount} concise definition blocks found` : "No concise definitions found — AI favors 'X is...' patterns after headings",
  });
  }

  // 17. Speakable Schema (Schema.org — voice/AI readiness)
  // Only relevant for news/article pages — non-news sites get a pass
  if (shouldSkipCheck(pageData.pageType, "Speakable Schema")) {
    results.push(naResult("Speakable Schema", pageData.pageType));
  } else {
    const isArticlePage = entities.some(e => entityHasType(e, "Article") || entityHasType(e, "NewsArticle") || entityHasType(e, "BlogPosting"));
    if (pageData.hasSpeakableSchema) {
      results.push({
        label: "Speakable Schema",
        score: 95,
        detail: "Speakable property found — explicitly marks content sections for voice assistants and AI reading",
      });
    } else if (isArticlePage) {
      results.push({
        label: "Speakable Schema",
        score: 45,
        detail: "No speakable schema on article page — add speakable property to JSON-LD to flag sections for voice/AI assistants",
      });
    } else {
      results.push({
        label: "Speakable Schema",
        score: 100,
        status: "na",
        detail: "Speakable schema not applicable — only relevant for news and article pages",
      });
    }
  }

  // 13. WebSite / WebPage Schema (Schema.org)
  // Note: WebSite.potentialAction/SearchAction is no longer checked — Google deprecated
  // the sitelinks search box rich result on 2024-10-21 (fully retired 2024-11-21).
  const hasWS = pageData.hasWebSiteSchema || false;
  const hasWP = pageData.hasWebPageSchema || false;
  const wpScore = (hasWS && hasWP) ? 100 : (hasWS || hasWP) ? 65 : 25;
  results.push({
    label: "WebSite / WebPage Schema",
    score: wpScore,
    detail: hasWS && hasWP
      ? "WebSite and WebPage schema found — AI can fully contextualize your page within your site"
      : hasWS
        ? "WebSite schema found but no WebPage — add WebPage schema so AI understands page-level context"
        : hasWP
          ? "WebPage schema found but no WebSite — add WebSite schema for site-level context"
          : "No WebSite or WebPage schema — AI lacks site structure context for accurate citation",
  });

  // 14. HowTo Schema (Schema.org) — only flag when procedural content exists without schema
  if (shouldSkipCheck(pageData.pageType, "HowTo Schema")) {
    results.push(naResult("HowTo Schema", pageData.pageType));
  } else if (pageData.hasHowToSchema) {
    results.push({
      label: "HowTo Schema",
      score: 95,
      detail: "HowTo schema found — procedural content with step markup is heavily cited by AI and eligible for rich results",
    });
  } else {
    const bodyText = pageData.paragraphs.join(" ").toLowerCase();
    // Multi-language procedural content detection
    // Require actual step-by-step patterns, not just "guide" or "tutorial" which appear in informational articles
    const hasProcedural = /\b(step \d|step-by-step|how to .{5,}|first,.*then,|next,.*finally,|stap \d|stap-voor-stap|eerst,.*vervolgens|étape \d|étape par étape|d'abord,.*ensuite|schritt \d|schritt für schritt|zuerst,.*dann|paso \d|paso a paso|primero,.*luego|passo \d|passo a passo)\b/i.test(bodyText)
      || /手順\d|ステップ\d|步骤\d|단계\s*\d/.test(bodyText);
    results.push({
      label: "HowTo Schema",
      score: hasProcedural ? 35 : 100,
      status: hasProcedural ? undefined : "na",
      detail: hasProcedural
        ? "Procedural content detected but no HowTo schema — add markup for step-by-step rich results and AI citations"
        : "No procedural content detected — HowTo schema not applicable for this page",
    });
  }

  // Readability checks (computed from visible text)
  const visibleText = pageData.visibleText || "";

  // Content Readability
  if (shouldSkipCheck(pageData.pageType, "Content Readability")) {
    results.push(naResult("Content Readability", pageData.pageType));
  } else if (visibleText.length > 100) {
    const lang = pageData.lang || "en";
    const readability = analyzeReadability(visibleText, lang);
    const isEnglish = lang.startsWith("en");
    const isCJKText = readability.isCJKContent;
    const langNote = isEnglish ? "" : isCJKText ? " (CJK metrics)" : " (adjusted for non-English)";

    // CJK: the readability module already returns adapted scores
    // Non-English Latin: compound words score lower on Flesch, adjust thresholds
    const readabilityScore = readability.fleschReadingEase;
    // Flesch 50-60 = grade 10-12, perfectly fine for professional/technical audiences
    const easyThreshold = isEnglish ? 50 : isCJKText ? 55 : 35;
    const okThreshold = isEnglish ? 30 : isCJKText ? 35 : 15;
    const adjustedScore = readabilityScore >= easyThreshold
      ? Math.min(95, isCJKText ? readabilityScore : isEnglish ? Math.max(readabilityScore, 80) : readabilityScore + 20)
      : readabilityScore >= okThreshold ? 60 : 30;
    results.push({
      label: "Content Readability",
      score: adjustedScore,
      detail: isCJKText
        ? `Reading ease: ${readability.fleschReadingEase}/100 (avg sentence: ${readability.avgSentenceLength} words equiv.)${langNote}`
        : `Reading ease: ${readability.fleschReadingEase}/100 (Grade ${readability.fleschKincaidGrade}, Fog: ${readability.gunningFog})${langNote}`,
    });
  }

  // Sentence Complexity
  if (shouldSkipCheck(pageData.pageType, "Sentence Complexity")) {
    results.push(naResult("Sentence Complexity", pageData.pageType));
  } else if (visibleText.length > 100) {
    const lang = pageData.lang || "en";
    const readability = analyzeReadability(visibleText, lang);
    const isEnglish = lang.startsWith("en");
    const isCJKText = readability.isCJKContent;
    const langNote = isEnglish ? "" : isCJKText ? " (CJK metrics)" : " (adjusted for non-English)";
    const sentenceOk = readability.avgSentenceLength <= 25;
    // CJK: complexWordRatio is 0 (not applicable), always passes
    // Non-English compound words inflate complexity — relax threshold
    const complexThreshold = isCJKText ? 1.0 : isEnglish ? 0.20 : 0.25;
    const complexOk = readability.complexWordRatio <= complexThreshold;
    const complexityScore = sentenceOk && complexOk ? 90 : sentenceOk || complexOk ? 55 : 25;
    results.push({
      label: "Sentence Complexity",
      score: complexityScore,
      detail: isCJKText
        ? `Avg sentence: ${readability.avgSentenceLength} words equiv.${langNote}`
        : `Avg sentence: ${readability.avgSentenceLength} words, complex words: ${Math.round(readability.complexWordRatio * 100)}%${langNote}`,
    });
  }

  return results;
}

module.exports = { runLlmChecks };
