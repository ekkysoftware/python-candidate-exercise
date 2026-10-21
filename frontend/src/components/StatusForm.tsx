import { useState } from 'react'
import type { FormEvent } from 'react'
import { errorMessage } from '../lib/api'
import { Field } from './Field'
import type { Contact, StatusChoice } from '../types'

interface StatusFormProps {
  contact: Contact
  statusChoices: StatusChoice[]
  onSave: (newStatus: string) => Promise<void>
  pending: boolean
}

export function StatusForm({
  contact,
  statusChoices,
  onSave,
  pending,
}: StatusFormProps) {
  const [error, setError] = useState('')

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const data = new FormData(event.currentTarget)
    setError('')
    try {
      await onSave(String(data.get('new_status') ?? ''))
    } catch (err) {
      setError(errorMessage(err, 'Could not update the status.'))
    }
  }

  return (
    <form className="action" onSubmit={handleSubmit}>
      <Field id="status-new" label="Change status" error={error}>
        <select
          key={contact.status}
          id="status-new"
          name="new_status"
          defaultValue={contact.status}
          disabled={pending}
        >
          {statusChoices.map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </Field>
      <button type="submit" className="btn" disabled={pending}>
        {pending ? 'Updating…' : 'Update status'}
      </button>
    </form>
  )
}
