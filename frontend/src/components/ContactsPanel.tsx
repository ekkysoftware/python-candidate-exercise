import { ContactRow } from './ContactRow'
import { NewContactForm } from './NewContactForm'
import type { Contact, StatusChoice } from '../types'
import type { MouseEvent } from 'react'

interface ContactsPanelProps {
  contacts: Contact[]
  selectedId: number | null
  query: string
  status: string
  busy: boolean
  refreshing: boolean
  statusChoices: StatusChoice[]
  onSelect: (contactId: number, event: MouseEvent<HTMLAnchorElement>) => void
  onCreate: (values: Record<string, string>) => Promise<void>
  creating: boolean
}

export function ContactsPanel({
  contacts,
  selectedId,
  query,
  status,
  busy,
  refreshing,
  statusChoices,
  onSelect,
  onCreate,
  creating,
}: ContactsPanelProps) {
  return (
    <section className="panel" aria-labelledby="contacts-heading">
      <h2 id="contacts-heading">Contacts</h2>
      <div className="list" aria-busy={busy || refreshing ? 'true' : 'false'}>
        {contacts.length === 0 ? (
          <p className="empty" role="status">
            {busy ? 'Loading contacts…' : 'No contacts match your filters.'}
          </p>
        ) : (
          contacts.map((contact) => (
            <ContactRow
              key={contact.id}
              contact={contact}
              selected={selectedId === contact.id}
              query={query}
              status={status}
              onSelect={onSelect}
            />
          ))
        )}
      </div>
      <NewContactForm
        statusChoices={statusChoices}
        onCreate={onCreate}
        pending={creating}
      />
    </section>
  )
}
