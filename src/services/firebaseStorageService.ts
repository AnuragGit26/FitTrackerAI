import {
  getStorage,
  ref,
  uploadBytes,
  getDownloadURL,
  deleteObject,
  listAll,
  StorageReference,
} from 'firebase/storage';
import { getFirebaseApp, getFirebaseAuth } from './firebaseConfig';
import { logger } from '@/utils/logger';
import { errorRecovery } from './errorRecovery';

export interface UploadResult {
  url: string;
  path: string;
}

export class FirebaseStorageService {
  private storage;

  constructor() {
    const app = getFirebaseApp();
    this.storage = getStorage(app);
  }

  /**
   * Upload a profile picture for a user
   * @param userId - The user's Firebase UID
   * @param file - The image file to upload
   * @returns The download URL and storage path
   */
  async uploadProfilePicture(userId: string, file: File): Promise<UploadResult> {
    // Ensure user is authenticated with Firebase Auth
    const auth = getFirebaseAuth();
    const currentUser = auth.currentUser;
    
    if (!currentUser) {
      throw new Error('You must be signed in to upload a profile picture. Please sign in and try again.');
    }

    // Verify userId matches the authenticated user
    if (currentUser.uid !== userId) {
      logger.warn(
        '[FirebaseStorage] User ID mismatch:',
        { requestedUserId: userId, authUserId: currentUser.uid }
      );
      throw new Error('User ID mismatch. Please sign out and sign in again.');
    }

    // Ensure auth token is fresh (Firebase Storage requires valid auth token)
    let authToken: string;
    try {
      authToken = await currentUser.getIdToken(true); // Force refresh
      logger.log('[FirebaseStorage] Auth token refreshed for user:', userId);
    } catch (tokenError) {
      logger.error('[FirebaseStorage] Failed to refresh auth token:', tokenError);
      throw new Error('Authentication expired. Please sign in again.');
    }

    // Verify token is valid (not null/undefined)
    if (!authToken) {
      throw new Error('Invalid authentication token. Please sign in again.');
    }

    // Validate file type
    if (!file.type.startsWith('image/')) {
      throw new Error('File must be an image');
    }

    // Validate file size (max 5MB)
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      throw new Error('Image size must be less than 5MB');
    }

    // Create a unique filename with timestamp
    const timestamp = Date.now();
    const extension = file.name.split('.').pop() || 'jpg';
    const filename = `${timestamp}.${extension}`;
    const storagePath = `profile-pictures/${userId}/${filename}`;

    // Create storage reference
    const storageRef = ref(this.storage, storagePath);

    // Set metadata
    const metadata = {
      contentType: file.type,
      customMetadata: {
        uploadedAt: new Date().toISOString(),
        userId,
      },
    };

