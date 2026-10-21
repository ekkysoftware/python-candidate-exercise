### Overview

The CRM frontend uses `@tanstack/react-query` v5 as the single owner of server state. Django still embeds the first payload, which hydrates the query cache without an extra request; later list and detail reads are cached per filter or contact, revalidated in the background, and kept consistent after create, status, note, and delete mutations. URL parameters remain the source of truth for search, status, and selection.

### Pros

- Replaces the hand-written `useCrmData` state machine, including manual abort handling, request-id race guards, and hand-maintained list/detail/summary updates.
- Preserves payload-first rendering through `initialData` and `initialDataUpdatedAt`, so the first paint still uses Django's embedded data with no duplicate boot request.
- Caches each filter and contact separately, making revisits instant while still revalidating stale data on focus or reconnect.
- Deduplicates concurrent reads and cancels superseded requests, so rapid filter changes cannot render an older response over a newer one.
- Centralizes mutation propagation: status changes update detail, list rows, ordering, and summary; notes update only detail; deletes remove detail and invalidate lists.
- Separates foreground loading from background refreshing, so revalidation does not blank the UI, disable unrelated controls, or clear drafts.
- Provides explicit retry semantics: reads retry once except for 4xx responses, while writes never retry automatically.
- Integrates cleanly with the existing URL-driven behavior and gives developers typed hooks plus dev-only cache inspection through Devtools.
- Keeps the production bundle free of Devtools; only the small React Query runtime is shipped.

### Cons

- Adds a runtime dependency and increases the client bundle (roughly 37 KB raw / 11 KB gzipped in the current build).
- Introduces more concepts for contributors than the previous local hook: query keys, cache invalidation, hydration gating, and mutation propagation.
- Hydration must be gated to the boot filter and contact; an incorrect gate could briefly seed the cache with the wrong list or detail.
- The global summary is duplicated across cached list entries, so every mutation that changes it must update all list keys or rely on invalidation.
- Background revalidation can remove or reorder the selected contact, which requires the URL-repair and selection-fallback logic to stay correct.
- Server-authoritative mutations wait for the API response instead of applying optimistic updates, so slow writes feel less immediate.
- The query cache consumes memory until entries are garbage-collected, and tuning `staleTime`/`gcTime` affects freshness and request volume.
- Cache behavior currently has no automated frontend test coverage; verification depends on build/lint checks and manual Devtools inspection.
- Devtools are available only in development, so diagnosing cache issues in production requires other instrumentation.
