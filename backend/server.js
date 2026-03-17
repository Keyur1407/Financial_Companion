import path from "path";
import { fileURLToPath } from "url";
import express from "express";
import dotenv from "dotenv";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const frontendDir = path.resolve(__dirname, "../frontend");

const app = express();
const PORT = Number(process.env.PORT) || 3001;
const GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions";
const MODEL = "llama-3.3-70b-versatile";
const NSE_BASE_URL = "https://www.nseindia.com";
const USER_AGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/132.0.0.0 Safari/537.36";
const SYSTEM_PROMPT = `You are the Financial Companion — a warm, knowledgeable, and patient financial assistant built for first-time investors in India.

Your personality:
- Friendly and approachable, like a knowledgeable friend — never formal or corporate
- Use simple language. Avoid jargon. When you must use a financial term, always explain it immediately
- Use Indian context always: rupees, Indian funds, SEBI, Indian tax rules (STCG/LTCG), Indian life goals
- Keep responses concise but complete. Use short paragraphs. Use bullet points only when listing 3 or more items
- Never lecture. Respond to exactly what was asked

Your knowledge scope:
- SIP (Systematic Investment Plan) — what it is, how it works, benefits of rupee cost averaging
- Mutual funds — types (equity, debt, hybrid, liquid, index), how NAV works, how to read fund performance
- Goal-based investing — retirement, child education, home purchase, emergency fund
- Risk profiling — conservative, moderate, aggressive — how to think about risk based on timeline
- Compounding — explain with simple rupee examples
- SIP projections — when asked, calculate and show projected corpus using the formula: FV = P × [((1 + r)^n - 1) / r] × (1 + r) where P = monthly SIP amount, r = monthly interest rate (annual rate divided by 12 divided by 100), n = total number of months. Always show the result clearly with total invested and total returns broken out separately.
- Indian tax rules — STCG at 15% for equity held under 1 year, LTCG at 12.5% above Rs 1.25 lakh for equity held over 1 year
- KYC process — what it involves, Aadhaar and PAN verification, why it is required by SEBI
- Index funds — what they are, why low expense ratio matters, Nifty 50 as the main Indian example
- Emergency fund — why 3 to 6 months of expenses, where to keep it (liquid mutual funds)

Hard rules you must NEVER break:
1. Never recommend a specific mutual fund by name. Never say things like "buy Axis Bluechip Fund" or "invest in HDFC Top 100".
2. Never tell the user to buy or sell any specific investment or security.
3. Never give specific tax advice. Always say "consult a tax professional for your specific situation" when tax questions arise.
4. Always add this exact disclaimer when showing any projection or calculation: "These figures are illustrative only. Mutual fund investments are subject to market risk. Past performance does not guarantee future returns."
5. If the user asks which specific fund to buy, ALWAYS respond with: "For specific fund recommendations tailored to your situation, I would recommend speaking with a SEBI-registered advisor. I can connect you with one through this platform — would you like me to?"
6. Always identify yourself as an AI assistant if the user directly asks whether you are human or AI.

When a user asks for a SIP calculation:
- Ask for monthly SIP amount, duration in years, and expected return rate if not provided
- Suggest 10 to 12 percent per annum as a general illustration for equity
- Show the projected corpus clearly
- Break down total amount invested versus total returns generated
- Always add the projection disclaimer

Escalation triggers — use this exact phrasing when any of these topics come up:
"This is a great question that deserves personalised advice. I would recommend connecting with a SEBI-registered advisor through this platform who can give you a recommendation based on your complete financial picture. Would you like me to set that up?"

Trigger the above escalation response for:
- Questions asking which specific fund to buy or invest in
- Questions asking whether to switch or move existing investments
- Questions asking whether a specific fund is good for them personally
- Any question that implies a specific buy, sell, or switch recommendation
- Questions like "what should I do with my money" seeking a direct personal recommendation

Conversation style:
- Start responses with a direct answer to what was asked. Never start with filler phrases like "Great question!" or "Absolutely!" or "Certainly!"
- Use the Rs or rupee symbol for all amounts
- Give concrete examples with numbers. For example: "If you invest Rs 5,000 per month for 10 years at 12 percent per annum, you would accumulate approximately Rs 11.6 lakhs"
- For live market questions, use the system-provided market snapshot exactly and explain the move, the day range, and key levels to watch in 2 to 4 short paragraphs
- End longer responses with a natural follow-up question to keep the conversation going
- Keep responses under 250 words unless a detailed calculation or explanation is genuinely needed
- Format numbers in Indian style: lakhs and crores, not millions and billions`;

