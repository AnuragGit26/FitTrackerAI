# Firebase Storage Setup Guide

**Project**: fittrackai2026
**Purpose**: Profile picture uploads with user-scoped security
**Status**: ⚠️ Needs Manual Setup

---

## Quick Setup (5 minutes)

### Step 1: Initialize Firebase Storage in Console

1. **Go to**: https://console.firebase.google.com/project/fittrackai2026/storage

2. **Click "Get Started"** button

3. **Choose Security Rules Mode**: Select **"Start in production mode"**
   - ✅ We already have secure rules in `storage.rules`
   - ✅ Rules will be deployed after initialization

4. **Choose Storage Location**: Select **`asia-south1` (Mumbai)**
   - ⚠️ **Important**: Must match your Firestore location for optimal performance
   - Cannot be changed after creation

5. **Click "Done"**

6. **Wait for bucket creation** (~30 seconds)

---

### Step 2: Deploy Storage Security Rules

After initialization completes, run this command:

```bash
firebase deploy --only storage
```

**Expected output**:
```
✔ storage: released rules storage.rules to firebase.storage
Deploy complete!
```

---

### Step 3: Verify Setup

#### Check Storage Console
1. Go to: https://console.firebase.google.com/project/fittrackai2026/storage/fittrackai2026.firebasestorage.app/files
2. Should see empty storage bucket ready to use
3. Click "Rules" tab to verify rules deployed

#### Check Storage URL
Your storage bucket URL:
```
gs://fittrackai2026.firebasestorage.app
```

Referenced in your code at `src/services/firebaseStorageService.ts`

---

## What Gets Deployed

### Storage Security Rules (`storage.rules`)

```javascript
// Profile pictures: /profile-pictures/{userId}/{fileName}
match /profile-pictures/{userId}/{fileName} {
  // Anyone authenticated can view profile pictures
  allow read: if request.auth != null;

  // Only owner can upload (with validation)
  allow write: if request.auth.uid == userId
               && request.resource.contentType.matches('image/.*')
               && request.resource.size < 5 * 1024 * 1024; // 5MB limit

  // Only owner can delete
  allow delete: if request.auth.uid == userId;
}
```

### Storage Structure

```
profile-pictures/
  ├── {userId1}/
  │   ├── 1704897234567.jpg
  │   └── 1704897345678.png
  ├── {userId2}/
  │   └── 1704897456789.webp
  └── ...
```

---

## Security Features

### ✅ User-Scoped Access
- Each user has their own folder: `/profile-pictures/{userId}/`
- Users can only upload/delete in their own folder
- All authenticated users can view profile pictures (public read)

### ✅ File Validation
- **Type**: Only image files allowed (`image/*`)
- **Size**: Maximum 5MB per file
- **Authentication**: Must be logged in to upload

### ✅ Automatic Cleanup
- Service automatically deletes old profile pictures when new one is uploaded
- Prevents storage bloat from multiple uploads

---

## Usage in Your App

### Upload Profile Picture

```typescript
import { firebaseStorageService } from '@/services/firebaseStorageService';

// In ProfilePictureUpload.tsx
const handleUpload = async (file: File) => {
  // Compress image (max 800x800, 85% quality)
  const compressed = await firebaseStorageService.compressImage(file, 800, 800, 0.85);

  // Upload to Firebase Storage
  const result = await firebaseStorageService.uploadProfilePicture(userId, compressed);

  // result.url: Public URL of uploaded image
  // result.path: Storage path for reference

  // Update user profile with new URL
  await updateProfile({ profilePictureUrl: result.url });
};
```

### Delete Profile Picture

```typescript
// Delete current profile picture
await firebaseStorageService.deleteProfilePicture(userId, currentPictureUrl);

// Clear from user profile
await updateProfile({ profilePictureUrl: null });
```

### Display Profile Picture

```typescript
// In UserMenu.tsx or Profile.tsx
<img
  src={user.profilePictureUrl || '/default-avatar.png'}
  alt="Profile"
/>
```

