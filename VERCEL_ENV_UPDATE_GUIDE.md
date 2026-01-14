# Vercel Environment Variables Update Guide

## Overview

This guide explains how to update environment variables in Vercel after migrating from Auth0 + MongoDB + Supabase to unified Firebase.

**Last Updated**: January 14, 2026

---

## Variables to Remove

### Auth0 Variables (6 total)

```bash
AUTH0_M2M_CLIENT_ID
AUTH0_M2M_CLIENT_SECRET
VITE_AUTH0_CLIENT_ID
VITE_AUTH0_DOMAIN
VITE_AUTH0_SECRET_KEY
VITE_AUTH0_DELEGATION_ENDPOINT
```

### MongoDB Variables (1 total)

```bash
VITE_MONGODB_URI
```

### Supabase Variables (4 total)

```bash
REACT_APP_SUPABASE_URL
REACT_APP_SUPABASE_PUBLISHABLE_DEFAULT_KEY
VITE_SUPABASE_ANON_KEY
VITE_SUPABASE_URL
```

### Feature Flags (1 total)

```bash
VITE_USE_FIRESTORE  # No longer needed - always use Firestore
```

**Total to Remove: 12 variables**

---

## Variables to Keep

### Firebase Configuration (7 variables)

```bash
VITE_FIREBASE_API_KEY
VITE_FIREBASE_AUTH_DOMAIN
VITE_FIREBASE_PROJECT_ID
VITE_FIREBASE_STORAGE_BUCKET
VITE_FIREBASE_MESSAGING_SENDER_ID
VITE_FIREBASE_APP_ID
VITE_FIREBASE_MEASUREMENT_ID
```

### Firebase Admin SDK (3 variables)

```bash
FIREBASE_PROJECT_ID
FIREBASE_CLIENT_EMAIL
FIREBASE_PRIVATE_KEY
```

### AI Services (1 variable)

```bash
VITE_GEMINI_API_KEY
```

### Authentication (Clerk - if used)

```bash
CLERK_SECRET_KEY
VITE_CLERK_PUBLISHABLE_KEY
```

### Third-party Services

```bash
AUTONOMA_CLIENT_ID
AUTONOMA_SECRET_ID
```

### Vercel Infrastructure

```bash
VERCEL_OIDC_TOKEN
VITE_ENABLE_VERCEL_LOGGING
VITE_APP_URL
```

---

## Method 1: Update via Vercel Dashboard (Recommended)

### Step 1: Access Environment Variables

1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Select your project: **fit-tracker-ai**
3. Click **Settings** tab
4. Click **Environment Variables** in the left sidebar

### Step 2: Remove Deprecated Variables

For each variable in the "Variables to Remove" list:

1. Find the variable name in the list
2. Click the **⋯** (three dots) menu on the right
3. Click **Remove**
4. Confirm deletion

**Important**: Remove from all environments:

- ✅ Production
- ✅ Preview
- ✅ Development

### Step 3: Verify Remaining Variables

After removal, you should have approximately **17-20 variables** remaining (depending on optional services like Clerk).

Verify these key Firebase variables are present:

- `VITE_FIREBASE_API_KEY`
- `VITE_FIREBASE_PROJECT_ID`
- `FIREBASE_PRIVATE_KEY`

### Step 4: Redeploy

1. Go to **Deployments** tab
2. Click **⋯** on the latest deployment
3. Click **Redeploy**
4. Wait for deployment to complete
5. Check for any errors in build logs

---

## Method 2: Update via Vercel CLI

### Prerequisites

```bash
npm install -g vercel@latest
vercel login
vercel link  # Link to fit-tracker-ai project
```

### Remove Variables (One by One)

