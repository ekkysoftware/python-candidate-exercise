# Spec Delta

## Purpose

Defines how the CRM single-page client caches, revalidates, and synchronizes server data so views stay consistent and responsive without refetching on every interaction or showing stale data after a mutation.

## ADDED Requirements

### Requirement: Cache entries are scoped by request identity

The system SHALL cache contact lists per distinct search and status filter and contact details per contact id, so a cached response is only ever shown for the request that produced it.

#### Scenario: Previously visited filter
- **WHEN** the user returns to a filter combination that was loaded earlier in the session
- **THEN** the matching cached list is rendered immediately while a background revalidation runs, without an empty loading state

#### Scenario: Filters are isolated
- **WHEN** the user submits a different search term or status filter
- **THEN** the list shows only results for the new filter, its loading state, or its error, never rows cached for another filter

#### Scenario: Revisited contact
- **WHEN** the user selects a contact that was viewed earlier
- **THEN** that contact's cached detail and activity feed are shown immediately, followed by revalidation when the entry is stale

#### Scenario: Bounded retention
- **WHEN** a cached list or detail entry has not been used for the configured retention period
- **THEN** it is discarded so memory does not grow with every filter or contact visited

### Requirement: Embedded payload seeds the cache without a duplicate request

The system SHALL treat the server-rendered payload as fresh initial data for the list, summary, status choices, and selected contact, and SHALL NOT issue a list or detail request for data the payload already contains.

#### Scenario: Load with embedded payload
- **WHEN** the page loads with the embedded contact list, selected detail, and summary
- **THEN** the first render shows that data and the client issues no additional list or detail request on mount

#### Scenario: Boot without embedded payload
- **WHEN** the page loads without the embedded payload hooks, such as the Vite dev page
- **THEN** the client loads the list once, resolves the selected contact from that list, and shows loading states until each request settles

#### Scenario: Hydrated entries become stale normally
- **WHEN** hydrated data has been displayed longer than the configured freshness window
- **THEN** it may be revalidated in the background without clearing the rendered content

### Requirement: Background revalidation does not disrupt the view

The system SHALL keep already-rendered data visible while revalidating it, and SHALL NOT show a full-region loading state, disable unrelated controls, or clear form input because a background request is in flight.

#### Scenario: Refresh after the freshness window
- **WHEN** the window regains focus or the network reconnects after cached data has gone stale
- **THEN** the affected data is revalidated and replaced in place without blanking the list or detail region

#### Scenario: Foreground fetch
- **WHEN** the user submits a search, selects a contact whose detail is not cached, or performs a mutation
- **THEN** the affected region shows a busy state and its primary control indicates progress until the request settles

#### Scenario: Rapid filter changes
- **WHEN** the user submits two filters in quick succession
- **THEN** only the newest filter's response is rendered and the older response cannot overwrite it

#### Scenario: Duplicate concurrent reads
- **WHEN** two views request the same list or detail before the first request settles
- **THEN** the client issues one network request and shares its result

#### Scenario: Navigate away from a pending request
- **WHEN** the user moves to another filter or contact while a request for the previous one is pending
- **THEN** the superseded request is cancelled or ignored and no error is reported for it

### Requirement: Read failures preserve data and surface a recoverable error

The system SHALL retry failed reads a bounded number of times, SHALL NOT retry client-error responses, and SHALL keep previously cached data available when a revalidation fails.

#### Scenario: Transient read failure
- **WHEN** a read fails with a network or server error
- **THEN** it is retried up to the configured limit and, if it still fails, a user-readable error is announced while any cached data remains visible

#### Scenario: Client-error response
- **WHEN** a read fails with a 4xx response such as a missing contact
- **THEN** it is not retried and the error is shown against the affected region

#### Scenario: Initial load failure
- **WHEN** the first load fails and no cached data exists
- **THEN** the affected region shows a readable error instead of a blank or permanently loading state

### Requirement: Mutations update every cached view consistently

The system SHALL apply the server's mutation response to the cache and invalidate affected lists, so the list row, detail panel, activity feed, and summary cannot disagree, and SHALL NOT show a mutation's result before the server confirms it.

#### Scenario: Create contact
- **WHEN** a contact is created successfully
- **THEN** the new contact appears at the top of the unfiltered list, the summary reflects it, it becomes the selected contact, and any cached filtered lists that could contain it are refreshed

#### Scenario: Status change
- **WHEN** a status change succeeds
- **THEN** the detail header, activity feed, summary status counts, and every cached list row for that contact show the new status, and list ordering reflects the contact's updated timestamp

#### Scenario: Add note
- **WHEN** a note is saved successfully
- **THEN** the detail activity feed shows the note at the top immediately and list entries for that contact remain valid

#### Scenario: Delete contact
- **WHEN** a contact is deleted successfully
- **THEN** it disappears from every cached list, the summary is refreshed, its detail entry is removed from the cache, and a later visit to that contact does not show deleted data

#### Scenario: Mutation failure
- **WHEN** a mutation is rejected or fails
- **THEN** no cache entry is updated, the error is shown next to the action that failed, and the form retains the user's input

#### Scenario: No automatic retry of writes
- **WHEN** a create, status, note, or delete request fails
- **THEN** it is not retried automatically, so a write cannot be applied twice without the user acting again

### Requirement: URL and form state remain the authority for what is shown

The system SHALL derive cached query identity from the URL's search, status, and selected contact, and SHALL keep form drafts, notices, and confirmation state outside the server cache.

#### Scenario: Deep link with cached data
- **WHEN** the user opens or returns to a URL naming a filter and contact that are already cached
- **THEN** the cached data for exactly that URL is shown and is revalidated if stale

#### Scenario: Browser history
- **WHEN** the user navigates back or forward between filters and contacts
- **THEN** the URL drives which cached entries are displayed, and a late response never rewrites the current URL

#### Scenario: Draft survives a background refresh
- **WHEN** a background revalidation completes while the user is typing a note or a new contact
- **THEN** the draft input keeps its value and is not replaced by cached server data
