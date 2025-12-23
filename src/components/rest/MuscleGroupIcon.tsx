import { useState, useEffect, useRef } from 'react';
import { MuscleGroup, RecoveryStatus } from '@/types/muscle';
import { getRecoveryColor } from '@/services/recoveryCalculator';
import { muscleImageCache } from '@/services/muscleImageCache';
import { cn } from '@/utils/cn';

interface MuscleGroupIconProps {
  muscle: MuscleGroup;
  recoveryStatus: RecoveryStatus;
  className?: string;
}

export function MuscleGroupIcon({ muscle, recoveryStatus, className }: MuscleGroupIconProps) {
  const [imageUrl, setImageUrl] = useState<string>(muscleImageCache.getImageUrl(muscle));
  const [imageError, setImageError] = useState(false);
  const blobUrlRef = useRef<string | null>(null);
  
  useEffect(() => {
    // Cleanup previous blob URL if it exists
    if (blobUrlRef.current && blobUrlRef.current.startsWith('blob:')) {
      URL.revokeObjectURL(blobUrlRef.current);
      blobUrlRef.current = null;
    }
    
    const directUrl = muscleImageCache.getImageUrl(muscle);
    
    // If it's a data URI, use it directly
    if (directUrl.startsWith('data:')) {
      setImageUrl(directUrl);
      setImageError(false);
      return;
    }
    
    // For external URLs, try to load from cache
    muscleImageCache.getCachedImageUrl(muscle)
      .then((url) => {
        blobUrlRef.current = url.startsWith('blob:') ? url : null;
        setImageUrl(url);
        setImageError(false);
      })
      .catch(() => {
        // Fallback to direct URL if cache fails
        setImageUrl(directUrl);
        blobUrlRef.current = null;
      });

    // Cleanup blob URL on unmount or muscle change
    return () => {
      if (blobUrlRef.current && blobUrlRef.current.startsWith('blob:')) {
        URL.revokeObjectURL(blobUrlRef.current);
        blobUrlRef.current = null;
      }
    };
  }, [muscle]);

  const recoveryColor = getRecoveryColor(recoveryStatus);
  const isReady = recoveryStatus === 'ready';
  const isOverworked = recoveryStatus === 'overworked' || recoveryStatus === 'sore';
  const isRecovering = recoveryStatus === 'recovering' || recoveryStatus === 'fresh';

  // Determine overlay opacity and filter based on recovery status
  let overlayOpacity = 'opacity-80';
  let filterClass = 'grayscale';
  
  if (isReady) {
    overlayOpacity = 'opacity-70';
    filterClass = 'grayscale-0';
  } else if (isOverworked) {
    overlayOpacity = 'opacity-90';
    filterClass = 'grayscale brightness-75';
  } else if (isRecovering) {
    overlayOpacity = 'opacity-85';
    filterClass = 'grayscale brightness-90';
  }

  return (
    <div className={cn('absolute inset-0 m-1.5 rounded-full overflow-hidden bg-slate-800', className)}>
      {/* Muscle anatomy image */}
      {imageError ? (
        <div
          className={cn('w-full h-full bg-gradient-to-br from-slate-700 to-slate-900', overlayOpacity)}
          style={{
            backgroundImage: `linear-gradient(135deg, ${recoveryColor}20 0%, ${recoveryColor}40 100%)`,
          }}
        />
      ) : (
        <img
          src={imageUrl}
          alt={`${muscle} muscle anatomy`}
          className={cn(
            'w-full h-full object-cover',
            filterClass,
            overlayOpacity
          )}
          loading="lazy"
          onError={() => {
            setImageError(true);
          }}
        />
      )}
      {/* Color overlay based on recovery status */}
      <div
        className={cn(
          'absolute inset-0 rounded-full',
          isReady 
            ? 'bg-primary/20' 
            : isOverworked 
            ? 'bg-warning/30' 
            : 'bg-caution/25'
        )}
        style={{
          mixBlendMode: 'overlay',
        }}
      />
    </div>
  );
}

