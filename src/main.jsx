import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import ErrorBoundary from './components/ErrorBoundary.jsx'
import { Analytics } from "@vercel/analytics/react"
import './styles/base.css'
import App from './App.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ErrorBoundary>
      <Analytics />
      <App />
    </ErrorBoundary>
  </StrictMode>,
)
