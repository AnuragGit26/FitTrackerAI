# Icon Refresh System

## Overview

The Icon Refresh System automatically updates PWA icons for existing users when icons are changed. This ensures users see the latest branding without manual intervention.

## How It Works

### 1. Version Tracking

The system tracks icon versions using localStorage:
- **Key**: `fitTrackAI_iconVersion`
- **Current Version**: `2.0.0` (Icon2.png - transparent RGBA)
- **Previous Version**: Automatically detected when user visits after update

### 2. Automatic Refresh Flow

On app initialization, the system:

1. **Checks Icon Version**
   - Compares stored version with current version
   - Detects if icons have been updated

2. **Clears Old Caches** (if update detected)
   - Removes old icon files (Fittrack2.png) from service worker caches
   - Clears manifest cache to force reload
   - Targets caches: `static-assets`, `workbox-precache`

3. **Forces Service Worker Update**
   - Triggers service worker update check
   - Activates waiting service worker immediately
   - Ensures new icons are precached

4. **Updates Version**
   - Sets localStorage to new icon version
   - Prevents repeated refresh attempts

### 3. User Notification

If icons are updated, users see a one-time prompt with:
- **Platform Detection**: iOS, Android, macOS, or Desktop
- **Step-by-Step Instructions**: How to update home screen icon
- **Dismissable**: Only shows once per version
- **Non-Intrusive**: Appears 2 seconds after app loads

## Files

### Core Service
- **`src/services/iconRefreshService.ts`**
  - Main icon refresh logic
  - Cache clearing functions
  - Version tracking
  - Platform-specific instructions

### UI Component
- **`src/components/common/IconUpdatePrompt.tsx`**
  - User notification banner
  - Platform-specific instructions
  - Dismissable prompt
  - Animated appearance

### Integration
- **`src/App.tsx`**
  - Initializes icon refresh on app load
  - Renders IconUpdatePrompt component

## Configuration

### Update Icon Version

When you change icons, update the version in `iconRefreshService.ts`:

```typescript
const CURRENT_ICON_VERSION = '3.0.0'; // Change this when icons update
```

This will trigger refresh for all existing users on next visit.

### Customize Instructions

Platform-specific instructions are in `getUpdateInstructions()`:

```typescript
{
  platform: 'iOS',
  instructions: [
    'Remove the current app from your Home Screen',
    'Open Safari and visit this site',
    // ... more steps
  ]
}
```

## Usage

### For Developers

Icon refresh runs automatically. No manual intervention needed.

To test the system:

```typescript
// In browser console
iconRefreshService.resetIconVersion(); // Reset to trigger prompt
location.reload(); // Reload to see prompt
```

### For Users

When icons update:
1. App automatically clears old icon caches
2. A prompt appears with instructions
3. Follow platform-specific steps to update home screen icon
4. Prompt only shows once

## Technical Details

### Cache Clearing

The system clears:
- **Static Assets Cache**: Where icons are cached
- **Workbox Precache**: Service worker precache
- **Manifest Cache**: PWA manifest files
- **Old Icon Files**: Specifically targets Fittrack2.png

### Service Worker Update

Forces immediate update by:
```typescript
await registration.update(); // Check for updates
registration.waiting?.postMessage({ type: 'SKIP_WAITING' }); // Activate immediately
```

### Version Storage

Uses localStorage for persistence:
- `fitTrackAI_iconVersion`: Current icon version
- `fitTrackAI_iconUpdatePrompted`: Whether user was prompted for this version

## Icon Version History

| Version | Icon File      | Format | Description                    |
|---------|----------------|--------|--------------------------------|
| 1.0.0   | Fittrack2.png  | RGB    | Original icon (opaque white)   |
| 2.0.0   | Icon2.png      | RGBA   | New icon (transparent)         |

## Benefits

1. **Automatic Updates**: No user action required for cache clearing
2. **User-Friendly**: Clear instructions for home screen update
3. **One-Time Prompt**: Non-intrusive notification
4. **Platform-Aware**: Customized instructions per platform
5. **Cached Properly**: New icons precached immediately

## Troubleshooting

### Prompt Not Showing

Check:
- Version updated in `iconRefreshService.ts`?
- User already prompted for this version?
- Browser localStorage working?

### Icons Not Updating

Try:
- Clear browser cache manually
- Unregister service worker
- Remove and reinstall PWA

### Testing

```typescript
// Reset system (browser console)
localStorage.removeItem('fitTrackAI_iconVersion');
localStorage.removeItem('fitTrackAI_iconUpdatePrompted');
location.reload();
```

## Future Enhancements

Potential improvements:
- Silent background icon update
- A/B testing for icons
- Analytics for icon update adoption
- Automatic home screen icon replacement (if possible)
