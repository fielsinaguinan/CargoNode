import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import './index.css'
import App from './App.tsx'
import { ThemeProvider } from './components/ThemeProvider.tsx'
import { AccessibilityProvider } from './components/AccessibilityProvider.tsx'
import { AuthProvider } from './contexts/AuthContext.tsx'

import { SystemPreferencesProvider } from './components/SystemPreferencesProvider.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <ThemeProvider defaultTheme="system" storageKey="cargonode-theme">
          <AccessibilityProvider>
            <SystemPreferencesProvider>
              <App />
            </SystemPreferencesProvider>
          </AccessibilityProvider>
        </ThemeProvider>
      </AuthProvider>
    </BrowserRouter>
  </StrictMode>,
)
