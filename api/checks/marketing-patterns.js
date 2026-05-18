// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (C) 2026 Lams IT Solutions
"use strict";

/**
 * Marketing language patterns for benefit/feature detection across 10 languages.
 * Used by marketing differentiation checks to classify copy as benefit-oriented
 * (outcome/result language) vs feature-oriented (spec/capability language).
 */

const SUPPORTED_LANGS = {
  en: "English",
  nl: "Dutch",
  fr: "French",
  de: "German",
  es: "Spanish",
  it: "Italian",
  pt: "Portuguese",
  ja: "Japanese",
  zh: "Chinese",
  ko: "Korean",
};

/**
 * Detect page language from pageData.lang attribute.
 * Normalizes regional variants (e.g. "nl-BE" → "nl").
 * Falls back to English when no lang tag is present.
 *
 * @param {object} pageData - page data with optional .lang property
 * @returns {{ lang: string, name: string, supported: boolean, noTag?: boolean }}
 */
function detectLang(pageData) {
  const raw = pageData && pageData.lang;

  if (!raw || raw === "") {
    return { lang: "en", name: "English", supported: true, noTag: true };
  }

  const base = raw.split("-")[0].toLowerCase();

  if (SUPPORTED_LANGS[base]) {
    return { lang: base, name: SUPPORTED_LANGS[base], supported: true };
  }

  return { lang: raw, name: raw, supported: false };
}

/**
 * Benefit/outcome patterns — words and phrases that indicate results,
 * outcomes, and value propositions rather than technical features.
 */
const BENEFIT_PATTERNS = {
  en: [
    "save", "increase", "reduce", "boost", "grow", "improve", "eliminate",
    "avoid", "achieve", "gain", "unlock", "maximize", "simplify", "accelerate",
    "transform", "enhance", "optimize", "streamline", "automate", "protect",
    "prevent", "guarantee", "double", "triple", "cut", "lower", "minimize",
    "free up", "reclaim", "recover", "retain", "generate", "earn", "deliver",
    "ensure", "empower", "enable", "scale", "outperform", "outrank",
    "you get", "you'll", "you can", "your business", "your team",
    "in minutes", "in seconds", "per month", "per year",
    "more time", "more money", "less time", "less stress", "less effort",
    "without hiring", "without coding", "no experience needed",
    "results", "outcome", "ROI", "profit", "revenue", "savings", "growth",
    "freedom", "peace of mind", "confidence", "control",
    "effortless", "proven", "trusted", "reliable", "fast",
    "affordable", "risk-free", "money-back", "no risk",
    "instant", "unlimited", "exclusive", "premium",
  ],

  nl: [
    "bespaar", "verhoog", "verminder", "verbeter", "groei", "vermijd",
    "bereik", "vereenvoudig", "versneld", "optimaliseer", "automatiseer",
    "bescherm", "voorkom", "garandeer", "verdubbel", "verdrievoudig",
    "verlaag", "minimaliseer", "herwin", "behoud", "genereer", "verdien",
    "lever", "versterk", "schaal", "overtreft",
    "u krijgt", "je krijgt", "u bespaart", "je bespaart",
    "uw bedrijf", "jouw bedrijf", "in minuten", "minder tijd", "meer tijd",
    "meer geld", "minder stress", "zonder personeel", "geen ervaring nodig",
    "resultaat", "resultaten", "opbrengst", "winst", "omzet", "besparing",
    "groei", "vrijheid", "gemoedsrust", "vertrouwen",
    "bewezen", "betrouwbaar", "snel", "betaalbaar", "risicovrij",
  ],

  fr: [
    "économisez", "augmentez", "réduisez", "améliorez", "évitez", "gagnez",
    "simplifiez", "accélérez", "optimisez", "automatisez", "protégez",
    "prévenez", "garantissez", "doublez", "triplez", "diminuez", "récupérez",
    "conservez", "générez", "assurez", "renforcez",
    "vous obtenez", "vous gagnez", "votre entreprise", "en minutes",
    "moins de temps", "plus de temps", "sans embaucher",
    "résultat", "résultats", "rendement", "bénéfice", "croissance",
    "liberté", "tranquillité", "confiance",
    "prouvé", "fiable", "rapide", "abordable", "sans risque",
    "instantané", "illimité", "exclusif", "premium",
  ],

  de: [
    "sparen", "steigern", "reduzieren", "verbessern", "vermeiden", "erreichen",
    "vereinfachen", "beschleunigen", "optimieren", "automatisieren", "schützen",
    "verhindern", "garantieren", "verdoppeln", "verdreifachen", "senken",
    "zurückgewinnen", "behalten", "generieren", "verdienen", "liefern",
    "sicherstellen", "stärken", "skalieren", "übertreffen",
    "Sie erhalten", "Sie sparen", "Ihr Unternehmen", "in Minuten",
    "weniger Zeit", "mehr Zeit", "mehr Geld", "weniger Stress",
    "Ergebnis", "Ergebnisse", "Rendite", "Gewinn", "Umsatz", "Wachstum",
    "Freiheit", "Vertrauen",
    "bewährt", "zuverlässig", "schnell", "erschwinglich", "risikofrei",
    "sofort", "unbegrenzt", "exklusiv", "Premium",
  ],

  es: [
    "ahorre", "aumente", "reduzca", "mejore", "evite", "logre",
    "simplifique", "acelere", "optimice", "automatice", "proteja",
    "prevenga", "garantice", "duplique", "triplique", "disminuya",
    "recupere", "conserve", "genere", "gane", "asegure",
    "usted obtiene", "su empresa", "en minutos", "menos tiempo", "más tiempo",
    "resultado", "resultados", "rendimiento", "beneficio", "crecimiento",
    "libertad", "confianza",
    "probado", "confiable", "rápido", "asequible", "sin riesgo",
    "instantáneo", "ilimitado", "exclusivo", "premium",
  ],

  it: [
    "risparmi", "aumenta", "riduci", "migliora", "evita", "raggiungi",
    "semplifica", "accelera", "ottimizza", "automatizza", "proteggi",
    "previeni", "garantisci", "raddoppia", "triplica", "diminuisci",
    "recupera", "conserva", "genera", "guadagna", "assicura", "ottieni",
    "la tua azienda", "in minuti", "meno tempo", "più tempo",
    "risultato", "risultati", "rendimento", "profitto", "crescita",
    "libertà", "fiducia",
    "provato", "affidabile", "veloce", "conveniente", "senza rischio",
    "istantaneo", "illimitato", "esclusivo", "premium",
  ],

  pt: [
    "economize", "aumente", "reduza", "melhore", "evite", "alcance",
    "simplifique", "acelere", "otimize", "automatize", "proteja",
    "previna", "garanta", "duplique", "triplique", "diminua", "recupere",
    "conserve", "gere", "ganhe", "assegure",
    "você obtém", "sua empresa", "em minutos", "menos tempo",
    "resultado", "resultados", "rendimento", "lucro", "crescimento",
    "liberdade", "confiança",
    "comprovado", "confiável", "rápido", "acessível", "sem risco",
    "instantâneo", "ilimitado", "exclusivo", "premium",
  ],

  ja: [
    "節約", "向上", "削減", "改善", "実現", "簡素化", "効率化",
    "できる", "を得る", "最大化", "最適化", "自動化", "保護", "防止",
    "保証", "倍増", "低減", "回復", "維持", "生成", "獲得",
    "結果", "成果", "収益", "利益", "売上", "成長", "安心",
    "お手伝い", "実現する", "届ける",
    "信頼", "高速", "手頃", "リスクなし", "即座に", "無制限",
  ],

  zh: [
    "节省", "提高", "减少", "改善", "实现", "简化", "提升",
    "获得", "最大化", "优化", "自动化", "保护", "防止", "保证",
    "翻倍", "降低", "恢复", "保持", "生成", "赚取",
    "结果", "成果", "收益", "利润", "收入", "增长", "安心",
    "帮助您", "让您",
    "可靠", "快速", "实惠", "无风险", "即时", "无限",
  ],

  ko: [
    "절약", "향상", "절감", "개선", "달성", "간소화",
    "얻으세요", "도와드립니다", "극대화", "최적화", "자동화",
    "보호", "방지", "보장", "두 배", "낮추다", "회복", "유지",
    "결과", "성과", "수익", "이익", "매출", "성장", "안심",
    "신뢰", "빠른", "저렴한", "위험 없는", "즉시", "무제한",
  ],
};

/**
 * Feature/spec patterns — words and phrases that indicate technical
 * capabilities, specifications, and implementation details.
 */
