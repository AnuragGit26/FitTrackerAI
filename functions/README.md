# Firebase Cloud Functions

This directory contains Firebase Cloud Functions for FitTrackAI.

## Functions

### `dailyNotifications`
- **Schedule**: Every day at 8 AM IST (2:30 AM UTC)
- **Purpose**: Send daily workout reminders and motivational notifications via Chrome push notifications
- **Technology**: Firebase Cloud Messaging (FCM) → Service Worker → Chrome Browser
- **Status**: Skeleton implementation (requires FCM token storage in Firestore)

## Development

### Prerequisites
- Node.js 18 or higher
- Firebase CLI installed (`npm install -g firebase-tools`)
- Firebase project configured

### Install Dependencies
```bash
npm install
```

### Build Functions
```bash
npm run build
```

### Test Locally
```bash
npm run serve
```

This starts the Firebase emulator for local testing.

## Deployment

### First-time Setup
1. Ensure you're logged in to Firebase:
   ```bash
   firebase login
   ```

2. Ensure your Firebase project is set:
   ```bash
   firebase use <project-id>
   ```

### Deploy Functions
Deploy all functions:
```bash
npm run deploy
```

Or from the project root:
```bash
firebase deploy --only functions
```

Deploy specific function:
```bash
firebase deploy --only functions:dailyNotifications
```

### View Logs
```bash
npm run logs
```

Or:
```bash
firebase functions:log
```

## Implementation Notes

### Daily Notifications Function
The current implementation is a skeleton that logs execution. To fully implement:

1. **Add User Settings to Firestore**
   - Create a `users` collection with settings:
     - `workoutReminderEnabled: boolean`
     - `workoutReminderMinutes: number`
     - `fcmToken: string` (for push notifications)

2. **Implement FCM Push Notifications**
   - Set up Firebase Cloud Messaging in the web app
   - Store FCM tokens in Firestore when users enable notifications
   - Use `admin.messaging().send()` to send push notifications

3. **Query Planned Workouts**
   - Check `planned_workouts` collection for today's workouts
   - Send reminders based on user preferences

4. **Track Inactive Users**
   - Query `workouts` collection for recent activity
   - Send motivational messages to users who haven't worked out

### Future Functions

Consider adding:
- **Weekly Summary**: Send weekly progress reports
- **Data Cleanup**: Remove old deleted items (soft deletes)
- **Analytics**: Process workout data for insights
- **Backup**: Scheduled backups to Cloud Storage

## Troubleshooting

### Build Errors
If you encounter TypeScript errors:
```bash
npm run build -- --force
```

### Deployment Errors
- Ensure you have the correct permissions in Firebase Console
- Check that billing is enabled for Cloud Functions
- Verify the Firebase project ID is correct

### Function Not Triggering
- Check Cloud Scheduler in Google Cloud Console
- View function logs: `firebase functions:log`
- Verify timezone settings in the function definition

## Cost Considerations

Firebase Cloud Functions pricing:
- **Invocations**: 2 million free per month
- **Compute time**: 400,000 GB-seconds free per month
- **Network egress**: 5 GB free per month

The `dailyNotifications` function:
- Runs once per day = 30 invocations/month
- Well within free tier limits