```bash
# Remove Auth0 variables
vercel env rm AUTH0_M2M_CLIENT_ID production preview development
vercel env rm AUTH0_M2M_CLIENT_SECRET production preview development
vercel env rm VITE_AUTH0_CLIENT_ID production preview development
vercel env rm VITE_AUTH0_DOMAIN production preview development
vercel env rm VITE_AUTH0_SECRET_KEY production preview development
vercel env rm VITE_AUTH0_DELEGATION_ENDPOINT production preview development

# Remove MongoDB variables
vercel env rm VITE_MONGODB_URI production preview development

# Remove Supabase variables
vercel env rm REACT_APP_SUPABASE_URL production preview development
vercel env rm REACT_APP_SUPABASE_PUBLISHABLE_DEFAULT_KEY production preview development
vercel env rm VITE_SUPABASE_ANON_KEY production preview development
vercel env rm VITE_SUPABASE_URL production preview development

# Remove feature flag
vercel env rm VITE_USE_FIRESTORE production preview development
```

### Verify Removal

```bash
# List all environment variables
vercel env ls

# Should NOT see any Auth0, MongoDB, or Supabase variables
```

### Trigger Redeployment

```bash
# Option 1: Redeploy latest
vercel deploy --prod

# Option 2: Force rebuild
vercel --force --prod
```

---

## Method 3: Bulk Update via API (Advanced)

### Prerequisites

```bash
# Get Vercel API token from: https://vercel.com/account/tokens
export VERCEL_TOKEN="your-token-here"
export VERCEL_PROJECT_ID="prj_hbDEG7X1DADAx6T3iIf9W8O4AEb"
export VERCEL_TEAM_ID="team_C3CUrhyEoENvf4Wa78S93xLA"
```

### List All Variables

```bash
curl -H "Authorization: Bearer $VERCEL_TOKEN" \
  "https://api.vercel.com/v9/projects/$VERCEL_PROJECT_ID/env?teamId=$VERCEL_TEAM_ID"
```

### Remove Variable by ID

```bash
# Get the ID from the list command above
curl -X DELETE \
  -H "Authorization: Bearer $VERCEL_TOKEN" \
  "https://api.vercel.com/v9/projects/$VERCEL_PROJECT_ID/env/{env-id}?teamId=$VERCEL_TEAM_ID"
```

---

## Verification Checklist

After updating environment variables:

### 1. Build Verification

- [ ] Deployment succeeds without errors
- [ ] No "missing environment variable" warnings in logs
- [ ] Build output shows Firebase configuration loaded

### 2. Runtime Verification

- [ ] Open deployed app: <https://fit-tracker-ai.vercel.app>
- [ ] Open browser DevTools Console
- [ ] Check for errors related to Auth0, MongoDB, or Supabase
- [ ] Verify Firebase initialized: Look for "Firebase initialized" log

### 3. Authentication Verification

- [ ] Test email/password login
- [ ] Test Google Sign-In
- [ ] Test signup flow
- [ ] Verify profile picture upload works

### 4. Database Verification

- [ ] Log a workout
- [ ] Check Firestore Console for data
- [ ] Verify offline mode works
- [ ] Test manual sync

---

## Rollback Plan

If deployment fails after removing variables:

### Immediate Rollback (< 5 minutes)

1. Go to Vercel Dashboard → Deployments
2. Find the last working deployment (before variable removal)
3. Click **⋯** → **Promote to Production**
4. Re-add removed variables temporarily
5. Investigate the issue

### Restore Specific Variable

```bash
# Via CLI
vercel env add VARIABLE_NAME production

# Via Dashboard
Settings → Environment Variables → Add New
```

---

## Common Issues

### Issue 1: "Firebase not configured" Error

**Symptoms**: App shows initialization error

**Cause**: Missing Firebase environment variables

**Fix**: Verify all `VITE_FIREBASE_*` variables are present in Vercel

```bash
vercel env ls | grep FIREBASE
```

### Issue 2: Build Fails with "Module not found"

**Symptoms**: Build log shows missing module errors

**Cause**: Old code still references deleted services

**Fix**: Ensure latest code is deployed (check git branch)

```bash
git status
git push origin main
```

### Issue 3: Authentication Not Working

**Symptoms**: Users can't log in, "Authentication failed" error

**Cause**: Firebase API key mismatch or expired

