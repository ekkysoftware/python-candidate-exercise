# Design

## Context

See `proposal.md` — Why, and `specs/crm-data-sync/spec.md` for the behavior contract. `crm-dashboard` and `crm-api` remain the product/API contracts.

Verified current state:

- `frontend/` is a Vite 8 + React 19 + TypeScript 6 SPA. `src/lib/api.ts` exposes `request<T>()` with CSRF bootstrap, `ApiError` (message + optional field errors), and abort-signal support.
- `src/data/useCrmData.ts` owns all server state as `useState` plus a shared `pending`/`error` pair, an `AbortController`, and a request-id guard. Mutations return payloads that `App.tsx` writes into that state by hand (`applyContact`, `setDetail`).
- `src/data/payload.ts` parses Django's embedded payload (`contacts-data`, `detail-data`, `server-data`, `CRM_STATUS_CHOICES`) into `InitialData`, including `hasEmbeddedPayload`.
- `App.tsx` keeps `q`, `status`, and `contact` in the URL, owns `notice`, and calls `loadList`/`loadDetail`. Mutations live in `App.tsx` and per-action pending/error flags live inside `NewContactForm`, `StatusForm`, `NoteForm`, and `DeleteAction`.
- The Django API returns: list `{contacts, summary, status_choices}`, detail `{contact, activities}`, status `{contact, activities, summary}`, create `{contact, summary}` (201), note `{contact, activities}`, delete `204`. Mutations are server-authoritative.
- `summary` is global (not filter-scoped) and is included in every list response. `add_note` does not save the contact, so it does not change list ordering; create/status/delete do.
- No frontend test framework exists. Verification today is `npm run build` (`tsc -b` + Vite), `npm run lint`, Django's `python manage.py test crm`, and manual checks.
- The prepared `react-query` skill documents the right conventions but uses React Query v3 syntax (`react-query` import, positional arguments, `cacheTime`). The installed package will be v5, so its API shape is v5 (object arguments, `gcTime`, `isPending`, `initialDataUpdatedAt`, `placeholderData: keepPreviousData`).

## Goals / Non-Goals

**Goals:**

- One cache owner for server state, seeded by the Django payload, with typed query/mutation hooks.
- Preserve payload-first paint, URL-driven view state, server-authoritative mutations, existing accessibility behavior, and the API contract.
- Per-query loading/error state so background refreshes are non-disruptive.
- Keep the change confined to the frontend data layer plus its consumers.

**Non-Goals:**

- Optimistic updates, offline mutation queues, persistence of the query cache to storage, or background sync workers.
- Pagination/infinite queries (the API is unpaginated), a router, or moving URL state into the cache.
- Restructuring components into per-feature folders; the existing flat `src/components` + `src/data` layout is retained.
- A new frontend test framework.
- Devtools in production output.

## Decisions

### 1. Dependency versions and provider placement

Add `@tanstack/react-query@^5.104.5` to `dependencies` and `@tanstack/react-query-devtools@^5.104.5` to `devDependencies`. `package-lock.json` is updated by `npm install`.

Add `src/providers/` with:

- `queryClient.ts` — a module-scope `QueryClient` singleton created once, so Fast Refresh does not recreate the cache on every edit.
- `ReactQueryProvider.tsx` — renders `QueryClientProvider`; in development only, lazily imports and renders `ReactQueryDevtools`.

`main.tsx` wraps `<App>` in `<ReactQueryProvider>` inside `StrictMode`. In React 19 + StrictMode, mount-time refetches are deduplicated by React Query; no behavior change.

**Why v5 over other options:** v5 supports React 19, has the typed object API and good mutation cache control, and is the current release of the library the skill targets. Alternatives:

- **Keep `useCrmData`:** it works today but every new data need reimplements cancellation, stale handling, and cache updates; it is the thing this change removes.
- **SWR:** lighter, but weaker mutation/cache-invalidation primitives for the create/status/note/delete consistency requirements.
- **Redux Toolkit Query:** requires a Redux store and a larger conceptual footprint for one screen.

**Why module-scope `QueryClient`:** creating it inside a component recreates the cache on remount; module scope is the documented pattern. A `useState(() => new QueryClient())` alternative is unnecessary because this app has a single root.

### 2. QueryClient defaults

```ts
new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      gcTime: 5 * 60_000,
      refetchOnWindowFocus: true,
      refetchOnReconnect: true,
      retry: (failureCount, error) =>
        !isClientError(error) && failureCount < 1,
    },
    mutations: { retry: false },
  },
})
```

- `staleTime` keeps hydrated/just-fetched data fresh for 30 seconds, so the first mount does not refetch the payload. It also makes filter revisits instant while still allowing revalidation.
- `gcTime` bounds memory per spec ("Bounded retention").
- Query retries are capped at one and skip 4xx responses; mutations never retry automatically, matching the spec's write-safety requirement.
- Focus/reconnect refetching is the source of background revalidation; the UI keeps rendered data during it.

