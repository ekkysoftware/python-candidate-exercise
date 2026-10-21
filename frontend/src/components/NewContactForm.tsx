import { useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { ApiError, errorMessage } from '../lib/api'
import { Field } from './Field'
import type { StatusChoice } from '../types'

interface NewContactFormProps {
  statusChoices: StatusChoice[]
  onCreate: (values: Record<string, string>) => Promise<void>
  pending: boolean
}

export function NewContactForm({
  statusChoices,
  onCreate,
  pending,
}: NewContactFormProps) {
  const [errors, setErrors] = useState<Record<string, string>>({})
  const formRef = useRef<HTMLFormElement>(null)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = event.currentTarget
    const values: Record<string, string> = {}
    new FormData(form).forEach((value, key) => {
      if (typeof value === 'string') values[key] = value
    })

    setErrors({})
    try {
      await onCreate(values)
      form.reset()
    } catch (err) {
      const fieldErrors =
        err instanceof ApiError && err.fieldErrors
          ? err.fieldErrors
          : { name: errorMessage(err, 'Could not save the contact.') }
      setErrors(fieldErrors)
      const first = Object.keys(fieldErrors)[0]
      if (first) {
        formRef.current
          ?.querySelector<HTMLInputElement>(`[name="${first}"]`)
          ?.focus()
      }
    }
  }

  return (
    <div className="newbox">
      <h3>Add contact</h3>
      <form ref={formRef} onSubmit={handleSubmit} noValidate>
        <Field id="new-name" label="Name" error={errors.name}>
          <input
            id="new-name"
            name="name"
            autoComplete="off"
            aria-invalid={errors.name ? 'true' : undefined}
            aria-describedby={errors.name ? 'new-name-error' : undefined}
          />
        </Field>
        <Field id="new-email" label="Email">
          <input
            id="new-email"
            type="email"
            name="email"
            autoComplete="off"
            spellCheck={false}
          />
        </Field>
        <Field id="new-company" label="Company">
          <input id="new-company" name="company" autoComplete="off" />
        </Field>
        <Field id="new-owner" label="Owner">
          <input id="new-owner" name="owner" autoComplete="off" />
        </Field>
        <Field id="new-phone" label="Phone">
          <input id="new-phone" type="tel" name="phone" autoComplete="off" />
        </Field>
        <Field id="new-value" label="Value">
          <input
            id="new-value"
            type="number"
            inputMode="decimal"
            name="value"
            min="0"
            step="0.01"
          />
        </Field>
        <Field id="new-status" label="Status">
          <select id="new-status" name="new_status" defaultValue="lead">
            {statusChoices.map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </Field>
        <button type="submit" className="btn" disabled={pending}>
          {pending ? 'Saving…' : 'Add contact'}
        </button>
      </form>
    </div>
  )
}
