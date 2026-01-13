import React from 'react'
import ReactDOM from 'react-dom/client'
import { Auth0Provider } from '@auth0/auth0-react'
import App from './App.tsx'
import './index.css'
import { initializeFirebase } from './services/firebaseConfig'

// Load test data utilities in development
if (import.meta.env.DEV) {
  import('./utils/testDataImporter')
}

const auth0Domain = import.meta.env.VITE_AUTH0_DOMAIN
const auth0ClientId = import.meta.env.VITE_AUTH0_CLIENT_ID
const auth0Audience = import.meta.env.VITE_AUTH0_AUDIENCE

if (!auth0Domain || !auth0ClientId) {
  throw new Error('Missing Auth0 configuration. Please add VITE_AUTH0_DOMAIN and VITE_AUTH0_CLIENT_ID to your .env file')
}

// Warn if audience is not set (required for Firebase token exchange)
if (!auth0Audience) {
  console.warn('[Auth0] VITE_AUTH0_AUDIENCE not set. Firebase token exchange may fail. See .env file for instructions.')
}

// Initialize Firebase early in the app lifecycle (if Firestore is enabled)
const useFirestore = import.meta.env.VITE_USE_FIRESTORE === 'true'
if (useFirestore) {
  try {
    initializeFirebase()
    console.log('[main.tsx] Firebase initialized')
  } catch (error) {
    console.error('[main.tsx] Failed to initialize Firebase:', error)
    // Non-blocking - app can still function with IndexedDB only
  }
}

const redirectUri = window.location.origin;

// Intercept fetch calls to Auth0 endpoints to catch 400 errors
const originalFetch = window.fetch;
window.fetch = async function(...args) {
  const firstArg = args[0];
  const url = typeof firstArg === 'string' 
    ? firstArg 
    : firstArg instanceof Request 
    ? firstArg.url 
    : firstArg instanceof URL
    ? firstArg.toString()
    : '';
  const isAuth0Request = url.includes('auth0.com') || url.includes('auth0');
  
  if (isAuth0Request) {
    const response = await originalFetch.apply(this, args);
    
    if (!response.ok && (response.status === 400 || response.status >= 400)) {
      const clonedResponse = response.clone();
      try {
        await clonedResponse.text();
      } catch {
        // Ignore error reading response body
      }
    }
    
    return response;
  }
  
  return originalFetch.apply(this, args);
};


ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <Auth0Provider
      domain={auth0Domain}
      clientId={auth0ClientId}
      authorizationParams={{
        redirect_uri: redirectUri,
        ...(auth0Audience && { audience: auth0Audience }),
        scope: 'openid profile email offline_access',
      }}
      cacheLocation="localstorage"
      useRefreshTokens={true}
      useCookiesForTransactions={false}
    >
      <App />
    </Auth0Provider>
  </React.StrictMode>,
)