const FEATURE_PATTERNS = {
  en: [
    "built with", "powered by", "includes", "features", "supports",
    "compatible with", "integrates with", "utilizes", "equipped with",
    "comes with", "consists of", "runs on", "based on", "leverages",
    "uses", "requires", "specifications", "specs", "dimensions",
    "capacity", "bandwidth", "uptime", "SLA", "API", "SDK",
    "framework", "architecture", "infrastructure", "stack", "module",
    "plugin", "extension", "dashboard", "interface", "platform",
    "engine", "processor", "version", "configuration", "settings",
    "parameters", "encryption", "database", "storage", "resolution",
    "export", "import", "sync", "webhook", "endpoint",
  ],

  nl: [
    "gebouwd met", "aangedreven door", "bevat", "ondersteunt",
    "compatibel met", "integreert met", "uitgerust met", "bestaat uit",
    "draait op", "gebaseerd op", "vereist", "specificaties",
    "architectuur", "module", "dashboard", "interface", "platform",
    "versie", "configuratie", "instellingen", "database", "opslag",
  ],

  fr: [
    "construit avec", "alimenté par", "comprend", "supporte",
    "compatible avec", "intègre", "équipé de", "dispose de", "inclut",
    "basé sur", "nécessite", "spécifications", "architecture", "module",
    "tableau de bord", "interface", "plateforme", "version",
    "configuration", "base de données", "stockage",
  ],

  de: [
    "gebaut mit", "angetrieben von", "enthält", "unterstützt",
    "kompatibel mit", "integriert mit", "ausgestattet mit", "verfügt über",
    "basiert auf", "erfordert", "Spezifikationen", "Architektur",
    "Modul", "Dashboard", "Schnittstelle", "Plattform", "Version",
    "Konfiguration", "Datenbank", "Speicher",
  ],

  es: [
    "construido con", "impulsado por", "incluye", "soporta",
    "compatible con", "integra con", "equipado con", "cuenta con",
    "basado en", "requiere", "especificaciones", "arquitectura",
    "módulo", "panel de control", "interfaz", "plataforma", "versión",
    "configuración", "base de datos", "almacenamiento",
  ],

  it: [
    "costruito con", "alimentato da", "include", "supporta",
    "compatibile con", "integra con", "dotato di", "dispone di",
    "basato su", "richiede", "specifiche", "architettura", "modulo",
    "pannello di controllo", "interfaccia", "piattaforma", "versione",
    "configurazione", "database", "archiviazione",
  ],

  pt: [
    "construído com", "alimentado por", "inclui", "suporta",
    "compatível com", "integra com", "equipado com", "dispõe de",
    "baseado em", "requer", "especificações", "arquitetura", "módulo",
    "painel de controle", "interface", "plataforma", "versão",
    "configuração", "banco de dados", "armazenamento",
  ],

  ja: [
    "搭載", "対応", "互換性", "内蔵", "装備", "機能を備え", "含まれ",
    "で動作", "に基づく", "を使用", "仕様", "アーキテクチャ", "モジュール",
    "ダッシュボード", "インターフェース", "プラットフォーム", "バージョン",
    "設定", "データベース", "ストレージ",
  ],

  zh: [
    "搭载", "支持", "兼容", "内置", "配备", "包含", "采用",
    "基于", "使用", "需要", "规格", "架构", "模块",
    "仪表板", "界面", "平台", "版本", "配置", "数据库", "存储",
  ],

  ko: [
    "탑재", "지원", "호환", "내장", "포함", "갖추고", "기반",
    "사용", "필요", "사양", "아키텍처", "모듈", "대시보드",
    "인터페이스", "플랫폼", "버전", "구성", "데이터베이스", "스토리지",
  ],
};

/**
 * Quantification patterns — unit/outcome words that, combined with numbers,
 * indicate specific quantified claims (e.g. "30% faster", "1000+ customers").
 */
const QUANTIFICATION_PATTERNS = {
  en: [
    "hours", "minutes", "seconds", "days", "weeks", "months", "year", "years",
    "quarter", "percent", "percentage", "times", "fold", "dollar", "dollars",
    "euro", "euros", "pound", "customers", "clients", "users", "businesses",
    "companies", "employees", "members", "subscribers", "downloads", "leads",
    "conversions", "sales", "revenue", "profit", "savings", "projects",
    "faster", "slower", "more", "less", "fewer", "better", "worse", "higher",
    "lower", "bigger", "smaller", "larger", "shorter", "longer", "cheaper",
    "increase", "decrease", "reduction", "growth", "improvement", "boost",
    "gain", "rise", "decline", "drop", "cut", "saving", "ROI", "return",
    "margin", "rate", "ratio", "score", "efficiency", "productivity",
    "performance", "speed",
  ],
  nl: [
    "uur", "uren", "minuten", "dagen", "weken", "maanden", "jaar", "procent",
    "keer", "klanten", "gebruikers", "bedrijven", "medewerkers", "leden",
    "downloads", "leads", "conversies", "verkopen", "omzet", "winst",
    "besparing", "sneller", "meer", "minder", "beter", "hoger", "lager",
    "groter", "kleiner", "goedkoper", "toename", "afname", "groei",
    "verbetering", "stijging", "daling", "rendement", "marge", "efficiëntie",
    "productiviteit",
  ],
  fr: [
    "heures", "minutes", "jours", "semaines", "mois", "an", "pour cent",
    "fois", "clients", "utilisateurs", "entreprises", "employés", "membres",
    "téléchargements", "conversions", "ventes", "revenus", "bénéfice",
    "économie", "plus rapide", "plus", "moins", "mieux", "augmentation",
    "diminution", "réduction", "croissance", "amélioration", "rendement",
    "marge", "efficacité", "productivité",
  ],
  de: [
    "Stunden", "Minuten", "Tage", "Wochen", "Monate", "Jahr", "Prozent",
    "Mal", "Kunden", "Nutzer", "Unternehmen", "Mitarbeiter", "Mitglieder",
    "Downloads", "Konversionen", "Verkäufe", "Umsatz", "Gewinn", "Ersparnis",
    "schneller", "mehr", "weniger", "besser", "höher", "niedriger",
    "Steigerung", "Senkung", "Wachstum", "Verbesserung", "Rendite",
    "Effizienz", "Produktivität",
  ],
  es: [
    "horas", "minutos", "días", "semanas", "meses", "año", "por ciento",
    "veces", "clientes", "usuarios", "empresas", "empleados", "miembros",
    "descargas", "conversiones", "ventas", "ingresos", "beneficio", "ahorro",
    "más rápido", "más", "menos", "mejor", "aumento", "disminución",
    "reducción", "crecimiento", "mejora", "rendimiento", "eficiencia",
    "productividad",
  ],
  it: [
    "ore", "minuti", "giorni", "settimane", "mesi", "anno", "per cento",
    "volte", "clienti", "utenti", "aziende", "dipendenti", "membri",
    "download", "conversioni", "vendite", "fatturato", "profitto",
    "risparmio", "più veloce", "più", "meno", "meglio", "aumento",
    "diminuzione", "riduzione", "crescita", "miglioramento", "rendimento",
    "efficienza", "produttività",
  ],
  pt: [
    "horas", "minutos", "dias", "semanas", "meses", "ano", "por cento",
    "vezes", "clientes", "usuários", "empresas", "funcionários", "membros",
    "downloads", "conversões", "vendas", "receita", "lucro", "economia",
    "mais rápido", "mais", "menos", "melhor", "aumento", "diminuição",
    "redução", "crescimento", "melhoria", "rendimento", "eficiência",
    "produtividade",
  ],
  ja: [
    "時間", "分", "日", "週間", "ヶ月", "年", "倍", "以上", "以下", "社",
    "名", "ユーザー", "企業", "ダウンロード", "売上", "収益", "削減", "向上",
    "増加", "改善", "効率", "生産性",
  ],
  zh: [
    "小时", "分钟", "天", "周", "月", "年", "倍", "以上", "以下", "客户",
    "用户", "企业", "下载量", "销售", "收入", "减少", "提高", "增长", "改善",
    "效率",
  ],
  ko: [
    "시간", "분", "일", "주", "월", "년", "배", "이상", "이하", "고객",
    "사용자", "기업", "다운로드", "매출", "수익", "감소", "향상", "증가",
    "개선", "효율",
  ],
};

/**
 * Urgency patterns — time-pressure words and phrases that create
 * a sense of urgency to encourage immediate action.
 */
