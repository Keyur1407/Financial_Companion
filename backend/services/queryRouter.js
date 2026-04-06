const MARKET_SUMMARY_PATTERN = /(today'?s market summary|market summary|daily market summary|market recap|market wrap|give me (?:today'?s )?market summary|summari[sz]e (?:today'?s )?market|how did the market do today|how was the market today|what happened in the market today|market trend today|market outlook today|market sentiment today|market direction today)/i;
const MARKET_NEWS_PATTERN = /(latest news|market news|news today|today'?s news|recent news|recent update|latest update|what happened today|what are the latest market themes|market themes|news themes|what is driving the market|what's driving the market|drivers of the market|market trend|market trends|sentiment|headline|headlines|policy update|announcement)/i;
const MARKET_SNAPSHOT_PATTERN = /(\bnifty\b|bank nifty|sensex|share price|stock price|market price|price of|quote of|current price|latest price|live price|market today|current market)/i;
const STOCK_ANALYSIS_PATTERN = /(\b(?:analy[sz]e|analysis|outlook|trend|support|resistance|bullish|bearish|momentum|volatility|setup|levels to watch)\b.*\b(stock|share|nifty|bank nifty|sensex|market)\b|\b(stock|share|nifty|bank nifty|sensex|market)\b.*\b(?:analy[sz]e|analysis|outlook|trend|support|resistance|bullish|bearish|momentum|volatility|setup)\b)/i;
const BROAD_MARKET_REFERENCE_PATTERN = /(\bmarket\b|\bnifty\b|bank nifty|sensex)/i;
const REGULATORY_QUERY_PATTERN = /(sebi|guideline|guidelines|rule|rules|circular|master circular|regulation|regulations|kyc|nominee|nomination|compliance|riskometer|disclosure|advisor regulations|investor charter|scores|grievance|complaint|mutual fund regulations|investment adviser|research analyst|portfolio manager|portfolio management|pms|aif|invit|reit|insider trading|takeover code|lodr|icdr|broker compliance|demat rules|ipo rules)/i;

export function isMarketQuery(message) {
  const text = typeof message === "string" ? message.trim() : "";
  return MARKET_SUMMARY_PATTERN.test(text)
    || MARKET_SNAPSHOT_PATTERN.test(text)
    || STOCK_ANALYSIS_PATTERN.test(text)
    || (MARKET_NEWS_PATTERN.test(text) && BROAD_MARKET_REFERENCE_PATTERN.test(text));
}

export function classifyQuery(message) {
  const text = typeof message === "string" ? message.trim() : "";
  const hasRegulatoryIntent = REGULATORY_QUERY_PATTERN.test(text);
  const hasMarketSummaryIntent = MARKET_SUMMARY_PATTERN.test(text);
  const hasMarketNewsIntent = MARKET_NEWS_PATTERN.test(text);
  const hasMarketSnapshotIntent = MARKET_SNAPSHOT_PATTERN.test(text);
  const hasStockAnalysisIntent = STOCK_ANALYSIS_PATTERN.test(text);
  const hasBroadMarketReference = BROAD_MARKET_REFERENCE_PATTERN.test(text);
  const hasHybridMarketNewsIntent = hasMarketNewsIntent && hasBroadMarketReference;

  if (hasMarketSummaryIntent) {
    return {
      route: "hybrid_market_summary",
      useMarketData: true,
      useKnowledgeRetrieval: true,
      knowledgeScopes: ["news"],
      isMarketQuery: true
    };
  }

  if (hasHybridMarketNewsIntent) {
    return {
      route: "hybrid_market_news",
      useMarketData: true,
      useKnowledgeRetrieval: true,
      knowledgeScopes: ["news"],
      isMarketQuery: true
    };
  }

  if (hasStockAnalysisIntent) {
    return {
      route: "stock_analysis",
      useMarketData: true,
      useKnowledgeRetrieval: false,
      knowledgeScopes: [],
      isMarketQuery: true
    };
  }

  if (hasMarketSnapshotIntent) {
    return {
      route: "live_market",
      useMarketData: true,
      useKnowledgeRetrieval: false,
      knowledgeScopes: [],
      isMarketQuery: true
    };
  }

  if (hasRegulatoryIntent) {
    return {
      route: "regulatory_rag",
      useMarketData: false,
      useKnowledgeRetrieval: true,
      knowledgeScopes: ["regulatory"],
      isMarketQuery: false
    };
  }

  if (hasMarketNewsIntent) {
    return {
      route: "news_rag",
      useMarketData: false,
      useKnowledgeRetrieval: true,
      knowledgeScopes: ["news"],
      isMarketQuery: false
    };
  }

  return {
    route: "general_llm",
    useMarketData: false,
    useKnowledgeRetrieval: false,
    knowledgeScopes: [],
    isMarketQuery: false
  };
}