---

## Testing After Setup

### Test 1: Upload Profile Picture

1. **Login** to your app: https://fit-trackai.vercel.app
2. **Go to Profile** page
3. **Click** profile picture area
4. **Select** an image file (JPG, PNG, or WebP)
5. **Upload** should complete in 2-3 seconds
6. **Verify** image appears immediately

### Test 2: Check Firebase Console

1. **Go to**: https://console.firebase.google.com/project/fittrackai2026/storage
2. **Navigate**: `profile-pictures/{your-user-id}/`
3. **Verify**: Your uploaded image appears
4. **Check**: File size is compressed (should be < 500KB for most images)

### Test 3: Delete Profile Picture

1. **Click** delete button on profile picture
2. **Confirm** deletion
3. **Verify** image removed from UI
4. **Check Firebase Console**: File should be deleted

### Test 4: Security (Try to Access Other User's Folder)

1. **Get another user's ID** from Firestore
2. **Try to upload** to `/profile-pictures/{other-user-id}/test.jpg`
3. **Should fail** with permission denied error ✅

---

## Storage Quotas & Costs

### Firebase Storage Free Tier (Spark Plan)
- **Storage**: 5 GB total
- **Downloads**: 1 GB/day
- **Uploads**: 1 GB/day

### Firebase Storage Blaze Plan (Pay-as-you-go)
**Storage**:
- First 5 GB: Free
- $0.026 per GB/month after

**Bandwidth**:
- First 1 GB/day: Free
- $0.12 per GB after

**Operations**:
- 50,000 operations/day: Free
- $0.05 per 10,000 operations after

### Estimated Usage for FitTrackAI

**Assumptions**:
- 1,000 active users
- 200 KB average profile picture size (after compression)
- Users update picture once per month
- Each picture viewed 10 times

**Monthly Costs**:
- **Storage**: 1,000 users × 200 KB = 200 MB = **Free**
- **Uploads**: 1,000 × 200 KB = 200 MB = **Free**
- **Downloads**: 1,000 users × 10 views × 200 KB = 2 GB = **$0.12**

**Total**: ~**$0.12/month** (well within budget!)

---

## Troubleshooting

### Error: "Storage bucket not initialized"

**Solution**: Complete Step 1 in Firebase Console first

### Error: "Permission denied"

**Causes**:
1. User not authenticated → Check Firebase Auth login
2. Trying to access other user's folder → Expected behavior (security working)
3. Rules not deployed → Run `firebase deploy --only storage`

**Verify rules**:
```bash
firebase deploy --only storage
```

### Error: "File too large"

**Cause**: Image exceeds 5MB limit

**Solution**:
- Image is automatically compressed to 85% quality
- If still too large, reduce max dimensions in `compressImage()` call
- Current: 800×800 pixels, 85% quality

### Error: "Invalid file type"

**Cause**: Non-image file uploaded

**Solution**:
- Only JPG, PNG, WebP, GIF allowed
- Check file MIME type starts with `image/`

### Images Not Loading

**Checks**:
1. **Storage URL correct**: Should be `gs://fittrackai2026.firebasestorage.app`
2. **Public read enabled**: Rules allow authenticated users to read
3. **CORS configured**: Firebase Storage has CORS enabled by default
4. **Authentication working**: User must be logged in

---

## Storage Rules Validation

### Test Rules Locally (Optional)

```bash
# Install Firebase Emulator
npm install -g firebase-tools

# Start storage emulator
firebase emulators:start --only storage

# Run tests against emulator
# Update VITE_FIREBASE_STORAGE_BUCKET to use emulator
```

### View Current Rules

**Firebase Console**: https://console.firebase.google.com/project/fittrackai2026/storage/fittrackai2026.firebasestorage.app/rules

**CLI**:
```bash
firebase storage:rules --database fittrackai2026
```

---

## Migration from Auth0 Profile Pictures

If users had profile pictures in Auth0, they need to re-upload:

### Option 1: Manual Re-upload (Recommended)
- Users re-upload from their device
- Ensures best quality and user control

