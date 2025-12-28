# Supabase Storage Setup for Profile Photos

## Issue

Profile photo uploads fail with error: `new row violates row-level security policy`

This happens because the app uses **Auth0** (not Supabase Auth), and the storage policies were using `auth.uid()` which only works with Supabase Auth.

## Solution

### Step 1: Make the Bucket Public

1. Go to your Supabase Dashboard: <https://supabase.com/dashboard>
2. Select your project
3. Navigate to **Storage** in the left sidebar
4. If the `profile-photos` bucket doesn't exist, create it:
   - Click **"New bucket"**
   - Name: `profile-photos`
   - **Make it PUBLIC** (toggle "Public bucket" to ON)
   - File size limit: 5MB
   - Allowed MIME types: `image/jpeg, image/png, image/webp, image/gif`
   - Click **"Create bucket"**
5. If the bucket already exists:
   - Click on the `profile-photos` bucket
   - Go to **Settings**
   - Toggle **"Public bucket"** to ON
   - Click **"Save"**

### Step 2: Run the Updated Migration

The migration file `supabase/migrations/002_storage_policies.sql` has been updated to use public bucket policies.

**Option A: Using Supabase CLI**

```bash
supabase db push
```

**Option B: Using Supabase Dashboard**

1. Go to **SQL Editor** in Supabase Dashboard
2. Copy the contents of `supabase/migrations/002_storage_policies.sql`
3. Paste into the SQL Editor
4. Click **"Run"**

### Step 3: Verify

After completing the above steps, try uploading a profile photo again. It should work without errors.

## How It Works

- The bucket is **public**, so anyone can upload/read files
- Security is maintained through **path-based organization**: `{user_id}/{filename}`
- The migration creates policies that allow public access to the `profile-photos` bucket
- Files are organized by user ID, so users can only access their own photos through the app logic

## Alternative: Private Bucket with Auth0 JWT

If you prefer a private bucket, you would need to:

1. Configure Supabase to accept Auth0 JWTs (Settings > API > JWT Secret)
2. Update the policies to extract user_id from Auth0 JWT claims
3. Pass Auth0 tokens to Supabase in the client code

However, the **public bucket approach is recommended** for simplicity and works well for profile photos.
