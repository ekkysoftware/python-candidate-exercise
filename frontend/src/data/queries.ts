import { useQuery } from '@tanstack/react-query'
import { request } from '../lib/api'
import type { Detail, ListPayload } from '../types'
import { normalizeFilters, queryKeys } from './queryKeys'
import type { ContactFilters } from './queryKeys'

export interface Hydration<T> {
  data: T
  updatedAt: number
}

async function required<T>(
  payload: Promise<T | null>,
  message: string,
): Promise<T> {
  const data = await payload
  if (data === null) throw new Error(message)
  return data
}

export function useContacts(
  filters: ContactFilters,
  hydration?: Hydration<ListPayload>,
) {
  return useQuery({
    queryKey: queryKeys.contacts.list(filters),
    queryFn: ({ signal }) => {
      const normalized = normalizeFilters(filters)
      const params = new URLSearchParams()
      if (normalized.q) params.set('q', normalized.q)
      if (normalized.status) params.set('status', normalized.status)
      const suffix = params.toString()
      return required(
        request<ListPayload>(
          '/api/contacts/' + (suffix ? '?' + suffix : ''),
          { signal },
        ),
        'Could not load the contact list.',
      )
    },
    initialData: hydration?.data,
    initialDataUpdatedAt: hydration?.updatedAt,
  })
}

export function useContactDetail(
  contactId: string,
  hydration?: Hydration<Detail>,
) {
  return useQuery({
    queryKey: queryKeys.contacts.detail(contactId),
    queryFn: ({ signal }) =>
      required(
        request<Detail>(
          '/api/contacts/' + encodeURIComponent(contactId) + '/',
          { signal },
        ),
        'Could not load the contact.',
      ),
    enabled: Boolean(contactId),
    initialData: hydration?.data,
    initialDataUpdatedAt: hydration?.updatedAt,
  })
}