const URGENCY_PATTERNS = {
  en: [
    "limited time", "act now", "act fast", "don't miss", "don't wait",
    "hurry", "ends soon", "ending soon", "expires", "deadline",
    "last chance", "final chance", "before it's gone", "while it lasts",
    "today only", "now or never", "time is running out", "offer ends",
    "sale ends", "hours left", "days left", "closing soon", "don't delay",
    "secure your spot", "reserve now", "flash sale", "countdown",
    "24 hours", "48 hours", "last day", "final hours", "ending today",
    "early bird", "early access", "pre-launch", "launching soon",
    "coming soon",
  ],
  nl: [
    "beperkte tijd", "wees er snel bij", "mis het niet", "wacht niet",
    "schiet op", "eindigt binnenkort", "verloopt", "deadline",
    "laatste kans", "zolang de voorraad strekt", "alleen vandaag",
    "nu of nooit", "de tijd dringt", "aanbieding eindigt", "nog maar",
    "sluit binnenkort", "stel niet uit", "reserveer nu",
    "flash uitverkoop", "aftelling", "laatste dag", "eindigt vandaag",
    "vroegboekkorting", "binnenkort beschikbaar",
  ],
  fr: [
    "temps limité", "agissez maintenant", "ne manquez pas",
    "n'attendez pas", "dépêchez-vous", "se termine bientôt", "expire",
    "date limite", "dernière chance", "aujourd'hui seulement",
    "maintenant ou jamais", "le temps presse", "l'offre se termine",
    "ferme bientôt", "ne tardez pas", "réservez maintenant",
    "vente flash", "compte à rebours", "dernier jour",
    "se termine aujourd'hui", "tarif préférentiel", "accès anticipé",
    "bientôt disponible",
  ],
  de: [
    "begrenzte Zeit", "jetzt handeln", "nicht verpassen", "nicht warten",
    "beeilen Sie sich", "endet bald", "läuft ab", "Frist",
    "letzte Chance", "nur heute", "jetzt oder nie", "die Zeit läuft",
    "Angebot endet", "schließt bald", "nicht zögern",
    "jetzt reservieren", "Blitzangebot", "Countdown", "letzter Tag",
    "endet heute", "Frühbucher", "früher Zugang", "demnächst",
  ],
  es: [
    "tiempo limitado", "actúe ahora", "no se lo pierda", "no espere",
    "apúrese", "termina pronto", "expira", "fecha límite",
    "última oportunidad", "solo hoy", "ahora o nunca",
    "la oferta termina", "cierra pronto", "no demore", "reserve ahora",
    "venta relámpago", "cuenta regresiva", "último día",
    "termina hoy", "acceso anticipado", "próximamente",
  ],
  it: [
    "tempo limitato", "agisci ora", "non perdere", "non aspettare",
    "affrettati", "termina presto", "scade", "scadenza",
    "ultima occasione", "solo oggi", "ora o mai", "l'offerta scade",
    "chiude presto", "non tardare", "prenota ora", "vendita lampo",
    "conto alla rovescia", "ultimo giorno", "termina oggi",
    "accesso anticipato", "prossimamente",
  ],
  pt: [
    "tempo limitado", "aja agora", "não perca", "não espere", "corra",
    "termina em breve", "expira", "prazo", "última chance",
    "somente hoje", "agora ou nunca", "a oferta termina",
    "fecha em breve", "não demore", "reserve agora",
    "venda relâmpago", "contagem regressiva", "último dia",
    "termina hoje", "acesso antecipado", "em breve",
  ],
  ja: [
    "期間限定", "今すぐ", "お見逃しなく", "お急ぎください", "間もなく終了",
    "締め切り", "最後のチャンス", "本日限り", "残りわずか", "セール終了",
    "タイムセール", "カウントダウン", "最終日", "早期割引", "先行アクセス",
    "近日公開",
  ],
  zh: [
    "限时", "立即行动", "不要错过", "即将结束", "截止", "最后机会",
    "仅限今天", "优惠结束", "闪购", "倒计时", "最后一天", "早鸟价",
    "提前体验", "即将上线",
  ],
  ko: [
    "한정 시간", "지금 바로", "놓치지 마세요", "곧 종료", "마감",
    "마지막 기회", "오늘만", "혜택 종료", "타임 세일", "카운트다운",
    "마지막 날", "얼리버드", "사전 접근", "곧 출시",
  ],
};

/**
 * Scarcity patterns — limited-availability words and phrases that
 * create fear of missing out (FOMO).
 */
const SCARCITY_PATTERNS = {
  en: [
    "limited spots", "limited seats", "limited availability",
    "only X left", "few remaining", "selling fast", "almost gone",
    "almost sold out", "sold out", "out of stock", "low stock",
    "exclusive", "members only", "invite only", "waitlist",
    "first come first served", "one-time", "limited edition",
    "limited offer", "rare", "high demand", "popular", "bestseller",
    "most popular", "trending", "top rated", "VIP", "premium access",
    "exclusive access", "fully booked", "nearly full", "filling up",
  ],
  nl: [
    "beperkte plaatsen", "beperkte beschikbaarheid", "bijna uitverkocht",
    "uitverkocht", "lage voorraad", "exclusief", "alleen voor leden",
    "wachtlijst", "wie het eerst komt", "gelimiteerde editie",
    "beperkt aanbod", "zeldzaam", "grote vraag", "populair",
    "bestseller", "VIP", "bijna vol", "volgeboekt",
  ],
  fr: [
    "places limitées", "disponibilité limitée", "presque épuisé",
    "épuisé", "stock faible", "exclusif", "réservé aux membres",
    "liste d'attente", "premier arrivé premier servi",
    "édition limitée", "offre limitée", "rare", "forte demande",
    "populaire", "meilleures ventes", "VIP", "complet",
    "presque complet",
  ],
  de: [
    "begrenzte Plätze", "begrenzte Verfügbarkeit", "fast ausverkauft",
    "ausverkauft", "geringer Bestand", "exklusiv",
    "nur für Mitglieder", "Warteliste", "wer zuerst kommt",
    "limitierte Auflage", "begrenztes Angebot", "selten",
    "hohe Nachfrage", "beliebt", "Bestseller", "VIP", "ausgebucht",
    "fast voll",
  ],
  es: [
    "plazas limitadas", "disponibilidad limitada", "casi agotado",
    "agotado", "stock bajo", "exclusivo", "solo para miembros",
    "lista de espera", "edición limitada", "oferta limitada", "raro",
    "alta demanda", "popular", "más vendido", "VIP", "completo",
    "casi completo",
  ],
  it: [
    "posti limitati", "disponibilità limitata", "quasi esaurito",
    "esaurito", "scorte basse", "esclusivo", "solo per membri",
    "lista d'attesa", "edizione limitata", "offerta limitata", "raro",
    "alta domanda", "popolare", "più venduto", "VIP", "al completo",
    "quasi al completo",
  ],
  pt: [
    "vagas limitadas", "disponibilidade limitada", "quase esgotado",
    "esgotado", "estoque baixo", "exclusivo", "apenas para membros",
    "lista de espera", "edição limitada", "oferta limitada", "raro",
    "alta demanda", "popular", "mais vendido", "VIP", "lotado",
    "quase lotado",
  ],
  ja: [
    "残席わずか", "数量限定", "在庫わずか", "完売", "品切れ", "限定",
    "会員限定", "先着順", "限定版", "希少", "人気", "ベストセラー", "VIP",
    "満席間近",
  ],
  zh: [
    "名额有限", "数量有限", "即将售罄", "已售罄", "独家", "会员专享",
    "先到先得", "限量版", "稀缺", "热门", "畅销", "VIP", "即将满员",
  ],
  ko: [
    "한정 수량", "재고 한정", "거의 매진", "매진", "품절", "독점",
    "회원 전용", "선착순", "한정판", "희귀", "인기", "베스트셀러", "VIP",
    "거의 만석",
  ],
};

/**
 * Emotional patterns — words and phrases organized by emotional trigger
 * category: trust, exclusivity, curiosity, empowerment.
 */
