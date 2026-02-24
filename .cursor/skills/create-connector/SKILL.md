---
name: create-connector
description: Add a new source connector to the Toth worker for catalog ingestion. Use when adding a new ebook source, implementing a connector for an external catalog, or when the user asks to create or add a connector.
---

# Create a Source Connector

Add a new connector so the worker can ingest editions from an external catalog. Connectors live in `apps/worker/src/connectors/` and implement the `SourceConnector` interface from `@toth/shared`.

## Checklist

- [ ] Add the connector type to `packages/shared/src/constants.ts` (`CONNECTOR_TYPES`)
- [ ] Implement a class that implements `SourceConnector` in `apps/worker/src/connectors/<name>.connector.ts`
- [ ] Register the implementation in `apps/worker/src/connectors/connector-registry.ts`
- [ ] (Optional) Add a migration in `apps/api/src/migrations/` to seed the source row

## 1. Add connector type

In `packages/shared/src/constants.ts`, add a new entry to `CONNECTOR_TYPES` (lowercase, snake_case), e.g. `'my_source'`. The type is inferred from the array.

## 2. Implement the connector

Create `apps/worker/src/connectors/<name>.connector.ts`.

**Interface** (from `@toth/shared`):

```ts
interface SourceConnector {
  readonly sourceId: string;
  fetchCatalog(): AsyncGenerator<RawEditionRecord, void, unknown>;
  healthCheck(): Promise<boolean>;
}
```

**Constructor**: Accept `sourceId: string` and assign to `public readonly sourceId`.

**fetchCatalog**: An async generator that yields `RawEditionRecord`. Use `connectorFetchOptions()`, `fetchWithRetry()`, `delayBetweenPages(ms)`, and `throttle(ms)` from `./http` for requests. Respect rate limits (delay between pages and between per-item requests when needed).

**healthCheck**: Return `true` if the source is reachable (e.g. fetch a known URL and check `res.ok`), `false` on failure. Use try/catch and do not throw.

**RawEditionRecord** (from `@toth/shared`):

- `source_id`, `external_id`, `title`, `authors` (string[]), `language`, `description` (string | null), `subjects` (string[]), `license`, `download_url`, `file_size` (number | null), `published_date` (string | null), `cover_url` (string | null)

Use a supported license from `SUPPORTED_LICENSES` in `@toth/shared` when possible (e.g. `'public-domain'`, `'cc-by'`).

**Patterns**:

- Pagination: loop with `delayBetweenPages()` between page requests; break when no items or error (e.g. 404).
- Listing + detail: fetch listing pages, then optionally fetch each item for authors/download URL; use `throttle()` between detail requests.
- API vs HTML: use `fetchWithRetry(url, connectorFetchOptions())`; for JSON use `res.json()`, for HTML use `res.text()` and parse (regex or structure as in existing connectors).

Reference implementations: `gutenberg.connector.ts` (HTML listing, one page type), `epub-gratis.connector.ts` (listing + detail pages), `open-library.connector.ts` (JSON API).

## 3. Register in the registry

In `apps/worker/src/connectors/connector-registry.ts`:

1. Import the new connector class.
2. Add an entry to `CONNECTOR_IMPLEMENTATIONS`: key = connector type (same as in `CONNECTOR_TYPES`), value = the class constructor.

No other call sites need changes; the ingestion service uses `createConnector(type, sourceId)` from the registry.

## 4. (Optional) Seed the source

To make the source available in the app, add a migration under `apps/api/src/migrations/` that inserts into `sources` with the same `connector_type` as in `CONNECTOR_TYPES`. Follow the pattern in `1730000000009-SeedEpubGratisSource.ts`: insert with `name`, `base_url`, `trust_score`, `license_type`, `connector_type`, `legal_basis` and use a `WHERE NOT EXISTS` on `connector_type` to avoid duplicates.

## Tests

Add a spec file `apps/worker/src/connectors/<name>.connector.spec.ts`. See `gutenberg.connector.spec.ts` or `epub-gratis.connector.spec.ts` for structure (e.g. healthCheck and fetchCatalog behavior with mocked fetch).
