import path from "path";
import { fileURLToPath } from "url";
import { ingestNewsFeeds } from "./ingest-news.js";
import { buildKnowledgeIndex } from "./build-knowledge-index.js";

const __filename = fileURLToPath(import.meta.url);
const currentScriptPath = path.resolve(__filename);

async function main() {
  const ingestionResult = await ingestNewsFeeds();
  const buildResult = await buildKnowledgeIndex();

  console.log(`News refresh complete. ${ingestionResult.itemCount} articles ingested and ${buildResult.itemCount} knowledge chunks built.`);
  if (ingestionResult.failedFeeds.length) {
    console.log(`Feeds with errors: ${ingestionResult.failedFeeds.map((item) => item.feed).join(", ")}`);
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === currentScriptPath) {
  main().catch((error) => {
    console.error("Failed to refresh market-news knowledge.");
    console.error(error);
    process.exit(1);
  });
}
