import React from 'react'
import ReactDOM from 'react-dom/client'
import { Auth0Provider } from '@auth0/auth0-react'
import App from './App.tsx'
import './index.css'

const auth0Domain = import.meta.env.VITE_AUTH0_DOMAIN
const auth0ClientId = import.meta.env.VITE_AUTH0_CLIENT_ID


if (!auth0Domain || !auth0ClientId) {
  throw new Error('Missing Auth0 configuration. Please add VITE_AUTH0_DOMAIN and VITE_AUTH0_CLIENT_ID to your .env file')
}

const redirectUri = window.location.origin;

// Intercept fetch calls to Auth0 endpoints to catch 400 errors
const originalFetch = window.fetch;
window.fetch = async function(...args) {
  const url = typeof args[0] === 'string' ? args[0] : args[0]?.url || '';
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
      }}
      cacheLocation="localstorage"
      useRefreshTokens={true}
      useCookiesForTransactions={false}
      onError={(error) => {
        console.error('Auth0 error:', error);
        // Log specific guidance for common errors
        if (error?.message?.includes('400') || error?.error === 'invalid_request') {
          console.error('⚠️ Auth0 400 Error - Common fixes:');
          console.error('1. Add your app URL to "Allowed Web Origins" in Auth0 Dashboard:');
          console.error(`   - Go to Auth0 Dashboard > Applications > Your App > Settings`);
          console.error(`   - Add "${redirectUri}" to "Allowed Web Origins"`);
          console.error(`   - Add "${redirectUri}" to "Allowed Callback URLs"`);
          console.error(`   - Add "${redirectUri}" to "Allowed Logout URLs"`);
        }
      }}
    >
      <App />
    </Auth0Provider>
  </React.StrictMode>,
)

