import fs from "fs/promises";
import path from "path";
import crypto from "crypto";
import { fileURLToPath } from "url";
import { getConfiguredNewsFeeds } from "../config/newsFeeds.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const NEWS_OUTPUT_DIR = path.resolve(__dirname, "../../data/knowledge/raw/news/ingested");
const MANIFEST_PATH = path.resolve(__dirname, "../../data/knowledge/processed/news-manifest.json");
const FETCH_TIMEOUT_MS = Number(process.env.NEWS_FETCH_TIMEOUT_MS) || 12000;
const MAX_ARTICLES_PER_FEED = Number(process.env.NEWS_MAX_ARTICLES_PER_FEED) || 12;
const MAX_TOTAL_ARTICLES = Number(process.env.NEWS_MAX_TOTAL_ARTICLES) || 30;
const USER_AGENT = "FinancialCompanionNewsBot/1.0 (+https://example.local)";

function decodeHtmlEntities(value) {
  return String(value || "")
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&#x([0-9a-f]+);/gi, (_match, hex) => String.fromCodePoint(parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_match, num) => String.fromCodePoint(parseInt(num, 10)));
}

function stripHtml(value) {
  return decodeHtmlEntities(String(value || ""))
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function getTagValue(block, tagNames) {
  for (const tagName of tagNames) {
    const pattern = new RegExp(`<${tagName}[^>]*>([\\s\\S]*?)<\/${tagName}>`, "i");
    const match = block.match(pattern);
    if (match && match[1]) {
      return stripHtml(match[1]);
    }
  }
  return "";
}

function getAtomLink(block) {
  const hrefMatch = block.match(/<link[^>]+href=["']([^"']+)["'][^>]*>/i);
  return hrefMatch && hrefMatch[1] ? hrefMatch[1].trim() : "";
}

function normalizeDate(value) {
  const parsed = Date.parse(value || "");
  if (!Number.isFinite(parsed)) {
    return "";
  }
  return new Date(parsed).toISOString();
}

function slugify(value) {
  return String(value || "article")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80) || "article";
}

function deriveTags(...values) {
  const text = values.join(" ").toLowerCase();
  const keywordMap = [
    ["nifty", /\bnifty\b/],
    ["bank-nifty", /bank nifty/],
    ["sensex", /\bsensex\b/],
    ["earnings", /earnings|results|profit|revenue/],
    ["rates", /interest rate|repo|rbi|fed/],
    ["inflation", /inflation|cpi|wpi/],
    ["liquidity", /liquidity|fii|dii|flows?/],
    ["rupee", /rupee|inr|usd\/inr/],
    ["crude", /crude|oil|brent/],
    ["banking", /bank|nbfc/],
    ["it", /it stocks?|software|technology/],
    ["auto", /auto|automobile/],
    ["pharma", /pharma|healthcare/],
    ["market-news", /market|stocks?|shares?|equities/]
  ];

  return keywordMap.filter(([, pattern]) => pattern.test(text)).map(([tag]) => tag);
}

function buildSummary(description, content) {
  const basis = description || content;
  if (!basis) {
    return "";
  }
  const clean = stripHtml(basis);
  if (clean.length <= 220) {
    return clean;
  }
  return `${clean.slice(0, 217).trimEnd()}...`;
}

function buildContent(title, description, content) {
  return [title, stripHtml(description), stripHtml(content)]
    .filter(Boolean)
    .join("\n\n")
    .trim();
}

function parseFeedItems(xml, feedName) {
  const itemBlocks = xml.match(/<item\b[\s\S]*?<\/item>/gi) || xml.match(/<entry\b[\s\S]*?<\/entry>/gi) || [];

  return itemBlocks.map((block) => {
    const title = getTagValue(block, ["title"]);
    const description = getTagValue(block, ["description", "summary"]);
    const content = getTagValue(block, ["content:encoded", "content"]);
    const link = getTagValue(block, ["link", "id"]) || getAtomLink(block);
    const publishedAt = normalizeDate(getTagValue(block, ["pubDate", "published", "updated"]));
    const fullContent = buildContent(title, description, content);
    const fingerprint = crypto.createHash("sha1").update(`${link}|${title}|${publishedAt}`).digest("hex");

    return {
      title,
      sourceUrl: link,
      publishedAt,
      category: "market_news",
      sourceType: "market_news",
      tags: deriveTags(title, description, content),
      summary: buildSummary(description, content),
      content: fullContent,
      publisher: feedName,
      fingerprint
    };
  }).filter((item) => item.title && item.content && item.sourceUrl);
}

