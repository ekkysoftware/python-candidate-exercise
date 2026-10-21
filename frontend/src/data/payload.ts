import type {
  Activity,
  Contact,
  Detail,
  InitialData,
  StatusChoice,
  Summary,
} from '../types'

type EmbeddedDetail = Contact & { activities?: Activity[] }

function readJsonScript<T>(id: string): T | null {
  const node = document.getElementById(id)
  if (!node) return null
  try {
    return JSON.parse(node.textContent ?? '') as T
  } catch {
    return null
  }
}

function readServerData(): Record<string, string | undefined> {
  const node = document.getElementById('server-data')
  return node ? { ...node.dataset } : {}
}

export function readStatusChoices(): StatusChoice[] {
  const raw: unknown = window.CRM_STATUS_CHOICES
  if (!Array.isArray(raw)) return []
  return raw.filter(
    (choice): choice is StatusChoice =>
      Array.isArray(choice) &&
      choice.length === 2 &&
      typeof choice[0] === 'string' &&
      typeof choice[1] === 'string',
  )
}

/**
 * Build the initial state from the server-rendered payload. When the payload
 * hooks are absent (the Vite dev page), the caller must fetch instead.
 */
export function initialData(): InitialData {
  const hasEmbeddedPayload =
    document.getElementById('contacts-data') !== null &&
    document.getElementById('server-data') !== null

  const contacts = readJsonScript<Contact[]>('contacts-data') ?? []
  const embedded = readJsonScript<EmbeddedDetail>('detail-data')
  let detail: Detail | null = null
  if (embedded) {
    const { activities = [], ...contact } = embedded
    detail = { contact, activities }
  }

  const server = readServerData()
  const summary: Summary = {
    total: Number(server.total) || 0,
    pipeline: Number(server.pipeline) || 0,
  }

  return {
    contacts,
    statusChoices: readStatusChoices(),
    summary,
    detail,
    serverError: server.error ?? '',
    hasEmbeddedPayload,
    initialQ: server.q ?? '',
    initialStatus: server.status ?? '',
    initialContactId: detail ? String(detail.contact.id) : '',
    bootedAt: Date.now(),
  }
}

/** Pick the requested contact, falling back to the first listed contact. */
export function pickContact(
  contacts: Contact[],
  contactId: string,
): Contact | null {
  if (contacts.length === 0) return null
  if (contactId) {
    const match = contacts.find((contact) => String(contact.id) === contactId)
    if (match) return match
  }
  return contacts[0]
}