### Option 2: Automated Migration Script
Create a script to:
1. Fetch Auth0 profile picture URLs from user records
2. Download images from Auth0 CDN
3. Upload to Firebase Storage
4. Update Firestore user_profiles collection

**Not implemented yet** - would require Auth0 API access

---

## Security Best Practices

### ✅ Implemented
- User-scoped folder structure
- File type validation (images only)
- File size limits (5MB max)
- Authentication required for uploads
- Auto-cleanup of old pictures

### ⚠️ Additional Recommendations
1. **Rate limiting**: Consider limiting uploads per user per day
2. **Content scanning**: Add virus/malware scanning for production
3. **Image moderation**: Consider AI moderation for inappropriate content
4. **CDN**: Firebase Storage serves via Google CDN automatically

---

## Monitoring & Analytics

### View Storage Usage

**Firebase Console**: https://console.firebase.google.com/project/fittrackai2026/usage/details

**Metrics**:
- Total storage used
- Bandwidth consumed
- Number of operations
- Cost breakdown

### Set Up Alerts

1. Go to: https://console.firebase.google.com/project/fittrackai2026/usage/details
2. Click "Set budget alerts"
3. Set threshold: **$1/month** (conservative)
4. Add email notification

---

## Advanced Features (Future)

### Image Variants (Thumbnails)
Use Cloud Functions to automatically generate thumbnails:
- Original: 800×800 (max)
- Thumbnail: 150×150 (for lists)
- Avatar: 40×40 (for navbar)

### WebP Conversion
Convert all uploads to WebP format for better compression:
- ~30% smaller file size
- Better quality at same file size
- Supported by all modern browsers

### Image CDN Optimization
Firebase Storage uses Google CDN automatically:
- Global edge locations
- Automatic caching
- Fast delivery worldwide

---

## Integration Points

### Files Using Firebase Storage

1. **src/services/firebaseStorageService.ts**
   - Core upload/download/delete logic
   - Image compression
   - URL generation

2. **src/components/profile/ProfilePictureUpload.tsx**
   - Upload UI component
   - Drag-and-drop support
   - Preview before upload

3. **src/components/layout/UserMenu.tsx**
   - Display profile picture
   - Fallback to default avatar

4. **src/pages/Profile.tsx**
   - Profile picture management
   - Delete functionality

---

## Summary

### Setup Steps
1. ⚠️ **Initialize Storage in Firebase Console** (5 min)
2. ⚠️ **Deploy storage rules**: `firebase deploy --only storage`
3. ✅ **Test upload/delete** in production app
4. ✅ **Verify security rules** working

### Current Status
- ✅ Storage rules created (`storage.rules`)
- ✅ Storage service implemented (`firebaseStorageService.ts`)
- ✅ UI components ready (`ProfilePictureUpload.tsx`)
- ⚠️ **Waiting for**: Storage bucket initialization in console

### After Setup
- ✅ Users can upload profile pictures
- ✅ Images compressed automatically (< 500KB typical)
- ✅ User-scoped security enforced
- ✅ Old pictures deleted automatically
- ✅ Costs minimal (~$0.12/month for 1000 users)

---

## Quick Commands Reference

```bash
# Deploy storage rules
firebase deploy --only storage

# Check current rules
firebase storage:rules

# View storage usage
firebase console:storage

# Test locally with emulator
firebase emulators:start --only storage
```

---

## Next Steps

1. **Complete setup**: Initialize storage in Firebase Console
2. **Deploy rules**: Run `firebase deploy --only storage`
3. **Test uploads**: Try uploading profile picture in app
4. **Monitor costs**: Set up billing alerts
5. **User communication**: Notify users to re-upload profile pictures

---

**Created by**: Claude Code (Anthropic)
**Date**: January 14, 2026
**Storage Bucket**: `gs://fittrackai2026.firebasestorage.app`
**Rules File**: `storage.rules` (ready to deploy)
**Status**: ⚠️ Ready for initialization (manual step required)
