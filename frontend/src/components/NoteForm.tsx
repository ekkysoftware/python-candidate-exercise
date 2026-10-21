import { useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { errorMessage } from '../lib/api'
import { Field } from './Field'

interface NoteFormProps {
  onSave: (note: string) => Promise<void>
  pending: boolean
}

export function NoteForm({ onSave, pending }: NoteFormProps) {
  const [note, setNote] = useState('')
  const [error, setError] = useState('')
  const noteRef = useRef<HTMLTextAreaElement>(null)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const body = note.trim()
    if (!body) {
      setError('Enter a note before saving.')
      noteRef.current?.focus()
      return
    }

    setError('')
    try {
      await onSave(body)
      setNote('')
    } catch (err) {
      setError(errorMessage(err, 'Could not save the note.'))
    }
  }

  return (
    <form className="action" onSubmit={handleSubmit}>
      <Field id="note-body" label="Add a note" error={error}>
        <textarea
          ref={noteRef}
          id="note-body"
          name="note"
          value={note}
          placeholder="Add a note…"
          aria-invalid={error ? 'true' : undefined}
          aria-describedby={error ? 'note-body-error' : undefined}
          onChange={(event) => setNote(event.target.value)}
        />
      </Field>
      <button type="submit" className="btn" disabled={pending}>
        {pending ? 'Saving…' : 'Save note'}
      </button>
    </form>
  )
}
