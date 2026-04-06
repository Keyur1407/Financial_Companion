import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const RAW_DIR = path.resolve(__dirname, "../../data/knowledge/raw");
const OUTPUT_PATH = path.resolve(__dirname, "../../data/knowledge/processed/knowledge-index.json");

function normalizeArray(value) {
  return Array.isArray(value)
    ? value.map((item) => String(item || "").trim()).filter(Boolean)
    : [];
}

function inferKnowledgeArea(entryPath) {
  const relativePath = path.relative(RAW_DIR, entryPath).replace(/\\/g, "/").toLowerCase();
  if (relativePath.startsWith("sebi/")) {
    return "sebi";
  }
  if (relativePath.startsWith("news/")) {
    return "news";
  }
  return "general";
}

function inferSourceType(entryPath) {
  const area = inferKnowledgeArea(entryPath);
  if (area === "sebi") {
    return "regulatory_note";
  }
  return "knowledge_note";
}

function inferAuthority(entryPath, explicitAuthority) {
  if (String(explicitAuthority || "").trim()) {
    return String(explicitAuthority).trim();
  }
  return inferKnowledgeArea(entryPath) === "sebi" ? "SEBI" : "";
}

function inferDocumentType(entryPath, sourceType, explicitDocumentType) {
  if (String(explicitDocumentType || "").trim()) {
    return String(explicitDocumentType).trim();
  }
  if (inferKnowledgeArea(entryPath) === "sebi") {
    return String(sourceType || "").toLowerCase().includes("circular") ? "circular" : "reference_note";
  }
  return "";
}

function slugify(value) {
  return String(value || "document")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60) || "document";
}

function chunkText(text, options = {}) {
  const maxLength = options.maxLength || 900;
  const overlap = options.overlap || 140;
  const normalized = String(text || "").replace(/\r/g, "").trim();
  if (!normalized) {
    return [];
  }

  const paragraphs = normalized.split(/\n\s*\n/).map((item) => item.trim()).filter(Boolean);
  const chunks = [];
  let buffer = "";

  const flush = () => {
    const content = buffer.trim();
    if (!content) {
      return;
    }
    chunks.push(content);
    buffer = content.slice(Math.max(0, content.length - overlap));
  };

  for (const paragraph of paragraphs.length ? paragraphs : [normalized]) {
    if ((buffer + "\n\n" + paragraph).trim().length > maxLength && buffer.trim()) {
      flush();
    }
    buffer = `${buffer}\n\n${paragraph}`.trim();
  }

  flush();
  return chunks;
}

function getChunkingOptions(doc) {
  if (doc.sourceType === "market_news") {
    return {
      maxLength: 700,
      overlap: 80
    };
  }

  if (String(doc.sourceType || "").toLowerCase().includes("reg") || String(doc.documentType || "").toLowerCase().includes("circular")) {
    return {
      maxLength: 760,
      overlap: 120
    };
  }

  return {
    maxLength: 900,
    overlap: 140
  };
}

async function readRawDocuments(directory) {
  const entries = await fs.readdir(directory, { withFileTypes: true }).catch(() => []);
  const docs = [];

  for (const entry of entries) {
    const entryPath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      docs.push(...await readRawDocuments(entryPath));
      continue;
    }

    const extension = path.extname(entry.name).toLowerCase();
    const raw = await fs.readFile(entryPath, "utf8").catch(() => "");
    if (!raw.trim()) {
      continue;
    }

    if (extension === ".json") {
      const parsed = JSON.parse(raw);
      const sourceType = parsed.sourceType || inferSourceType(entryPath);
      docs.push({
        title: parsed.title || path.basename(entry.name, extension),
        sourceType,
        sourceUrl: parsed.sourceUrl || "",
        publishedAt: parsed.publishedAt || "",
        category: parsed.category || "",
        tags: normalizeArray(parsed.tags),
        topics: normalizeArray(parsed.topics),
        summary: parsed.summary || "",
        content: parsed.content || "",
        publisher: parsed.publisher || "",
        authority: inferAuthority(entryPath, parsed.authority),
        documentType: inferDocumentType(entryPath, sourceType, parsed.documentType),
        documentNumber: parsed.documentNumber || "",
        issuedAt: parsed.issuedAt || "",
        effectiveFrom: parsed.effectiveFrom || "",
        filePath: entryPath
      });
      continue;
    }

    if (extension === ".md" || extension === ".txt") {
      const sourceType = inferSourceType(entryPath);
      docs.push({
        title: path.basename(entry.name, extension),
        sourceType,
        sourceUrl: "",
        publishedAt: "",
        category: path.basename(path.dirname(entryPath)),
        tags: [],
        topics: [],
        summary: "",
        content: raw,
        publisher: "",
        authority: inferAuthority(entryPath, ""),
        documentType: inferDocumentType(entryPath, sourceType, ""),
        documentNumber: "",
        issuedAt: "",
        effectiveFrom: "",
        filePath: entryPath
      });
    }
  }

  return docs;
}

export async function buildKnowledgeIndex() {
  const docs = await readRawDocuments(RAW_DIR);
  const items = [];

  docs.forEach((doc) => {
    const parts = chunkText(doc.content, getChunkingOptions(doc));
    parts.forEach((text, index) => {
      items.push({
        id: `${slugify(doc.title)}-${index + 1}`,
        title: doc.title,
        sourceType: doc.sourceType,
        sourceUrl: doc.sourceUrl,
        publishedAt: doc.publishedAt,
        category: doc.category,
        tags: doc.tags,
        topics: doc.topics,
        summary: doc.summary,
        publisher: doc.publisher,
        authority: doc.authority,
        documentType: doc.documentType,
        documentNumber: doc.documentNumber,
        issuedAt: doc.issuedAt,
        effectiveFrom: doc.effectiveFrom,
        text,
        chunkIndex: index,
        sourceFile: path.relative(path.resolve(__dirname, "../.."), doc.filePath).replace(/\\/g, "/")
      });
    });
  });

  const payload = {
    builtAt: new Date().toISOString(),
    itemCount: items.length,
    items
  };

  await fs.writeFile(OUTPUT_PATH, JSON.stringify(payload, null, 2));
  return payload;
}

const currentScriptPath = path.resolve(__filename);
if (process.argv[1] && path.resolve(process.argv[1]) === currentScriptPath) {
  buildKnowledgeIndex()
    .then((result) => {
      console.log(`Knowledge index built with ${result.itemCount} chunks.`);
    })
    .catch((error) => {
      console.error("Failed to build knowledge index.");
      console.error(error);
      process.exit(1);
    });
}