const EMOTIONAL_PATTERNS = {
  en: {
    trust: [
      "guaranteed", "guarantee", "proven", "certified", "verified",
      "authentic", "official", "secure", "safe", "protected", "risk-free",
      "money-back", "warranty", "trusted", "reliable", "no obligation",
      "no commitment", "cancel anytime", "worry-free", "hassle-free",
      "stress-free",
    ],
    exclusivity: [
      "exclusive", "premium", "elite", "luxury", "ultimate", "superior",
      "world-class", "high-end", "deluxe", "bespoke", "custom", "tailored",
      "personalized", "handcrafted", "curated", "signature", "cutting-edge",
      "revolutionary", "innovative", "pioneering", "insider", "secret",
      "hidden", "first look", "early access", "unlock", "reveal",
      "discover", "you deserve",
    ],
    curiosity: [
      "secret", "secrets", "surprising", "unexpected", "little-known",
      "you won't believe", "the truth about", "hidden", "revealed",
      "shocking", "mind-blowing", "remarkable", "extraordinary",
      "incredible", "fascinating", "mysterious", "myth", "debunked",
      "misconception", "mistake", "mistakes", "trap", "pitfall", "warning",
      "hack", "hacks", "trick", "tricks", "tip", "tips", "pro tip",
      "cheat sheet", "shortcut", "blueprint", "playbook", "formula",
      "framework", "method", "strategy", "step-by-step", "guide",
      "roadmap", "checklist", "template", "toolkit", "case study",
      "behind the scenes", "finally",
    ],
    empowerment: [
      "easy", "simple", "effortless", "seamless", "intuitive",
      "no experience needed", "anyone can", "free", "free trial",
      "no cost", "zero cost", "bonus", "extra", "included", "all-in-one",
      "everything you need", "ready-made", "done-for-you", "turnkey",
      "plug and play", "instant", "immediate", "quick", "fast",
      "in minutes", "in seconds", "24/7", "always", "forever", "lifetime",
      "unlimited", "endless", "powerful", "robust", "comprehensive",
      "complete", "essential", "must-have", "game-changer", "life-changing",
      "transformative", "massive", "legendary",
    ],
  },
  nl: {
    trust: [
      "gegarandeerd", "garantie", "bewezen", "gecertificeerd",
      "geverifieerd", "authentiek", "officieel", "veilig", "beschermd",
      "risicovrij", "geld-terug", "garantie", "betrouwbaar",
      "geen verplichting", "altijd opzegbaar", "zorgeloos",
    ],
    exclusivity: [
      "exclusief", "premium", "elite", "luxe", "ultieme", "superieur",
      "wereldklasse", "high-end", "op maat", "gepersonaliseerd",
      "handgemaakt", "innovatief", "baanbrekend", "insider", "geheim",
      "eerste blik", "vroege toegang", "ontgrendel", "ontdek",
      "u verdient",
    ],
    curiosity: [
      "geheim", "geheimen", "verrassend", "onverwacht", "weinig bekend",
      "de waarheid over", "verborgen", "onthuld", "opmerkelijk",
      "ongelooflijk", "fascinerend", "mythe", "misvatting", "fout",
      "fouten", "valkuil", "waarschuwing", "hack", "truc", "trucs",
      "tip", "tips", "spiekbriefje", "snelkoppeling", "blauwdruk",
      "stappenplan", "gids", "checklist", "sjabloon",
    ],
    empowerment: [
      "eenvoudig", "simpel", "moeiteloos", "naadloos", "intuïtief",
      "geen ervaring nodig", "iedereen kan", "gratis", "gratis proefperiode",
      "geen kosten", "bonus", "extra", "inbegrepen", "alles-in-één",
      "alles wat je nodig hebt", "kant-en-klaar", "direct", "snel",
      "in minuten", "24/7", "altijd", "levenslang", "onbeperkt",
      "krachtig", "uitgebreid", "compleet", "essentieel", "must-have",
    ],
  },
  fr: {
    trust: [
      "garanti", "garantie", "prouvé", "certifié", "vérifié",
      "authentique", "officiel", "sécurisé", "sûr", "protégé",
      "sans risque", "satisfait ou remboursé", "garantie", "fiable",
      "sans obligation", "sans engagement", "résiliable à tout moment",
      "sans souci",
    ],
    exclusivity: [
      "exclusif", "premium", "élite", "luxe", "ultime", "supérieur",
      "de classe mondiale", "haut de gamme", "sur mesure", "personnalisé",
      "artisanal", "innovant", "révolutionnaire", "pionnier", "initié",
      "secret", "premier aperçu", "accès anticipé", "débloquer",
      "découvrir", "vous méritez",
    ],
    curiosity: [
      "secret", "secrets", "surprenant", "inattendu", "peu connu",
      "la vérité sur", "caché", "révélé", "remarquable", "incroyable",
      "fascinant", "mythe", "idée reçue", "erreur", "erreurs", "piège",
      "avertissement", "astuce", "astuces", "conseil", "conseils",
      "aide-mémoire", "raccourci", "plan", "méthode", "stratégie",
      "étape par étape", "guide", "feuille de route", "checklist",
      "modèle",
    ],
    empowerment: [
      "facile", "simple", "sans effort", "intuitif", "sans expérience",
      "tout le monde peut", "gratuit", "essai gratuit", "sans frais",
      "bonus", "extra", "inclus", "tout-en-un", "tout ce dont vous avez besoin",
      "clé en main", "instantané", "immédiat", "rapide", "en minutes",
      "24/7", "toujours", "à vie", "illimité", "puissant", "complet",
      "essentiel", "indispensable", "révolutionnaire",
    ],
  },
  de: {
    trust: [
      "garantiert", "Garantie", "bewährt", "zertifiziert", "verifiziert",
      "authentisch", "offiziell", "sicher", "geschützt", "risikofrei",
      "Geld-zurück", "Garantie", "zuverlässig", "keine Verpflichtung",
      "jederzeit kündbar", "sorgenfrei",
    ],
    exclusivity: [
      "exklusiv", "Premium", "Elite", "Luxus", "ultimativ", "überlegen",
      "Weltklasse", "High-End", "maßgeschneidert", "personalisiert",
      "handgefertigt", "innovativ", "revolutionär", "bahnbrechend",
      "Insider", "Geheimnis", "erster Blick", "früher Zugang",
      "freischalten", "entdecken", "Sie verdienen",
    ],
    curiosity: [
      "Geheimnis", "Geheimnisse", "überraschend", "unerwartet",
      "wenig bekannt", "die Wahrheit über", "verborgen", "enthüllt",
      "bemerkenswert", "unglaublich", "faszinierend", "Mythos",
      "Irrtum", "Fehler", "Falle", "Warnung", "Hack", "Trick",
      "Tricks", "Tipp", "Tipps", "Spickzettel", "Abkürzung",
      "Bauplan", "Methode", "Strategie", "Schritt für Schritt",
      "Leitfaden", "Checkliste", "Vorlage",
    ],
    empowerment: [
      "einfach", "simpel", "mühelos", "nahtlos", "intuitiv",
      "keine Erfahrung nötig", "jeder kann", "kostenlos",
      "kostenlose Testversion", "ohne Kosten", "Bonus", "extra",
      "inklusive", "alles in einem", "alles was Sie brauchen",
      "schlüsselfertig", "sofort", "schnell", "in Minuten", "24/7",
      "immer", "lebenslang", "unbegrenzt", "leistungsstark",
      "umfassend", "komplett", "essentiell", "unverzichtbar",
    ],
  },
  es: {
    trust: [
      "garantizado", "garantía", "probado", "certificado", "verificado",
      "auténtico", "oficial", "seguro", "protegido", "sin riesgo",
      "devolución", "confiable", "sin obligación", "sin compromiso",
      "cancele cuando quiera", "sin preocupaciones",
    ],
    exclusivity: [
      "exclusivo", "premium", "élite", "lujo", "definitivo", "superior",
      "de clase mundial", "alta gama", "a medida", "personalizado",
      "artesanal", "innovador", "revolucionario", "pionero", "secreto",
      "primer vistazo", "acceso anticipado", "desbloquear", "descubrir",
      "usted merece",
    ],
    curiosity: [
      "secreto", "secretos", "sorprendente", "inesperado", "poco conocido",
      "la verdad sobre", "oculto", "revelado", "notable", "increíble",
      "fascinante", "mito", "error", "errores", "trampa",
      "advertencia", "truco", "trucos", "consejo", "consejos",
      "atajo", "método", "estrategia", "paso a paso", "guía",
      "hoja de ruta", "checklist", "plantilla",
    ],
    empowerment: [
      "fácil", "simple", "sin esfuerzo", "intuitivo", "sin experiencia",
      "cualquiera puede", "gratis", "prueba gratuita", "sin costo",
      "bono", "extra", "incluido", "todo en uno",
      "todo lo que necesita", "llave en mano", "instantáneo",
      "inmediato", "rápido", "en minutos", "24/7", "siempre",
      "de por vida", "ilimitado", "potente", "completo", "esencial",
      "imprescindible",
    ],
  },
  it: {
    trust: [
      "garantito", "garanzia", "provato", "certificato", "verificato",
      "autentico", "ufficiale", "sicuro", "protetto", "senza rischio",
      "soddisfatti o rimborsati", "affidabile", "senza obbligo",
      "senza impegno", "cancella quando vuoi", "senza pensieri",
    ],
    exclusivity: [
      "esclusivo", "premium", "élite", "lusso", "definitivo", "superiore",
      "di classe mondiale", "alta gamma", "su misura", "personalizzato",
      "artigianale", "innovativo", "rivoluzionario", "pionieristico",
      "segreto", "primo sguardo", "accesso anticipato", "sbloccare",
      "scoprire", "te lo meriti",
    ],
    curiosity: [
      "segreto", "segreti", "sorprendente", "inaspettato",
      "poco conosciuto", "la verità su", "nascosto", "rivelato",
      "notevole", "incredibile", "affascinante", "mito", "errore",
      "errori", "trappola", "avvertimento", "trucco", "trucchi",
      "consiglio", "consigli", "scorciatoia", "metodo", "strategia",
      "passo dopo passo", "guida", "checklist", "modello",
    ],
    empowerment: [
      "facile", "semplice", "senza sforzo", "intuitivo",
      "senza esperienza", "chiunque può", "gratuito", "prova gratuita",
      "senza costi", "bonus", "extra", "incluso", "tutto in uno",
      "tutto ciò di cui hai bisogno", "chiavi in mano", "istantaneo",
      "immediato", "veloce", "in pochi minuti", "24/7", "sempre",
      "a vita", "illimitato", "potente", "completo", "essenziale",
      "indispensabile",
    ],
  },
  pt: {
    trust: [
      "garantido", "garantia", "comprovado", "certificado", "verificado",
      "autêntico", "oficial", "seguro", "protegido", "sem risco",
      "devolução", "confiável", "sem obrigação", "sem compromisso",
      "cancele quando quiser", "sem preocupações",
    ],
    exclusivity: [
      "exclusivo", "premium", "elite", "luxo", "definitivo", "superior",
      "classe mundial", "alto padrão", "sob medida", "personalizado",
      "artesanal", "inovador", "revolucionário", "pioneiro", "segredo",
      "primeira olhada", "acesso antecipado", "desbloquear",
      "descobrir", "você merece",
    ],
    curiosity: [
      "segredo", "segredos", "surpreendente", "inesperado",
      "pouco conhecido", "a verdade sobre", "escondido", "revelado",
      "notável", "incrível", "fascinante", "mito", "erro", "erros",
      "armadilha", "aviso", "truque", "truques", "dica", "dicas",
      "atalho", "método", "estratégia", "passo a passo", "guia",
      "roteiro", "checklist", "modelo",
    ],
    empowerment: [
      "fácil", "simples", "sem esforço", "intuitivo", "sem experiência",
      "qualquer um pode", "grátis", "teste grátis", "sem custo",
      "bônus", "extra", "incluído", "tudo em um",
      "tudo que você precisa", "pronto para usar", "instantâneo",
      "imediato", "rápido", "em minutos", "24/7", "sempre",
      "vitalício", "ilimitado", "poderoso", "completo", "essencial",
      "indispensável",
    ],
  },
  ja: {
    trust: [
      "保証付き", "保証", "実証済み", "認定", "認証", "公式", "安全",
      "安心", "リスクなし", "返金保証", "信頼", "義務なし", "いつでも解約",
    ],
    exclusivity: [
      "限定", "プレミアム", "最高級", "究極", "ワールドクラス", "オーダーメイド",
      "カスタム", "革新的", "画期的", "先行公開", "先行アクセス",
      "解放", "発見",
    ],
    curiosity: [
      "秘密", "驚きの", "意外な", "知られていない", "真実", "隠された",
      "明かされた", "驚異的", "信じられない", "神話", "誤解", "間違い",
      "罠", "裏技", "コツ", "ヒント", "近道", "方法", "戦略",
      "ステップバイステップ", "ガイド", "チェックリスト",
    ],
    empowerment: [
      "簡単", "シンプル", "手軽", "直感的", "経験不要", "誰でも",
      "無料", "無料トライアル", "コストゼロ", "ボーナス", "含まれる",
      "オールインワン", "即座に", "すぐに", "数分で", "24時間",
      "無制限", "パワフル", "包括的", "必須",
    ],
  },
  zh: {
    trust: [
      "保证", "已验证", "认证", "官方", "安全", "无风险", "退款保证",
      "可靠", "无义务", "随时取消", "无忧",
    ],
    exclusivity: [
      "独家", "高端", "至尊", "定制", "个性化", "创新", "革命性",
      "开创性", "抢先体验", "解锁", "发现",
    ],
    curiosity: [
      "秘密", "令人惊讶", "意想不到", "鲜为人知", "真相", "隐藏",
      "揭示", "不可思议", "神话", "误区", "错误", "陷阱", "技巧",
      "窍门", "捷径", "方法", "策略", "指南", "清单",
    ],
    empowerment: [
      "简单", "轻松", "直观", "无需经验", "任何人都能", "免费",
      "免费试用", "零成本", "奖励", "包含", "一体化", "即时",
      "快速", "几分钟内", "全天候", "无限", "强大", "全面", "必备",
    ],
  },
  ko: {
    trust: [
      "보장", "검증된", "인증", "공식", "안전", "위험 없는", "환불 보장",
      "신뢰할 수 있는", "의무 없음", "언제든 해지", "걱정 없는",
    ],
    exclusivity: [
      "독점", "프리미엄", "최고급", "맞춤형", "개인화", "혁신적",
      "획기적", "선행 접근", "잠금 해제", "발견",
    ],
    curiosity: [
      "비밀", "놀라운", "예상 밖의", "잘 알려지지 않은", "진실", "숨겨진",
      "공개된", "놀라운", "신화", "오해", "실수", "함정", "꿀팁",
      "비결", "지름길", "방법", "전략", "가이드", "체크리스트",
    ],
    empowerment: [
      "쉬운", "간단한", "손쉬운", "직관적", "경험 불필요", "누구나",
      "무료", "무료 체험", "비용 없음", "보너스", "포함", "올인원",
      "즉시", "빠른", "몇 분 만에", "연중무휴", "무제한", "강력한",
      "포괄적", "필수",
    ],
  },
};

