import { MuscleGroup } from '@/types/muscle';
import { cn } from '@/utils/cn';

interface ExerciseMuscleDiagramProps {
  primaryMuscles: MuscleGroup[];
  secondaryMuscles?: MuscleGroup[];
  className?: string;
}

// Map muscle groups to SVG path coordinates for the torso diagram
const musclePaths: Partial<Record<MuscleGroup, string>> = {
  [MuscleGroup.CHEST]: 'M30 35 C35 45 45 45 50 35 C55 45 65 45 70 35 C65 25 55 25 50 30 C45 25 35 25 30 35 Z',
  [MuscleGroup.FRONT_DELTS]: 'M30 25 L35 30 L50 30 L65 30 L70 25 L65 20 L50 22 L35 20 Z',
  [MuscleGroup.TRICEPS]: 'M25 45 L30 50 L30 60 L25 65 L20 60 L20 50 Z',
  [MuscleGroup.BICEPS]: 'M75 45 L80 50 L80 60 L75 65 L70 60 L70 50 Z',
  [MuscleGroup.ABS]: 'M40 60 L45 70 L55 70 L60 60 L55 50 L45 50 Z',
  [MuscleGroup.OBLIQUES]: 'M35 55 L40 65 L40 75 L35 80 L30 75 L30 65 Z',
};

export function ExerciseMuscleDiagram({
  primaryMuscles,
  secondaryMuscles = [],
  className,
}: ExerciseMuscleDiagramProps) {
  return (
    <div className={cn('relative h-28 w-20 opacity-80', className)}>
      <svg
        className="w-full h-full drop-shadow-[0_0_8px_rgba(13,242,105,0.3)]"
        fill="none"
        viewBox="0 0 100 150"
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Body outline */}
        <path
          d="M50 10C60 10 65 15 70 20C75 25 85 28 90 35L85 60C80 55 75 50 70 55C70 80 65 100 60 130H40C35 100 30 80 30 55C25 50 20 55 15 60L10 35C15 28 25 25 30 20C35 15 40 10 50 10Z"
          stroke="#334d40"
          strokeWidth="2"
        />

        {/* Primary muscles - highlighted with primary color and pulse animation */}
        {primaryMuscles.map((muscle) => {
          const path = musclePaths[muscle];
          if (!path) return null;
          return (
            <path
              key={`primary-${muscle}`}
              className="animate-pulse"
              d={path}
              fill="#0df269"
            />
          );
        })}

        {/* Secondary muscles - subtle highlight */}
        {secondaryMuscles.map((muscle) => {
          const path = musclePaths[muscle];
          if (!path) return null;
          return (
            <path
              key={`secondary-${muscle}`}
              d={path}
              fill="#316847"
              opacity="0.4"
            />
          );
        })}
      </svg>
    </div>
  );
}

