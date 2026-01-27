import React from 'react'
import ReactDOM from 'react-dom/client'
import { AuthProvider } from './contexts/AuthContext'
import App from './App.tsx'
import './index.css'
import { logger } from './utils/logger'

// Load test data utilities in development (lazy loaded)
if (import.meta.env.DEV) {
  import('./utils/testDataImporter')
  import('./utils/legacyDataImporter')
}

// Initialize Firebase lazily on-demand instead of blocking initial render
// This significantly improves Time to First Byte and First Contentful Paint
const initializeFirebaseOnDemand = async () => {
  try {
    const { initializeFirebase } = await import('./services/firebaseConfig')
    initializeFirebase()
    logger.log('[main.tsx] Firebase initialized on-demand')
  } catch (error) {
    logger.error('[main.tsx] Failed to initialize Firebase:', error)
    // Don't throw - Firebase is initialized in AuthContext when needed
  }
}

// Start Firebase initialization in the background but don't wait for it
initializeFirebaseOnDemand()

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <AuthProvider>
      <App />
    </AuthProvider>
  </React.StrictMode>,
)