/**
 * Headline patterns — regex patterns for detecting headline types
 * (number-led lists, how-to, questions, outcome-driven, comparisons).
 */
const HEADLINE_PATTERNS = {
  en: {
    numberLed: /^\d+\s+(ways|reasons|tips|tricks|steps|secrets|mistakes|signs|facts|things|ideas|strategies|methods|tools|examples|benefits|lessons|hacks|rules|habits|principles|questions|myths|trends)\b/i,
    howTo: /^how\s+to\b/i,
    question: [
      /^(what|how|why|when|where|which|can|does|is|are|do|will|should)\b/i,
    ],
    outcomeDriven: /^(get|achieve|build|create|grow|boost|double|triple|master|launch|start|earn|save|win|unlock|discover|transform|crush|dominate|scale|maximize|optimize|eliminate|stop|avoid|prevent|overcome|fix|solve)\b/i,
    comparison: [/\bvs\.?\b/i, /\bversus\b/i, /\balternatives?\s+to\b/i, /\bdifference between\b/i, /\bcompared to\b/i, /\bbetter than\b/i],
  },
  nl: {
    numberLed: /^\d+\s+(manieren|redenen|tips|trucs|stappen|geheimen|fouten|tekenen|feiten|dingen|ideeën|strategieën|methoden|voorbeelden|voordelen|lessen|regels)\b/i,
    howTo: /^hoe\s+(je|u|men|we)\b/i,
    question: [/^(wat|hoe|waarom|wanneer|waar|welke|kan|is|zijn)\b/i],
    outcomeDriven: /^(krijg|bereik|bouw|maak|groei|verhoog|verdubbel|beheers|lanceer|start|verdien|bespaar|win|ontgrendel|ontdek|transformeer|domineer|schaal|maximaliseer|optimaliseer|elimineer|stop|vermijd|voorkom|overwin|los op|verbeter)\b/i,
    comparison: [/\bvs\.?\b/i, /\bversus\b/i, /\balternatie(f|ven)\s+voor\b/i, /\bverschil tussen\b/i, /\bvergeleken met\b/i, /\bbeter dan\b/i],
  },
  fr: {
    numberLed: /^\d+\s+(façons|raisons|conseils|astuces|étapes|secrets|erreurs|signes|faits|choses|idées|stratégies|méthodes|outils|exemples|avantages|leçons|règles|tendances)\b/i,
    howTo: /^comment\s/i,
    question: [/^(que|quoi|comment|pourquoi|quand|où|quel|quelle|quels|quelles|est-ce que|peut-on)\b/i],
    outcomeDriven: /^(obtenez|atteignez|construisez|créez|développez|boostez|doublez|triplez|maîtrisez|lancez|commencez|gagnez|économisez|débloquez|découvrez|transformez|dominez|optimisez|éliminez|arrêtez|évitez|prévenez|résolvez|améliorez)\b/i,
    comparison: [/\bvs\.?\b/i, /\bversus\b/i, /\balternatives?\s+à\b/i, /\bdifférence entre\b/i, /\bcomparé à\b/i, /\bmieux que\b/i],
  },
  de: {
    numberLed: /^\d+\s+(Wege|Gründe|Tipps|Tricks|Schritte|Geheimnisse|Fehler|Zeichen|Fakten|Dinge|Ideen|Strategien|Methoden|Werkzeuge|Beispiele|Vorteile|Lektionen|Regeln|Trends)\b/i,
    howTo: /^wie\s+(man|Sie|du)\b/i,
    question: [/^(was|wie|warum|wann|wo|welche|welcher|welches|kann|ist|sind)\b/i],
    outcomeDriven: /^(erreichen|bauen|erstellen|wachsen|steigern|verdoppeln|verdreifachen|meistern|starten|verdienen|sparen|gewinnen|freischalten|entdecken|transformieren|dominieren|skalieren|maximieren|optimieren|eliminieren|stoppen|vermeiden|verhindern|überwinden|lösen|verbessern)\b/i,
    comparison: [/\bvs\.?\b/i, /\bversus\b/i, /\bAlternative(n)?\s+zu\b/i, /\bUnterschied zwischen\b/i, /\bverglichen mit\b/i, /\bbesser als\b/i],
  },
  es: {
    numberLed: /^\d+\s+(formas|razones|consejos|trucos|pasos|secretos|errores|señales|hechos|cosas|ideas|estrategias|métodos|herramientas|ejemplos|beneficios|lecciones|reglas|tendencias)\b/i,
    howTo: /^cómo\s/i,
    question: [/^(qué|cómo|por qué|cuándo|dónde|cuál|cuáles|puede|es|son)\b/i],
    outcomeDriven: /^(obtenga|logre|construya|cree|crezca|aumente|duplique|triplique|domine|lance|comience|gane|ahorre|desbloquee|descubra|transforme|escale|maximice|optimice|elimine|detenga|evite|prevenga|supere|resuelva|mejore)\b/i,
    comparison: [/\bvs\.?\b/i, /\bversus\b/i, /\balternativas?\s+a\b/i, /\bdiferencia entre\b/i, /\bcomparado con\b/i, /\bmejor que\b/i],
  },
  it: {
    numberLed: /^\d+\s+(modi|ragioni|consigli|trucchi|passi|segreti|errori|segni|fatti|cose|idee|strategie|metodi|strumenti|esempi|vantaggi|lezioni|regole|tendenze)\b/i,
    howTo: /^come\s/i,
    question: [/^(cosa|come|perché|quando|dove|quale|quali|può|è|sono)\b/i],
    outcomeDriven: /^(ottieni|raggiungi|costruisci|crea|cresci|aumenta|raddoppia|triplica|padroneggia|lancia|inizia|guadagna|risparmia|sblocca|scopri|trasforma|domina|scala|massimizza|ottimizza|elimina|ferma|evita|previeni|supera|risolvi|migliora)\b/i,
    comparison: [/\bvs\.?\b/i, /\bversus\b/i, /\balternative?\s+a\b/i, /\bdifferenza tra\b/i, /\bconfrontato con\b/i, /\bmeglio di\b/i],
  },
  pt: {
    numberLed: /^\d+\s+(formas|razões|dicas|truques|passos|segredos|erros|sinais|fatos|coisas|ideias|estratégias|métodos|ferramentas|exemplos|benefícios|lições|regras|tendências)\b/i,
    howTo: /^como\s/i,
    question: [/^(o que|como|por que|quando|onde|qual|quais|pode|é|são)\b/i],
    outcomeDriven: /^(obtenha|alcance|construa|crie|cresça|aumente|duplique|triplique|domine|lance|comece|ganhe|economize|desbloqueie|descubra|transforme|escale|maximize|otimize|elimine|pare|evite|previna|supere|resolva|melhore)\b/i,
    comparison: [/\bvs\.?\b/i, /\bversus\b/i, /\balternativas?\s+para\b/i, /\bdiferença entre\b/i, /\bcomparado com\b/i, /\bmelhor que\b/i],
  },
  ja: {
    numberLed: /^\d+\s*(つの|個の|選|の)(方法|理由|コツ|ヒント|ステップ|秘訣|間違い|事実|アイデア|戦略|メリット|ルール|トレンド)/i,
    howTo: /の(方法|やり方|仕方|手順|コツ)/i,
    question: [/^(なぜ|どう|何|いつ|どこ|どの|どれ)/i, /とは[？?]?$/i, /か[？?]$/i],
    outcomeDriven: /^(実現|達成|構築|作成|成長|向上|倍増|習得|開始|獲得|節約|解放|発見|変革|最大化|最適化|排除|防止|克服|解決|改善)/i,
    comparison: [/\bvs\.?\b/i, /と.*の(違い|比較)/i, /より(良い|優れた)/i],
  },
  zh: {
    numberLed: /^\d+\s*(个|种|条|大)(方法|理由|技巧|步骤|秘诀|错误|事实|想法|策略|好处|规则|趋势)/i,
    howTo: /^如何/i,
    question: [/^(为什么|怎么|什么|何时|哪里|哪个|是否)/i, /[？?]$/i],
    outcomeDriven: /^(实现|达成|构建|创建|增长|提升|翻倍|掌握|启动|开始|赚取|节省|解锁|发现|变革|最大化|优化|消除|停止|避免|预防|克服|解决|改善)/i,
    comparison: [/\bvs\.?\b/i, /与.*的(区别|比较)/i, /比.*更/i],
  },
  ko: {
    numberLed: /^\d+\s*(가지|개의?)\s*(방법|이유|팁|단계|비밀|실수|사실|아이디어|전략|장점|규칙|트렌드)/i,
    howTo: /하는\s*(방법|법)/i,
    question: [/^(왜|어떻게|무엇|언제|어디|어떤|할 수)/i, /[？?]$/i],
    outcomeDriven: /^(달성|구축|만들기|성장|향상|두 배|마스터|시작|획득|절약|해제|발견|변혁|최대화|최적화|제거|중단|방지|극복|해결|개선)/i,
    comparison: [/\bvs\.?\b/i, /와.*의?\s*(차이|비교)/i, /보다\s*(나은|좋은|우수한)/i],
  },
};

