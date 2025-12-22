import { MuscleGroup, RecoveryStatus } from '@/types/muscle';
import { getRecoveryColor } from '@/services/recoveryCalculator';
import { cn } from '@/utils/cn';

// Map muscle groups to individual muscle anatomy image URLs
// Using images that focus on specific muscle groups, not full body
const MUSCLE_IMAGE_MAP: Record<MuscleGroup, string> = {
  // Upper Body - Chest
  [MuscleGroup.CHEST]: 'https://moyerwellness.com/wp-content/uploads/2023/07/Pectorals-1024x1024.jpg',
  [MuscleGroup.UPPER_CHEST]: 'https://moyerwellness.com/wp-content/uploads/2023/07/Pectorals-1024x1024.jpg',
  [MuscleGroup.LOWER_CHEST]: 'https://moyerwellness.com/wp-content/uploads/2023/07/Pectorals-1024x1024.jpg',
  
  // Upper Body - Back
  [MuscleGroup.BACK]: 'https://moyerwellness.com/wp-content/uploads/2023/07/Latissimus-Dorsi-1024x1024.jpg',
  [MuscleGroup.LATS]: 'https://moyerwellness.com/wp-content/uploads/2023/07/Latissimus-Dorsi-1024x1024.jpg',
  [MuscleGroup.TRAPS]: 'https://moyerwellness.com/wp-content/uploads/2023/07/Trapezius-1024x1024.jpg',
  [MuscleGroup.RHOMBOIDS]: 'https://moyerwellness.com/wp-content/uploads/2023/07/Rhomboids-1024x1024.jpg',
  [MuscleGroup.LOWER_BACK]: 'https://moyerwellness.com/wp-content/uploads/2023/07/Erector-Spinae-1024x1024.jpg',
  
  // Upper Body - Shoulders
  [MuscleGroup.SHOULDERS]: 'https://moyerwellness.com/wp-content/uploads/2023/07/Deltoids-1-1024x1024.jpg',
  [MuscleGroup.FRONT_DELTS]: 'https://moyerwellness.com/wp-content/uploads/2023/07/Deltoids-1-1024x1024.jpg',
  [MuscleGroup.SIDE_DELTS]: 'https://moyerwellness.com/wp-content/uploads/2023/07/Deltoids-1-1024x1024.jpg',
  [MuscleGroup.REAR_DELTS]: 'https://moyerwellness.com/wp-content/uploads/2023/07/Deltoids-1-1024x1024.jpg',
  
  // Upper Body - Arms
  [MuscleGroup.BICEPS]: 'https://moyerwellness.com/wp-content/uploads/2023/07/Biceps-1024x1024.jpg',
  [MuscleGroup.TRICEPS]: 'https://moyerwellness.com/wp-content/uploads/2023/07/Triceps-1024x1024.jpg',
  [MuscleGroup.FOREARMS]: 'https://moyerwellness.com/wp-content/uploads/2023/07/Forearms-1024x1024.jpg',
  
  // Core
  [MuscleGroup.ABS]: 'https://moyerwellness.com/wp-content/uploads/2023/07/Rectus-Abdominis-1024x1024.jpg',
  [MuscleGroup.OBLIQUES]: 'https://moyerwellness.com/wp-content/uploads/2023/07/Obliques-1024x1024.jpg',
  
  // Lower Body
  [MuscleGroup.QUADS]: 'https://moyerwellness.com/wp-content/uploads/2023/07/Quadriceps-1024x1024.jpg',
  [MuscleGroup.HAMSTRINGS]: 'https://moyerwellness.com/wp-content/uploads/2023/07/Hamstrings-1024x1024.jpg',
  [MuscleGroup.GLUTES]: 'https://moyerwellness.com/wp-content/uploads/2023/07/Glutes-1024x1024.jpg',
  [MuscleGroup.CALVES]: 'https://moyerwellness.com/wp-content/uploads/2023/07/Calves-1024x1024.jpg',
  [MuscleGroup.HIP_FLEXORS]: 'https://moyerwellness.com/wp-content/uploads/2023/07/Hip-Flexors-1024x1024.jpg',
};

interface MuscleGroupIconProps {
  muscle: MuscleGroup;
  recoveryStatus: RecoveryStatus;
  className?: string;
}

export function MuscleGroupIcon({ muscle, recoveryStatus, className }: MuscleGroupIconProps) {
  const imageUrl = MUSCLE_IMAGE_MAP[muscle];
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
      <img
        src={imageUrl}
        alt={`${muscle} muscle anatomy`}
        className={cn(
          'w-full h-full object-cover',
          filterClass,
          overlayOpacity
        )}
        loading="lazy"
        onError={(e) => {
          // Fallback to gradient if image fails to load
          const target = e.target as HTMLImageElement;
          target.style.display = 'none';
          const parent = target.parentElement;
          if (parent) {
            const fallback = document.createElement('div');
            fallback.className = `w-full h-full bg-gradient-to-br from-slate-700 to-slate-900 ${overlayOpacity}`;
            fallback.style.backgroundImage = `linear-gradient(135deg, ${recoveryColor}20 0%, ${recoveryColor}40 100%)`;
            parent.appendChild(fallback);
          }
        }}
      />
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

