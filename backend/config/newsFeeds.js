export const DEFAULT_NEWS_FEEDS = [
  {
    name: "Mint Markets",
    url: "https://www.livemint.com/rss/markets"
  },
  {
    name: "Mint Money",
    url: "https://www.livemint.com/rss/money"
  },
  {
    name: "Mint Companies",
    url: "https://www.livemint.com/rss/companies"
  }
];

export function getConfiguredNewsFeeds() {
  const rawValue = String(process.env.NEWS_FEED_URLS || "").trim();
  if (!rawValue) {
    return DEFAULT_NEWS_FEEDS;
  }

  return rawValue
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean)
    .map((entry, index) => {
      const separatorIndex = entry.indexOf("|");
      if (separatorIndex === -1) {
        return {
          name: `Feed ${index + 1}`,
          url: entry
        };
      }

      return {
        name: entry.slice(0, separatorIndex).trim() || `Feed ${index + 1}`,
        url: entry.slice(separatorIndex + 1).trim()
      };
    })
    .filter((feed) => /^https?:\/\//i.test(feed.url));
}