/**
 * Offering patterns — words and phrases that indicate value propositions,
 * product/service descriptions, and what a business offers.
 */
const OFFERING_PATTERNS = {
  en: [
    "we help", "we make", "we build", "we provide", "we offer",
    "we deliver", "we create", "we design", "we enable", "we empower",
    "we connect", "we simplify", "we automate", "we transform",
    "we solve", "we protect", "we manage", "our platform", "our tool",
    "our service", "our solution", "our product", "our software",
    "our app", "is a", "is the", "is your", "the only", "the first",
    "the fastest", "the easiest", "the best", "the leading",
    "platform for", "tool for", "solution for", "service for",
    "helps you", "lets you", "allows you", "enables you",
    "makes it easy", "designed for", "built for", "made for",
    "created for",
  ],
  nl: [
    "wij helpen", "we maken", "we bouwen", "we bieden", "we leveren",
    "we creëren", "we ontwerpen", "we verbinden", "we vereenvoudigen",
    "ons platform", "onze tool", "onze dienst", "onze oplossing",
    "ons product", "onze software", "is een", "is de", "is uw",
    "de enige", "de eerste", "de snelste", "de beste", "platform voor",
    "oplossing voor", "helpt je", "helpt u", "maakt het makkelijk",
    "ontworpen voor", "gebouwd voor", "gemaakt voor",
  ],
  fr: [
    "nous aidons", "nous créons", "nous offrons", "nous fournissons",
    "nous livrons", "nous concevons", "nous connectons",
    "nous simplifions", "nous automatisons", "notre plateforme",
    "notre outil", "notre service", "notre solution", "notre produit",
    "notre logiciel", "est un", "est le", "est votre", "le seul",
    "le premier", "le plus rapide", "le meilleur", "plateforme pour",
    "solution pour", "vous aide", "vous permet", "conçu pour",
    "construit pour", "créé pour",
  ],
  de: [
    "wir helfen", "wir erstellen", "wir bieten", "wir liefern",
    "wir gestalten", "wir verbinden", "wir vereinfachen",
    "wir automatisieren", "unsere Plattform", "unser Tool",
    "unser Service", "unsere Lösung", "unser Produkt",
    "unsere Software", "ist ein", "ist die", "ist Ihr", "die einzige",
    "die erste", "die schnellste", "die beste", "Plattform für",
    "Lösung für", "hilft Ihnen", "ermöglicht Ihnen", "entwickelt für",
    "gebaut für", "gemacht für",
  ],
  es: [
    "ayudamos", "creamos", "ofrecemos", "proporcionamos", "entregamos",
    "diseñamos", "conectamos", "simplificamos", "automatizamos",
    "nuestra plataforma", "nuestra herramienta", "nuestro servicio",
    "nuestra solución", "nuestro producto", "nuestro software",
    "es un", "es el", "es su", "el único", "el primero", "el más rápido",
    "el mejor", "plataforma para", "solución para", "le ayuda",
    "le permite", "diseñado para", "construido para", "creado para",
  ],
  it: [
    "aiutiamo", "creiamo", "offriamo", "forniamo", "consegniamo",
    "progettiamo", "colleghiamo", "semplifichiamo", "automatizziamo",
    "la nostra piattaforma", "il nostro strumento", "il nostro servizio",
    "la nostra soluzione", "il nostro prodotto", "il nostro software",
    "è un", "è il", "è il tuo", "l'unico", "il primo", "il più veloce",
    "il migliore", "piattaforma per", "soluzione per", "ti aiuta",
    "ti permette", "progettato per", "costruito per", "creato per",
  ],
  pt: [
    "ajudamos", "criamos", "oferecemos", "fornecemos", "entregamos",
    "projetamos", "conectamos", "simplificamos", "automatizamos",
    "nossa plataforma", "nossa ferramenta", "nosso serviço",
    "nossa solução", "nosso produto", "nosso software", "é um",
    "é o", "é seu", "o único", "o primeiro", "o mais rápido",
    "o melhor", "plataforma para", "solução para", "ajuda você",
    "permite que você", "projetado para", "construído para",
    "criado para",
  ],
  ja: [
    "私たちは", "を提供", "を実現", "を支援", "を構築", "を設計",
    "を自動化", "を簡素化", "当社のプラットフォーム", "当社のツール",
    "当社のサービス", "当社のソリューション", "当社の製品", "唯一の",
    "初の", "最速の", "最高の", "のためのプラットフォーム",
    "のためのソリューション", "を可能にする", "のために設計",
  ],
  zh: [
    "我们帮助", "我们提供", "我们创建", "我们构建", "我们设计",
    "我们自动化", "我们简化", "我们的平台", "我们的工具", "我们的服务",
    "我们的解决方案", "我们的产品", "唯一的", "第一个", "最快的",
    "最好的", "平台", "解决方案", "帮助您", "让您",
    "专为", "为您打造",
  ],
  ko: [
    "우리는 돕습니다", "우리는 제공합니다", "우리는 만듭니다",
    "우리는 구축합니다", "우리는 설계합니다", "우리의 플랫폼",
    "우리의 도구", "우리의 서비스", "우리의 솔루션", "우리의 제품",
    "유일한", "최초의", "가장 빠른", "최고의", "플랫폼",
    "솔루션", "도와드립니다", "가능하게 합니다", "위해 설계",
    "위해 구축",
  ],
};

