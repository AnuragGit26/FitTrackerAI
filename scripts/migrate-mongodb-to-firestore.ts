#!/usr/bin/env tsx

import { MongoClient } from 'mongodb';
import { initializeApp, cert, App } from 'firebase-admin/app';
import { getFirestore, Firestore, Timestamp, WriteBatch } from 'firebase-admin/firestore';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../.env') });

// Configuration
const BATCH_SIZE = 500; // Firestore batch limit
const DRY_RUN = process.env.DRY_RUN === 'true'; // Set to 'true' for dry run (no writes)

// Initialize Firebase Admin SDK
let firebaseApp: App;
let firestoreDb: Firestore;

function initializeFirebaseAdmin() {
  try {
    firebaseApp = initializeApp({
      credential: cert({
        projectId: process.env.FIREBASE_PROJECT_ID!,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL!,
        privateKey: process.env.FIREBASE_PRIVATE_KEY!.replace(/\\n/g, '\n'),
      }),
    });
    firestoreDb = getFirestore(firebaseApp);
    console.log('✅ Firebase Admin SDK initialized');
  } catch (error) {
    console.error('❌ Failed to initialize Firebase Admin SDK:', error);
    throw error;
  }
}

/**
 * Convert MongoDB document to Firestore format
 */
function convertToFirestoreFormat(doc: any): any {
  const converted: any = { ...doc };

  // Remove MongoDB _id
  delete converted._id;

  // Convert Date strings to Firestore Timestamps
  Object.keys(converted).forEach((key) => {
    const value = converted[key];

    // Convert date strings or Date objects to Timestamp
    if (value instanceof Date) {
      converted[key] = Timestamp.fromDate(value);
    } else if (typeof value === 'string' && isValidDate(value)) {
      const date = new Date(value);
      if (!isNaN(date.getTime())) {
        converted[key] = Timestamp.fromDate(date);
      }
    } else if (typeof value === 'number' && (key.includes('At') || key.includes('Time'))) {
      // Convert Unix timestamps to Firestore Timestamps
      const date = new Date(value);
      if (!isNaN(date.getTime()) && date.getFullYear() >= 2000) {
        converted[key] = Timestamp.fromDate(date);
      }
    } else if (Array.isArray(value)) {
      // Recursively convert arrays
      converted[key] = value.map((item) =>
        typeof item === 'object' ? convertToFirestoreFormat(item) : item
      );
    } else if (value && typeof value === 'object' && !(value instanceof Timestamp)) {
      // Recursively convert nested objects
      converted[key] = convertToFirestoreFormat(value);
    }
  });

  return converted;
}

/**
 * Check if string is a valid date
 */
function isValidDate(dateString: string): boolean {
  return /^\d{4}-\d{2}-\d{2}/.test(dateString);
}

/**
 * Migrate a collection with batching
 */
async function migrateCollection(
  mongodb: any,
  mongoCollection: string,
  firestoreCollection: string,
  query: any = {}
): Promise<number> {
  console.log(`\n📦 Migrating ${mongoCollection} → ${firestoreCollection}...`);

  const records = await mongodb.collection(mongoCollection).find(query).toArray();

  if (records.length === 0) {
    console.log(`  ℹ️  No records found in ${mongoCollection}`);
    return 0;
  }

  if (DRY_RUN) {
    console.log(`  🔍 [DRY RUN] Would migrate ${records.length} records`);
    return records.length;
  }

  let migratedCount = 0;
  const batches = Math.ceil(records.length / BATCH_SIZE);

  for (let i = 0; i < batches; i++) {
    const batchStart = i * BATCH_SIZE;
    const batchEnd = Math.min((i + 1) * BATCH_SIZE, records.length);
    const batchRecords = records.slice(batchStart, batchEnd);

    const batch = firestoreDb.batch();

    for (const record of batchRecords) {
      const docId = record.id || record._id.toString();
      const docRef = firestoreDb.collection(firestoreCollection).doc(docId);
      const firestoreData = convertToFirestoreFormat(record);
      batch.set(docRef, firestoreData);
      migratedCount++;
    }

    await batch.commit();
    console.log(`  ✓ Migrated ${batchEnd}/${records.length} records (${Math.round((batchEnd / records.length) * 100)}%)`);
  }

  console.log(`✅ Completed: ${migratedCount} records migrated from ${mongoCollection}`);
  return migratedCount;
}

