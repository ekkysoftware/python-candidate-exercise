export interface Contact {
  id: number
  name: string
  email: string
  company: string
  phone: string
  status: string
  status_label: string
  owner: string
  value: number
}

export interface Activity {
  kind: string
  body: string
  created_by: string
  created_at: string
  created_at_iso: string
}

export interface Summary {
  total: number
  pipeline: number
  status_counts?: Record<string, number>
}

export interface Detail {
  contact: Contact
  activities: Activity[]
}

export interface ListPayload {
  contacts: Contact[]
  summary: Summary
  status_choices?: StatusChoice[]
}

export interface CreatePayload {
  contact: Contact
  summary: Summary
}

export interface StatusPayload extends Detail {
  summary: Summary
}

export type StatusChoice = [value: string, label: string]

export interface UrlState {
  q: string
  status: string
  contactId: string
}

export interface InitialData {
  contacts: Contact[]
  statusChoices: StatusChoice[]
  summary: Summary
  detail: Detail | null
  serverError: string
  hasEmbeddedPayload: boolean
  initialQ: string
  initialStatus: string
  initialContactId: string
  bootedAt: number
}