/**
 * Audience patterns — words and phrases that indicate target audience
 * segments and who a product/service is designed for.
 */
const AUDIENCE_PATTERNS = {
  en: [
    "for startups", "for teams", "for developers", "for marketers",
    "for agencies", "for freelancers", "for creators", "for founders",
    "for entrepreneurs", "for small business", "for enterprise",
    "for ecommerce", "for saas", "for professionals", "for beginners",
    "for experts", "for designers", "for coaches", "for consultants",
    "for students", "for educators", "for healthcare", "for real estate",
    "for restaurants", "for B2B", "for B2C", "for companies",
    "for organizations", "for brands", "whether you're", "if you're a",
    "perfect for", "ideal for", "built for", "designed for", "made for",
    "who want", "who need", "who struggle", "looking to", "trying to",
    "ready to",
  ],
  nl: [
    "voor startups", "voor teams", "voor ontwikkelaars",
    "voor marketeers", "voor bureaus", "voor freelancers",
    "voor ondernemers", "voor mkb", "voor enterprise",
    "voor professionals", "voor beginners", "voor B2B",
    "voor bedrijven", "of je nu", "als je een", "perfect voor",
    "ideaal voor", "gebouwd voor", "ontworpen voor", "die willen",
    "die nodig hebben", "op zoek naar",
  ],
  fr: [
    "pour les startups", "pour les équipes", "pour les développeurs",
    "pour les marketeurs", "pour les agences", "pour les freelances",
    "pour les créateurs", "pour les entrepreneurs", "pour les PME",
    "pour les entreprises", "pour les professionnels",
    "pour les débutants", "pour le B2B", "que vous soyez",
    "si vous êtes", "parfait pour", "idéal pour", "conçu pour",
    "construit pour", "qui veulent", "qui ont besoin", "à la recherche de",
  ],
  de: [
    "für Startups", "für Teams", "für Entwickler", "für Marketer",
    "für Agenturen", "für Freelancer", "für Gründer",
    "für Unternehmer", "für KMU", "für Enterprise",
    "für Profis", "für Anfänger", "für B2B", "für Unternehmen",
    "ob Sie", "wenn Sie ein", "perfekt für", "ideal für",
    "entwickelt für", "gebaut für", "die wollen", "die brauchen",
    "auf der Suche nach",
  ],
  es: [
    "para startups", "para equipos", "para desarrolladores",
    "para profesionales del marketing", "para agencias",
    "para freelancers", "para creadores", "para emprendedores",
    "para pymes", "para empresas", "para profesionales",
    "para principiantes", "para B2B", "ya sea que",
    "si eres", "perfecto para", "ideal para", "diseñado para",
    "construido para", "que quieren", "que necesitan", "buscando",
  ],
  it: [
    "per startup", "per team", "per sviluppatori", "per marketer",
    "per agenzie", "per freelancer", "per creatori", "per imprenditori",
    "per PMI", "per aziende", "per professionisti", "per principianti",
    "per B2B", "che tu sia", "se sei un", "perfetto per", "ideale per",
    "progettato per", "costruito per", "che vogliono", "che hanno bisogno",
    "alla ricerca di",
  ],
  pt: [
    "para startups", "para equipes", "para desenvolvedores",
    "para profissionais de marketing", "para agências",
    "para freelancers", "para criadores", "para empreendedores",
    "para PMEs", "para empresas", "para profissionais",
    "para iniciantes", "para B2B", "seja você", "se você é",
    "perfeito para", "ideal para", "projetado para",
    "construído para", "que querem", "que precisam", "procurando",
  ],
  ja: [
    "スタートアップ向け", "チーム向け", "開発者向け",
    "マーケター向け", "エージェンシー向け", "フリーランス向け",
    "起業家向け", "中小企業向け", "エンタープライズ向け",
    "プロフェッショナル向け", "初心者向け", "B2B向け",
    "企業向け", "に最適", "のために設計", "のために構築",
    "を求める方", "をお探しの方",
  ],
  zh: [
    "适合初创企业", "适合团队", "适合开发者", "适合营销人员",
    "适合代理商", "适合自由职业者", "适合创业者", "适合中小企业",
    "适合企业", "适合专业人士", "适合初学者", "适合B2B",
    "无论您是", "如果您是", "非常适合", "专为", "为您打造",
    "寻找",
  ],
  ko: [
    "스타트업을 위한", "팀을 위한", "개발자를 위한",
    "마케터를 위한", "에이전시를 위한", "프리랜서를 위한",
    "창업자를 위한", "중소기업을 위한", "엔터프라이즈를 위한",
    "전문가를 위한", "초보자를 위한", "B2B를 위한",
    "기업을 위한", "에 적합", "을 위해 설계", "을 위해 구축",
    "을 찾는 분", "을 원하는 분",
  ],
};

/**
 * Social proof patterns — words and phrases that indicate social proof
 * elements like testimonials, client logos, case studies, and awards.
 */
