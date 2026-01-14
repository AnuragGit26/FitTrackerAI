# Legacy Data Import Guide (Auth0 → Firebase Migration)

**Purpose**: Import your old workout data from Auth0 + MongoDB + Supabase exports into the new Firebase system.

**Your Export File**: `/Users/anurag2/Downloads/fittrackai-export-2026-01-06 (1).json`

---

## 🚀 Quick Import (5 Minutes)

### Step 1: Open Your App in Dev Mode

```bash
npm run dev
```

**Or open**: http://localhost:3000

---

### Step 2: Login with Firebase

1. **Open the app** in your browser
2. **Login** with your Firebase account (Google, email/password, or Apple)
3. **Important**: Make sure you're logged in BEFORE importing!

---

### Step 3: Open Browser Console

**Press**: `F12` (Windows/Linux) or `Cmd+Option+J` (Mac)

**Click**: Console tab

---

### Step 4: Load Your Export File

**Method 1: Copy-Paste (Easiest)**

1. **Open your export file**: `/Users/anurag2/Downloads/fittrackai-export-2026-01-06 (1).json`
2. **Copy ALL the content** (Cmd+A, Cmd+C)
3. **In browser console**, paste this:

```javascript
const data = // PASTE YOUR JSON HERE
```

Example:
```javascript
const data = {
  "version": "2.0.0",
  "exportDate": "2026-01-06T12:28:45.583Z",
  // ... rest of your data
}
```

**Method 2: Using fetch (if you have a URL)**

```javascript
const response = await fetch('path-to-your-export.json');
const data = await response.json();
```

---

### Step 5: Import the Data

**In the browser console**, run:

```javascript
// Dry run first (test without importing)
await window.importLegacyData(data, { dryRun: true });

// If dry run looks good, do the actual import
await window.importLegacyData(data, { clearExisting: true });
```

**Expected output:**
```
🔄 Legacy Data Import (Auth0 → Firebase Migration)
✅ Using current Firebase user ID: abc123xyz...
🔄 Auth0 → Firebase migration detected
   Old ID: auth0|695049ee1195e9080590da44
   New ID: abc123xyz...

💪 Importing 11 workouts...
✅ Imported 11/11 workouts

📋 Importing 68 templates...
✅ Imported 68/68 templates

📊 Import Summary:
Imported: {workouts: 11, templates: 68, ...}

✅ Import completed successfully!
   Your data has been migrated from Auth0 to Firebase.
   ⚠️  Please re-upload your profile picture in Profile settings.
```

---

## 📋 What Gets Imported

From your export file:

✅ **11 Workouts** → All exercise sets, reps, weights, RPE
✅ **68 Templates** → All your saved workout templates
✅ **9 Sleep Logs** → Sleep tracking data
✅ **8 Recovery Logs** → Recovery scores
✅ **12 Muscle Statuses** → Muscle recovery tracking
✅ **User Profile** → Name, age, goals, preferences
✅ **Settings** → App preferences

---

## 🔄 Migration Features

### Automatic User ID Conversion

**Old ID** (Auth0):
```
auth0|695049ee1195e9080590da44
```

**New ID** (Firebase):
```
abc123xyz... (automatically uses your current Firebase user)
```

All your data is automatically re-assigned to your new Firebase account!

### Profile Picture Handling

Your old profile picture URL won't work (it's on Supabase storage):

```
❌ Old: https://vvrrjceqdqufluytwzbp.supabase.co/storage/...
✅ New: Re-upload in Profile settings
```

**Action required**: Re-upload your profile picture after import.

---

## ⚙️ Import Options

### Option 1: Clear Existing Data First (Recommended)

```javascript
await window.importLegacyData(data, { clearExisting: true });
```

**Use when**: You want a clean import, replacing all existing data.

### Option 2: Merge with Existing Data

```javascript
await window.importLegacyData(data, { clearExisting: false });
```

**Use when**: You want to keep existing workouts and add imported ones.

### Option 3: Dry Run (Test First)

```javascript
await window.importLegacyData(data, { dryRun: true });
```

**Use when**: You want to test the import without actually saving data.

### Option 4: Skip User Profile

```javascript
await window.importLegacyData(data, {
  clearExisting: true,
  skipUserProfile: true
});
```

**Use when**: You've already set up your profile and don't want to overwrite it.

### Option 5: Skip Settings

```javascript
await window.importLegacyData(data, {
  clearExisting: true,
  skipSettings: true
});
```

**Use when**: You want to keep your current app settings.

---

## 🧪 Testing Your Import

### Step 1: Check Import Summary

After import, you should see:

```
📊 Import Summary:
Imported: {
  workouts: 11,
  templates: 68,
  plannedWorkouts: 0,
  customExercises: 0,
  muscleStatuses: 12,
  sleepLogs: 9,
  recoveryLogs: 8,
  userProfile: true,
  settings: true
}
```

### Step 2: Verify in App

1. **Go to Home page** → Should see your recent workouts
2. **Go to History** → Should see all 11 workouts
3. **Go to Templates** → Should see all 68 templates
4. **Go to Profile** → Should see your name, age, etc.

### Step 3: Check Firestore (Optional)

1. **Open**: https://console.firebase.google.com/project/fittrackai2026/firestore
2. **Navigate to**:
   - `workouts` collection → Should see 11 documents
   - `workoutTemplates` collection → Should see 68 documents
   - `user_profiles` collection → Should see your profile

---

## ⚠️ Warnings & Known Issues

### Warning 1: Profile Picture Removed

```
⚠️  Warnings:
1. Old profile picture removed (Supabase storage). Please re-upload.
```

**Action**: Go to Profile → Upload new profile picture

