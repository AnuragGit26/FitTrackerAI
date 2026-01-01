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
      }}
      cacheLocation="localstorage"
      useRefreshTokens={true}
      useCookiesForTransactions={false}
    >
      <App />
    </Auth0Provider>
  </React.StrictMode>,
)

