import { QueryClientProvider } from '@tanstack/react-query'
import { lazy, Suspense } from 'react'
import type { ReactNode } from 'react'
import { queryClient } from './queryClient'

// Vite replaces import.meta.env.DEV with false in production, so the dynamic
// import (and the devtools package) is dropped from the built bundle.
const ReactQueryDevtools = import.meta.env.DEV
  ? lazy(() =>
      import('@tanstack/react-query-devtools').then((module) => ({
        default: module.ReactQueryDevtools,
      })),
    )
  : null

interface ReactQueryProviderProps {
  children: ReactNode
}

export function ReactQueryProvider({ children }: ReactQueryProviderProps) {
  return (
    <QueryClientProvider client={queryClient}>
      {children}
      {ReactQueryDevtools ? (
        <Suspense fallback={null}>
          <ReactQueryDevtools initialIsOpen={false} />
        </Suspense>
      ) : null}
    </QueryClientProvider>
  )
}