let nseCookies = "";
let nseCookiesFetchedAt = 0;

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

function getBaseHeaders() {
  return {
    "user-agent": USER_AGENT,
    accept: "application/json, text/plain, */*",
    "accept-language": "en-US,en;q=0.9",
    referer: `${NSE_BASE_URL}/`,
    origin: NSE_BASE_URL
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

async function refreshNseCookies() {
  const response = await fetch(`${NSE_BASE_URL}/`, {
    headers: getBaseHeaders()
  });

  nseCookies = extractCookies(response);
  nseCookiesFetchedAt = Date.now();
}

async function nseFetchJson(apiPath, retry = true) {
  if (!nseCookies || Date.now() - nseCookiesFetchedAt > 10 * 60 * 1000) {
    await refreshNseCookies();
  }

  const response = await fetch(`${NSE_BASE_URL}${apiPath}`, {
    headers: {
      ...getBaseHeaders(),
      cookie: nseCookies
    }
  });

  if ((response.status === 401 || response.status === 403) && retry) {
    await refreshNseCookies();
    return nseFetchJson(apiPath, false);
  }

  if (!response.ok) {
    throw new Error(`NSE request failed with status ${response.status}`);
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
  return /(nifty|bank nifty|sensex|share price|stock price|market price|price of|quote of|current price|latest price|live price|market today|current market)/i.test(message);
}

function extractInstrumentRequest(message) {
  const normalized = message.trim();
  const lower = normalized.toLowerCase();

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
    return { type: "unsupported", label: "SENSEX" };
  }

  const patterns = [
    /(?:price of|quote of|current price of|market price of|share price of|stock price of)\s+([a-z0-9&.\-\s]+)$/i,
    /([a-z0-9&.\-\s]+?)\s+(?:share|stock)\s+price$/i
  ];

  for (const pattern of patterns) {
    const match = normalized.match(pattern);
    if (match && match[1]) {
      return { type: "equity", query: match[1].trim() };
    }
  }

  return { type: "index", indexName: "NIFTY 50" };
}

async function fetchIndexSnapshot(indexName) {
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

  const lines = [
    "Live market snapshot from NSE public market data:",
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

  lines.push("Use these values exactly if the user asked for live prices. Mention that market prices can change quickly during market hours. Do not invent technical indicators that were not provided. If the user asks for personalised buy or sell advice, do not recommend a security and follow the advisor escalation rule.");
  return lines.join("\n");
}

async function maybeBuildMarketContext(userMessage) {
  const request = extractInstrumentRequest(userMessage);
  if (!request) {
    return { context: "", note: "", marketData: null };
  }

  if (request.type === "unsupported") {
    return {
      context: "",
      note: `I can currently fetch live NSE prices and Nifty index snapshots, but I could not fetch ${request.label} in this version. Try asking for Nifty 50, Bank Nifty, or an NSE-listed stock price instead.`,
      marketData: null
    };
  }

  try {
    const snapshot = request.type === "index"
      ? await fetchIndexSnapshot(request.indexName)
      : await fetchEquitySnapshot(request.query);

    if (!snapshot) {
      return {
        context: "",
        note: "I could not fetch that live market price right now. Please try again in a moment, or ask for Nifty 50 or a listed NSE stock by name.",
        marketData: null
      };
    }

    const marketData = buildMarketInsights(snapshot);
    return {
      context: buildMarketContext(snapshot, marketData),
      note: "",
      marketData
    };
  } catch (_error) {
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

app.post("/api/chat", async (req, res) => {
  const apiKey = (process.env.GROQ_API_KEY || "").trim();
  if (!apiKey) {
    return res.status(500).json({ error: "The AI backend is not configured yet. Add GROQ_API_KEY to backend/.env." });
  }

  const userMessage = typeof req.body.userMessage === "string" ? req.body.userMessage.trim() : "";
  const conversationHistory = sanitizeHistory(req.body.conversationHistory);

  if (!userMessage) {
    return res.status(400).json({ error: "Please send a message before calling the AI backend." });
  }

  const marketInfo = await maybeBuildMarketContext(userMessage);
  if (looksLikeMarketDataQuery(userMessage) && marketInfo.note) {
    return res.json({ message: marketInfo.note, marketData: marketInfo.marketData });
  }

  const messages = [{ role: "system", content: SYSTEM_PROMPT }];
  if (marketInfo.context) {
    messages.push({ role: "system", content: marketInfo.context });
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

    return res.json({ message: assistantMessage, marketData: marketInfo.marketData });
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
