import { StrictMode } from 'react'
import { Analytics } from '@vercel/analytics/react';
import { createRoot } from 'react-dom/client'
import ErrorBoundary from './components/ErrorBoundary.jsx'

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
