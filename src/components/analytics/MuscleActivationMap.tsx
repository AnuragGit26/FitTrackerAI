import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { MuscleGroup } from '@/types/muscle';
import { aggregateVolumeByMuscleGroup } from '@/utils/analyticsHelpers';
import { Workout } from '@/types/workout';
import { Link } from 'react-router-dom';
import { pulse, prefersReducedMotion } from '@/utils/animations';

interface MuscleActivationMapProps {
  workouts: Workout[];
}

export function MuscleActivationMap({ workouts }: MuscleActivationMapProps) {
  const topMuscles = useMemo(() => {
    const muscleVolume = aggregateVolumeByMuscleGroup(workouts);
    return Array.from(muscleVolume.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 2)
      .map(([muscle]) => muscle);
  }, [workouts]);

  const getMuscleLabel = (muscle: MuscleGroup): string => {
    const labels: Record<MuscleGroup, string> = {
      [MuscleGroup.CHEST]: 'Pecs',
      [MuscleGroup.QUADS]: 'Quads',
      [MuscleGroup.HAMSTRINGS]: 'Hamstrings',
      [MuscleGroup.BACK]: 'Back',
      [MuscleGroup.LATS]: 'Lats',
      [MuscleGroup.SHOULDERS]: 'Shoulders',
      [MuscleGroup.BICEPS]: 'Biceps',
      [MuscleGroup.TRICEPS]: 'Triceps',
      [MuscleGroup.GLUTES]: 'Glutes',
      [MuscleGroup.CALVES]: 'Calves',
      [MuscleGroup.UPPER_CHEST]: 'Upper Chest',
      [MuscleGroup.LOWER_CHEST]: 'Lower Chest',
      [MuscleGroup.TRAPS]: 'Traps',
      [MuscleGroup.RHOMBOIDS]: 'Rhomboids',
      [MuscleGroup.LOWER_BACK]: 'Lower Back',
      [MuscleGroup.FRONT_DELTS]: 'Front Delts',
      [MuscleGroup.SIDE_DELTS]: 'Side Delts',
      [MuscleGroup.REAR_DELTS]: 'Rear Delts',
      [MuscleGroup.FOREARMS]: 'Forearms',
      [MuscleGroup.ABS]: 'Abs',
      [MuscleGroup.OBLIQUES]: 'Obliques',
      [MuscleGroup.HIP_FLEXORS]: 'Hip Flexors',
    };
    return labels[muscle] || muscle;
  };

  return (
    <div className="@container">
      <div className="flex flex-col items-stretch justify-start rounded-xl shadow-sm bg-white dark:bg-surface-dark overflow-hidden border border-gray-100 dark:border-[#316847]">
        <Link to="/anatomy" className="relative h-64 w-full bg-slate-900 cursor-pointer group">
          <div className="absolute inset-0 bg-gradient-to-br from-gray-800 to-gray-900 opacity-80 group-hover:opacity-90 transition-opacity"></div>
          <div className="absolute inset-0 bg-gradient-to-t from-surface-dark via-transparent to-transparent opacity-90"></div>
          {topMuscles.map((muscle, index) => {
            const shouldReduceMotion = prefersReducedMotion();
            return (
              <motion.div
                key={muscle}
                className={`absolute ${
                  index === 0 ? 'top-1/4 left-1/4' : 'top-1/2 right-1/3'
                }`}
                initial={{ opacity: 0, scale: 0 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: index * 0.2, duration: 0.5 }}
              >
                <motion.div 
                  className="h-3 w-3 rounded-full bg-primary shadow-[0_0_10px_#0df269]"
                  animate={shouldReduceMotion ? {} : {
                    scale: [1, 1.5, 1],
                    boxShadow: [
                      '0 0 10px #0df269',
                      '0 0 20px #0df269',
                      '0 0 10px #0df269',
                    ],
                  }}
                  transition={{
                    duration: 2,
                    repeat: Infinity,
                    ease: 'easeInOut',
                    delay: index * 0.3
                  }}
                />
                <motion.span 
                  className="absolute left-4 -top-1 text-[10px] font-bold text-white bg-black/50 px-1 rounded backdrop-blur-sm"
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.2 + 0.3 }}
                >
                  {getMuscleLabel(muscle)}
                </motion.span>
              </motion.div>
            );
          })}
          <div className="absolute bottom-4 left-4">
            <p className="text-white text-lg font-bold leading-tight">Muscle Activation Map</p>
            <p className="text-gray-300 text-xs mt-1">
              {topMuscles.length > 0
                ? `${topMuscles.map((m) => getMuscleLabel(m)).join(' and ')} are highly active this week.`
                : 'Start logging workouts to see muscle activation.'}
            </p>
          </div>
        </Link>
      </div>
    </div>
  );
}

