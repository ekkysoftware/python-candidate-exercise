import { render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@inertiajs/react', async () => await import('../mocks/inertia'))

import Dashboard from '@/pages/crm/Dashboard'
import { dashboardProps } from '../fixtures'
import { usePage } from '../mocks/inertia'

describe('Dashboard page', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    usePage.mockReturnValue({ props: { errors: {} } })
  })

  it('renders the screen from page props', () => {
    render(<Dashboard {...dashboardProps} />)

    expect(screen.getByText('Jellybean CRM')).toBeInTheDocument()
    expect(screen.getByText('All contacts')).toBeInTheDocument()
    expect(screen.getByText('Pipeline value')).toBeInTheDocument()
    // Stats, the contact row and the detail panel each show the value.
    expect(screen.getAllByText('$1,000')).toHaveLength(3)
    expect(screen.getAllByText('Ekky Example').length).toBeGreaterThan(0)
    expect(screen.getByRole('heading', { name: 'Contact details' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Activity' })).toBeInTheDocument()
  })

  it('renders shared validation errors as a banner', () => {
    usePage.mockReturnValue({ props: { errors: { name: 'Name is required' } } })

    render(<Dashboard {...dashboardProps} />)

    expect(screen.getByText('Name is required')).toBeInTheDocument()
  })
})
