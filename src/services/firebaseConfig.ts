import { initializeApp, FirebaseApp } from 'firebase/app';
import {
  initializeFirestore,
  getFirestore,
  Firestore,
  persistentLocalCache,
  CACHE_SIZE_UNLIMITED,
} from 'firebase/firestore';
import { getAuth, Auth } from 'firebase/auth';
import { logger } from '@/utils/logger';

// Firebase configuration from environment variables
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

let firebaseApp: FirebaseApp | null = null;
let firestoreDb: Firestore | null = null;
let firebaseAuth: Auth | null = null;
let persistenceEnabled = false;

/**
 * Initialize Firebase application
 * This should be called early in the app lifecycle (before any Firestore operations)
 */
export function initializeFirebase(): { app: FirebaseApp; db: Firestore; auth: Auth } {
  if (firebaseApp && firestoreDb && firebaseAuth) {
    return { app: firebaseApp, db: firestoreDb, auth: firebaseAuth };
  }

  try {
    // Initialize Firebase app
    firebaseApp = initializeApp(firebaseConfig);
    logger.log('[FirebaseConfig] Firebase app initialized');

    // Initialize Firestore with persistent local cache (replaces enableIndexedDbPersistence)
    try {
      firestoreDb = initializeFirestore(firebaseApp, {
        cache: persistentLocalCache({
          cacheSizeBytes: CACHE_SIZE_UNLIMITED,
        }),
      });
      persistenceEnabled = true;
      logger.log('[FirebaseConfig] Firestore initialized with offline persistence');
    } catch (err: unknown) {
      // Fallback to default Firestore if initialization fails
      // This handles cases where persistence isn't supported
      firestoreDb = getFirestore(firebaseApp);
      if (err && typeof err === 'object' && 'code' in err && err.code === 'failed-precondition') {
        logger.warn(
          '[FirebaseConfig] Multiple tabs open. Persistence enabled in first tab only.'
        );
      } else if (err.code === 'unimplemented') {
        logger.warn('[FirebaseConfig] Browser does not support offline persistence');
      } else {
        logger.error('[FirebaseConfig] Error initializing Firestore with persistence:', err);
      }
      logger.log('[FirebaseConfig] Firestore initialized (fallback mode)');
    }

    // Initialize Firebase Auth
    firebaseAuth = getAuth(firebaseApp);
    logger.log('[FirebaseConfig] Firebase Auth initialized');

    return { app: firebaseApp, db: firestoreDb, auth: firebaseAuth };
  } catch (error) {
    logger.error('[FirebaseConfig] Error initializing Firebase:', error);
    throw error;
  }
}

/**
 * Get Firestore database instance
 * Initializes Firebase if not already done
 */
export function getFirestoreDb(): Firestore {
  if (!firestoreDb) {
    const { db } = initializeFirebase();
    return db;
  }
  return firestoreDb;
}

/**
 * Get Firebase Auth instance
 * Initializes Firebase if not already done
 */
export function getFirebaseAuth(): Auth {
  if (!firebaseAuth) {
    const { auth } = initializeFirebase();
    return auth;
  }
  return firebaseAuth;
}

/**
 * Get Firebase App instance
 * Initializes Firebase if not already done
 */
export function getFirebaseApp(): FirebaseApp {
  if (!firebaseApp) {
    const { app } = initializeFirebase();
    return app;
  }
  return firebaseApp;
}

/**
 * Check if Firebase is initialized
 */
export function isFirebaseInitialized(): boolean {
  return firebaseApp !== null && firestoreDb !== null && firebaseAuth !== null;
}

/**
 * Check if offline persistence is enabled
 */
export function isOfflinePersistenceEnabled(): boolean {
  return persistenceEnabled;
}