const SOCIAL_PROOF_PATTERNS = {
  en: {
    testimonials: [
      "testimonial", "testimonials", "what our customers say",
      "customer reviews", "client reviews", "don't take our word",
      "in their own words", "real results", "happy customers",
      "satisfied customers", "loved by", "trusted by", "rated by",
      "5 stars", "five stars", "star rating",
    ],
    clientLogos: [
      "as seen in", "as featured in", "featured by", "our clients",
      "our customers", "they trust us", "who use us", "partner logos",
      "client logos", "in the press", "in the media", "press coverage",
    ],
    caseStudies: [
      "case study", "case studies", "success story", "success stories",
      "results", "proven results", "real results", "track record",
      "portfolio", "before and after", "ROI", "return on investment",
      "outcome", "impact", "white paper",
    ],
    awards: [
      "award", "awards", "award-winning", "winner", "finalist",
      "certified", "certification", "accredited", "recognized", "badge",
      "seal of approval", "top rated", "industry leader", "G2",
      "Capterra", "Trustpilot", "Gartner", "Forrester", "#1",
      "number one", "ISO",
    ],
  },
  nl: {
    testimonials: [
      "getuigenis", "getuigenissen", "wat onze klanten zeggen",
      "klantbeoordelingen", "neem niet ons woord",
      "in hun eigen woorden", "echte resultaten", "tevreden klanten",
      "geliefd bij", "vertrouwd door", "beoordeeld door",
      "5 sterren", "vijf sterren", "sterrenbeoordeling",
    ],
    clientLogos: [
      "zoals gezien in", "uitgelicht door", "onze klanten",
      "zij vertrouwen ons", "wie ons gebruiken", "partnerlogo's",
      "klantlogo's", "in de pers", "in de media", "persaandacht",
    ],
    caseStudies: [
      "casestudy", "casestudies", "succesverhaal", "succesverhalen",
      "resultaten", "bewezen resultaten", "track record", "portfolio",
      "voor en na", "ROI", "rendement op investering", "impact",
      "white paper",
    ],
    awards: [
      "prijs", "prijzen", "prijswinnend", "winnaar", "finalist",
      "gecertificeerd", "certificering", "geaccrediteerd", "erkend",
      "keurmerk", "beste beoordeling", "marktleider", "G2",
      "Capterra", "Trustpilot", "#1", "nummer één", "ISO",
    ],
  },
  fr: {
    testimonials: [
      "témoignage", "témoignages", "ce que disent nos clients",
      "avis clients", "ne nous croyez pas sur parole",
      "dans leurs propres mots", "résultats réels", "clients satisfaits",
      "aimé par", "fait confiance par", "noté par",
      "5 étoiles", "cinq étoiles", "notation",
    ],
    clientLogos: [
      "vu dans", "présenté dans", "nos clients", "ils nous font confiance",
      "qui nous utilisent", "logos partenaires", "logos clients",
      "dans la presse", "dans les médias", "couverture presse",
    ],
    caseStudies: [
      "étude de cas", "études de cas", "histoire de succès",
      "résultats", "résultats prouvés", "bilan", "portfolio",
      "avant et après", "ROI", "retour sur investissement", "impact",
      "livre blanc",
    ],
    awards: [
      "prix", "récompense", "primé", "gagnant", "finaliste",
      "certifié", "certification", "accrédité", "reconnu", "label",
      "sceau d'approbation", "mieux noté", "leader du secteur", "G2",
      "Capterra", "Trustpilot", "Gartner", "#1", "numéro un", "ISO",
    ],
  },
  de: {
    testimonials: [
      "Erfahrungsbericht", "Erfahrungsberichte",
      "was unsere Kunden sagen", "Kundenbewertungen",
      "nehmen Sie nicht unser Wort", "in ihren eigenen Worten",
      "echte Ergebnisse", "zufriedene Kunden", "geliebt von",
      "vertraut von", "bewertet von", "5 Sterne", "fünf Sterne",
      "Sternebewertung",
    ],
    clientLogos: [
      "bekannt aus", "vorgestellt in", "unsere Kunden",
      "sie vertrauen uns", "die uns nutzen", "Partnerlogos",
      "Kundenlogos", "in der Presse", "in den Medien",
      "Presseberichterstattung",
    ],
    caseStudies: [
      "Fallstudie", "Fallstudien", "Erfolgsgeschichte",
      "Erfolgsgeschichten", "Ergebnisse", "bewährte Ergebnisse",
      "Bilanz", "Portfolio", "Vorher und Nachher", "ROI",
      "Kapitalrendite", "Auswirkung", "Whitepaper",
    ],
    awards: [
      "Auszeichnung", "Auszeichnungen", "preisgekrönt", "Gewinner",
      "Finalist", "zertifiziert", "Zertifizierung", "akkreditiert",
      "anerkannt", "Gütesiegel", "bestbewertet", "Branchenführer",
      "G2", "Capterra", "Trustpilot", "#1", "Nummer eins", "ISO",
    ],
  },
  es: {
    testimonials: [
      "testimonio", "testimonios", "lo que dicen nuestros clientes",
      "reseñas de clientes", "no tome nuestra palabra",
      "en sus propias palabras", "resultados reales",
      "clientes satisfechos", "amado por", "confiado por",
      "calificado por", "5 estrellas", "cinco estrellas",
      "calificación",
    ],
    clientLogos: [
      "visto en", "presentado en", "nuestros clientes",
      "confían en nosotros", "quienes nos usan", "logos de socios",
      "logos de clientes", "en la prensa", "en los medios",
      "cobertura de prensa",
    ],
    caseStudies: [
      "caso de estudio", "casos de estudio", "historia de éxito",
      "historias de éxito", "resultados", "resultados comprobados",
      "trayectoria", "portafolio", "antes y después", "ROI",
      "retorno de inversión", "impacto", "libro blanco",
    ],
    awards: [
      "premio", "premios", "galardonado", "ganador", "finalista",
      "certificado", "certificación", "acreditado", "reconocido",
      "sello de aprobación", "mejor calificado", "líder del sector",
      "G2", "Capterra", "Trustpilot", "#1", "número uno", "ISO",
    ],
  },
  it: {
    testimonials: [
      "testimonianza", "testimonianze",
      "cosa dicono i nostri clienti", "recensioni clienti",
      "non fidarti solo delle nostre parole", "nelle loro parole",
      "risultati reali", "clienti soddisfatti", "amato da",
      "fidato da", "valutato da", "5 stelle", "cinque stelle",
      "valutazione",
    ],
    clientLogos: [
      "visto su", "presentato su", "i nostri clienti",
      "si fidano di noi", "chi ci usa", "loghi partner",
      "loghi clienti", "sulla stampa", "nei media",
      "copertura stampa",
    ],
    caseStudies: [
      "caso studio", "casi studio", "storia di successo",
      "storie di successo", "risultati", "risultati comprovati",
      "track record", "portfolio", "prima e dopo", "ROI",
      "ritorno sull'investimento", "impatto", "white paper",
    ],
    awards: [
      "premio", "premi", "premiato", "vincitore", "finalista",
      "certificato", "certificazione", "accreditato", "riconosciuto",
      "sigillo di approvazione", "più votato", "leader del settore",
      "G2", "Capterra", "Trustpilot", "#1", "numero uno", "ISO",
    ],
  },
  pt: {
    testimonials: [
      "depoimento", "depoimentos", "o que nossos clientes dizem",
      "avaliações de clientes", "não acredite apenas em nós",
      "nas palavras deles", "resultados reais", "clientes satisfeitos",
      "amado por", "confiado por", "avaliado por", "5 estrelas",
      "cinco estrelas", "classificação",
    ],
    clientLogos: [
      "visto em", "apresentado em", "nossos clientes",
      "confiam em nós", "quem nos usa", "logos de parceiros",
      "logos de clientes", "na imprensa", "na mídia",
      "cobertura de imprensa",
    ],
    caseStudies: [
      "estudo de caso", "estudos de caso", "história de sucesso",
      "histórias de sucesso", "resultados", "resultados comprovados",
      "histórico", "portfólio", "antes e depois", "ROI",
      "retorno sobre investimento", "impacto", "white paper",
    ],
    awards: [
      "prêmio", "prêmios", "premiado", "vencedor", "finalista",
      "certificado", "certificação", "credenciado", "reconhecido",
      "selo de aprovação", "mais bem avaliado", "líder do setor",
      "G2", "Capterra", "Trustpilot", "#1", "número um", "ISO",
    ],
  },
  ja: {
    testimonials: [
      "お客様の声", "レビュー", "口コミ", "体験談", "お客様の評価",
      "実績", "満足度", "信頼の声", "5つ星", "星評価",
    ],
    clientLogos: [
      "掲載メディア", "取引先", "お客様一覧", "導入企業", "パートナー",
      "メディア掲載", "プレス", "報道",
    ],
    caseStudies: [
      "導入事例", "事例", "成功事例", "成果", "実績", "ビフォーアフター",
      "ROI", "投資対効果", "インパクト", "ホワイトペーパー",
    ],
    awards: [
      "受賞", "受賞歴", "アワード", "優勝", "認定", "認証",
      "認定済み", "業界リーダー", "No.1", "ナンバーワン", "ISO",
    ],
  },
  zh: {
    testimonials: [
      "客户评价", "用户评价", "客户反馈", "好评", "真实评价",
      "满意客户", "信赖", "5星", "五星评价",
    ],
    clientLogos: [
      "媒体报道", "合作伙伴", "客户案例", "信赖我们的企业",
      "谁在使用", "媒体", "新闻报道",
    ],
    caseStudies: [
      "案例研究", "成功案例", "客户案例", "成果", "实绩",
      "投资回报率", "ROI", "影响", "白皮书",
    ],
    awards: [
      "奖项", "获奖", "认证", "资质", "认可", "行业领导者",
      "第一名", "ISO",
    ],
  },
  ko: {
    testimonials: [
      "고객 후기", "리뷰", "사용 후기", "고객의 목소리", "만족한 고객",
      "신뢰받는", "5성", "별점",
    ],
    clientLogos: [
      "언론 보도", "파트너", "고객사", "신뢰하는 기업",
      "사용 기업", "미디어", "보도 자료",
    ],
    caseStudies: [
      "사례 연구", "성공 사례", "고객 사례", "성과", "실적",
      "투자 수익률", "ROI", "영향", "백서",
    ],
    awards: [
      "수상", "수상 이력", "인증", "자격", "인정",
      "업계 리더", "1위", "ISO",
    ],
  },
};

module.exports = {
  SUPPORTED_LANGS,
  detectLang,
  BENEFIT_PATTERNS,
  FEATURE_PATTERNS,
  QUANTIFICATION_PATTERNS,
  URGENCY_PATTERNS,
  SCARCITY_PATTERNS,
  EMOTIONAL_PATTERNS,
  HEADLINE_PATTERNS,
  OFFERING_PATTERNS,
  AUDIENCE_PATTERNS,
  SOCIAL_PROOF_PATTERNS,
};
