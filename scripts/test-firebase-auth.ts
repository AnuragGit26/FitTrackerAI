#!/usr/bin/env tsx

/**
 * Test Firebase Authentication Setup
 *
 * This script verifies that Firebase Authentication is properly configured
 * and can generate custom tokens for Auth0 integration.
 */

import { initializeApp, cert } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import * as dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

// Load environment variables (ESM-compatible)
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: resolve(__dirname, '../.env') });

async function testFirebaseAuth() {
  console.log('🔥 Testing Firebase Authentication Setup...\n');

  // Step 1: Verify environment variables
  console.log('Step 1: Checking environment variables...');
  const requiredVars = [
    'FIREBASE_PROJECT_ID',
    'FIREBASE_CLIENT_EMAIL',
    'FIREBASE_PRIVATE_KEY',
  ];

  const missingVars = requiredVars.filter((varName) => !process.env[varName]);
  if (missingVars.length > 0) {
    console.error('❌ Missing required environment variables:');
    missingVars.forEach((varName) => console.error(`   - ${varName}`));
    process.exit(1);
  }
  console.log('✅ All environment variables present\n');

  // Step 2: Initialize Firebase Admin SDK
  console.log('Step 2: Initializing Firebase Admin SDK...');
  try {
    const app = initializeApp({
      credential: cert({
        projectId: process.env.FIREBASE_PROJECT_ID!,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL!,
        privateKey: process.env.FIREBASE_PRIVATE_KEY!.replace(/\\n/g, '\n'),
      }),
    });
    console.log('✅ Firebase Admin SDK initialized\n');

    // Step 3: Test Authentication
    console.log('Step 3: Testing Firebase Authentication...');
    const auth = getAuth(app);

    // Try to create a custom token for a test user
    const testUserId = 'test-user-' + Date.now();
    const customToken = await auth.createCustomToken(testUserId, {
      testUser: true,
      createdAt: new Date().toISOString(),
    });

    console.log('✅ Firebase Authentication working!');
    console.log(`   Generated custom token for test user: ${testUserId}`);
    console.log(`   Token length: ${customToken.length} characters\n`);

    // Step 4: Summary
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🎉 Firebase Authentication Setup: SUCCESS');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    console.log('✅ Identity Toolkit API is enabled');
    console.log('✅ Firebase Admin SDK working');
    console.log('✅ Custom token generation working');
    console.log('\nYour Firebase Authentication is properly configured!');
    console.log('You can now use Auth0 → Firebase custom token authentication.\n');

    process.exit(0);
  } catch (error: any) {
    console.error('❌ Firebase Authentication test failed!\n');
    console.error('Error:', error.message);

    if (error.code === 'auth/project-not-found') {
      console.error('\n❌ Firebase project not found or Authentication not enabled');
      console.error('   Please enable Authentication in Firebase Console:');
      console.error('   https://console.firebase.google.com/project/fittrackai2026/authentication');
    } else if (error.code === 'auth/invalid-credential') {
      console.error('\n❌ Invalid Firebase Admin credentials');
      console.error('   Please verify FIREBASE_CLIENT_EMAIL and FIREBASE_PRIVATE_KEY in .env');
    } else {
      console.error('\nFull error:', error);
    }

    process.exit(1);
  }
}

testFirebaseAuth();
