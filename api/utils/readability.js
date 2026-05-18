// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (C) 2026 Lams IT Solutions
/**
 * Detect if text is primarily CJK (Chinese, Japanese, Korean).
 * CJK characters don't use spaces between words and syllable counting is meaningless.
 */
function isCJK(text) {
  const cjkChars = (text.match(/[\u3000-\u9fff\uac00-\ud7af\uff00-\uffef]/g) || []).length;
  const totalChars = text.replace(/\s+/g, "").length;
  return totalChars > 0 && cjkChars / totalChars > 0.3;
}

/**
 * Count syllables in a word. Supports Latin-script languages including
 * accented characters (ä, ö, ü, é, è, ñ, etc.).
 * For non-Latin scripts, returns a character-based estimate.
 */
function countSyllables(word) {
  // Strip non-letter characters but keep Unicode letters (accented chars, etc.)
  const cleaned = word.toLowerCase().replace(/[^\p{L}]/gu, "");
  if (cleaned.length === 0) return 1;
  if (cleaned.length <= 2) return 1;

  // Check if word is non-Latin (Cyrillic, Greek, Arabic, Hebrew, Thai, etc.)
  const hasLatin = /[\p{Script=Latin}]/u.test(cleaned);
  if (!hasLatin) {
    // Rough estimate: 1 syllable per 2-3 characters for non-Latin scripts
    return Math.max(1, Math.round(cleaned.length / 2.5));
  }

  // Latin-script syllable counting (English, Dutch, German, French, Spanish, etc.)
  // Extended vowel set including accented vowels
  let w = cleaned.replace(/e$/, "");
  const vowelGroups = w.match(/[aeiouyàáâãäåæèéêëìíîïòóôõöùúûüýÿœø]+/g);
  const count = vowelGroups ? vowelGroups.length : 1;
  return Math.max(1, count);
}

/**
 * Count "words" in CJK text. CJK doesn't use spaces, so we estimate
 * based on character count. Roughly 1.5 CJK chars ≈ 1 English word.
 */
function countCJKWords(text) {
  const cjkChars = (text.match(/[\u3000-\u9fff\uac00-\ud7af\uff00-\uffef]/g) || []).length;
  const latinWords = (text.match(/[\p{Script=Latin}]+/gu) || []).length;
  return Math.round(cjkChars / 1.5) + latinWords;
}

function analyzeReadability(text, lang) {
  const empty = {
    fleschReadingEase: 0, fleschKincaidGrade: 0, gunningFog: 0,
    avgSentenceLength: 0, complexWordRatio: 0, isCJKContent: false,
  };
  if (!text || text.trim().length === 0) return empty;

  const cjkContent = isCJK(text);

  // CJK: use character-based metrics instead of syllable-based Flesch
  if (cjkContent) {
    return analyzeCJKReadability(text);
  }

  // Sentence splitting: also handle CJK sentence-ending punctuation
  const sentences = text.split(/[.!?。！？]+/).filter((s) => s.trim().length > 0);
  if (sentences.length === 0) return empty;

  const words = text.match(/[\p{L}]+/gu);
  if (!words || words.length === 0) return empty;

  const totalWords = words.length;
  const totalSentences = sentences.length;
  let totalSyllables = 0;
  let complexWords = 0;

  for (const word of words) {
    const syllables = countSyllables(word);
    totalSyllables += syllables;
    if (syllables >= 3) complexWords++;
  }

  const avgSentenceLength = Math.round(totalWords / totalSentences);
  const avgSyllablesPerWord = totalSyllables / totalWords;
  const complexWordRatio = Math.round((complexWords / totalWords) * 100) / 100;

  const fleschReadingEase = Math.round(
    Math.max(0, Math.min(100, 206.835 - 1.015 * (totalWords / totalSentences) - 84.6 * avgSyllablesPerWord))
  );
  const fleschKincaidGrade = Math.round(
    Math.max(0, 0.39 * (totalWords / totalSentences) + 11.8 * avgSyllablesPerWord - 15.59) * 10
  ) / 10;
  const gunningFog = Math.round(
    Math.max(0, 0.4 * ((totalWords / totalSentences) + 100 * (complexWords / totalWords))) * 10
  ) / 10;

  return { fleschReadingEase, fleschKincaidGrade, gunningFog, avgSentenceLength, complexWordRatio, isCJKContent: false };
}

/**
 * CJK readability analysis using character-based metrics.
 * Flesch formula is meaningless for CJK — use sentence length and
 * character density as proxies for readability.
 */
function analyzeCJKReadability(text) {
  const sentences = text.split(/[.!?。！？\n]+/).filter((s) => s.trim().length > 0);
  if (sentences.length === 0) {
    return { fleschReadingEase: 50, fleschKincaidGrade: 0, gunningFog: 0, avgSentenceLength: 0, complexWordRatio: 0, isCJKContent: true };
  }

  // Average sentence length in characters (CJK standard: 20-40 chars is readable)
  const avgSentenceChars = sentences.reduce((sum, s) => sum + s.replace(/\s+/g, "").length, 0) / sentences.length;

  // Map to a 0-100 reading ease score:
  // < 20 chars/sentence = very easy (90+)
  // 20-35 = easy (60-90)
  // 35-50 = moderate (40-60)
  // > 50 = difficult (< 40)
  let readingEase;
  if (avgSentenceChars <= 20) {
    readingEase = 95;
  } else if (avgSentenceChars <= 35) {
    readingEase = Math.round(90 - (avgSentenceChars - 20) * 2);
  } else if (avgSentenceChars <= 50) {
    readingEase = Math.round(60 - (avgSentenceChars - 35) * 1.3);
  } else {
    readingEase = Math.max(10, Math.round(40 - (avgSentenceChars - 50) * 0.6));
  }

  // Estimate grade level from sentence length
  const grade = Math.round(Math.max(0, avgSentenceChars / 5 - 2) * 10) / 10;

  // Estimate word count for avgSentenceLength (for display compatibility)
  const avgSentenceLength = Math.round(avgSentenceChars / 1.5);

  return {
    fleschReadingEase: Math.min(100, Math.max(0, readingEase)),
    fleschKincaidGrade: grade,
    gunningFog: grade,
    avgSentenceLength,
    complexWordRatio: 0,
    isCJKContent: true,
  };
}

module.exports = { analyzeReadability, countSyllables, isCJK, countCJKWords };