/**
 * Migrate user-scoped subcollection
 */
async function migrateUserSubcollection(
  mongodb: any,
  mongoCollection: string,
  userId: string,
  firestoreSubcollection: string,
  filter: any = {}
): Promise<number> {
  const records = await mongodb.collection(mongoCollection)
    .find({ userId, ...filter })
    .toArray();

  if (records.length === 0) {
    return 0;
  }

  if (DRY_RUN) {
    console.log(`    🔍 [DRY RUN] Would migrate ${records.length} ${firestoreSubcollection}`);
    return records.length;
  }

  let migratedCount = 0;
  const batches = Math.ceil(records.length / BATCH_SIZE);

  for (let i = 0; i < batches; i++) {
    const batchStart = i * BATCH_SIZE;
    const batchEnd = Math.min((i + 1) * BATCH_SIZE, records.length);
    const batchRecords = records.slice(batchStart, batchEnd);

    const batch = firestoreDb.batch();

    for (const record of batchRecords) {
      const docId = record.id || record._id.toString();
      const docRef = firestoreDb
        .collection('users')
        .doc(userId)
        .collection(firestoreSubcollection)
        .doc(docId);

      const firestoreData = convertToFirestoreFormat(record);
      batch.set(docRef, firestoreData);
      migratedCount++;
    }

    await batch.commit();
  }

  return migratedCount;
}

/**
 * Main migration function
 */
