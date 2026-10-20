import { useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { Field } from './Field'
import type { StatusChoice } from '../types'

interface ToolbarProps {
  initialQuery: string
  initialStatus: string
  statusChoices: StatusChoice[]
  busy: boolean
  onSubmit: (values: { q: string; status: string }) => void
}

export function Toolbar({
  initialQuery,
  initialStatus,
  statusChoices,
  busy,
  onSubmit,
}: ToolbarProps) {
  const formRef = useRef<HTMLFormElement>(null)
  const [query, setQuery] = useState(initialQuery)

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const data = new FormData(event.currentTarget)
    onSubmit({
      q: String(data.get('q') ?? '').trim(),
      status: String(data.get('status') ?? ''),
    })
  }

  function handleClear() {
    const form = formRef.current
    const status = form ? String(new FormData(form).get('status') ?? '') : ''
    setQuery('')
    onSubmit({ q: '', status })
  }

  return (
    <div className="toolbar">
      <form
        ref={formRef}
        role="search"
        className="filters"
        onSubmit={handleSubmit}
      >
        <Field id="filter-q" label="Search contacts">
          <div className="input-clear">
            <input
              id="filter-q"
              type="search"
              name="q"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search name, company, email…"
              autoComplete="off"
              spellCheck={false}
            />
            {query ? (
              <button
                type="button"
                className="input-clear__btn"
                aria-label="Clear search"
                title="Clear search"
                onClick={handleClear}
              >
                ×
              </button>
            ) : null}
          </div>
        </Field>
        <Field id="filter-status" label="Status">
          <select id="filter-status" name="status" defaultValue={initialStatus}>
            <option value="">All statuses</option>
            {statusChoices.map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </Field>
        <button type="submit" className="btn" disabled={busy}>
          {busy ? 'Searching…' : 'Search'}
        </button>
      </form>
      <a className="export-link" href="/export/">
        Export CSV
      </a>
    </div>
  )
}