To distinguish 4xx from transient failures, extend `ApiError` in `src/lib/api.ts` with a readonly `status: number` (constructor gains an optional status; existing call sites keep working) and add an `isClientError()` helper. Alternative rejected: parsing status out of the message — brittle and untestable.

### 3. Query keys and cache shape

`src/data/queryKeys.ts` exports a single factory:

```ts
export const queryKeys = {
  contacts: {
    all: ['contacts'] as const,
    lists: () => ['contacts', 'list'] as const,
    list: (filters: { q: string; status: string }) =>
      ['contacts', 'list', filters] as const,
    details: () => ['contacts', 'detail'] as const,
    detail: (id: string) => ['contacts', 'detail', id] as const,
  },
}
```

Notes:

- Filters are normalized (trimmed; empty string for "none") before building the key, so `?q=` and no `q` share one entry.
- List entries cache the whole `ListPayload` (contacts, summary, status choices). The summary is duplicated across list entries, but it is global and small; keeping it with the list avoids a second summary query and a second request. Cache updates after mutations use `setQueriesData` across `queryKeys.contacts.lists()` so every entry's summary agrees.
- Detail entries cache `Detail` (contact + activities), keyed by `String(id)` to match the URL.
- No separate `summary` or `statusChoices` query exists: both always arrive with a list payload or the embedded payload.

Why structured keys instead of concatenated strings: prefix invalidation (`['contacts','list']`) is needed for mutation propagation, and per-filter/per-id isolation is the spec's cache-scoping requirement.

### 4. Query hooks and payload hydration

`src/data/queries.ts`:

- `useContacts(filters, boot)` — `useQuery` for the list. `queryFn` calls `request<ListPayload>('/api/contacts/?...')` and receives React Query's `signal`.
- `useContactDetail(contactId)` — `useQuery` with `enabled: Boolean(contactId)`; `queryFn` calls `/api/contacts/<id>/`.

Hydration rules:

- `InitialData` is extended with the boot URL (`initialQ`, `initialStatus`, `initialContactId`) and a `bootedAt` timestamp; `payload.ts` reads `data-q`/`data-status` and the current selection. `initialData` is passed to `useContacts` **only when the hook's filter key equals the boot filter key**, and to `useContactDetail` only when the id matches the boot selection. This prevents boot data from seeding a later filter or contact.
- `initialDataUpdatedAt: bootedAt` makes hydrated entries obey the normal `staleTime`; no immediate refetch, but they go stale normally.
- When `hasEmbeddedPayload` is false (Vite dev), `initialData` is `undefined`, so the list query fetches once and shows `isPending`; the detail query starts when a selection resolves.
- The embedded payload is read once in `main.tsx`/`App` initialization (module-level `initialData()` call already happens in `main.tsx`); do not re-read the DOM on every render.

**Alternative considered:** render the payload into components and let queries start empty. Rejected: it breaks the existing "no extra request on first load" spec scenario and causes a loading flash.

### 5. Selection resolution stays URL-driven

Because queries no longer return a single "selected contact", `App.tsx` derives the selected id:

1. If a contact was just created and filters exclude it, keep a `forcedSelectionId` state (existing behavior: the created contact remains selected regardless of filters).
2. Otherwise use `url.contactId` when it exists in the current list payload; fall back to `contacts[0]?.id`; otherwise `null`.
3. After the list settles, `settleSelection` keeps the URL in sync with the resolved id via `replaceState`, with the same guard that avoids rewriting a URL the user changed during an in-flight load.

`useContactDetail(selectedId)` runs independently of the list; a URL contact absent from the filtered list falls back to the first listed contact, matching the existing `pickContact` behavior. The detail query is enabled only for a non-empty resolved id, so no 404-driven fallback logic is needed.

**Alternative rejected:** derive selection purely from the URL. It would make a deep link to an out-of-filter contact show a contact the current filter excludes, changing existing behavior.

### 6. Mutation hooks and cache propagation

`src/data/mutations.ts` implements `useCreateContact`, `useChangeStatus`, `useAddNote`, and `useDeleteContact` with `useMutation`. All are server-authoritative; no `onMutate` optimistic writes.

Propagation rules:

| Mutation | On success |
| --- | --- |
| Create | `setQueriesData` is not used for rows (filter membership is unknown); invalidate all list keys, navigate to the new contact, seed the URL, and let the list/detail queries fetch. Show the existing notice. |
| Status change | Write the returned `Detail` to `queryKeys.contacts.detail(id)`; update the contact row and summary in every cached list via `setQueriesData`; invalidate list keys because `updated_at` changes ordering and status filters may change membership. |
| Add note | Write the returned `Detail` to the detail key. Lists do not change (server does not touch `updated_at`). Do not invalidate lists. |
| Delete | Remove the detail entry with `removeQueries`; invalidate every list key so filtered lists and summaries refetch; resolve the next selection. |

