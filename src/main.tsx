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

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <Auth0Provider
      domain={auth0Domain}
      clientId={auth0ClientId}
      authorizationParams={{
        redirect_uri: window.location.origin,
      }}
    >
      <App />
    </Auth0Provider>
  </React.StrictMode>,
)