    // Upload with retry logic for network errors
    return await errorRecovery.withRetry(
      async () => {
        logger.log('[FirebaseStorage] Uploading profile picture for user:', userId);

        // Upload file
        const snapshot = await uploadBytes(storageRef, file, metadata);
        logger.log('[FirebaseStorage] Upload complete:', snapshot.metadata.fullPath);

        // Get download URL
        const url = await getDownloadURL(storageRef);
        logger.log('[FirebaseStorage] Download URL obtained:', url);

        // Delete old profile pictures (keep only the latest)
        await this.deleteOldProfilePictures(userId, filename);

        return {
          url,
          path: storagePath,
        };
      },
      {
        maxRetries: 3,
        baseDelay: 1000,
        maxDelay: 5000,
        exponentialBackoff: true,
        retryableErrors: (error) => {
          // Check if it's a network/connection error
          const message = error.message.toLowerCase();
          const errorString = String(error).toLowerCase();
          
          // Retry on connection reset, network errors, and timeouts
          const isNetworkError = 
            message.includes('connection') ||
            message.includes('network') ||
            message.includes('timeout') ||
            message.includes('econnreset') ||
            message.includes('failed to fetch') ||
            errorString.includes('err_connection_reset') ||
            error.name === 'NetworkError' ||
            error.name === 'TimeoutError';
          
          // Don't retry on auth/permission errors
          const isNonRetryable = 
            message.includes('unauthorized') ||
            message.includes('permission') ||
            message.includes('quota') ||
            message.includes('invalid') ||
            message.includes('forbidden');
          
          return isNetworkError && !isNonRetryable;
        },
      }
    ).catch((error) => {
      logger.error('[FirebaseStorage] Upload error after retries:', error);
      throw this.handleStorageError(error);
    });
  }

  /**
   * Get the download URL for a profile picture
   * @param storagePath - The path to the file in storage
   * @returns The download URL
   */
  async getProfilePictureURL(storagePath: string): Promise<string> {
    try {
      logger.log('[FirebaseStorage] Getting download URL for:', storagePath);
      const storageRef = ref(this.storage, storagePath);
      const url = await getDownloadURL(storageRef);
      return url;
    } catch (error) {
      logger.error('[FirebaseStorage] Get URL error:', error);
      throw this.handleStorageError(error);
    }
  }

  /**
   * Delete a profile picture
   * @param storagePath - The path to the file in storage
   */
  async deleteProfilePicture(storagePath: string): Promise<void> {
    try {
      logger.log('[FirebaseStorage] Deleting profile picture:', storagePath);
      const storageRef = ref(this.storage, storagePath);
      await deleteObject(storageRef);
      logger.log('[FirebaseStorage] Profile picture deleted successfully');
    } catch (error) {
      logger.error('[FirebaseStorage] Delete error:', error);
      throw this.handleStorageError(error);
    }
  }

  /**
   * Delete all profile pictures for a user
   * @param userId - The user's Firebase UID
   */
  async deleteAllProfilePictures(userId: string): Promise<void> {
    try {
      logger.log('[FirebaseStorage] Deleting all profile pictures for user:', userId);
      const folderRef = ref(this.storage, `profile-pictures/${userId}`);
      const listResult = await listAll(folderRef);

      // Delete all files in the folder
      const deletePromises = listResult.items.map((itemRef) => deleteObject(itemRef));
      await Promise.all(deletePromises);

      logger.log('[FirebaseStorage] All profile pictures deleted');
    } catch (error) {
      logger.error('[FirebaseStorage] Delete all error:', error);
      throw this.handleStorageError(error);
    }
  }

  /**
   * Delete old profile pictures, keeping only the most recent one
   * @param userId - The user's Firebase UID
   * @param currentFilename - The filename of the current picture to keep
   */
  private async deleteOldProfilePictures(
    userId: string,
    currentFilename: string
  ): Promise<void> {
    try {
      logger.log('[FirebaseStorage] Cleaning up old profile pictures for user:', userId);
      const folderRef = ref(this.storage, `profile-pictures/${userId}`);
      const listResult = await listAll(folderRef);

      // Delete all files except the current one
      const deletePromises = listResult.items
        .filter((itemRef) => !itemRef.name.includes(currentFilename))
        .map((itemRef) => {
          logger.log('[FirebaseStorage] Deleting old picture:', itemRef.name);
          return deleteObject(itemRef);
        });

      await Promise.all(deletePromises);
      logger.log('[FirebaseStorage] Old profile pictures cleaned up');
    } catch (error) {
      // Non-blocking - log error but don't throw
      logger.warn('[FirebaseStorage] Failed to cleanup old pictures:', error);
    }
  }

  /**
   * List all profile pictures for a user
   * @param userId - The user's Firebase UID
   * @returns Array of storage references
   */
  async listProfilePictures(userId: string): Promise<StorageReference[]> {
    try {
      logger.log('[FirebaseStorage] Listing profile pictures for user:', userId);
      const folderRef = ref(this.storage, `profile-pictures/${userId}`);
      const listResult = await listAll(folderRef);
      return listResult.items;
    } catch (error) {
      logger.error('[FirebaseStorage] List error:', error);
      throw this.handleStorageError(error);
    }
  }

  /**
   * Compress and resize image before upload (client-side)
   * @param file - The original image file
   * @param maxWidth - Maximum width in pixels
   * @param maxHeight - Maximum height in pixels
   * @param quality - JPEG quality (0-1)
   * @returns Compressed image file
   */
  async compressImage(
    file: File,
    maxWidth: number = 800,
    maxHeight: number = 800,
    quality: number = 0.8
  ): Promise<File> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');

      if (!ctx) {
        reject(new Error('Failed to get canvas context'));
        return;
      }

      img.onload = () => {
        // Calculate new dimensions
        let width = img.width;
        let height = img.height;

        if (width > maxWidth || height > maxHeight) {
          const ratio = Math.min(maxWidth / width, maxHeight / height);
          width = width * ratio;
          height = height * ratio;
        }

        // Set canvas dimensions
        canvas.width = width;
        canvas.height = height;

        // Draw image on canvas
        ctx.drawImage(img, 0, 0, width, height);

        // Convert canvas to blob
        canvas.toBlob(
          (blob) => {
            if (!blob) {
              reject(new Error('Failed to compress image'));
              return;
            }

            // Create new file from blob
            const compressedFile = new File([blob], file.name, {
              type: 'image/jpeg',
              lastModified: Date.now(),
            });

            logger.log(
              '[FirebaseStorage] Image compressed:',
              `${(file.size / 1024).toFixed(2)}KB → ${(compressedFile.size / 1024).toFixed(2)}KB`
            );

            resolve(compressedFile);
          },
          'image/jpeg',
          quality
        );
      };

      img.onerror = () => {
        reject(new Error('Failed to load image'));
      };

      // Load image from file
      img.src = URL.createObjectURL(file);
    });
  }

  /**
   * Handle Firebase Storage errors and convert to user-friendly messages
   */
  private handleStorageError(error: unknown): Error {
    if (error && typeof error === 'object' && 'code' in error) {
      const storageError = error as { code: string; message: string };

      switch (storageError.code) {
        case 'storage/unauthorized':
          return new Error(
            'You do not have permission to access this file. ' +
            'This usually means the Firebase Storage security rules have not been deployed. ' +
            'Please run: firebase deploy --only storage'
          );
        case 'storage/canceled':
          return new Error('Upload was cancelled.');
        case 'storage/unknown':
          return new Error('An unknown error occurred. Please try again.');
        case 'storage/object-not-found':
          return new Error('File not found.');
        case 'storage/bucket-not-found':
          return new Error('Storage bucket not found. Please contact support.');
        case 'storage/project-not-found':
          return new Error('Firebase project not found. Please contact support.');
        case 'storage/quota-exceeded':
          return new Error('Storage quota exceeded. Please contact support.');
        case 'storage/unauthenticated':
          return new Error('Please sign in to upload files.');
        case 'storage/retry-limit-exceeded':
          return new Error('Upload failed after multiple attempts. Please check your internet connection and try again.');
        case 'storage/invalid-checksum':
          return new Error('File was corrupted during upload. Please try again.');
        case 'storage/invalid-event-name':
        case 'storage/invalid-url':
        case 'storage/invalid-argument':
          return new Error('Invalid request. Please try again.');
        case 'storage/no-default-bucket':
          return new Error('No storage bucket configured. Please contact support.');
        case 'storage/cannot-slice-blob':
          return new Error('Failed to read file. Please try again.');
        case 'storage/server-file-wrong-size':
          return new Error('Upload failed due to file size mismatch. Please try again.');
        default:
          logger.error(
            '[FirebaseStorage] Unhandled error:',
            new Error(storageError.message),
            { code: storageError.code }
          );
          return new Error(`Storage error: ${storageError.message}`);
      }
    }

    // Handle network errors
    const errorMessage = error instanceof Error ? error.message : String(error);
    const lowerMessage = errorMessage.toLowerCase();
    
    if (
      lowerMessage.includes('connection reset') ||
      lowerMessage.includes('err_connection_reset') ||
      lowerMessage.includes('network error') ||
      lowerMessage.includes('failed to fetch')
    ) {
      return new Error('Network connection failed. Please check your internet connection and try again.');
    }

    return error instanceof Error ? error : new Error('Unknown storage error');
  }
}

// Export singleton instance
export const firebaseStorageService = new FirebaseStorageService();
