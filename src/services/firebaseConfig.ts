import { initializeApp, FirebaseApp } from 'firebase/app';
import {
  initializeFirestore,
  getFirestore,
  Firestore,
  persistentLocalCache,
  memoryLocalCache,
  CACHE_SIZE_UNLIMITED,
  enableNetwork,
  disableNetwork,
  terminate,
  clearIndexedDbPersistence,
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
let networkEnabled = true;
let persistenceType: 'persistent' | 'memory' | 'none' = 'none';

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

    // Initialize Firestore with enhanced fallback chain
    try {
      // First attempt: Persistent cache
      firestoreDb = initializeFirestore(firebaseApp, {
        cache: persistentLocalCache({
          cacheSizeBytes: CACHE_SIZE_UNLIMITED,
        }),
      });
      persistenceEnabled = true;
      persistenceType = 'persistent';
      logger.log('[FirebaseConfig] Firestore initialized with persistent cache');
    } catch (persistentError) {
      // Second attempt: Memory-only cache
      try {
        firestoreDb = initializeFirestore(firebaseApp, {
          cache: memoryLocalCache(),
        });
        persistenceEnabled = false;
        persistenceType = 'memory';
        logger.warn(
          '[FirebaseConfig] Firestore initialized with memory cache (persistent failed):',
          persistentError
        );
      } catch (memoryError) {
        // Final fallback: Default getFirestore
        firestoreDb = getFirestore(firebaseApp);
        persistenceEnabled = false;
        persistenceType = 'none';
        logger.error(
          '[FirebaseConfig] Firestore initialized with default (all cache options failed):',
          memoryError
        );
      }
    }

    // Explicitly enable network after initialization to prevent stuck offline state
    // Run this asynchronously to not block initialization
    enableNetwork(firestoreDb)
      .then(() => {
        networkEnabled = true;
        logger.log('[FirebaseConfig] Firestore network explicitly enabled');
      })
      .catch((error) => {
        logger.warn('[FirebaseConfig] Could not explicitly enable network:', error);
        networkEnabled = false;
      });

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

/**
 * Force enable Firestore network (recovery mechanism)
 * Use this when Firestore gets stuck in offline mode
 */
export async function forceFirestoreOnline(): Promise<void> {
  if (!firestoreDb) {
    throw new Error('Firestore not initialized');
  }
  
  // Check if device is actually online
  if (!navigator.onLine) {
    logger.warn('[FirebaseConfig] Device is offline, cannot force Firestore online');
    throw new Error('Device is offline. Please check your internet connection.');
  }
  
  try {
    // First, try to disable network (in case it's in a bad state)
    try {
      await disableNetwork(firestoreDb);
      logger.log('[FirebaseConfig] Network disabled for reset');
      // Small delay to ensure state is cleared
      await new Promise(resolve => setTimeout(resolve, 100));
    } catch (disableError) {
      // Ignore errors when disabling - it might already be disabled
      logger.warn('[FirebaseConfig] Could not disable network (may already be disabled):', disableError);
    }
    
    // Now enable network
    await enableNetwork(firestoreDb);
    networkEnabled = true;
    
    // Wait a bit for network to stabilize
    await new Promise(resolve => setTimeout(resolve, 200));
    
    logger.log('[FirebaseConfig] Firestore network force-enabled');
  } catch (error) {
    logger.error('[FirebaseConfig] Failed to force enable network:', error);
    networkEnabled = false;
    throw error;
  }
}

/**
 * Get diagnostic information about Firestore state
 */
export function getFirestoreDiagnostics() {
  return {
    isInitialized: firestoreDb !== null,
    persistenceEnabled,
    persistenceType,
    networkEnabled,
  };
}

/**
 * Clear Firestore persistence (nuclear option for recovery)
 * WARNING: This will terminate the Firestore instance and clear all cached data
 */
export async function clearFirestorePersistence(): Promise<void> {
  try {
    if (firestoreDb) {
      await terminate(firestoreDb);
      firestoreDb = null;
    }
    if (firebaseApp) {
      await clearIndexedDbPersistence(getFirestore(firebaseApp));
      logger.log('[FirebaseConfig] Firestore persistence cleared');
    }
  } catch (error) {
    logger.error('[FirebaseConfig] Failed to clear persistence:', error);
    throw error;
  }
}
