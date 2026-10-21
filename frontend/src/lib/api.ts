export class ApiError extends Error {
  readonly fieldErrors: Record<string, string> | null
  readonly status: number

  constructor(
    message: string,
    fieldErrors?: Record<string, string> | null,
    status = 0,
  ) {
    super(message)
    this.name = 'ApiError'
    this.fieldErrors = fieldErrors ?? null
    this.status = status
  }
}

interface RequestOptions {
  method?: 'GET' | 'POST' | 'DELETE'
  body?: unknown
  signal?: AbortSignal
}

function readCookie(name: string): string {
  const match = document.cookie.match(
    new RegExp('(?:^|;\\s*)' + name + '=([^;]*)'),
  )
  return match ? decodeURIComponent(match[1]) : ''
}

/**
 * Client-rendered pages (the Vite dev server) never receive Django's shell, so
 * the CSRF cookie has to be fetched before the first unsafe request.
 */
async function ensureCsrfToken(): Promise<void> {
  if (readCookie('csrftoken')) return
  await fetch('/api/csrf/', { credentials: 'same-origin' })
}

export async function request<T = unknown>(
  url: string,
  options: RequestOptions = {},
): Promise<T | null> {
  const method = options.method ?? 'GET'
  const headers: Record<string, string> = { Accept: 'application/json' }

  if (options.body !== undefined) headers['Content-Type'] = 'application/json'
  if (method !== 'GET') {
    await ensureCsrfToken()
    headers['X-CSRFToken'] = readCookie('csrftoken')
  }

  const response = await fetch(url, {
    method,
    headers,
    credentials: 'same-origin',
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
    signal: options.signal,
  })

  if (response.status === 204) return null

  let data: unknown = null
  try {
    data = await response.json()
  } catch {
    data = null
  }

  if (!response.ok) {
    const body = (data ?? {}) as {
      error?: string
      detail?: string
      errors?: Record<string, string>
    }
    throw new ApiError(
      body.error || body.detail || 'Request failed (' + response.status + ').',
      body.errors,
      response.status,
    )
  }

  return data as T
}

export function errorMessage(error: unknown, fallback: string): string {
  return error instanceof Error && error.message ? error.message : fallback
}

/** True for 4xx responses, which retrying cannot fix. */
export function isClientError(error: unknown): boolean {
  return (
    error instanceof ApiError &&
    error.status >= 400 &&
    error.status < 500
  )
}
