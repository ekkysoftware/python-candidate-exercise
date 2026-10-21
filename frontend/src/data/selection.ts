import type { Contact } from '../types'

/**
 * The URL names the intended selection, but it is only valid while the contact
 * is in the current filtered list. A just-created contact may be outside the
 * active filter and stays selected until the user moves on.
 */
export function resolveSelection(
  contacts: Contact[],
  requestedId: string,
  forcedId = '',
): string {
  if (forcedId) return forcedId
  if (requestedId && contacts.some((contact) => String(contact.id) === requestedId)) {
    return requestedId
  }
  return contacts[0] ? String(contacts[0].id) : ''
}
