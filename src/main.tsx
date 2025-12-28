import React from 'react'
import ReactDOM from 'react-dom/client'
import { Auth0Provider } from '@auth0/auth0-react'
import App from './App.tsx'
import './index.css'

const auth0Domain = import.meta.env.VITE_AUTH0_DOMAIN
const auth0ClientId = import.meta.env.VITE_AUTH0_CLIENT_ID

// #region agent log
fetch('http://127.0.0.1:7248/ingest/f44644c5-d500-4fbd-a834-863cb4856614',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'main.tsx:12',message:'Auth0 config check',data:{hasDomain:!!auth0Domain,hasClientId:!!auth0ClientId,domain:auth0Domain?.substring(0,20)+'...',clientId:auth0ClientId?.substring(0,10)+'...'},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
// #endregion

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
    // #region agent log
    fetch('http://127.0.0.1:7248/ingest/f44644c5-d500-4fbd-a834-863cb4856614',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'main.tsx:25',message:'Auth0 fetch request',data:{url:url.substring(0,100),method:args[1]?.method||'GET'},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(()=>{});
    // #endregion
    
    try {
      const response = await originalFetch.apply(this, args);
      
      if (!response.ok && (response.status === 400 || response.status >= 400)) {
        const clonedResponse = response.clone();
        let errorBody = '';
        try {
          errorBody = await clonedResponse.text();
        } catch {}
        
        // #region agent log
        fetch('http://127.0.0.1:7248/ingest/f44644c5-d500-4fbd-a834-863cb4856614',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'main.tsx:37',message:'Auth0 fetch error response',data:{url:url.substring(0,100),status:response.status,statusText:response.statusText,errorBody:errorBody.substring(0,500)},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(()=>{});
        // #endregion
      }
      
      return response;
    } catch (error) {
      // #region agent log
      fetch('http://127.0.0.1:7248/ingest/f44644c5-d500-4fbd-a834-863cb4856614',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'main.tsx:46',message:'Auth0 fetch exception',data:{url:url.substring(0,100),errorMessage:error?.message,errorString:String(error)},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(()=>{});
      // #endregion
      throw error;
    }
  }
  
  return originalFetch.apply(this, args);
};

// #region agent log
fetch('http://127.0.0.1:7248/ingest/f44644c5-d500-4fbd-a834-863cb4856614',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'main.tsx:22',message:'Auth0Provider init',data:{redirectUri,origin:window.location.origin,protocol:window.location.protocol,host:window.location.host},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
// #endregion

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
        // #region agent log
        fetch('http://127.0.0.1:7248/ingest/f44644c5-d500-4fbd-a834-863cb4856614',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'main.tsx:70',message:'Auth0Provider onError',data:{errorName:error?.name,errorMessage:error?.message,errorStack:error?.stack?.substring(0,500),errorString:String(error),errorCode:error?.error,errorDescription:error?.error_description},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
        // #endregion
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