### Warning 2: User Profile Missing

```
⚠️  Warnings:
1. User profile missing, extracted user ID from workouts
```

**Meaning**: Export didn't have a user profile section, but import still worked by using the userId from workouts.

---

## 🔍 Troubleshooting

### Error: "No Firebase user logged in"

**Cause**: You're not logged into the app

**Fix**:
1. Login to the app first
2. Then run the import

### Error: "Cannot determine user ID"

**Cause**: Export file is corrupted or empty

**Fix**:
1. Check that your JSON file is valid
2. Ensure it has either `userProfile.id` or `workouts[0].userId`

### Error: "Invalid data format"

**Cause**: JSON syntax error when pasting

**Fix**:
1. Make sure you copy the ENTIRE JSON (including outer `{` and `}`)
2. Check for any copy-paste errors
3. Try the fetch method instead

### Import Shows 0 Items

**Cause**: Using `dryRun: true`

**Fix**: Remove `dryRun` or set it to `false`:

```javascript
await window.importLegacyData(data, { clearExisting: true }); // No dryRun
```

### Workouts Don't Appear in App

**Possible causes**:
1. Using wrong user account → Re-login with correct account
2. Data not synced yet → Refresh the page
3. Import failed silently → Check console for errors

**Fix**:
```javascript
// Check if data is in IndexedDB
const workouts = await db.workouts.toArray();
console.log('Workouts in IndexedDB:', workouts.length);
```

---

## 🔒 Data Safety

### Your Data is Safe

- ✅ Original export file is not modified
- ✅ `dryRun` mode lets you test first
- ✅ Can clear and re-import anytime
- ✅ Data saved to local IndexedDB first
- ✅ Can export again if needed

### Clearing Data (If Import Goes Wrong)

```javascript
// Clear all imported data for current user
await window.clearAllData(currentUserId);

// Or just clear existing and re-import
await window.importLegacyData(data, { clearExisting: true });
```

---

## 📊 Example: Full Import Session

Here's a complete example of a typical import:

```javascript
// 1. Load data (copy-paste your JSON)
const data = { /* your exported data */ };

// 2. Test first (dry run)
console.log('🧪 Testing import...');
const testResult = await window.importLegacyData(data, { dryRun: true });
console.log('Test result:', testResult);

// 3. If test looks good, do actual import
console.log('🚀 Starting actual import...');
const result = await window.importLegacyData(data, { clearExisting: true });

// 4. Check results
console.log('✅ Import complete!');
console.log('Imported:', result.imported);
console.log('Warnings:', result.warnings);
console.log('Errors:', result.errors);

// 5. Verify in app
console.log('📱 Check your app now - data should be visible!');
```

---

## 🎯 Migration Summary

### What Happens During Import

1. **Detects Auth0 user ID** in your old data
2. **Gets your current Firebase user ID** (the one you're logged in with)
3. **Replaces all Auth0 IDs** with your Firebase ID
4. **Removes old profile picture** (Supabase URL won't work)
5. **Converts date strings** to Date objects
6. **Imports everything** to IndexedDB
7. **Logs detailed summary** of what was imported

### Migration Path

```
Old System (Auth0):
  User ID: auth0|695049ee1195e9080590da44
  Storage: Supabase
  Database: MongoDB

                ↓ MIGRATION ↓

New System (Firebase):
  User ID: abc123xyz... (your Firebase UID)
  Storage: Firebase Storage
  Database: Firestore
```

---

## 🆘 Need Help?

### Check Console Logs

The importer provides detailed logging:
- ✅ Green checkmarks = Success
- ⚠️ Yellow warnings = Non-critical issues
- ❌ Red errors = Failed imports

### Common Questions

**Q: Will this delete my current workouts?**
A: Only if you use `clearExisting: true`. Use `clearExisting: false` to merge data.

**Q: Can I import multiple times?**
A: Yes! Use `clearExisting: true` to replace, or `false` to add more data.

**Q: What if I'm not logged in?**
A: Import will fail with clear error. Just login first, then import.

**Q: Can I undo an import?**
A: Yes, use `clearAllData()` or import again with `clearExisting: true`.

**Q: Why is my profile picture gone?**
A: Old Supabase URLs don't work anymore. Re-upload in Profile settings.

---

## ✅ Success Checklist

After import, verify:

- [ ] Login to app with Firebase account
- [ ] Open browser console (F12)
- [ ] Paste export data into console
- [ ] Run `dryRun` first to test
- [ ] Run actual import with `clearExisting: true`
- [ ] Check console for success message
- [ ] Verify workouts appear in app
- [ ] Verify templates appear in Templates page
- [ ] Check Profile page for your info
- [ ] Re-upload profile picture
- [ ] Done! 🎉

---

## 📝 Quick Reference

**Load legacy importer:**
```javascript
// Already loaded in dev mode - just check:
console.log(window.importLegacyData); // Should show function
```

**Import commands:**
```javascript
// Dry run (test)
await window.importLegacyData(data, { dryRun: true });

// Actual import (replace existing)
await window.importLegacyData(data, { clearExisting: true });

// Import without clearing
await window.importLegacyData(data, { clearExisting: false });

// Skip user profile
await window.importLegacyData(data, { skipUserProfile: true });

// Skip settings
await window.importLegacyData(data, { skipSettings: true });
```

---

**Created by**: Claude Code (Anthropic)
**Date**: January 14, 2026
**Your Export**: fittrackai-export-2026-01-06 (1).json
**Data Counts**: 11 workouts, 68 templates, 9 sleep logs, 8 recovery logs

**Ready to import?** Follow the Quick Import steps above! 🚀
