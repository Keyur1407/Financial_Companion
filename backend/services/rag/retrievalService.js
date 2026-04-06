import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const KNOWLEDGE_INDEX_PATH = path.resolve(__dirname, "../../../data/knowledge/processed/knowledge-index.json");
const NEWS_FRESHNESS_DAYS = Number(process.env.NEWS_MAX_AGE_DAYS) || 5;
const REGULATORY_SOURCE_HINTS = ["reg", "guide", "circular", "faq", "charter", "compliance", "investor"];
const REGULATORY_DOCUMENT_HINTS = ["circular", "master circular", "regulation", "guidance", "faq", "charter", "reference"];
const REGULATORY_CATEGORY_HINTS = ["kyc", "investor", "advisor", "compliance", "grievance", "nomination", "mutual_funds"];
const REGULATORY_TAG_HINTS = [
  "sebi", "kyc", "nominee", "nomination", "grievance", "complaint", "scores", "mutual fund", "advisor", "research analyst",
  "aif", "pms", "invit", "reit", "icdr", "lodr", "pit", "takeover", "compliance", "riskometer", "disclosure"
];
const STOP_WORDS = new Set([
  "a", "an", "and", "are", "as", "at", "be", "by", "for", "from", "how", "i", "if", "in", "into", "is", "it", "me",
  "my", "of", "on", "or", "our", "should", "tell", "than", "that", "the", "this", "to", "today", "what", "when",
  "where", "which", "who", "why", "with", "you", "your"
]);

let cachedIndex = null;
let cachedMtimeMs = 0;

