# Firebase Cloud Messaging (FCM) Integration Guide

This guide explains how to set up Chrome push notifications using Firebase Cloud Messaging.

## Overview

The notification flow:

1. **Web App** requests notification permission and gets FCM token
2. **FCM Token** is stored in Firestore user_profiles
3. **Cloud Function** queries Firestore at 8 AM daily
4. **FCM** sends notification to Chrome
5. **Service Worker** receives and displays notification

## Implementation Steps

### 1. Add FCM to Firebase Config

Update `src/services/firebaseConfig.ts`:

```typescript
import { getMessaging, Messaging } from 'firebase/messaging';

let messaging: Messaging | null = null;

export function getFirebaseMessaging(): Messaging {
  if (!messaging) {
    messaging = getMessaging(getFirebaseApp());
  }
  return messaging;
}
```

### 2. Request Notification Permission

Update `src/services/notificationService.ts` to get FCM token:

```typescript
import { getToken } from 'firebase/messaging';
import { getFirebaseMessaging } from './firebaseConfig';
import { getFirestoreDb } from './firebaseConfig';
import { doc, updateDoc } from 'firebase/firestore';

async requestPermissionAndGetToken(userId: string): Promise<string | null> {
  try {
    // Request notification permission
    const permission = await Notification.requestPermission();

    if (permission !== 'granted') {
      console.log('Notification permission denied');
      return null;
    }

    // Get FCM token
    const messaging = getFirebaseMessaging();
    const token = await getToken(messaging, {
      vapidKey: import.meta.env.VITE_FIREBASE_VAPID_KEY,
    });

    if (token) {
      // Save token to Firestore
      const db = getFirestoreDb();
      await updateDoc(doc(db, 'user_profiles', userId), {
        fcmToken: token,
        'notificationSettings.workoutReminderEnabled': true,
        updatedAt: new Date(),
      });

      console.log('FCM token saved:', token);
      return token;
    }

    return null;
  } catch (error) {
    console.error('Error getting FCM token:', error);
    return null;
  }
}
```

### 3. Update Service Worker

Add FCM message handling to `public/sw.ts`:

```typescript
import { initializeApp } from 'firebase/app';
import { getMessaging, onBackgroundMessage } from 'firebase/messaging/sw';

// Initialize Firebase in service worker
const firebaseConfig = {
  apiKey: self.FIREBASE_API_KEY,
  authDomain: self.FIREBASE_AUTH_DOMAIN,
  projectId: self.FIREBASE_PROJECT_ID,
  storageBucket: self.FIREBASE_STORAGE_BUCKET,
  messagingSenderId: self.FIREBASE_MESSAGING_SENDER_ID,
  appId: self.FIREBASE_APP_ID,
};

const app = initializeApp(firebaseConfig);
const messaging = getMessaging(app);

// Handle background messages
onBackgroundMessage(messaging, (payload) => {
  console.log('Background message received:', payload);

  const notificationTitle = payload.notification?.title || 'FitTrackAI';
  const notificationOptions = {
    body: payload.notification?.body || 'You have a new notification',
    icon: payload.notification?.icon || '/fittrackAI_icon.png',
    badge: '/fittrackAI_icon.png',
    tag: payload.data?.tag || 'fittrack-notification',
    data: {
      url: payload.fcmOptions?.link || '/',
    },
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});

// Handle notification click
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const url = event.notification.data?.url || '/';
  event.waitUntil(
    clients.openWindow(url)
  );
});
```

### 4. Update Environment Variables

Add to `.env`:

```bash
# Firebase Cloud Messaging
VITE_FIREBASE_VAPID_KEY=your-vapid-key-here
```

Get the VAPID key from:

- Firebase Console → Project Settings → Cloud Messaging → Web Push certificates

### 5. Update User Profile Schema

Add FCM token field to Firestore:

```typescript
// In userStore.ts or wherever UserProfile is defined
export interface UserProfile {
  // ... existing fields
  fcmToken?: string; // FCM token for push notifications
  notificationSettings?: {
    workoutReminderEnabled: boolean;
    workoutReminderMinutes: number; // 15, 30, 60, or 120
    muscleRecoveryAlertsEnabled: boolean;
  };
}
```

### 6. Update Profile Page

Add notification setup in Profile.tsx:

```typescript
import { notificationService } from '@/services/notificationService';

const handleEnableNotifications = async () => {
  if (!profile?.id) return;

  try {
    const token = await notificationService.requestPermissionAndGetToken(profile.id);
    if (token) {
      success('Notifications enabled! You\'ll receive daily reminders at 8 AM.');
    } else {
      showError('Failed to enable notifications. Please check your browser settings.');
    }
  } catch (error) {
    showError('Failed to enable notifications');
  }
};
```

### 7. Deploy Cloud Function

```bash
cd functions
npm run build
firebase deploy --only functions:dailyNotifications
```

## Testing

### Test Locally

1. Start the dev server:

   ```bash
   npm run dev
   ```

2. Open Chrome DevTools → Application → Service Workers
3. Enable "Update on reload"
4. Click "Enable Notifications" in Profile page
5. Check Console for FCM token

### Test Cloud Function

1. Deploy the function:

   ```bash
   firebase deploy --only functions
   ```

2. View logs:

   ```bash
   firebase functions:log --only dailyNotifications
   ```

3. Trigger manually (for testing):

   ```bash
   firebase functions:shell
   > dailyNotifications()
   ```

### Test Notifications

Send a test notification using Firebase Console:

1. Go to Firebase Console → Cloud Messaging
2. Click "Send your first message"
3. Enter notification details
4. Select "User segment" → "User in audience"
5. Click "Send test message"
6. Enter your FCM token
7. Click "Test"

## Troubleshooting

### Token Not Saving

- Check Firestore security rules allow updates to user_profiles
- Verify user is authenticated
- Check browser console for errors

### Notifications Not Appearing

- Ensure notification permission is granted
- Check service worker is registered
- Verify FCM token is valid and saved
- Check Cloud Function logs for errors
- Ensure browser supports notifications

### Service Worker Issues

- Clear service worker cache
- Unregister and re-register service worker
- Check for JavaScript errors in DevTools

## Security Considerations

1. **Firestore Rules**: Ensure users can only update their own FCM tokens:

   ```javascript
   match /user_profiles/{userId} {
     allow update: if request.auth.uid == userId
                   && request.resource.data.diff(resource.data).affectedKeys()
                      .hasOnly(['fcmToken', 'notificationSettings', 'updatedAt']);
   }
   ```

2. **Token Rotation**: FCM tokens can expire or change. Implement token refresh:

   ```typescript
   onTokenRefresh((newToken) => {
     // Update token in Firestore
     updateUserFcmToken(userId, newToken);
   });
   ```

3. **Privacy**: Only send notifications to users who explicitly enabled them

## Cost Considerations

- FCM is free for unlimited notifications
- Cloud Functions: ~30 invocations/month (daily function)
- Well within Firebase free tier

## Future Enhancements

1. **Personalized Timing**: Allow users to set their preferred notification time
2. **Multiple Notifications**: Add weekly summary, rest day reminders
3. **Interactive Notifications**: Add action buttons (e.g., "Log Workout", "Snooze")
4. **Rich Content**: Include workout preview images
5. **Notification History**: Store sent notifications in Firestore
