import { useRef, useState } from 'react';
import { Camera, Upload, X } from 'lucide-react';
import { cn } from '@/utils/cn';
import { processImage, validateImageFile } from '@/utils/imageProcessor';
import { firebaseStorageService } from '@/services/firebaseStorageService';
import { useAuth } from '@/contexts/AuthContext';
import { useUserStore } from '@/store/userStore';
import { useToast } from '@/hooks/useToast';

interface ProfilePictureUploadProps {
  picture?: string;
  onPictureChange: (picture: string) => void;
}

export function ProfilePictureUpload({ picture, onPictureChange }: ProfilePictureUploadProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const { currentUser } = useAuth();
  const { profile } = useUserStore();
  const { error: showError, success } = useToast();

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Check if user is authenticated
    if (!currentUser) {
      showError('Please sign in to upload a profile picture');
      return;
    }

    // Validate file
    const validation = validateImageFile(file);
    if (!validation.valid) {
      showError(validation.error || 'Invalid image file');
      return;
    }

    setIsLoading(true);
    setUploadProgress(0);
    setPreviewUrl(null);

    try {
      // Process image (compress and resize)
      const processed = await processImage(file);
      setPreviewUrl(processed.dataUrl);

      setUploadProgress(30);

      // Compress image before upload using Firebase Storage service
      const compressedFile = await firebaseStorageService.compressImage(
        processed.file,
        800,
        800,
        0.85
      );

      setUploadProgress(50);

      // Upload to Firebase Storage
      const result = await firebaseStorageService.uploadProfilePicture(
        currentUser.uid,
        compressedFile
      );

      setUploadProgress(100);
      onPictureChange(result.url);
      success('Profile photo uploaded successfully');
    } catch (error) {
      console.error('Failed to upload profile photo:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to upload profile photo';
      showError(errorMessage);
      setPreviewUrl(null);
    } finally {
      setIsLoading(false);
      setUploadProgress(0);
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleRemovePhoto = async () => {
    if (!picture) return;

    // Check if user is authenticated
    if (!currentUser) {
      showError('Please sign in to remove profile picture');
      return;
    }

    try {
      // Delete from Firebase Storage if it's a Firebase Storage URL
      if (picture.includes('firebase')) {
        // Extract storage path from URL
        // Firebase Storage URLs look like: https://firebasestorage.googleapis.com/v0/b/{bucket}/o/{path}?alt=media...
        const pathMatch = picture.match(/\/o\/(.+?)\?/);
        if (pathMatch) {
          const encodedPath = pathMatch[1];
          const storagePath = decodeURIComponent(encodedPath);
          await firebaseStorageService.deleteProfilePicture(storagePath);
        }
      }

      onPictureChange('');
      success('Profile photo removed');
    } catch (error) {
      console.error('Failed to remove profile photo:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to remove profile photo';
      showError(errorMessage);
    }
  };

  const handleClick = () => {
    fileInputRef.current?.click();
  };

  // Use previewUrl if uploading, otherwise use prop picture, fallback to profile from store
  const displayUrl = previewUrl || picture || profile?.profilePicture;

  return (
    <section className="flex flex-col items-center">
      <div className="relative group">
        <div
          className={cn(
            'size-32 rounded-full overflow-hidden border-4 border-gray-200 dark:border-surface-border',
            'group-hover:border-primary transition-colors duration-300',
            'bg-gray-100 dark:bg-surface-dark bg-center bg-cover',
            isLoading && 'opacity-50',
            !isLoading && 'cursor-pointer'
          )}
          style={
            displayUrl
              ? { backgroundImage: `url("${displayUrl}")` }
              : undefined
          }
          onClick={!isLoading ? handleClick : undefined}
        >
          {!displayUrl && (
            <div className="w-full h-full flex items-center justify-center bg-gray-200 dark:bg-surface-dark">
              <Camera className="w-12 h-12 text-gray-400 dark:text-gray-500" />
            </div>
          )}
          {isLoading && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/20 backdrop-blur-sm">
              <div className="flex flex-col items-center gap-2">
                <Upload className="w-6 h-6 text-white animate-bounce" />
                {uploadProgress > 0 && (
                  <div className="w-20 h-1 bg-white/30 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary transition-all duration-300"
                      style={{ width: `${uploadProgress}%` }}
                    />
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
        {displayUrl && !isLoading && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleRemovePhoto();
            }}
            className="absolute -top-2 -right-2 bg-red-500 hover:bg-red-600 text-white rounded-full p-1.5 shadow-lg transition-colors"
            aria-label="Remove profile photo"
          >
            <X className="w-4 h-4" />
          </button>
        )}
        {!isLoading && (
          <div
            className="absolute bottom-0 right-0 bg-primary text-black rounded-full p-2 border-4 border-background-light dark:border-background-dark flex items-center justify-center cursor-pointer hover:bg-[#0be060] transition-colors"
            onClick={handleClick}
          >
            <Camera className="w-5 h-5" />
          </div>
        )}
      </div>
      <div className="mt-3 text-center">
        <p className="text-lg font-bold">
          {displayUrl ? 'Change Photo' : 'Upload Photo'}
        </p>
        <p className="text-sm text-slate-500 dark:text-[#90cba8]">
          {displayUrl ? 'Tap to change your profile picture' : 'Add a profile picture'}
        </p>
      </div>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif,image/heic,image/heif,.heic,.heif"
        onChange={handleFileSelect}
        className="hidden"
        disabled={isLoading}
      />
    </section>
  );
}

