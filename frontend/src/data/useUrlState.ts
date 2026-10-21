import { useMemo, useSyncExternalStore } from 'react'
import { readUrlState } from '../lib/url'
import type { UrlState } from '../types'

const listeners = new Set<() => void>()

function subscribe(listener: () => void): () => void {
  window.addEventListener('popstate', listener)
  listeners.add(listener)
  return () => {
    window.removeEventListener('popstate', listener)
    listeners.delete(listener)
  }
}

function getSnapshot(): string {
  return window.location.search
}

/** Tell subscribers that pushState/replaceState changed the URL. */
export function notifyUrlChange(): void {
  for (const listener of listeners) listener()
}

/**
 * The URL is external state, so history navigation and programmatic updates
 * share one subscription instead of mirroring it into component state.
 */
export function useUrlState(): UrlState {
  const search = useSyncExternalStore(subscribe, getSnapshot, getSnapshot)
  return useMemo(() => readUrlState(search), [search])
}
