import { ContactDetail } from './ContactDetail'
import type { Detail, StatusChoice } from '../types'

interface DetailPanelProps {
  detail: Detail | null
  busy: boolean
  statusChoices: StatusChoice[]
  onChangeStatus: (newStatus: string) => Promise<void>
  onAddNote: (note: string) => Promise<void>
  onDelete: () => Promise<void>
  statusPending: boolean
  notePending: boolean
  deletePending: boolean
}

export function DetailPanel({
  detail,
  busy,
  statusChoices,
  onChangeStatus,
  onAddNote,
  onDelete,
  statusPending,
  notePending,
  deletePending,
}: DetailPanelProps) {
  return (
    <section className="panel" aria-labelledby="detail-heading">
      <h2 id="detail-heading">Contact details</h2>
      {detail ? (
        <ContactDetail
          key={detail.contact.id}
          detail={detail}
          statusChoices={statusChoices}
          onChangeStatus={onChangeStatus}
          onAddNote={onAddNote}
          onDelete={onDelete}
          statusPending={statusPending}
          notePending={notePending}
          deletePending={deletePending}
        />
      ) : (
        <p className="muted" role="status">
          {busy ? 'Loading contact…' : 'Select a contact to see details.'}
        </p>
      )}
    </section>
  )
}