- The mutation response's `summary` (create/status) is written to every cached list entry before invalidation, so no cached view briefly disagrees.
- After a status change that removes the contact from the active filter, invalidating the active list makes it disappear, matching current behavior.
- `mutateAsync` is used in `App.tsx` so existing form try/catch flows keep control of inline errors; field errors from `ApiError.fieldErrors` continue to feed `NewContactForm`.
- Mutation pending state comes from `mutation.isPending`, passed to the components; the local `pending` flags in `NewContactForm`, `StatusForm`, `NoteForm`, and `DeleteAction` are removed. Local validation state (blank note, confirm dialog) stays.

**Why not optimistic updates:** the API is the authority for activity bodies and aggregates; optimistic writes would need rollback logic for every action and are not required by the specs.

### 7. App/component wiring

`useCrmData.ts` is deleted. `App.tsx` composes:

```ts
const list = useContacts({ q: url.q, status: url.status }, bootHydration)
const selectedId = resolveSelection(list.data, url, forcedSelectionId)
const detail = useContactDetail(selectedId)
```

- `list.isPending` drives the list's initial loading state and the Search button's "Searching…" state; `list.isFetching` is used only for a non-blocking refresh hint (e.g. `aria-busy`), never to blank the list.
- `detail.isPending` drives the detail loading state.
- The single error banner uses `list.error ?? detail.error`; stale data stays rendered when a background refetch fails, and the banner is not treated as a fatal empty state.
- Mutations are created at the `App` level and their `mutateAsync` is passed to the same component props (`onCreate`, `onChangeStatus`, `onAddNote`, `onDelete`), keeping component APIs stable. Pending flags are passed from mutation objects.
- The `popstate` listener still updates `url`; no query is fired from an effect. Query keys change with `url`, which triggers the reads.
- `notice` and `forcedSelectionId` remain client state, not cache data.

`aria-live` behavior, form labels, focus handling, and `window.confirm` are unchanged.

### 8. Keep `src/lib/api.ts`, remove only the manual race handling

`request<T>()` stays the single HTTP helper (CSRF bootstrap, JSON parsing, `ApiError`). Query functions pass React Query's `signal` into it. The `requestId`/`AbortController` bookkeeping in `useCrmData.ts` is removed: React Query deduplicates identical in-flight queries and cancels/ignores superseded ones, and aborted fetches are treated as cancellations rather than errors.

### 9. Verification and documentation

- No new test framework. Type-level verification comes from `tsc -b` in `npm run build`; behavior is checked in the running app with React Query Devtools (cache entries, freshness, invalidation) plus the existing manual matrix (search, filter, deep link, back/forward, create, status, note, delete, background refresh).
- `python manage.py test crm` must remain green (no backend edits).
- Document the data layer in the existing empty `REACT_QUERY.md` (query keys, hydration, mutation propagation, defaults) and link it from `frontend/README.md`, so the conventions are discoverable next to the code.

## Risks / Trade-offs

- **Boot payload leak into another filter** → gate `initialData` on the boot filter/id keys and pass `initialDataUpdatedAt`, so only the matching key is hydrated. Add an explicit manual check: load `/`, change the filter, and confirm the first filter's rows do not flash.
- **Background refetch reorders or removes the selected contact** → selection resolution falls back to the first listed contact and `settleSelection` repairs the URL with `replaceState`; the detail query follows the resolved id.
- **Duplicate summary across cached list entries** → every list response and relevant mutation calls `setQueriesData` over `queryKeys.contacts.lists()`; list invalidation after create/status/delete backstops any missed entry.
- **Devtools or query cache in production** → devtools are rendered only under `import.meta.env.DEV` and imported dynamically; the production bundle is checked with `npm run build` and a scan for the devtools chunk.
- **Retry policy hides a real failure** → one retry only, never for 4xx, and the error banner appears after retries are exhausted while cached data stays visible; mutations never retry.
- **React 19 + StrictMode double mounts** → React Query deduplicates in-flight queries; `initialData` prevents boot refetches, so no duplicate network traffic. Verified manually in dev.
- **Behavior drift in forms** → component props keep the same async callback shapes; only the source of `isPending` changes. Django tests and the manual checklist cover create/status/note/delete and validation paths.
- **Rollback** → the change is frontend-only and isolated to the data layer plus `App` wiring; reverting the commit restores `useCrmData.ts` and the previous cache behavior. No data migration or deployment ordering constraint.

## Migration Plan

1. Install the two packages and update the lockfile.
2. Add the provider, query client, keys, queries, and mutations while `useCrmData` still exists; wire `App` to the hooks behind the same component props.
3. Delete `useCrmData.ts` once build/lint and the manual matrix pass.
4. Update `REACT_QUERY.md` and `frontend/README.md`.
5. No backend, settings, or database changes; deploy with the normal frontend build.

## Open Questions

None. The deferrable choices (e.g. whether to add a frontend test framework later, or to persist the query cache) are explicitly out of scope and do not change the specs or task breakdown.