async function migrateData() {
  console.log('🚀 Starting MongoDB to Firestore migration...\n');

  if (DRY_RUN) {
    console.log('⚠️  DRY RUN MODE - No data will be written to Firestore\n');
  }

  // Validate environment variables
  if (!process.env.VITE_MONGODB_URI) {
    throw new Error('VITE_MONGODB_URI environment variable not set');
  }
  if (!process.env.FIREBASE_PROJECT_ID || !process.env.FIREBASE_CLIENT_EMAIL || !process.env.FIREBASE_PRIVATE_KEY) {
    throw new Error('Firebase Admin SDK credentials not configured');
  }

  const mongoClient = new MongoClient(process.env.VITE_MONGODB_URI);

  try {
    // Connect to MongoDB
    console.log('📡 Connecting to MongoDB...');
    await mongoClient.connect();
    const mongodb = mongoClient.db();
    console.log('✅ Connected to MongoDB\n');

    // Initialize Firebase Admin
    initializeFirebaseAdmin();

    let totalMigrated = 0;

    // ==========================================
    // 1. Migrate Global Exercises
    // ==========================================
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📚 Phase 1: Global Collections');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    const exercisesCount = await migrateCollection(
      mongodb,
      'exercises',
      'exercises',
      { isCustom: { $ne: true } } // Only non-custom exercises
    );
    totalMigrated += exercisesCount;

    // ==========================================
    // 2. Migrate User Profiles and User Data
    // ==========================================
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('👥 Phase 2: User Data');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    const users = await mongodb.collection('user_profiles').find({}).toArray();
    console.log(`\n📊 Found ${users.length} users to migrate\n`);

    for (let i = 0; i < users.length; i++) {
      const user = users[i];
      const userId = user.id || user._id.toString();
      const userProgress = `[${i + 1}/${users.length}]`;

      console.log(`\n${userProgress} 👤 Migrating user: ${userId} (${user.name || 'Unknown'})`);

      // Migrate user profile document
      if (!DRY_RUN) {
        const userDocRef = firestoreDb.collection('users').doc(userId);
        const userData = convertToFirestoreFormat(user);
        await userDocRef.set(userData);
      }
      console.log(`  ✓ User profile migrated`);
      totalMigrated++;

      // Migrate user's workouts
      const workoutsCount = await migrateUserSubcollection(
        mongodb,
        'workouts',
        userId,
        'workouts'
      );
      console.log(`  ✓ ${workoutsCount} workouts`);
      totalMigrated += workoutsCount;

      // Migrate user's templates
      const templatesCount = await migrateUserSubcollection(
        mongodb,
        'workout_templates',
        userId,
        'templates'
      );
      console.log(`  ✓ ${templatesCount} templates`);
      totalMigrated += templatesCount;

      // Migrate user's planned workouts
      const plannedCount = await migrateUserSubcollection(
        mongodb,
        'planned_workouts',
        userId,
        'plannedWorkouts'
      );
      console.log(`  ✓ ${plannedCount} planned workouts`);
      totalMigrated += plannedCount;

      // Migrate user's custom exercises
      const customExercisesCount = await migrateUserSubcollection(
        mongodb,
        'exercises',
        userId,
        'customExercises',
        { isCustom: true }
      );
      console.log(`  ✓ ${customExercisesCount} custom exercises`);
      totalMigrated += customExercisesCount;

      // Migrate user's muscle status
      const muscleStatusCount = await migrateUserSubcollection(
        mongodb,
        'muscle_statuses',
        userId,
        'muscleStatus'
      );
      console.log(`  ✓ ${muscleStatusCount} muscle status records`);
      totalMigrated += muscleStatusCount;

      // Migrate user's sleep logs
      const sleepLogsCount = await migrateUserSubcollection(
        mongodb,
        'sleep_logs',
        userId,
        'sleepLogs'
      );
      console.log(`  ✓ ${sleepLogsCount} sleep logs`);
      totalMigrated += sleepLogsCount;

      // Migrate user's recovery logs
      const recoveryLogsCount = await migrateUserSubcollection(
        mongodb,
        'recovery_logs',
        userId,
        'recoveryLogs'
      );
      console.log(`  ✓ ${recoveryLogsCount} recovery logs`);
      totalMigrated += recoveryLogsCount;

      // Migrate user's notifications
      const notificationsCount = await migrateUserSubcollection(
        mongodb,
        'notifications',
        userId,
        'notifications'
      );
      console.log(`  ✓ ${notificationsCount} notifications`);
      totalMigrated += notificationsCount;

      // Migrate user's error logs
      const errorLogsCount = await migrateUserSubcollection(
        mongodb,
        'error_logs',
        userId,
        'errorLogs'
      );
      console.log(`  ✓ ${errorLogsCount} error logs`);
      totalMigrated += errorLogsCount;

      // Migrate user's settings
      const settingsRecords = await mongodb.collection('settings').find({ userId }).toArray();
      if (settingsRecords.length > 0 && !DRY_RUN) {
        const settingsDocRef = firestoreDb
          .collection('users')
          .doc(userId)
          .collection('settings')
          .doc('appSettings');

        // Combine all settings into a single document
        const settingsData: any = {};
        settingsRecords.forEach((record) => {
          const key = record.key;
          const value = record.value;
          settingsData[key] = value;
        });

        const firestoreSettings = convertToFirestoreFormat(settingsData);
        await settingsDocRef.set(firestoreSettings);
      }
      console.log(`  ✓ ${settingsRecords.length} settings`);
      totalMigrated += settingsRecords.length;

      console.log(`✅ Completed user ${userId}`);
    }

    // ==========================================
    // 3. Summary
    // ==========================================
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📊 Migration Summary');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`\n✅ Total records migrated: ${totalMigrated}`);
    console.log(`✅ Total users migrated: ${users.length}`);
    console.log(`✅ Global exercises: ${exercisesCount}`);

    if (DRY_RUN) {
      console.log('\n⚠️  DRY RUN COMPLETE - No data was written to Firestore');
      console.log('   Remove DRY_RUN=true to perform actual migration');
    } else {
      console.log('\n🎉 Migration completed successfully!');
      console.log('\nNext steps:');
      console.log('1. Verify data in Firebase Console');
      console.log('2. Deploy Firestore security rules: firebase deploy --only firestore:rules');
      console.log('3. Update .env: VITE_USE_FIRESTORE=true');
      console.log('4. Deploy application with Firestore enabled');
    }
  } catch (error) {
    console.error('\n❌ Migration failed:', error);
    throw error;
  } finally {
    await mongoClient.close();
    console.log('\n📡 MongoDB connection closed');
  }
}

// Run migration
migrateData()
  .then(() => {
    console.log('\n✅ Script completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Script failed:', error);
    process.exit(1);
  });
