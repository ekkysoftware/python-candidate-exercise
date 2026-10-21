export interface ContactFilters {
  q: string
  status: string
}

/** Trims filters so `?q=` and a missing `q` share one cache entry. */
export function normalizeFilters(filters: ContactFilters): ContactFilters {
  return { q: filters.q.trim(), status: filters.status.trim() }
}

const contacts = ['contacts'] as const

export const queryKeys = {
  contacts: {
    all: contacts,
    lists: () => [...contacts, 'list'] as const,
    list: (filters: ContactFilters) =>
      [...contacts, 'list', normalizeFilters(filters)] as const,
    details: () => [...contacts, 'detail'] as const,
    detail: (id: string | number) =>
      [...contacts, 'detail', String(id)] as const,
  },
}