function normalizeText(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function tokenize(value) {
  return normalizeText(value)
    .split(" ")
    .filter((token) => token && !STOP_WORDS.has(token) && token.length > 1);
}

function uniqueTokens(value) {
  return [...new Set(tokenize(value))];
}

function dateAgeInDays(value) {
  const timestamp = Date.parse(value || "");
  if (!Number.isFinite(timestamp)) {
    return null;
  }
  return Math.max(0, (Date.now() - timestamp) / (1000 * 60 * 60 * 24));
}

function getScopeFilters(routeInfo) {
  const scopes = Array.isArray(routeInfo && routeInfo.knowledgeScopes) ? routeInfo.knowledgeScopes : [];
  return {
    wantsRegulatory: scopes.includes("regulatory"),
    wantsNews: scopes.includes("news")
  };
}

function isNewsLikeChunk(chunk) {
  const sourceType = String(chunk.sourceType || "").toLowerCase();
  const category = String(chunk.category || "").toLowerCase();
  const tags = (chunk.tags || []).map((tag) => String(tag).toLowerCase());
  return sourceType.includes("news") || category.includes("market") || tags.some((tag) => tag.includes("news") || tag.includes("market"));
}

function isRegulatoryChunk(chunk) {
  const sourceType = String(chunk.sourceType || "").toLowerCase();
  const category = String(chunk.category || "").toLowerCase();
  const authority = String(chunk.authority || "").toLowerCase();
  const documentType = String(chunk.documentType || "").toLowerCase();
  const tags = [...(chunk.tags || []), ...(chunk.topics || [])].map((tag) => String(tag).toLowerCase());

  return authority.includes("sebi")
    || REGULATORY_SOURCE_HINTS.some((hint) => sourceType.includes(hint))
    || REGULATORY_DOCUMENT_HINTS.some((hint) => documentType.includes(hint))
    || REGULATORY_CATEGORY_HINTS.some((hint) => category.includes(hint))
    || tags.some((tag) => REGULATORY_TAG_HINTS.some((hint) => tag.includes(hint)));
}

function scoreChunk(queryTokens, chunk, routeInfo) {
  const sourceText = [
    chunk.title,
    chunk.category,
    chunk.summary,
    chunk.publisher,
    chunk.authority,
    chunk.documentType,
    chunk.documentNumber,
    chunk.text,
    ...(chunk.tags || []),
    ...(chunk.topics || [])
  ].join(" ");
  const chunkTokens = new Set(tokenize(sourceText));
  let score = 0;

  for (const token of queryTokens) {
    if (chunkTokens.has(token)) {
      score += 3;
    }
    if ((chunk.title || "").toLowerCase().includes(token)) {
      score += 2;
    }
    if ((chunk.category || "").toLowerCase().includes(token)) {
      score += 1.5;
    }
    if ((chunk.tags || []).some((tag) => String(tag).toLowerCase().includes(token))) {
      score += 1.5;
    }
    if ((chunk.topics || []).some((topic) => String(topic).toLowerCase().includes(token))) {
      score += 1.5;
    }
    if ((chunk.documentType || "").toLowerCase().includes(token)) {
      score += 1.5;
    }
    if ((chunk.authority || "").toLowerCase().includes(token)) {
      score += 1;
    }
  }

  const { wantsRegulatory, wantsNews } = getScopeFilters(routeInfo);
  const sourceType = String(chunk.sourceType || "").toLowerCase();
  const category = String(chunk.category || "").toLowerCase();
  const authority = String(chunk.authority || "").toLowerCase();
  const documentType = String(chunk.documentType || "").toLowerCase();
  const tags = [...(chunk.tags || []), ...(chunk.topics || [])].map((tag) => String(tag).toLowerCase());

  if (wantsRegulatory) {
    if (!isRegulatoryChunk(chunk) || isNewsLikeChunk(chunk)) {
      return Number.NEGATIVE_INFINITY;
    }

    score += 5;
    if (authority.includes("sebi")) {
      score += 4;
    }
    if (documentType.includes("master circular") || documentType.includes("regulation")) {
      score += 2;
    }
    if (sourceType.includes("reg") || sourceType.includes("guide") || category.includes("kyc") || tags.some((tag) => tag.includes("sebi"))) {
      score += 3;
    }
  }

  if (wantsNews) {
    if (!isNewsLikeChunk(chunk)) {
      score -= 2;
    } else {
      const ageInDays = dateAgeInDays(chunk.publishedAt);
      if (ageInDays == null || ageInDays > NEWS_FRESHNESS_DAYS) {
        return Number.NEGATIVE_INFINITY;
      }
      score += 5;
      score += Math.max(0, NEWS_FRESHNESS_DAYS - ageInDays);
    }
  }

  if (["hybrid_market_news", "hybrid_market_summary"].includes(routeInfo.route) && tags.some((tag) => ["nifty", "market", "equity"].includes(tag))) {
    score += 2;
  }

  return score;
}

function buildSourceExcerpt(chunk) {
  const raw = String(chunk.summary || chunk.text || "").replace(/\s+/g, " ").trim();
  if (raw.length <= 180) {
    return raw;
  }
  return `${raw.slice(0, 177).trimEnd()}...`;
}

function buildContext(matches, routeInfo) {
  if (!matches.length) {
    return "";
  }

  const intro = routeInfo.route === "news_rag" || routeInfo.route === "hybrid_market_news" || routeInfo.route === "hybrid_market_summary"
    ? "Retrieved recent knowledge-base context for news and market explanation:"
    : "Retrieved knowledge-base context for regulation and investor education:";

  const lines = [intro];
  matches.forEach((chunk, index) => {
    lines.push(`[Source ${index + 1}] ${chunk.title}`);
    if (chunk.publisher) {
      lines.push(`Publisher: ${chunk.publisher}`);
    }
    if (chunk.category) {
      lines.push(`Category: ${chunk.category}`);
    }
    if (chunk.authority) {
      lines.push(`Authority: ${chunk.authority}`);
    }
    if (chunk.documentType) {
      lines.push(`Document type: ${chunk.documentType}`);
    }
    if (chunk.documentNumber) {
      lines.push(`Document number: ${chunk.documentNumber}`);
    }
    if (chunk.issuedAt) {
      lines.push(`Issued: ${chunk.issuedAt}`);
    }
    if (chunk.effectiveFrom) {
      lines.push(`Effective from: ${chunk.effectiveFrom}`);
    }
    if (chunk.publishedAt) {
      lines.push(`Published: ${chunk.publishedAt}`);
    }
    if (chunk.sourceUrl) {
      lines.push(`URL: ${chunk.sourceUrl}`);
    }
    if ((chunk.topics || []).length) {
      lines.push(`Topics: ${chunk.topics.join(", ")}`);
    }
    lines.push(`Excerpt: ${buildSourceExcerpt(chunk)}`);
  });
  lines.push("Use this retrieved context when it directly answers the user. If the retrieved context is missing or not enough, say so naturally and avoid presenting stale information as live data.");
  return lines.join("\n");
}

async function loadKnowledgeIndex() {
  try {
    const stats = await fs.stat(KNOWLEDGE_INDEX_PATH);
    if (cachedIndex && cachedMtimeMs === stats.mtimeMs) {
      return cachedIndex;
    }

    const raw = await fs.readFile(KNOWLEDGE_INDEX_PATH, "utf8");
    const parsed = JSON.parse(raw);
    cachedIndex = Array.isArray(parsed.items) ? parsed.items : [];
    cachedMtimeMs = stats.mtimeMs;
    return cachedIndex;
  } catch (_error) {
    cachedIndex = [];
    cachedMtimeMs = 0;
    return [];
  }
}

export async function retrieveKnowledgeContext(userMessage, routeInfo) {
  if (!routeInfo || !routeInfo.useKnowledgeRetrieval) {
    return { context: "", sources: [], matches: [] };
  }

  const index = await loadKnowledgeIndex();
  if (!index.length) {
    return { context: "", sources: [], matches: [] };
  }

  const queryTokens = uniqueTokens(userMessage);
  if (!queryTokens.length) {
    return { context: "", sources: [], matches: [] };
  }

  const scored = index
    .map((chunk) => ({ chunk, score: scoreChunk(queryTokens, chunk, routeInfo) }))
    .filter((item) => Number.isFinite(item.score) && item.score >= 4)
    .sort((left, right) => right.score - left.score)
    .slice(0, routeInfo.route === "hybrid_market_news" ? 3 : 4);

  const matches = scored.map((item) => item.chunk);
  const sources = matches.map((chunk) => ({
    id: chunk.id,
    title: chunk.title,
    category: chunk.category || "",
    sourceType: chunk.sourceType || "",
    publishedAt: chunk.publishedAt || "",
    sourceUrl: chunk.sourceUrl || "",
    publisher: chunk.publisher || "",
    authority: chunk.authority || "",
    documentType: chunk.documentType || "",
    documentNumber: chunk.documentNumber || "",
    issuedAt: chunk.issuedAt || "",
    effectiveFrom: chunk.effectiveFrom || "",
    topics: Array.isArray(chunk.topics) ? chunk.topics : [],
    excerpt: buildSourceExcerpt(chunk)
  }));

  return {
    context: buildContext(matches, routeInfo),
    sources,
    matches
  };
}

