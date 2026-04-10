import path from "path";
import { fileURLToPath } from "url";
import express from "express";
import dotenv from "dotenv";
import { classifyQuery, isMarketQuery } from "./services/queryRouter.js";
import { retrieveKnowledgeContext } from "./services/rag/retrievalService.js";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const frontendDir = path.resolve(__dirname, "../frontend");

const app = express();
const PORT = Number(process.env.PORT) || 3001;
const GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions";
const MODEL = "openai/gpt-oss-120b";
const NSE_BASE_URL = "https://www.nseindia.com";
const BSE_BASE_URL = "https://www.bseindia.com";
const BSE_REALTIME_API_BASE_URL = "https://api.bseindia.com/RealTimeBseIndiaAPI/api";
const USER_AGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/132.0.0.0 Safari/537.36";
const NSE_FETCH_TIMEOUT_MS = Number(process.env.NSE_FETCH_TIMEOUT_MS) || 12000;
const DEBUG_MARKET_FETCH = process.env.DEBUG_MARKET_FETCH === "1";
const SYSTEM_PROMPT = `You are the Financial Companion - a warm, knowledgeable, and patient financial assistant built for first-time investors in India.

Your personality:
- Friendly and approachable, like a knowledgeable friend - never formal or corporate
- Use simple language. Avoid jargon. When you must use a financial term, always explain it immediately
- Use Indian context always: rupees, Indian funds, SEBI, Indian tax rules (STCG/LTCG), Indian life goals
- Keep responses concise but complete. Use short paragraphs. Use bullet points only when listing 3 or more items. For beginner process or "how to start" questions, use 3 to 6 numbered steps with short descriptions and optional short bullet sub-points. For concept-explainer questions like SIP, mutual funds, or index funds, prefer a short definition followed by 2 to 4 labeled bullets such as "How it works", "Why it helps", or "When it fits".
- When showing a formula, first write it in readable plain text such as "CAGR = (Final Value / Initial Value)^(1 / n) - 1". If you also include math notation, wrap inline math in "\\(...\\)" and display math in "$$...$$". Never output raw LaTeX commands without delimiters.
- Never lecture. Respond to exactly what was asked

Your knowledge scope:
- SIP (Systematic Investment Plan) - what it is, how it works, benefits of rupee cost averaging
- Mutual funds - types (equity, debt, hybrid, liquid, index), how NAV works, how to read fund performance
- Goal-based investing - retirement, child education, home purchase, emergency fund
- Risk profiling - conservative, moderate, aggressive - how to think about risk based on timeline
- Compounding - explain with simple rupee examples
- SIP projections - when asked, calculate and show projected corpus using the formula: FV = P x [((1 + r)^n - 1) / r] x (1 + r) where P = monthly SIP amount, r = monthly interest rate (annual rate divided by 12 divided by 100), n = total number of months. Always show the result clearly with total invested and total returns broken out separately.
- Indian tax rules - STCG at 15% for equity held under 1 year, LTCG at 12.5% above Rs 1.25 lakh for equity held over 1 year
- KYC process - what it involves, Aadhaar and PAN verification, why it is required by SEBI
- Index funds - what they are, why low expense ratio matters, Nifty 50 as the main Indian example
- Emergency fund - why 3 to 6 months of expenses, where to keep it (liquid mutual funds)

Hard rules you must NEVER break:
1. Always add this exact disclaimer when showing any projection or calculation: "These figures are illustrative only. Mutual fund investments are subject to market risk. Past performance does not guarantee future returns."
2. Always identify yourself as an AI assistant if the user directly asks whether you are human or AI.
3. For stock or index questions, you may provide a structured market view such as bullish intraday bias, bearish intraday bias, or neutral/range-bound, along with catalysts, risks, support, resistance, and levels to watch. Never turn that analysis into a direct action recommendation.
4. End every response about a specific stock, share, or index with this exact line: "This is informational analysis based on publicly available market data, not a personalised buy or sell recommendation."

When a user asks for a SIP calculation:
- Ask for monthly SIP amount, duration in years, and expected return rate if not provided
- Suggest 10 to 12 percent per annum as a general illustration for equity
- Show the projected corpus clearly
- Break down total amount invested versus total returns generated
- Always add the projection disclaimer


Conversation style:
- Start responses with a direct answer to what was asked. Never start with filler phrases like "Great question!" or "Absolutely!" or "Certainly!"
- Use the Rs or rupee symbol for all amounts
- Give concrete examples with numbers. For example: "If you invest Rs 5,000 per month for 10 years at 12 percent per annum, you would accumulate approximately Rs 11.6 lakhs"
- For live market questions, use the system-provided market snapshot exactly and explain the move, the day range, and key levels to watch in 2 to 4 short paragraphs
- For stock or index analysis questions, prefer this structure when helpful: current read, bullish signals, bearish signals, and what to watch next
- Neutral conclusions are allowed. Use phrases like "bullish intraday bias", "bearish intraday bias", "range-bound setup", "watchlist candidate", "research further", or "high-risk setup" when justified by the provided data
- If news context is available from the system, cite it as part of the reasoning. If it is not available, say the read is based mainly on price action and the provided market snapshot
- Formatting rules: use only plain paragraphs, **bold** text, numbered lists like 1. 2. 3., and bullet lists starting with -
- Never use markdown tables, pipe-separated comparison grids, raw HTML tags like <br>, or markdown headings that start with #
- If you need to compare options, convert the comparison into labeled bullets or short paragraphs instead of a table
- If retrieved knowledge-base context is provided, prefer it for guideline, compliance, or news-summary questions and do not present unsupported claims as fresh facts
- End longer responses with a natural follow-up question to keep the conversation going
- Keep responses under 250 words unless a detailed calculation or explanation is genuinely needed
- Format numbers in Indian style: lakhs and crores, not millions and billions`;


