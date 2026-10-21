# Proposal

## Why

The React client hand-rolls its server state in `useCrmData`: a single `pending`/`error` pair, manual `AbortController` bookkeeping, request-id race guards, and hand-written cache updates after each mutation. That duplicates the job of a server-state library and makes every new data need (caching a filter, keeping list/detail/summary consistent, retrying a transient failure) a one-off implementation. Adding `@tanstack/react-query` gives the frontend one typed, well-tested owner for fetching, caching, deduplication, and cache invalidation while preserving the payload-first behavior Django already provides.

## What Changes

- Add `@tanstack/react-query` (v5) as a runtime dependency and `@tanstack/react-query-devtools` as a development-only dependency; pin both in `frontend/package-lock.json`.
- Add a single `QueryClient` with explicit defaults (stale time, garbage collection, retry policy, refetch-on-focus) and wrap the app in `QueryClientProvider`; render Devtools only in development.
- Introduce a typed query-key factory for the contact list (filter-scoped), contact detail (id-scoped), and dashboard summary, so cache entries never collide across filters or contacts.
- Seed the cache from Django's embedded payload (`contacts-data`, `detail-data`, `server-data`) as `initialData` with `initialDataUpdatedAt`, so the first paint stays payload-first with no extra list request; keep the single boot fetch when the payload hooks are absent (Vite dev).
- Replace `useCrmData` with feature hooks: queries for list/detail and mutations for create, status change, add note, and delete. The URL stays the source of truth for `q`, `status`, and `contact`; query keys derive from it.
- Keep mutations server-authoritative: write the returned contact/activities/summary into the cache with `setQueryData` and invalidate the affected list keys; add no optimistic updates.
- Replace the global `pending` flag with per-query `isPending`/`isFetching` and per-mutation pending states, so a background revalidation does not blank the list, disable controls, or replace already-rendered data.
- Remove the manual abort/request-id guards in favor of React Query cancellation and deduplication (the existing `request()` helper still receives an `AbortSignal`).
- Keep the existing API contract, initial payload contract, URL behavior, accessibility behavior, and Django tests unchanged.
- Document the new data layer in `REACT_QUERY.md` and reference it from `frontend/README.md`.

## Capabilities

### New Capabilities

- `crm-data-sync`: Client-side server-state behavior for the CRM SPA: payload hydration without a duplicate request, filter/id-scoped caching, background revalidation, deduplication, retry and error semantics, and cache propagation after create/status/note/delete mutations.

### Modified Capabilities

None. `crm-dashboard` and `crm-api` keep their existing requirements; this change replaces the client data layer behind them without changing the observable product behavior they specify.

## Impact

- **Frontend source**: `frontend/package.json` and `package-lock.json`; new `src/providers/` (QueryClient setup) and `src/data/` hooks (`queryKeys`, list/detail queries, mutations); `main.tsx` wraps `App` in the provider; `App.tsx` and panels consume hook results instead of `useCrmData`; `src/data/useCrmData.ts` is removed.
- **Unchanged contracts**: `src/lib/api.ts` request/CSRF behavior, the Django JSON endpoints and error shapes, the server-rendered payload hooks, URL state (`q`, `status`, `contact`), and the legacy form POST shim.
- **Dependencies**: one new runtime package and one dev-only package; Node 22+ requirement unchanged. React 19 is supported by React Query v5.
- **Verification**: `npm run build` (`tsc -b` + Vite), `npm run lint`, and the existing `python manage.py test crm` suite continue to pass; React Query Devtools is used for cache inspection in development.
- **Out of scope**: backend/API changes, new UI features, optimistic updates or offline mutation queues, infinite scroll/pagination (the API is unpaginated), a client-side router, a form library (`react-hook-form`/Zod), a CSS framework, and a new frontend test framework.
