import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import { App } from './App'
import { initialData } from './data/payload'
import { ReactQueryProvider } from './providers/ReactQueryProvider'

const container = document.getElementById('crm-app')

if (container) {
  createRoot(container).render(
    <StrictMode>
      <ReactQueryProvider>
        <App initial={initialData()} />
      </ReactQueryProvider>
    </StrictMode>,
  )
}