// Recommendation Prompt
// Escalation triggers - use this exact phrasing when any of these topics come up:
// "This is a great question that deserves personalised advice. I would recommend connecting with a SEBI-registered advisor through this platform who can give you a recommendation based on your complete financial picture. Would you like me to set that up?"

// Trigger the above escalation response for:
// - Questions asking which specific fund to buy or invest in
// - Questions asking whether to switch or move existing investments
// - Questions asking whether a specific fund is good for them personally
// - Any question that implies a specific buy, sell, or switch recommendation
// - Questions like "what should I do with my money" seeking a direct personal recommendation


let nseCookies = "";
let nseCookiesFetchedAt = 0;

const DEFAULT_SUGGESTED_QUESTIONS = [
  "How should I start investing as a beginner?",
  "What is SIP in simple language?",
  "How much should I invest every month?"
];

const MARKET_SUGGESTED_QUESTIONS = [
  "What is Bank Nifty today?",
  "What are the bullish and bearish signals here?",
  "What levels should I watch next?"
];

app.use(express.json({ limit: "1mb" }));
app.use(express.static(frontendDir));

function sanitizeHistory(history) {
  if (!Array.isArray(history)) {
    return [];
  }

  return history
    .filter((item) => item && (item.role === "user" || item.role === "assistant") && typeof item.content === "string")
    .slice(-20);
}

function sanitizeSuggestedQuestion(question) {
  if (typeof question !== "string") {
    return "";
  }

  const cleaned = question.replace(/\s+/g, " ").trim();
  if (!cleaned || cleaned.length < 8 || cleaned.length > 120) {
    return "";
  }

  return /\?$/.test(cleaned) ? cleaned : `${cleaned}?`;
}

function buildFallbackSuggestedQuestions(userMessage, marketData) {
  if (marketData || looksLikeMarketDataQuery(userMessage)) {
    return MARKET_SUGGESTED_QUESTIONS.slice(0, 3);
  }

  return DEFAULT_SUGGESTED_QUESTIONS.slice(0, 3);
}

function normalizeSuggestedQuestions(questions, fallbackQuestions) {
  const normalized = [];
  const seen = new Set();

  const source = Array.isArray(questions) ? questions : [];
  for (const candidate of source) {
    const cleaned = sanitizeSuggestedQuestion(candidate);
    const key = cleaned.toLowerCase();
    if (!cleaned || seen.has(key)) {
      continue;
    }
    seen.add(key);
    normalized.push(cleaned);
    if (normalized.length === 3) {
      break;
    }
  }

  for (const candidate of fallbackQuestions) {
    const cleaned = sanitizeSuggestedQuestion(candidate);
    const key = cleaned.toLowerCase();
    if (!cleaned || seen.has(key)) {
      continue;
    }
    seen.add(key);
    normalized.push(cleaned);
    if (normalized.length === 3) {
      break;
    }
  }

  return normalized.slice(0, 3);
}

function tryParseJsonObject(text) {
  if (typeof text !== "string") {
    return null;
  }

  const fencedMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = fencedMatch ? fencedMatch[1].trim() : text.trim();

  try {
    return JSON.parse(candidate);
  } catch (_error) {
    const objectMatch = candidate.match(/\{[\s\S]*\}/);
    if (!objectMatch) {
      return null;
    }

    try {
      return JSON.parse(objectMatch[0]);
    } catch (_innerError) {
      return null;
    }
  }
}

async function generateSuggestedQuestions(apiKey, userMessage, assistantMessage, marketData) {
  const fallbackQuestions = buildFallbackSuggestedQuestions(userMessage, marketData);
  const marketLabel = marketData && marketData.label ? marketData.label : "";

  try {
    const response = await fetch(GROQ_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 180,
        messages: [
          {
            role: "system",
            content: "You generate exactly 3 short follow-up questions for a financial education chatbot. Keep them specific to the assistant reply, beginner-friendly, non-repetitive, and free of direct buy/sell recommendations. Return valid JSON only in this shape: {\"suggestedQuestions\":[\"...\",\"...\",\"...\"]}."
          },
          {
            role: "user",
            content: `User question: ${userMessage}\nAssistant reply: ${assistantMessage}\nLive market instrument: ${marketLabel || "none"}\nGenerate 3 natural follow-up questions.`
          }
        ]
      })
    });

    if (!response.ok) {
      return fallbackQuestions;
    }

    const data = await response.json().catch(() => ({}));
    const rawContent = data && data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content;
    const parsed = tryParseJsonObject(rawContent);
    return normalizeSuggestedQuestions(parsed && parsed.suggestedQuestions, fallbackQuestions);
  } catch (_error) {
    return fallbackQuestions;
  }
}

function logMarketDebug(...parts) {
  if (DEBUG_MARKET_FETCH) {
    console.log("[market]", ...parts);
  }
}

