import React from 'react'
import ReactDOM from 'react-dom/client'
import { AuthProvider } from './contexts/AuthContext'
import App from './App.tsx'
import './index.css'
import { initializeFirebase } from './services/firebaseConfig'
import { logger } from './utils/logger'

// Load test data utilities in development
if (import.meta.env.DEV) {
  import('./utils/testDataImporter')
  import('./utils/legacyDataImporter')
}

// Initialize Firebase early in the app lifecycle
try {
  initializeFirebase()
  logger.log('[main.tsx] Firebase initialized')
} catch (error) {
  logger.error('[main.tsx] Failed to initialize Firebase:', error)
  throw new Error('Firebase initialization failed. Please check your configuration.')
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <AuthProvider>
      <App />
    </AuthProvider>
  </React.StrictMode>,
)

