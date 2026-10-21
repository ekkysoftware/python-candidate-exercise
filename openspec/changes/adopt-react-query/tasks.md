# Tasks

## 1. Dependency and provider setup

- [x] 1.1 Install the runtime and dev packages in `frontend/`: `npm install @tanstack/react-query@^5.104.5` and `npm install -D @tanstack/react-query-devtools@^5.104.5`. Verify `npm ls @tanstack/react-query @tanstack/react-query-devtools` resolves both at 5.104.5 (or newer 5.x), both appear in the correct `package.json` section, and `npm run build` still succeeds.
- [x] 1.2 Add `src/providers/queryClient.ts` (module-scope `QueryClient` with the design's stale/gc/retry defaults) and `src/providers/ReactQueryProvider.tsx` (`QueryClientProvider`, devtools rendered only under `import.meta.env.DEV` via dynamic import). Wrap `<App>` in `main.tsx`. Verify `npm run lint` and `npm run build` pass, the Devtools panel appears with `npm run dev`, and the production build contains no devtools code (`grep -r "ReactQueryDevtools" crm/static/crm/dist/assets` finds nothing).

## 2. Query layer and payload hydration

- [x] 2.1 Extend `ApiError` in `src/lib/api.ts` with a readonly `status: number` (optional constructor parameter, existing call sites unchanged) and add an `isClientError(error)` helper for the retry predicate. Verify `npm run build` type-checks all existing `ApiError` usages, and a manual 4xx/5xx check shows the status populated.
- [x] 2.2 Add `src/data/queryKeys.ts` with normalized filter keys (`['contacts','list',{q,status}]`) and id-keyed details (`['contacts','detail',id]`), including `lists()`/`details()` prefixes. Verify `npm run build` and that Devtools shows the expected key shapes once the hooks are wired.
- [x] 2.3 Add `src/data/queries.ts` with `useContacts(filters, hydration)` and `useContactDetail(contactId)`; both call the existing `request<T>()` with React Query's `signal`, the detail query is `enabled` only for a non-empty id, and no `useEffect` fetching is introduced. Verify `npm run lint`/`npm run build`, and in Devtools confirm one list entry per filter and one detail entry per contact.
- [x] 2.4 Extend `InitialData` in `src/types.ts`/`src/data/payload.ts` with the boot filter, boot selection, and `bootedAt`, and pass `initialData`/`initialDataUpdatedAt` only when the query key matches the boot keys. Verify a normal `/` load issues no `/api/contacts` request on mount, and the Vite dev page (`npm run dev`) issues exactly one list request plus one detail request for the resolved selection.
- [x] 2.5 Add URL-driven selection resolution in `App.tsx` (URL contact when present in the list, otherwise the first listed contact, `null` for an empty list) plus the existing `settleSelection` URL repair. Verify deep links (`/?q=…&status=…&contact=<id>`), a URL naming a missing or out-of-filter contact, an empty result, and back/forward all behave as before.

## 3. Mutation hooks and cache propagation

- [x] 3.1 Add `useCreateContact` in `src/data/mutations.ts`: POST `/api/contacts/`, then invalidate list keys, set the created contact as the selection, and refresh the summary. Verify the new contact appears at the top of the unfiltered list, becomes selected, updates the summary, and refreshes cached filtered lists.
- [x] 3.2 Add `useChangeStatus`: POST `/api/contacts/<id>/status/`, write the returned detail into the detail cache, update the contact row and summary in every cached list, and invalidate list keys for ordering/membership. Verify the detail header, activity feed, summary, and every visited list row show the new status, and the contact disappears from an active filter that excludes it.
- [x] 3.3 Add `useAddNote`: POST `/api/contacts/<id>/notes/`, write the returned detail into the detail cache, and do not invalidate lists. Verify the note appears at the top of the feed, list rows/order do not change, and the network tab shows no list request after the mutation.
- [x] 3.4 Add `useDeleteContact`: DELETE `/api/contacts/<id>/`, remove the detail entry, invalidate all list keys, and resolve the next selection. Verify the contact leaves every visited list, the summary updates, the next contact is selected, and returning to the deleted contact's URL does not show cached data.
- [x] 3.5 Confirm mutations use `retry: false` and no optimistic writes, and that server errors/field errors still reach `NewContactForm`/inline action errors. Verify a failed create keeps the form values and shows "Name is required" for a blank name, and a failed mutation triggers no automatic retry and no cache update.

## 4. App and component wiring

- [x] 4.1 Replace `useCrmData` in `App.tsx` with the query and mutation hooks; derive list/detail `isPending`, a non-blocking refresh indicator, and a single `list.error ?? detail.error` banner; keep mutations at the `App` level behind the existing props. Verify search/filter, selection, create, status, note, and delete still work end to end and `grep -rn "useCrmData" frontend/src` returns nothing.
- [x] 4.2 Remove the duplicated local `pending` flags from `NewContactForm`, `StatusForm`, `NoteForm`, and `DeleteAction`; drive their disabled/progress labels from each mutation's `isPending`, keeping blank-note validation and delete confirmation local. Verify each button shows its "Saving…"/"Updating…"/"Deleting…"/"Searching…" state only while its own request is in flight, and unrelated controls stay enabled during background refreshes.
- [ ] 4.3 Verify background revalidation is non-disruptive in the running app: a window-focus refresh after the freshness window replaces list/detail in place, does not blank regions, does not clear a note or new-contact draft, and cannot rewrite the current URL. Verify rapid filter submissions leave the newest filter's results on screen.
- [x] 4.4 Delete `src/data/useCrmData.ts` once wiring passes. Verify `npm run build` (which runs `tsc -b`) and `npm run lint` both pass with no unused imports or `any` escape hatches.

## 5. Documentation

- [x] 5.1 Document the data layer in `REACT_QUERY.md`: dependency versions, QueryClient defaults, query-key conventions, payload hydration rules, selection resolution, mutation propagation table, and the devtools-only-in-development rule. Verify every code path and key name named in the document exists in `frontend/src`.
- [x] 5.2 Link the document from `frontend/README.md` and note the v5 API conventions (object-form `useQuery`, `gcTime`, `isPending`). Verify the link resolves and the documented commands (`npm install`, `npm run dev`, `npm run build`, `npm run lint`) run as written.

## 6. Integration verification

- [x] 6.1 Run `npm run build`, `npm run lint`, `python manage.py check`, and `python manage.py test crm` from the repository root/frontend; confirm all pass and `git diff` shows no backend, migration, or Django test changes.
- [ ] 6.2 Run the full manual matrix in both `npm run dev` and the built `runserver` page: search, status filter, deep link, back/forward, create (blank and valid, filtered and unfiltered), status change, add note, delete cancel/confirm, CSV export, keyboard-only pass, 375px viewport, reduced motion, and blocked-bundle fallback. Record any deviation in the change notes instead of silently changing the specs.
- [ ] 6.3 Inspect the production bundle and Network panel: no devtools chunk, no new third-party/CDN requests, no duplicate list/detail request on first paint, and no list request after adding a note. Confirm React Query Devtools was used to inspect cache freshness and invalidation during the check.

## Workflow follow-up

- Archive the change after review; confirm `crm-data-sync` is added to `openspec/specs/` and the existing `crm-dashboard`/`crm-api` specs are unchanged.
