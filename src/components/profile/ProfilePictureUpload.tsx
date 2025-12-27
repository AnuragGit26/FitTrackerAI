import { useRef, useState } from 'react';
import { Camera, Upload, X } from 'lucide-react';
import { cn } from '@/utils/cn';
import { processImage, validateImageFile } from '@/utils/imageProcessor';
import { getSupabaseClient } from '@/services/supabaseClient';
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
  const { profile } = useUserStore();
  const { error: showError, success } = useToast();

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

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

      // Upload to Supabase Storage
      if (!profile?.id) {
        throw new Error('User not logged in');
      }

      const supabase = getSupabaseClient();
      const fileName = `${profile.id}/${Date.now()}-${processed.file.name}`;

      // Delete old profile photo if exists
      if (picture && picture.includes('profile-photos')) {
        try {
          const oldPath = picture.split('/profile-photos/')[1];
          if (oldPath) {
            await supabase.storage.from('profile-photos').remove([oldPath]);
          }
        } catch (error) {
          // Ignore errors when deleting old photo
          console.warn('Failed to delete old profile photo:', error);
        }
      }

      // Upload new photo
      const { error: uploadError } = await supabase.storage
        .from('profile-photos')
        .upload(fileName, processed.file, {
          cacheControl: '3600',
          upsert: true,
        });

      if (uploadError) {
        throw uploadError;
      }

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('profile-photos')
        .getPublicUrl(fileName);

      if (!urlData?.publicUrl) {
        throw new Error('Failed to get public URL');
      }

      setUploadProgress(100);
      onPictureChange(urlData.publicUrl);
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

    try {
      // Delete from Supabase Storage if it's a Supabase URL
      if (picture.includes('profile-photos')) {
        const supabase = getSupabaseClient();
        const fileName = picture.split('/profile-photos/')[1];
        if (fileName) {
          await supabase.storage.from('profile-photos').remove([fileName]);
        }
      }

      onPictureChange('');
      success('Profile photo removed');
    } catch (error) {
      console.error('Failed to remove profile photo:', error);
      showError('Failed to remove profile photo');
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