async function fetchFeed(feed) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  try {
    const response = await fetch(feed.url, {
      headers: {
        "user-agent": USER_AGENT,
        accept: "application/rss+xml, application/xml, text/xml, */*"
      },
      signal: controller.signal
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const xml = await response.text();
    return parseFeedItems(xml, feed.name).slice(0, MAX_ARTICLES_PER_FEED);
  } finally {
    clearTimeout(timeout);
  }
}

async function clearGeneratedNewsDirectory() {
  await fs.mkdir(NEWS_OUTPUT_DIR, { recursive: true });
  const entries = await fs.readdir(NEWS_OUTPUT_DIR, { withFileTypes: true }).catch(() => []);

  await Promise.all(entries
    .filter((entry) => entry.isFile() && entry.name.toLowerCase().endsWith(".json"))
    .map((entry) => fs.unlink(path.join(NEWS_OUTPUT_DIR, entry.name)).catch(() => undefined)));
}

async function writeNewsDocuments(items) {
  await clearGeneratedNewsDirectory();

  await Promise.all(items.map(async (item, index) => {
    const publishedPrefix = item.publishedAt ? item.publishedAt.slice(0, 10) : `undated-${String(index + 1).padStart(2, "0")}`;
    const fileName = `${publishedPrefix}-${slugify(item.title)}-${item.fingerprint.slice(0, 8)}.json`;
    await fs.writeFile(path.join(NEWS_OUTPUT_DIR, fileName), JSON.stringify(item, null, 2));
  }));
}

export async function ingestNewsFeeds() {
  const feeds = getConfiguredNewsFeeds();
  const settled = await Promise.allSettled(feeds.map((feed) => fetchFeed(feed)));
  const unique = new Map();
  const failedFeeds = [];

  settled.forEach((result, index) => {
    if (result.status !== "fulfilled") {
      failedFeeds.push({
        feed: feeds[index].name,
        url: feeds[index].url,
        error: result.reason instanceof Error ? result.reason.message : String(result.reason)
      });
      return;
    }

    result.value.forEach((item) => {
      const existing = unique.get(item.fingerprint);
      if (!existing) {
        unique.set(item.fingerprint, item);
      }
    });
  });

  const items = [...unique.values()]
    .sort((left, right) => Date.parse(right.publishedAt || 0) - Date.parse(left.publishedAt || 0))
    .slice(0, MAX_TOTAL_ARTICLES);

  await writeNewsDocuments(items);
  await fs.writeFile(MANIFEST_PATH, JSON.stringify({
    fetchedAt: new Date().toISOString(),
    feeds,
    fetchedCount: items.length,
    failedFeeds,
    documents: items.map((item) => ({
      title: item.title,
      sourceUrl: item.sourceUrl,
      publishedAt: item.publishedAt,
      publisher: item.publisher,
      fingerprint: item.fingerprint
    }))
  }, null, 2));

  return {
    feeds,
    itemCount: items.length,
    failedFeeds
  };
}

const currentScriptPath = fileURLToPath(import.meta.url);
if (process.argv[1] && path.resolve(process.argv[1]) === currentScriptPath) {
  ingestNewsFeeds()
    .then((result) => {
      console.log(`Fetched ${result.itemCount} market-news documents across ${result.feeds.length} feeds.`);
      if (result.failedFeeds.length) {
        console.log(`Feeds with errors: ${result.failedFeeds.map((item) => item.feed).join(", ")}`);
      }
    })
    .catch((error) => {
      console.error("Failed to ingest market news.");
      console.error(error);
      process.exit(1);
    });
}
