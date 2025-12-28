/**
 * Vercel Serverless Function for Auth0 Delegation Token Exchange
 * 
 * This endpoint exchanges user access tokens for Auth0 Management API tokens.
 * It validates the user's token and returns a Management API token that can be
 * used to update user profiles and metadata.
 * 
 * Environment Variables Required:
 * - AUTH0_DOMAIN: Your Auth0 tenant domain (e.g., your-tenant.auth0.com)
 * - AUTH0_M2M_CLIENT_ID: Machine-to-Machine application client ID
 * - AUTH0_M2M_CLIENT_SECRET: Machine-to-Machine application client secret
 * 
 * Usage:
 * POST /api/auth0/delegation
 * Headers: Authorization: Bearer <user_access_token>
 * Body: { "target": "https://your-tenant.auth0.com/api/v2/", "scope": "update:users read:users" }
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';

interface DelegationRequest {
    target?: string;
    scope?: string;
}

interface DelegationResponse {
    access_token: string;
    token_type: string;
    expires_in: number;
}

interface ErrorResponse {
    message: string;
    error?: string;
}

/**
 * Extract origin from request headers
 * Handles both origin header and referer header (extracting origin from full URL)
 */
function extractOrigin(req: VercelRequest): string | undefined {
    if (req.headers.origin) {
        return req.headers.origin;
    }
    
    // Extract origin from referer if present
    const referer = req.headers.referer;
    if (referer) {
        try {
            const url = new URL(referer);
            return url.origin;
        } catch {
            // If referer is not a valid URL, return undefined
            return undefined;
        }
    }
    
    return undefined;
}

/**
 * Set CORS headers to allow cross-origin requests
 * Supports both development (localhost) and production origins
 */
function setCorsHeaders(res: VercelResponse, origin?: string): void {
    // Allow specific origins (development and production)
    const allowedOrigins = [
        'http://localhost:3000',
        'http://localhost:5173',
        'http://localhost:4173',
        'https://fit-trackai.vercel.app',
    ];

    // Determine which origin to allow
    let allowOrigin: string | undefined;
    
    if (origin) {
        if (allowedOrigins.includes(origin)) {
            // Origin is in the allowed list - use it
            allowOrigin = origin;
        } else if (origin.startsWith('http://localhost:') || origin.startsWith('http://127.0.0.1:')) {
            // Localhost origin (any port) - allow for development
            allowOrigin = origin;
        }
        // If origin doesn't match, allowOrigin remains undefined (will use first allowed origin as fallback)
    }
    
    // Fallback: if no origin matched or no origin header, use first allowed origin
    // This ensures we always return a valid CORS header
    if (!allowOrigin) {
        allowOrigin = allowedOrigins[0];
    }

    // Set CORS headers
    res.setHeader('Access-Control-Allow-Origin', allowOrigin);
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
    res.setHeader('Access-Control-Max-Age', '86400'); // 24 hours
    res.setHeader('Access-Control-Allow-Credentials', 'true');
}

export default async function handler(
    req: VercelRequest,
    res: VercelResponse
): Promise<void> {
    const origin = extractOrigin(req);
    
    // Set CORS headers for all responses (must be set before any response)
    setCorsHeaders(res, origin);

    // Handle preflight OPTIONS request FIRST (before any other logic)
    if (req.method === 'OPTIONS') {
        // Return 204 No Content for preflight requests (more standard than 200)
        res.status(204).end();
        return;
    }

    // Only allow POST requests
    if (req.method !== 'POST') {
        res.status(405).json({
            message: 'Method not allowed',
            error: 'Only POST requests are supported'
        } as ErrorResponse);
        return;
    }

    // Get user access token from Authorization header
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        res.status(401).json({
            message: 'Missing authorization token',
            error: 'Authorization header must be in format: Bearer <token>'
        } as ErrorResponse);
        return;
    }

    const accessToken = authHeader.replace('Bearer ', '');

    // Get environment variables
    const auth0Domain = process.env.AUTH0_DOMAIN;
    const auth0ClientId = process.env.AUTH0_M2M_CLIENT_ID;
    const auth0ClientSecret = process.env.AUTH0_M2M_CLIENT_SECRET;

    // Validate required environment variables
    if (!auth0Domain || !auth0ClientId || !auth0ClientSecret) {
        const missingVars: string[] = [];
        if (!auth0Domain) missingVars.push('AUTH0_DOMAIN');
        if (!auth0ClientId) missingVars.push('AUTH0_M2M_CLIENT_ID');
        if (!auth0ClientSecret) missingVars.push('AUTH0_M2M_CLIENT_SECRET');
        
        console.error('Missing required environment variables:', {
            hasDomain: !!auth0Domain,
            hasClientId: !!auth0ClientId,
            hasClientSecret: !!auth0ClientSecret,
            missing: missingVars,
        });
        res.status(500).json({
            message: 'Server configuration error',
            error: `Missing required Auth0 environment variables: ${missingVars.join(', ')}. Please configure these in your Vercel project settings.`
        } as ErrorResponse);
        return;
    }

    try {
        // Verify the user's access token by calling Auth0's userinfo endpoint
        const userInfoResponse = await fetch(`https://${auth0Domain}/userinfo`, {
            headers: {
                Authorization: `Bearer ${accessToken}`,
                'Content-Type': 'application/json'
            },
        });

        if (!userInfoResponse.ok) {
            const errorText = await userInfoResponse.text();
            console.error('Invalid user token:', {
                status: userInfoResponse.status,
                statusText: userInfoResponse.statusText,
                error: errorText,
            });
            res.status(401).json({
                message: 'Invalid access token',
                error: 'The provided access token is invalid or expired'
            } as ErrorResponse);
            return;
        }

        // Parse request body (optional - for future extensibility)
        // Note: body parsing is kept for future extensibility if needed
        // const body = req.body as DelegationRequest;
        // const target = body?.target || `https://${auth0Domain}/api/v2/`;
        // const scope = body?.scope || 'update:users read:users';

        // Get Management API token using client credentials grant
        const tokenResponse = await fetch(`https://${auth0Domain}/oauth/token`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                client_id: auth0ClientId,
                client_secret: auth0ClientSecret,
                audience: `https://${auth0Domain}/api/v2/`,
                grant_type: 'client_credentials',
            }),
        });

        if (!tokenResponse.ok) {
            const errorText = await tokenResponse.text();
            console.error('Failed to get Management API token:', {
                status: tokenResponse.status,
                statusText: tokenResponse.statusText,
                error: errorText,
            });
            throw new Error('Failed to obtain Management API token');
        }

        const tokenData = await tokenResponse.json();
        const managementToken = tokenData.access_token;

        if (!managementToken) {
            throw new Error('Management API token response missing access_token');
        }

        // Return the token in the expected format
        const response: DelegationResponse = {
            access_token: managementToken,
            token_type: 'Bearer',
            expires_in: tokenData.expires_in || 86400, // Use actual expiry or default to 24 hours
        };

        res.status(200).json(response);
    } catch (error) {
        console.error('Delegation error:', error);

        // Provide helpful error messages
        const errorMessage = error instanceof Error
            ? error.message
            : 'Unknown error occurred';

        res.status(500).json({
            message: 'Failed to get delegation token',
            error: errorMessage
        } as ErrorResponse);
    }
}

