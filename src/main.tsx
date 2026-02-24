import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { AppProviders } from './providers/AppProviders'
import App from './App'
import './index.css'

async function enableMocking() {
  if (import.meta.env.DEV) {
    const { worker } = await import('./mocks/browser')
    return worker.start({
      onUnhandledRequest: 'bypass',
      quiet: true,
    })
  }
}

enableMocking().then(() => {
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <AppProviders>
        <App />
      </AppProviders>
    </StrictMode>
  )
})
