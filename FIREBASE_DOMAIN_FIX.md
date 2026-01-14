# Fix: Unauthorized Domain Error

## Issue
Firebase Authentication is blocking login because your production domain is not authorized.

**Production URL**: `https://fit-trackai.vercel.app`

## Quick Fix (2 minutes)

### Step 1: Add Authorized Domain in Firebase Console

1. **Go to**: https://console.firebase.google.com/project/fittrackai2026/authentication/settings

2. **Click on the "Settings" tab** (if not already there)

3. **Scroll down to "Authorized domains"** section

4. **Click "Add domain"**

5. **Enter**: `fit-trackai.vercel.app`

6. **Click "Add"**

### Step 2: Add All Vercel Preview Domains (Optional but Recommended)

Also add these for preview deployments:

1. Click "Add domain" again
2. Enter: `fit-trackai-*.vercel.app` (wildcard for preview branches)
3. Click "Add"

### Default Domains (Should Already Be There)

These are usually pre-configured:
- ✅ `localhost`
- ✅ `fittrackai2026.firebaseapp.com`
- ✅ `fittrackai2026.web.app`

## Verification

After adding the domain:

1. **Refresh your production app**: https://fit-trackai.vercel.app
2. **Try to log in** with Google or email/password
3. **Should work immediately** (no need to redeploy)

## If Still Getting Error

### Check These Settings:

1. **OAuth Consent Screen** (for Google Sign-In):
   - Go to: https://console.cloud.google.com/apis/credentials/consent
   - Ensure `fit-trackai.vercel.app` is in authorized domains

2. **Google OAuth Client ID** (for Google Sign-In):
   - Go to: https://console.cloud.google.com/apis/credentials
   - Find your OAuth 2.0 Client ID
   - Add `https://fit-trackai.vercel.app` to "Authorized JavaScript origins"
   - Add `https://fittrackai2026.firebaseapp.com/__/auth/handler` to "Authorized redirect URIs"

3. **Apple Sign-In** (if using):
   - Go to: https://developer.apple.com/account/resources/identifiers
   - Add domains to your App ID configuration

## Alternative: Use Custom Domain

If you have a custom domain (e.g., `fittrack.ai`):

1. Add it to Vercel: https://vercel.com/killcoder26s-projects/fit-tracker-ai/settings/domains
2. Add it to Firebase authorized domains
3. Update environment variables if needed

## Common Causes

- ✅ **Domain not added**: Most common - just add the domain
- ✅ **Wildcard not configured**: Preview deployments get random URLs
- ✅ **Custom domain not authorized**: If using custom domain

## Need More Help?

**Firebase Auth Docs**: https://firebase.google.com/docs/auth/web/redirect-best-practices#authorized-domains

**Error Details**:
- Error Code: `auth/unauthorized-domain`
- Reason: The domain is not in Firebase's authorized domains list
- Fix: Add domain in Firebase Console (takes effect immediately)
