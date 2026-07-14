# Benchmark collection workspace

Place de-identified JSON records in `benchmark/input/`, then run:

```bash
npm run benchmark:aggregate
```

Accepted record shape:

```json
{
  "id": "nonidentifying_token_000001",
  "platform": "WordPress",
  "visibleAuthor": true,
  "dateModified": true,
  "thinServerHtml": false,
  "citationLinks": 6,
  "scores": { "technical": 82, "geo": 70, "aeo": 76, "rag": 68, "llmo": 65 }
}
```

Do not store URLs, hostnames, raw HTML, article text, IP addresses, API keys, or personal data in this workspace. The aggregator validates fields and writes only aggregate output to `public/data/`.
