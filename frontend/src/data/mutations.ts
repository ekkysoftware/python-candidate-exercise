import { useMutation, useQueryClient } from '@tanstack/react-query'
import { request } from '../lib/api'
import type {
  Contact,
  CreatePayload,
  Detail,
  ListPayload,
  StatusPayload,
  Summary,
} from '../types'
import { queryKeys } from './queryKeys'

export type ContactValues = Record<string, string>

interface StatusVariables {
  contactId: string
  newStatus: string
}

interface NoteVariables {
  contactId: string
  note: string
}

async function required<T>(
  payload: Promise<T | null>,
  message: string,
): Promise<T> {
  const data = await payload
  if (data === null) throw new Error(message)
  return data
}

function updateSummary(
  current: ListPayload | undefined,
  summary: Summary,
): ListPayload | undefined {
  return current ? { ...current, summary } : current
}

function updateContact(
  current: ListPayload | undefined,
  contact: Contact,
): ListPayload | undefined {
  if (!current) return current
  return {
    ...current,
    contacts: current.contacts.map((row) =>
      row.id === contact.id ? contact : row,
    ),
  }
}

export function useCreateContact() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (values: ContactValues) =>
      required(
        request<CreatePayload>('/api/contacts/', {
          method: 'POST',
          body: values,
        }),
        'The server did not return the new contact.',
      ),
    onSuccess: (result) => {
      // The new row may or may not belong to each filtered list, so only the
      // global summary is safe to write before invalidation.
      queryClient.setQueriesData<ListPayload>(
        { queryKey: queryKeys.contacts.lists() },
        (current) => updateSummary(current, result.summary),
      )
      void queryClient.invalidateQueries({
        queryKey: queryKeys.contacts.lists(),
      })
    },
  })
}

export function useChangeStatus() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ contactId, newStatus }: StatusVariables) =>
      required(
        request<StatusPayload>(
          '/api/contacts/' + encodeURIComponent(contactId) + '/status/',
          { method: 'POST', body: { new_status: newStatus } },
        ),
        'The server did not return the updated contact.',
      ),
    onSuccess: (result) => {
      queryClient.setQueryData<Detail>(
        queryKeys.contacts.detail(result.contact.id),
        { contact: result.contact, activities: result.activities },
      )
      queryClient.setQueriesData<ListPayload>(
        { queryKey: queryKeys.contacts.lists() },
        (current) => updateContact(updateSummary(current, result.summary), result.contact),
      )
      // updated_at changed, so list ordering and filter membership are stale.
      void queryClient.invalidateQueries({
        queryKey: queryKeys.contacts.lists(),
      })
    },
  })
}

export function useAddNote() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ contactId, note }: NoteVariables) =>
      required(
        request<Detail>(
          '/api/contacts/' + encodeURIComponent(contactId) + '/notes/',
          { method: 'POST', body: { note } },
        ),
        'The server did not return the note.',
      ),
    onSuccess: (result) => {
      queryClient.setQueryData<Detail>(
        queryKeys.contacts.detail(result.contact.id),
        result,
      )
    },
  })
}

export function useDeleteContact() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (contactId: string): Promise<void> => {
      await request('/api/contacts/' + encodeURIComponent(contactId) + '/', {
        method: 'DELETE',
      })
    },
    onSuccess: (_result, contactId) => {
      queryClient.removeQueries({
        queryKey: queryKeys.contacts.detail(contactId),
      })
      void queryClient.invalidateQueries({
        queryKey: queryKeys.contacts.lists(),
      })
    },
  })
}
