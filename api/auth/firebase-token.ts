import type { VercelRequest, VercelResponse } from '@vercel/node';
import { initializeApp, cert, getApps, App } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import jwt from 'jsonwebtoken';
import jwksClient from 'jwks-rsa';

// Initialize Firebase Admin SDK (singleton pattern)
let firebaseAdminApp: App | null = null;

function getFirebaseAdminApp(): App {
  if (firebaseAdminApp) {
    return firebaseAdminApp;
  }

  const existingApps = getApps();
  if (existingApps.length > 0) {
    firebaseAdminApp = existingApps[0];
    return firebaseAdminApp;
  }

  try {
    firebaseAdminApp = initializeApp({
      credential: cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
      }),
    });
    console.log('[FirebaseTokenAPI] Firebase Admin SDK initialized');
    return firebaseAdminApp;
  } catch (error) {
    console.error('[FirebaseTokenAPI] Error initializing Firebase Admin:', error);
    throw error;
  }
}

// JWKS client for Auth0 token verification
const client = jwksClient({
  jwksUri: `https://${process.env.VITE_AUTH0_DOMAIN}/.well-known/jwks.json`,
  cache: true,
  rateLimit: true,
  jwksRequestsPerMinute: 10,
});

/**
 * Get signing key from Auth0 JWKS
 */
function getKey(header: any, callback: any) {
  client.getSigningKey(header.kid, (err, key) => {
    if (err) {
      console.error('[FirebaseTokenAPI] Error getting signing key:', err);
      callback(err);
    } else {
      const signingKey = key?.getPublicKey();
      callback(null, signingKey);
    }
  });
}

/**
 * Verify Auth0 JWT token
 */
async function verifyAuth0Token(token: string): Promise<any> {
  return new Promise((resolve, reject) => {
    jwt.verify(
      token,
      getKey,
      {
        audience: process.env.VITE_AUTH0_AUDIENCE,
        issuer: `https://${process.env.VITE_AUTH0_DOMAIN}/`,
        algorithms: ['RS256'],
      },
      (err, decoded) => {
        if (err) {
          console.error('[FirebaseTokenAPI] Token verification failed:', err);
          reject(err);
        } else {
          resolve(decoded);
        }
      }
    );
  });
}

/**
 * Firebase Custom Token Generation API
 *
 * This endpoint exchanges an Auth0 JWT token for a Firebase custom token.
 * The custom token can then be used to authenticate with Firebase on the client.
 *
 * Security:
 * 1. Verifies Auth0 JWT signature using JWKS
 * 2. Validates token audience and issuer
 * 3. Ensures userId matches token subject claim
 * 4. Returns Firebase custom token with user claims
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', process.env.VITE_APP_URL || '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type');

  // Handle OPTIONS request for CORS preflight
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  // Only allow POST method
  if (req.method !== 'POST') {
    return res.status(405).json({
      error: 'Method not allowed',
      message: 'Only POST method is supported',
    });
  }

  try {
    // Extract Auth0 token from Authorization header
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Missing or invalid authorization header. Expected: Bearer <token>',
      });
    }

    const auth0Token = authHeader.substring(7);
    const { userId } = req.body;

    // Validate request body
    if (!userId) {
      return res.status(400).json({
        error: 'Bad request',
        message: 'userId is required in request body',
      });
    }

    // Verify Auth0 token
    let decoded: any;
    try {
      decoded = await verifyAuth0Token(auth0Token);
    } catch (error) {
      console.error('[FirebaseTokenAPI] Auth0 token verification failed:', error);
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Invalid or expired Auth0 token',
      });
    }

    // Verify userId matches token subject
    if (decoded.sub !== userId) {
      console.error('[FirebaseTokenAPI] UserId mismatch:', {
        tokenSub: decoded.sub,
        requestedUserId: userId,
      });
      return res.status(403).json({
        error: 'Forbidden',
        message: 'userId does not match authenticated user',
      });
    }

    // Validate required environment variables
    if (
      !process.env.FIREBASE_PROJECT_ID ||
      !process.env.FIREBASE_CLIENT_EMAIL ||
      !process.env.FIREBASE_PRIVATE_KEY
    ) {
      console.error('[FirebaseTokenAPI] Missing Firebase Admin SDK credentials');
      return res.status(500).json({
        error: 'Configuration error',
        message: 'Firebase Admin SDK credentials not configured',
      });
    }

    // Create Firebase custom token
    const firebaseApp = getFirebaseAdminApp();
    const auth = getAuth(firebaseApp);

    const customToken = await auth.createCustomToken(userId, {
      auth0Sub: decoded.sub,
      email: decoded.email,
      name: decoded.name,
      picture: decoded.picture,
      emailVerified: decoded.email_verified,
    });

    console.log('[FirebaseTokenAPI] Successfully created custom token for user:', userId);

    return res.status(200).json({
      customToken,
      expiresIn: 3600, // Firebase custom tokens are valid for 1 hour
    });
  } catch (error) {
    console.error('[FirebaseTokenAPI] Error creating Firebase custom token:', error);

    // Determine appropriate error response
    if (error instanceof Error) {
      if (error.message.includes('auth/')) {
        return res.status(500).json({
          error: 'Firebase error',
          message: 'Failed to create Firebase custom token',
          details: error.message,
        });
      }
    }

    return res.status(500).json({
      error: 'Internal server error',
      message: 'An unexpected error occurred',
    });
  }
}
