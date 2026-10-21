import { useState } from 'react'
import { errorMessage } from '../lib/api'
import type { Contact } from '../types'

interface DeleteActionProps {
  contact: Contact
  onDelete: () => Promise<void>
  pending: boolean
}

export function DeleteAction({ contact, onDelete, pending }: DeleteActionProps) {
  const [error, setError] = useState('')

  async function handleClick() {
    const confirmed = window.confirm(
      'Delete ' + contact.name + '? This cannot be undone.',
    )
    if (!confirmed) return

    setError('')
    try {
      await onDelete()
    } catch (err) {
      setError(errorMessage(err, 'Could not delete the contact.'))
    }
  }

  return (
    <div className="action">
      <button
        type="button"
        className="btn danger"
        onClick={handleClick}
        disabled={pending}
      >
        {pending ? 'Deleting…' : 'Delete contact'}
      </button>
      {error ? (
        <p className="field__error" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  )
}