function getBaseHeaders() {
  return {
    "user-agent": USER_AGENT,
    accept: "application/json, text/plain, */*",
    "accept-language": "en-US,en;q=0.9",
    "cache-control": "no-cache",
    pragma: "no-cache",
    referer: `${NSE_BASE_URL}/`,
    origin: NSE_BASE_URL
  };
}

function getBseHeaders() {
  return {
    "user-agent": USER_AGENT,
    accept: "application/json, text/plain, */*",
    "accept-language": "en-US,en;q=0.9",
    "cache-control": "no-cache",
    pragma: "no-cache",
    referer: `${BSE_BASE_URL}/`,
    origin: BSE_BASE_URL
  };
}

function extractCookies(response) {
  if (typeof response.headers.getSetCookie === "function") {
    return response.headers.getSetCookie().map((cookie) => cookie.split(";")[0]).join("; ");
  }

  const rawCookie = response.headers.get("set-cookie") || "";
  const matches = rawCookie.match(/(?:^|,)\s*([^=;,\s]+=[^;]+)/g) || [];
  return matches.map((item) => item.replace(/^,\s*/, "")).join("; ");
}

async function fetchWithTimeout(url, options = {}) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), NSE_FETCH_TIMEOUT_MS);

  try {
    return await fetch(url, {
      ...options,
      signal: controller.signal
    });
  } catch (error) {
    if (error && error.name === "AbortError") {
      throw new Error(`Request timed out after ${NSE_FETCH_TIMEOUT_MS}ms`);
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

async function refreshNseCookies() {
  logMarketDebug("Refreshing NSE cookies");
  const response = await fetchWithTimeout(`${NSE_BASE_URL}/`, {
    headers: getBaseHeaders()
  });

  if (!response.ok) {
    throw new Error(`NSE cookie bootstrap failed with status ${response.status}`);
  }

  nseCookies = extractCookies(response);
  if (!nseCookies) {
    throw new Error("NSE cookie bootstrap failed because no cookies were returned");
  }

  nseCookiesFetchedAt = Date.now();
  logMarketDebug("NSE cookies refreshed", `length=${nseCookies.length}`);
}

async function nseFetchJson(apiPath, retry = true) {
  if (!nseCookies || Date.now() - nseCookiesFetchedAt > 10 * 60 * 1000) {
    await refreshNseCookies();
  }

  logMarketDebug("Fetching NSE API", apiPath);
  const response = await fetchWithTimeout(`${NSE_BASE_URL}${apiPath}`, {
    headers: {
      ...getBaseHeaders(),
      cookie: nseCookies
    }
  });

  if ((response.status === 401 || response.status === 403) && retry) {
    logMarketDebug("NSE API returned auth status, retrying with fresh cookies", response.status);
    await refreshNseCookies();
    return nseFetchJson(apiPath, false);
  }

  if (!response.ok) {
    const body = await response.text().catch(() => "");
    throw new Error(`NSE request failed for ${apiPath} with status ${response.status}${body ? `: ${body.slice(0, 160)}` : ""}`);
  }

  return response.json();
}

function toNumber(value) {
  if (value == null || value === "") {
    return null;
  }

  const numeric = Number(String(value).replace(/,/g, "").trim());
  return Number.isFinite(numeric) ? numeric : null;
}

function formatNumber(value) {
  const numeric = toNumber(value);
  if (numeric == null) {
    return null;
  }

  return numeric.toLocaleString("en-IN", { maximumFractionDigits: 2 });
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function looksLikeMarketDataQuery(message) {
  return isMarketQuery(message);
}

function isGenericMarketOverviewQuery(message) {
  const lower = typeof message === "string" ? message.toLowerCase() : "";
  return /(market today|current market|how is the market|what is the market doing|market trend|market outlook|market sentiment|market direction|market summary|today'?s market summary|daily market summary|market recap|market wrap|summari[sz]e (?:today'?s )?market|how did the market do today|how was the market today|what happened in the market today|what is driving the market|what's driving the market|drivers of the market|market themes|news themes|market news)/i.test(lower);
}

function extractInstrumentRequest(message) {
  const normalized = message.trim();
  const lower = normalized.toLowerCase();
  const normalizedForPatternMatch = normalized.replace(/[?!.,:;]+$/g, "").trim();

  if (!looksLikeMarketDataQuery(lower)) {
    return null;
  }

  if (lower.includes("bank nifty")) {
    return { type: "index", indexName: "NIFTY BANK" };
  }

  if (lower.includes("nifty")) {
    return { type: "index", indexName: "NIFTY 50" };
  }

  if (lower.includes("sensex")) {
    return { type: "index", indexName: "SENSEX" };
  }

  const patterns = [
    /(?:price of|quote of|current price of|market price of|share price of|stock price of)\s+([a-z0-9&.\-\s]+)$/i,
    /([a-z0-9&.\-\s]+?)\s+(?:share|stock)\s+price$/i,
    /(?:analy[sz]e|analysis of|outlook for|view on|thoughts on|trend for|setup for|support and resistance for|support for|resistance for|bullish on|bearish on)\s+([a-z0-9&.\-\s]+?)(?:\s+(?:share|stock))?(?:\s+(?:today|now|right now|currently))?$/i,
    /([a-z0-9&.\-\s]+?)\s+(?:stock|share)\s+(?:analysis|outlook|trend|setup)$/i,
    /(?:is|how is)\s+([a-z0-9&.\-\s]+?)(?:\s+(?:share|stock))?\s+(?:bullish|bearish|looking|trading|doing|moving)(?:\s+(?:today|now|right now|currently))?$/i
  ];

  for (const pattern of patterns) {
    const match = normalizedForPatternMatch.match(pattern);
    if (match && match[1]) {
      return { type: "equity", query: match[1].trim() };
    }
  }

  if (isGenericMarketOverviewQuery(lower)) {
    return { type: "index", indexName: "NIFTY 50" };
  }

  return null;
}

async function fetchSensexSnapshot() {
  logMarketDebug("Fetching BSE API", "/GetSensexData/w");
  const response = await fetchWithTimeout(`${BSE_REALTIME_API_BASE_URL}/GetSensexData/w`, {
    headers: getBseHeaders()
  });

  if (!response.ok) {
    const body = await response.text().catch(() => "");
    throw new Error(`BSE request failed for /GetSensexData/w with status ${response.status}${body ? `: ${body.slice(0, 160)}` : ""}`);
  }

  const payload = await response.json().catch(() => []);
  const target = Array.isArray(payload) ? payload[0] : null;
  if (!target) {
    return null;
  }

  return {
    type: "index",
    label: "BSE SENSEX",
    marketSource: "BSE",
    lastPrice: target.ltp,
    change: target.chg,
    percentChange: target.perchg,
    open: target.I_open,
    high: target.High,
    low: target.Low,
    previousClose: target.Prev_Close,
    lastUpdated: target.dttm || ""
  };
}

async function fetchIndexSnapshot(indexName) {
  if (String(indexName || "").toUpperCase() === "SENSEX") {
    return fetchSensexSnapshot();
  }

  const payload = await nseFetchJson("/api/allIndices");
  const items = Array.isArray(payload.data) ? payload.data : [];
  const target = items.find((item) => {
    const names = [item.index, item.indexName, item.key, item.indexSymbol, item.symbol]
      .filter(Boolean)
      .map((value) => String(value).toUpperCase());
    return names.includes(indexName.toUpperCase());
  });

  if (!target) {
    return null;
  }

  return {
    type: "index",
    label: target.index || indexName,
    marketSource: "NSE",
    lastPrice: target.last,
    change: target.variation,
    percentChange: target.percentChange,
    open: target.open,
    high: target.high,
    low: target.low,
    previousClose: target.previousClose,
    lastUpdated: target.lastUpdateTime || target.timeVal || target.timestamp || ""
  };
}

function normalizeSymbolCandidate(query) {
  return query
    .replace(/\b(share|stock|price|market|current|latest|live|today|limited|ltd|india)\b/gi, " ")
    .replace(/[^a-z0-9&.\-\s]/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}

async function resolveEquitySymbol(query) {
  const cleanedQuery = normalizeSymbolCandidate(query);
  if (!cleanedQuery) {
    return null;
  }

  try {
    const payload = await nseFetchJson(`/api/search/autocomplete?q=${encodeURIComponent(cleanedQuery)}`);
    const results = Array.isArray(payload.symbols) ? payload.symbols : Array.isArray(payload.data) ? payload.data : Array.isArray(payload) ? payload : [];

    const preferred = results.find((item) => {
      const blob = JSON.stringify(item).toUpperCase();
      return blob.includes("NSE") && blob.includes("EQ");
    }) || results[0];

    const symbol = preferred && (preferred.symbol || preferred.symbolName || preferred.value || preferred.name);
    if (symbol) {
      return String(symbol).toUpperCase().replace(/[^A-Z0-9]/g, "");
    }
  } catch (_error) {
    // Fall through to heuristics below if autocomplete is unavailable.
  }

  const collapsed = cleanedQuery.toUpperCase().replace(/[^A-Z0-9]/g, "");
  if (collapsed) {
    return collapsed;
  }

  const firstWord = cleanedQuery.split(" ")[0];
  return firstWord ? firstWord.toUpperCase() : null;
}

async function fetchEquitySnapshot(query) {
  const symbol = await resolveEquitySymbol(query);
  if (!symbol) {
    return null;
  }

  const payload = await nseFetchJson(`/api/quote-equity?symbol=${encodeURIComponent(symbol)}`);
  const priceInfo = payload.priceInfo || {};
  const info = payload.info || {};
  const metadata = payload.metadata || {};

  if (!priceInfo.lastPrice && !metadata.lastPrice) {
    return null;
  }

  return {
    type: "equity",
    label: info.companyName || metadata.symbol || symbol,
    symbol,
    marketSource: "NSE",
    lastPrice: priceInfo.lastPrice || metadata.lastPrice,
    change: priceInfo.change,
    percentChange: priceInfo.pChange,
    open: priceInfo.open,
    high: priceInfo.intraDayHighLow && priceInfo.intraDayHighLow.max,
    low: priceInfo.intraDayHighLow && priceInfo.intraDayHighLow.min,
    previousClose: priceInfo.previousClose,
    lastUpdated: metadata.lastUpdateTime || ""
  };
}

function getMarketTone(percentChange) {
  const move = toNumber(percentChange);
  if (move == null) {
    return "neutral";
  }
  if (move >= 0.6) {
    return "positive";
  }
  if (move <= -0.6) {
    return "negative";
  }
  return "neutral";
}

function getTrendLabel(percentChange) {
  const move = toNumber(percentChange);
  if (move == null) {
    return "Steady session";
  }
  if (move >= 1) {
    return "Strong upward session";
  }
  if (move >= 0.2) {
    return "Positive bias";
  }
  if (move <= -1) {
    return "Sharp corrective move";
  }
  if (move <= -0.2) {
    return "Under mild pressure";
  }
  return "Range-bound trade";
}

function buildSessionSummary(snapshot, rangePosition, tone) {
  const change = toNumber(snapshot.change);
  const percentChange = toNumber(snapshot.percentChange);
  const label = snapshot.label;

  if (percentChange == null) {
    return `${label} is trading near Rs ${formatNumber(snapshot.lastPrice) || snapshot.lastPrice}. Market prices can change quickly during the session.`;
  }

  if (tone === "positive") {
    if (rangePosition != null && rangePosition >= 70) {
      return `${label} is holding near the top of today's range, suggesting buyers are still in control for now.`;
    }
    return `${label} is trading higher by ${formatNumber(percentChange)} percent, which points to a constructive intraday tone so far.`;
  }

  if (tone === "negative") {
    if (rangePosition != null && rangePosition <= 30) {
      return `${label} is hovering near the lower end of today's range, which usually signals intraday weakness.`;
    }
    return `${label} is down ${formatNumber(Math.abs(percentChange))} percent today, showing a softer market tone in the current session.`;
  }

  if (change != null && Math.abs(change) < 0.1) {
    return `${label} is almost flat today, so the market is still looking for direction.`;
  }

  return `${label} is moving in a relatively balanced range today, without a strong directional signal yet.`;
}

function buildWatchText(snapshot, rangePosition) {
  const high = toNumber(snapshot.high);
  const low = toNumber(snapshot.low);
  const lastPrice = toNumber(snapshot.lastPrice);

  if (high == null || low == null || lastPrice == null || high === low) {
    return "Watch whether the price can sustain above the current level or slips back as the session develops.";
  }

  if (rangePosition >= 75) {
    return `The immediate level to watch is the day high near Rs ${formatNumber(high)}. A hold near this zone would keep momentum supportive.`;
  }

  if (rangePosition <= 25) {
    return `The immediate level to watch is the day low near Rs ${formatNumber(low)}. If that area breaks, pressure can stay elevated.`;
  }

  return `The price is sitting in the middle of today's range, so watch for a move toward Rs ${formatNumber(high)} on the upside or Rs ${formatNumber(low)} on the downside.`;
}

function buildMarketInsights(snapshot) {
  const lastPrice = toNumber(snapshot.lastPrice);
  const open = toNumber(snapshot.open);
  const high = toNumber(snapshot.high);
  const low = toNumber(snapshot.low);
  const previousClose = toNumber(snapshot.previousClose);
  const percentChange = toNumber(snapshot.percentChange);
  const change = toNumber(snapshot.change);
  const range = high != null && low != null ? high - low : null;
  const rangePosition = range && lastPrice != null ? clamp(((lastPrice - low) / range) * 100, 0, 100) : null;
  const volatilityPct = range != null && previousClose ? (range / previousClose) * 100 : null;
  const tone = getMarketTone(percentChange);
  const trendLabel = getTrendLabel(percentChange);
  const gapFromOpen = lastPrice != null && open != null ? lastPrice - open : null;

  const bullets = [];
  if (change != null && percentChange != null) {
    bullets.push(`The session move is ${change >= 0 ? "up" : "down"} Rs ${formatNumber(Math.abs(change))} (${formatNumber(Math.abs(percentChange))} percent) versus the previous close.`);
  }
  if (gapFromOpen != null) {
    bullets.push(`Compared with the opening level, the price is ${gapFromOpen >= 0 ? "higher" : "lower"} by Rs ${formatNumber(Math.abs(gapFromOpen))}.`);
  }
  if (volatilityPct != null) {
    bullets.push(`Today's visible trading range is about ${formatNumber(volatilityPct)} percent from low to high, which gives a quick read on intraday volatility.`);
  }
  bullets.push(buildWatchText(snapshot, rangePosition));

  return {
    instrumentType: snapshot.type,
    label: snapshot.label,
    symbol: snapshot.symbol || "",
    lastPrice,
    change,
    percentChange,
    open,
    high,
    low,
    previousClose,
    lastUpdated: snapshot.lastUpdated || "",
    tone,
    trendLabel,
    rangePosition,
    supportLevel: low,
    resistanceLevel: high,
    volatilityPct,
    summary: buildSessionSummary(snapshot, rangePosition, tone),
    watchText: buildWatchText(snapshot, rangePosition),
    bullets: bullets.slice(0, 4)
  };
}

function buildMarketContext(snapshot, marketData) {
  if (!snapshot || !marketData) {
    return "";
  }

  const marketSourceLabel = snapshot.marketSource ? `${snapshot.marketSource} public market data` : "public market data";
  const lines = [
    `Live market snapshot from ${marketSourceLabel}:`,
    `Instrument: ${snapshot.label}${snapshot.symbol ? ` (${snapshot.symbol})` : ""}`,
    `Last price: Rs ${formatNumber(snapshot.lastPrice) || snapshot.lastPrice}`,
    `Trend label: ${marketData.trendLabel}`,
    `Session summary: ${marketData.summary}`
  ];

  if (snapshot.change != null && snapshot.percentChange != null) {
    lines.push(`Change: ${formatNumber(snapshot.change) || snapshot.change} (${snapshot.percentChange}%)`);
  }
  if (snapshot.open != null) {
    lines.push(`Open: Rs ${formatNumber(snapshot.open) || snapshot.open}`);
  }
  if (snapshot.high != null) {
    lines.push(`Day high: Rs ${formatNumber(snapshot.high) || snapshot.high}`);
  }
  if (snapshot.low != null) {
    lines.push(`Day low: Rs ${formatNumber(snapshot.low) || snapshot.low}`);
  }
  if (snapshot.previousClose != null) {
    lines.push(`Previous close: Rs ${formatNumber(snapshot.previousClose) || snapshot.previousClose}`);
  }
  if (snapshot.lastUpdated) {
    lines.push(`Last updated: ${snapshot.lastUpdated}`);
  }

  lines.push("Use these values exactly if the user asked for live prices. Mention that market prices can change quickly during market hours. Do not invent technical indicators that were not provided. You may give a neutral market view such as bullish intraday bias, bearish intraday bias, range-bound setup, watchlist candidate, research further, or high-risk setup if it is clearly supported by the provided data. Do not convert that view into a buy, sell, entry, exit, target, or stop-loss instruction. If the user asks for personalised buy or sell advice, do not recommend a security and follow the advisor escalation rule. End stock and index analysis with the required informational-analysis disclaimer.");
  return lines.join("\n");
}

function buildMissingNewsContextMessage(routeInfo, marketData, marketNote = "") {
  if (routeInfo.route === "hybrid_market_summary") {
    if (marketData && marketData.label) {
      return `${marketData.label} live data is available in the card above, but I do not have fresh market-news context loaded right now for a reliable full market summary. I can explain the index move and key levels from the live snapshot, but I should not guess about today's main drivers without recent news documents.`;
    }

    if (marketNote) {
      return `I could not fetch live market data right now, and I also do not have fresh market-news context loaded in the app. That means I cannot produce a reliable market summary for today without guessing. Please try again in a moment, or add recent market-news documents to the knowledge base.`;
    }
  }

  if (routeInfo.route === "hybrid_market_news" && marketData && marketData.label) {
    return `${marketData.label} live data is available in the card above, but I do not have fresh news context loaded right now for a reliable summary of the latest market themes. I would rather not guess. Once recent market-news items are added to the app knowledge base, I can group them into clear themes and explain what is driving the move.`;
  }

  return "I can summarise the latest market news themes only when recent news context has been loaded into this app. I do not have fresh news documents available right now, so I would rather not guess. Once recent market-news items are added to the knowledge base, I can group them into themes like rates, liquidity, earnings, and sector rotation in a much more useful way.";
}

async function maybeBuildMarketContext(userMessage) {
  const request = extractInstrumentRequest(userMessage);
  if (!request) {
    return { context: "", note: "", marketData: null };
  }

  try {
    const snapshot = request.type === "index"
      ? await fetchIndexSnapshot(request.indexName)
      : await fetchEquitySnapshot(request.query);

    if (!snapshot) {
      return {
        context: "",
        note: "I could not fetch that live market price right now. Please try again in a moment, or ask for Nifty 50, Sensex, or a listed NSE stock by name.",
        marketData: null
      };
    }

    const marketData = buildMarketInsights(snapshot);
    return {
      context: buildMarketContext(snapshot, marketData),
      note: "",
      marketData
    };
  } catch (error) {
    console.error("[market] Failed to build market context:", error);
    return {
      context: "",
      note: "I could not fetch live market data right now. Please try again in a moment.",
      marketData: null
    };
  }
}
app.get("/api/health", (_req, res) => {
  res.json({ status: "ok" });
});

// ------------------------------------------------------------------
// Stock lookup: resolve a holding name to symbol + live market data
// ------------------------------------------------------------------
app.get("/api/stock-lookup", async (req, res) => {
  const query = typeof req.query.q === "string" ? req.query.q.trim() : "";
  if (!query) {
    return res.status(400).json({ error: "Missing query parameter ?q=<stock name>" });
  }

  try {
    const symbol = await resolveEquitySymbol(query);
    if (!symbol) {
      return res.status(404).json({ error: "Could not resolve a symbol for that name." });
    }

    const payload = await nseFetchJson(`/api/quote-equity?symbol=${encodeURIComponent(symbol)}`);
    const priceInfo = payload.priceInfo || {};
    const info = payload.info || {};
    const metadata = payload.metadata || {};

    if (!priceInfo.lastPrice && !metadata.lastPrice) {
      return res.status(404).json({ error: "No price data found for that symbol." });
    }

    const industry = info.industry || metadata.industry || "";

    return res.json({
      symbol,
      name: info.companyName || metadata.symbol || symbol,
      currentPrice: priceInfo.lastPrice || metadata.lastPrice,
      dayChangePct: priceInfo.pChange != null ? priceInfo.pChange : 0,
      sector: industry || "Unclassified",
      assetType: "Equity",
      marketCap: classifyMarketCap(metadata.macro),
      previousClose: priceInfo.previousClose || null,
      open: priceInfo.open || null,
      high: priceInfo.intraDayHighLow ? priceInfo.intraDayHighLow.max : null,
      low: priceInfo.intraDayHighLow ? priceInfo.intraDayHighLow.min : null,
      lastUpdated: metadata.lastUpdateTime || ""
    });
  } catch (error) {
    console.error("[stock-lookup] Failed:", error.message || error);
    return res.status(502).json({ error: "Could not fetch stock data right now. Please try again." });
  }
});

function classifyMarketCap(macro) {
  if (!macro) return "Large Cap";
  const lower = String(macro).toLowerCase();
  if (/small/i.test(lower)) return "Small Cap";
  if (/mid/i.test(lower)) return "Mid Cap";
  return "Large Cap";
}

// ------------------------------------------------------------------
// Portfolio insights: AI summary with news, P&L, and market context
// ------------------------------------------------------------------
app.post("/api/portfolio-insights", async (req, res) => {
  const apiKey = (process.env.GROQ_API_KEY || "").trim();
  if (!apiKey) {
    return res.status(500).json({ error: "AI backend not configured." });
  }

  const portfolioSnapshot = req.body.portfolioSnapshot || {};
  const holdingNames = Array.isArray(req.body.holdingNames) ? req.body.holdingNames.slice(0, 20) : [];

  // Fetch market context (NIFTY 50) for general market read
  let marketContext = "";
  try {
    const niftySnapshot = await fetchIndexSnapshot("NIFTY 50");
    if (niftySnapshot) {
      const marketData = buildMarketInsights(niftySnapshot);
      marketContext = buildMarketContext(niftySnapshot, marketData);
    }
  } catch (_e) { /* ignore */ }

  // Fetch news from RAG for holdings + general market
  let holdingNewsContext = "";
  let generalNewsContext = "";
  try {
    const holdingQuery = holdingNames.length
      ? `Latest news about ${holdingNames.slice(0, 5).join(", ")}`
      : "";
    if (holdingQuery) {
      const holdingRetrieval = await retrieveKnowledgeContext(holdingQuery, {
        route: "hybrid_market_news",
        useKnowledgeRetrieval: true,
        knowledgeScopes: ["news"]
      });
      if (holdingRetrieval.context) holdingNewsContext = holdingRetrieval.context;
    }

    const generalRetrieval = await retrieveKnowledgeContext("today's market news themes and global news", {
      route: "hybrid_market_news",
      useKnowledgeRetrieval: true,
      knowledgeScopes: ["news"]
    });
    if (generalRetrieval.context) generalNewsContext = generalRetrieval.context;
  } catch (_e) { /* ignore */ }

  const promptParts = [
    "You are a portfolio analyst for an Indian beginner investor.",
    "Generate a structured portfolio insight with EXACTLY these 4 sections, using these exact headings:",
    "",
    "**Today's P&L Summary**",
    "Summarize the portfolio's daily performance in 2-3 sentences using the data below.",
    "",
    "**Holdings News**",
    "If any recent news is available about the user's holdings, mention it briefly (2-3 bullet points). If no news is available, say 'No recent news found for your holdings.'",
    "",
    "**Market & Sector News**",
    "Summarize 2-3 key market themes, sector moves, or global news items if available. If no news context is available, say 'No fresh market news loaded right now.'",
    "",
    "**Quick Take**",
    "One-line overall read on the portfolio's position today.",
    "",
    "Use the user profile, goals, and plan from the portfolio snapshot when they are provided; keep the advice educational and goal-aware.",
    "Keep total response under 200 words. Do not give buy/sell advice.",
    "",
    `Portfolio snapshot: ${JSON.stringify(portfolioSnapshot)}`,
    holdingNewsContext ? `\nHolding-related news context:\n${holdingNewsContext}` : "",
    generalNewsContext ? `\nGeneral market news context:\n${generalNewsContext}` : "",
    marketContext ? `\nLive market data:\n${marketContext}` : ""
  ];

  try {
    const response = await fetch(GROQ_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 600,
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: promptParts.filter(Boolean).join("\n") }
        ]
      })
    });

    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      return res.status(502).json({ error: "AI provider returned an error." });
    }

    const aiMessage = data && data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content;
    return res.json({
      summary: aiMessage || "",
      hasHoldingNews: !!holdingNewsContext,
      hasMarketNews: !!generalNewsContext,
      hasMarketData: !!marketContext
    });
  } catch (_error) {
    return res.status(502).json({ error: "Could not connect to AI provider." });
  }
});
app.post("/api/chat", async (req, res) => {
  const apiKey = (process.env.GROQ_API_KEY || "").trim();
  if (!apiKey) {
    return res.status(500).json({ error: "The AI backend is not configured yet. Add GROQ_API_KEY to backend/.env." });
  }

  const userMessage = typeof req.body.userMessage === "string" ? req.body.userMessage.trim() : "";
  const conversationHistory = sanitizeHistory(req.body.conversationHistory);
  const routeInfo = classifyQuery(userMessage);

  if (!userMessage) {
    return res.status(400).json({ error: "Please send a message before calling the AI backend." });
  }

  const marketInfo = routeInfo.useMarketData
    ? await maybeBuildMarketContext(userMessage)
    : { context: "", note: "", marketData: null };
  const retrievalInfo = routeInfo.useKnowledgeRetrieval
    ? await retrieveKnowledgeContext(userMessage, routeInfo)
    : { context: "", sources: [], matches: [] };

  const isHybridMarketRoute = routeInfo.route === "hybrid_market_news" || routeInfo.route === "hybrid_market_summary";
  const shouldReturnMarketFailureImmediately = routeInfo.route === "live_market" || routeInfo.route === "stock_analysis";

  if (routeInfo.isMarketQuery && marketInfo.note && shouldReturnMarketFailureImmediately) {
    const suggestedQuestions = await generateSuggestedQuestions(apiKey, userMessage, marketInfo.note, marketInfo.marketData);
    return res.json({
      message: marketInfo.note,
      marketData: marketInfo.marketData,
      suggestedQuestions,
      retrievedSources: retrievalInfo.sources,
      route: routeInfo.route
    });
  }

  if (routeInfo.route === "news_rag" && !retrievalInfo.sources.length) {
    const missingNewsMessage = buildMissingNewsContextMessage(routeInfo, marketInfo.marketData, marketInfo.note);
    const suggestedQuestions = await generateSuggestedQuestions(apiKey, userMessage, missingNewsMessage, marketInfo.marketData);
    return res.json({
      message: missingNewsMessage,
      marketData: marketInfo.marketData,
      suggestedQuestions,
      retrievedSources: [],
      route: routeInfo.route
    });
  }

  if (routeInfo.route === "hybrid_market_news" && !retrievalInfo.sources.length) {
    const missingNewsMessage = buildMissingNewsContextMessage(routeInfo, marketInfo.marketData, marketInfo.note);
    const suggestedQuestions = await generateSuggestedQuestions(apiKey, userMessage, missingNewsMessage, marketInfo.marketData);
    return res.json({
      message: missingNewsMessage,
      marketData: marketInfo.marketData,
      suggestedQuestions,
      retrievedSources: [],
      route: routeInfo.route
    });
  }

  if (routeInfo.route === "hybrid_market_summary" && !retrievalInfo.sources.length && !marketInfo.marketData) {
    const missingSummaryMessage = buildMissingNewsContextMessage(routeInfo, marketInfo.marketData, marketInfo.note);
    const suggestedQuestions = await generateSuggestedQuestions(apiKey, userMessage, missingSummaryMessage, marketInfo.marketData);
    return res.json({
      message: missingSummaryMessage,
      marketData: marketInfo.marketData,
      suggestedQuestions,
      retrievedSources: [],
      route: routeInfo.route
    });
  }

  const messages = [{ role: "system", content: SYSTEM_PROMPT }];
  if (routeInfo.route === "hybrid_market_summary") {
    messages.push({
      role: "system",
      content: "The user wants a market summary for today. If both live market data and retrieved news context are available, combine them into a concise summary covering index move, major drivers, sector tone, and what to watch. If only live market data is available, give a price-led market summary and clearly say that fresh news context is limited. If only retrieved news context is available, give a news-led summary and clearly say that live market levels are unavailable. Do not guess missing data."
    });
  } else if (routeInfo.route === "hybrid_market_news") {
    messages.push({
      role: "system",
      content: "The user wants current market-news context. If live market data is also available, use it as supporting context. If live market data is unavailable but retrieved news context exists, still answer using the retrieved news and be explicit about the missing live snapshot."
    });
  }

  if (isHybridMarketRoute && marketInfo.note && !marketInfo.marketData) {
    messages.push({
      role: "system",
      content: `Live market snapshot status: ${marketInfo.note} If retrieved news context is available, still answer using it and clearly state that live index levels could not be fetched.`
    });
  }
  if (marketInfo.context) {
    messages.push({ role: "system", content: marketInfo.context });
  }
  if (retrievalInfo.context) {
    messages.push({ role: "system", content: retrievalInfo.context });
  } else if (routeInfo.useKnowledgeRetrieval) {
    messages.push({
      role: "system",
      content: "No matching knowledge-base documents were retrieved for this request. If the user is asking about current rules, latest guidelines, or recent news, avoid overstating freshness and be transparent about uncertainty."
    });
  }
  messages.push(...conversationHistory);

  try {
    const response = await fetch(GROQ_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 1024,
        messages
      })
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      if (response.status === 429) {
        return res.status(429).json({ error: "You have hit Groq's free tier rate limit. Please wait about a minute and try again." });
      }

      if (response.status === 401) {
        return res.status(500).json({ error: "The backend Groq API key is invalid. Please update backend/.env." });
      }

      return res.status(502).json({
        error: data && data.error && data.error.message ? data.error.message : "The AI provider returned an error."
      });
    }

    const assistantMessage = data && data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content;
    if (!assistantMessage) {
      return res.status(502).json({ error: "The AI provider returned an empty response." });
    }

    const suggestedQuestions = await generateSuggestedQuestions(apiKey, userMessage, assistantMessage, marketInfo.marketData);
    return res.json({
      message: assistantMessage,
      marketData: marketInfo.marketData,
      suggestedQuestions,
      retrievedSources: retrievalInfo.sources,
      route: routeInfo.route
    });
  } catch (_error) {
    return res.status(502).json({ error: "Could not connect. Please check your internet connection and try again." });
  }
});

app.get("*", (_req, res) => {
  res.sendFile(path.join(frontendDir, "index.html"));
});

app.listen(PORT, () => {
  console.log(`Financial Companion server running on http://localhost:${PORT}`);
});
