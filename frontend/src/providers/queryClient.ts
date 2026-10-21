import { QueryClient } from '@tanstack/react-query'
import { isClientError } from '../lib/api'

/**
 * Module scope keeps the cache stable across Fast Refresh updates.
 *
 * Hydrated payload data stays fresh for 30s so the boot render does not
 * immediately refetch what Django already embedded. Reads retry once for
 * transient failures, never for 4xx; writes never retry automatically.
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      gcTime: 5 * 60_000,
      refetchOnWindowFocus: true,
      refetchOnReconnect: true,
      retry: (failureCount, error) =>
        !isClientError(error) && failureCount < 1,
    },
    mutations: {
      retry: false,
    },
  },
})
