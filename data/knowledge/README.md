## Knowledge Base

This folder stores the local knowledge source files used by the backend RAG layer.

### Structure

- `raw/sebi/`
  Add regulation notes, investor education guides, KYC references, circular summaries, or platform policy notes.
- `raw/news/`
  Add recent market-news summaries or policy updates when you want the chatbot to ground answers in fresh news context.
- `raw/news/ingested/`
  Auto-generated market-news documents created by the ingestion pipeline.
- `processed/knowledge-index.json`
  Generated retrieval index used at runtime.
- `processed/news-manifest.json`
  Snapshot of the most recently ingested market-news documents.

### Supported raw file formats

- `.json`
- `.md`
- `.txt`

### Recommended JSON shape

```json
{
  "title": "Document title",
  "sourceType": "regulatory_circular",
  "sourceUrl": "https://example.com/source",
  "publishedAt": "2026-03-25T09:30:00.000Z",
  "issuedAt": "2026-03-25T09:30:00.000Z",
  "effectiveFrom": "2026-04-01T00:00:00.000Z",
  "authority": "SEBI",
  "documentType": "master_circular",
  "documentNumber": "SEBI/HO/IMD/IMD-PoD-1/P/CIR/2026/123",
  "category": "mutual_funds",
  "tags": ["sebi", "mutual_funds", "riskometer"],
  "topics": ["riskometer", "scheme disclosure", "investor communication"],
  "summary": "Short summary shown in source chips.",
  "content": "Full text content that will be chunked for retrieval.",
  "publisher": "Securities and Exchange Board of India"
}
```

### Recommended deep SEBI corpus structure

- `raw/sebi/master-circulars/`
  Consolidated master circulars and operational handbooks.
- `raw/sebi/regulations/`
  Regulation summaries and structured notes for LODR, ICDR, PIT, takeover code, mutual funds, AIF, PMS, and RIAs.
- `raw/sebi/faqs/`
  Investor FAQs, SCORES complaint process notes, nominee and KYC explainers.
- `raw/sebi/investor-charters/`
  Investor charter and intermediary responsibility summaries.
- `raw/sebi/circulars/`
  Recent circular summaries with issue dates, document numbers, and effective dates.

### Retrieval tips for a deep regulatory corpus

- Prefer one document per official source or per meaningful section, not one giant combined file.
- Include `authority`, `documentType`, `documentNumber`, `issuedAt`, and `effectiveFrom` for every SEBI document you add.
- Use `topics` for concrete search handles such as `riskometer`, `nomination`, `KYC`, `SCORES`, `mutual_funds`, `AIF`, `PMS`, `ICDR`, `LODR`, or `insider_trading`.
- Keep `summary` short and factual, and put the detailed guidance in `content`.
- When possible, preserve the official source URL so the chatbot can cite it back.

### Build the index only

From `backend/` run:

```bash
npm run build:knowledge
```

### Ingest market news only

From `backend/` run:

```bash
npm run ingest:news
```

### Refresh market news and rebuild the knowledge index

From `backend/` run:

```bash
npm run refresh:news
```

### Environment variables

- `NEWS_FEED_URLS`
  Optional comma-separated list of feed definitions. Use either plain URLs or `Name|URL` entries.
- `NEWS_MAX_ARTICLES_PER_FEED`
  Controls how many stories are kept from each feed.
- `NEWS_MAX_TOTAL_ARTICLES`
  Caps the total generated news documents.
- `NEWS_MAX_AGE_DAYS`
  News older than this is treated as stale for latest-news retrieval.
- `NEWS_FETCH_TIMEOUT_MS`
  Feed-fetch timeout per request.
