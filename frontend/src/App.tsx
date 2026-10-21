import { useCallback, useEffect, useMemo, useState } from 'react'
import type { MouseEvent } from 'react'
import { ContactsPanel } from './components/ContactsPanel'
import { DetailPanel } from './components/DetailPanel'
import { Stats } from './components/Stats'
import { Toolbar } from './components/Toolbar'
import { useAddNote, useChangeStatus, useCreateContact, useDeleteContact } from './data/mutations'
import { normalizeFilters } from './data/queryKeys'
import { useContactDetail, useContacts } from './data/queries'
import { resolveSelection } from './data/selection'
import { notifyUrlChange, useUrlState } from './data/useUrlState'
import { errorMessage } from './lib/api'
import { buildUrl, readUrlState } from './lib/url'
import type { InitialData, UrlState } from './types'

interface AppProps {
  initial: InitialData
}

export function App({ initial }: AppProps) {
  const url = useUrlState()
  const [notice, setNotice] = useState('')
  const [bootError, setBootError] = useState(initial.serverError)
  const [forcedSelectionId, setForcedSelectionId] = useState('')

  const createContact = useCreateContact()
  const changeStatus = useChangeStatus()
  const addNote = useAddNote()
  const deleteContact = useDeleteContact()

  const listHydration = useMemo(() => {
    if (!initial.hasEmbeddedPayload) return undefined
    const boot = normalizeFilters({
      q: initial.initialQ,
      status: initial.initialStatus,
    })
    const current = normalizeFilters({ q: url.q, status: url.status })
    if (boot.q !== current.q || boot.status !== current.status) return undefined
    return {
      data: {
        contacts: initial.contacts,
        summary: initial.summary,
        status_choices: initial.statusChoices,
      },
      updatedAt: initial.bootedAt,
    }
  }, [initial, url.q, url.status])

  const list = useContacts({ q: url.q, status: url.status }, listHydration)
  const contacts = list.data?.contacts ?? []
  const selectedId = resolveSelection(
    contacts,
    url.contactId,
    forcedSelectionId,
  )

  const detailHydration = useMemo(() => {
    if (
      !initial.hasEmbeddedPayload ||
      !initial.detail ||
      selectedId !== initial.initialContactId
    ) {
      return undefined
    }
    return { data: initial.detail, updatedAt: initial.bootedAt }
  }, [initial, selectedId])

  const detail = useContactDetail(selectedId, detailHydration)
  const detailData = detail.data ?? null

  const statusChoices = list.data?.status_choices?.length
    ? list.data.status_choices
    : initial.statusChoices
  const summary = list.data?.summary ?? initial.summary
  const queryError = list.error ?? detail.error
  const errorText = queryError
    ? errorMessage(queryError, 'Something went wrong.')
    : bootError

  // `isPending` alone stays true for a disabled detail query, so require an
  // active fetch. A cached entry being revalidated is not a foreground load.
  const listBusy = list.isPending && list.isFetching
  const refreshing = list.isFetching && !listBusy
  const detailBusy = detail.isPending && detail.isFetching

  const navigate = useCallback(
    (next: UrlState, options: { replace?: boolean } = {}) => {
      const target = buildUrl(next)
      if (options.replace) {
        window.history.replaceState(null, '', target)
      } else {
        window.history.pushState(null, '', target)
      }
      notifyUrlChange()
    },
    [],
  )

  useEffect(() => {
    function handlePopState() {
      setForcedSelectionId('')
    }
    window.addEventListener('popstate', handlePopState)
    return () => window.removeEventListener('popstate', handlePopState)
  }, [])

  // Keep the URL aligned with the selection the list actually resolved. The
  // guard prevents a slow boot/fetch from rewriting a URL the user changed.
  useEffect(() => {
    if (!list.data) return
    const resolved = resolveSelection(
      list.data.contacts,
      url.contactId,
      forcedSelectionId,
    )
    if (!resolved || resolved === url.contactId) return

    const current = readUrlState()
    if (
      current.q !== url.q ||
      current.status !== url.status ||
      current.contactId !== url.contactId
    ) {
      return
    }
    navigate({ ...url, contactId: resolved }, { replace: true })
  }, [list.data, url, forcedSelectionId, navigate])

  function handleFilterSubmit(values: { q: string; status: string }) {
    const next: UrlState = { ...url, q: values.q, status: values.status }
    setForcedSelectionId('')
    setBootError('')
    navigate(next)
  }

  function handleSelect(
    contactId: number,
    event: MouseEvent<HTMLAnchorElement>,
  ) {
    if (
      event.metaKey ||
      event.ctrlKey ||
      event.shiftKey ||
      event.altKey ||
      event.button !== 0
    ) {
      return
    }
    event.preventDefault()
    setForcedSelectionId('')
    setBootError('')
    navigate({ ...url, contactId: String(contactId) })
  }

  async function handleCreate(values: Record<string, string>): Promise<void> {
    const result = await createContact.mutateAsync(values)
    const next: UrlState = { ...url, contactId: String(result.contact.id) }
    setBootError('')
    setForcedSelectionId(String(result.contact.id))
    navigate(next)
    setNotice('Contact created.')
  }

  async function handleStatusChange(newStatus: string): Promise<void> {
    const current = detailData
    if (!current) return

    const result = await changeStatus.mutateAsync({
      contactId: String(current.contact.id),
      newStatus,
    })
    setBootError('')
    setNotice('Status updated to ' + result.contact.status_label + '.')

    if (url.status && url.status !== result.contact.status) {
      // The contact no longer belongs to the active status filter.
      setForcedSelectionId('')
    }
  }

  async function handleAddNote(note: string): Promise<void> {
    const current = detailData
    if (!current) return

    await addNote.mutateAsync({
      contactId: String(current.contact.id),
      note,
    })
    setBootError('')
    setNotice('Note saved.')
  }

  async function handleDelete(): Promise<void> {
    const current = detailData
    if (!current) return

    await deleteContact.mutateAsync(String(current.contact.id))
    setBootError('')
    setForcedSelectionId('')
    navigate({ ...url, contactId: '' })
    setNotice('Contact deleted.')
  }

  return (
    <>
      <a className="skip-link" href="#crm-main">
        Skip to contacts
      </a>
      <header className="top">
        <h1>Jellybean CRM</h1>
      </header>
      <main id="crm-main" className="wrap">
        <p className="visually-hidden" role="status" aria-live="polite">
          {notice}
        </p>
        {errorText ? (
          <div className="error" role="alert">
            {errorText}
          </div>
        ) : null}
        <Stats summary={summary} />
        <Toolbar
          key={url.q + '|' + url.status}
          initialQuery={url.q}
          initialStatus={url.status}
          statusChoices={statusChoices}
          onSubmit={handleFilterSubmit}
          busy={listBusy}
        />
        <div className="grid">
          <ContactsPanel
            contacts={contacts}
            selectedId={detailData ? detailData.contact.id : null}
            query={url.q}
            status={url.status}
            busy={listBusy}
            refreshing={refreshing}
            statusChoices={statusChoices}
            onSelect={handleSelect}
            onCreate={handleCreate}
            creating={createContact.isPending}
          />
          <DetailPanel
            detail={detailData}
            busy={detailBusy}
            statusChoices={statusChoices}
            onChangeStatus={handleStatusChange}
            onAddNote={handleAddNote}
            onDelete={handleDelete}
            statusPending={changeStatus.isPending}
            notePending={addNote.isPending}
            deletePending={deleteContact.isPending}
          />
        </div>
      </main>
    </>
  )
}