**Fix**: Regenerate Firebase config in Firebase Console

1. Firebase Console → Project Settings → General
2. Scroll to "Your apps" → Web app
3. Click "Config" to view current values
4. Update in Vercel if different

### Issue 4: Profile Pictures Not Loading

**Symptoms**: 403 Forbidden or CORS errors

**Cause**: Firebase Storage rules not deployed

**Fix**: Deploy storage rules

```bash
firebase deploy --only storage
```

---

## Security Best Practices

### 1. Audit Remaining Variables

After cleanup, review remaining variables:

```bash
vercel env ls
```

Ensure no sensitive keys are accidentally exposed as `VITE_*` (client-side accessible).

### 2. Rotate Sensitive Keys

Since Auth0 and MongoDB are removed, consider rotating:

- Firebase Admin SDK private key
- Gemini API key
- Any other API keys

### 3. Update .gitignore

Ensure `.env` and `.env.local` are in `.gitignore`:

```bash
# .gitignore
.env
.env.local
.env.*.local
```

### 4. Document Changes

Update your team documentation with:

- New environment variable list
- Firebase setup instructions
- Deployment checklist

---

## Post-Migration Monitoring

### Week 1: Daily Checks

- [ ] Monitor Vercel deployment status
- [ ] Check Firebase Console for auth errors
- [ ] Review Firestore usage metrics
- [ ] Monitor Cloud Functions logs (when deployed)

### Week 2-4: Weekly Checks

- [ ] Analyze deployment frequency and success rate
- [ ] Review Firebase costs vs. estimates
- [ ] Check user feedback for auth issues
- [ ] Verify sync reliability

---

## Cost Monitoring

### Before Migration (Multi-Service)

- Auth0: ~$23/month
- MongoDB: ~$9/month
- Supabase: ~$25/month
- **Total: ~$57/month**

### After Migration (Firebase Only)

- Authentication: Free (50K users/month)
- Firestore: ~$1-5/month
- Storage: ~$1-2/month
- Functions: ~$0-3/month (when deployed)
- **Total: ~$2-10/month**

### Monitor Firebase Usage

1. [Firebase Console](https://console.firebase.google.com) → fittrackai2026
2. Click **Usage and Billing**
3. Review daily usage:
   - Authentication: Sign-ins per day
   - Firestore: Reads/Writes/Storage
   - Storage: Files stored and bandwidth
   - Functions: Invocations and compute time

Set up billing alerts:

- Click **Set budget alerts**
- Set threshold: $10/month (conservative)
- Add email notification

---

## Next Steps

After updating Vercel environment variables:

1. **Deploy Cloud Functions** (if not already done)

   ```bash
   cd functions
   npm run build
   firebase deploy --only functions
   ```

2. **Implement FCM Tokens** (for push notifications)
   - Follow `FCM_INTEGRATION_GUIDE.md`
   - Update web app to collect FCM tokens
   - Test Chrome push notifications

3. **Run Comprehensive Tests**
   - Use `MIGRATION_TEST_SUMMARY.md` checklist
   - Test all authentication flows
   - Verify data sync across devices
   - Test offline mode

4. **Monitor Production**
   - Watch for errors in Vercel logs
   - Check Firebase Console daily for first week
   - Respond to user feedback quickly

---

## Support

### Vercel Support

- Dashboard: <https://vercel.com/dashboard>
- Docs: <https://vercel.com/docs/concepts/projects/environment-variables>
- Support: <https://vercel.com/support>

### Firebase Support

- Console: <https://console.firebase.google.com>
- Docs: <https://firebase.google.com/docs>
- Status: <https://status.firebase.google.com>

### Emergency Contacts

- Check deployment logs first
- Review Firebase Console for errors
- Consult `MIGRATION_TEST_SUMMARY.md` for rollback plan

---

## Changelog

- **2026-01-14**: Initial guide created after Auth0/MongoDB/Supabase removal
- Migration from multi-service to unified Firebase architecture complete
- 12 deprecated environment variables identified for removal
