import { useState, useRef } from 'react';
import { MuscleStatus } from '@/types/muscle';
import { useMuscleRecovery } from '@/hooks/useMuscleRecovery';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { ThreeJSMuscleModel } from './ThreeJSMuscleModel';
import { MuscleDetailCard } from './MuscleDetailCard';

type ViewMode = 'fatigue' | 'strength' | 'activity';

export function MuscleMap() {
  const [selectedMuscle, setSelectedMuscle] = useState<MuscleStatus | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('fatigue');
  const { muscleStatuses, isLoading } = useMuscleRecovery();
  const detailCardRef = useRef<HTMLDivElement>(null);

  const handleMuscleClick = (muscle: MuscleStatus) => {
    setSelectedMuscle(muscle);
    setTimeout(() => {
      detailCardRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }, 100);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* View Mode Toggle */}
      <div className="px-4 py-2">
        <div className="flex h-12 w-full items-center justify-center rounded-xl bg-gray-200 dark:bg-surface-dark p-1">
          <label className="flex cursor-pointer h-full grow items-center justify-center overflow-hidden rounded-lg px-2 has-[:checked]:bg-white dark:has-[:checked]:bg-background-dark has-[:checked]:shadow-sm has-[:checked]:text-primary text-gray-500 dark:text-gray-400 text-sm font-bold transition-all">
            <span className="truncate">Fatigue</span>
            <input
              checked={viewMode === 'fatigue'}
              onChange={() => setViewMode('fatigue')}
              className="invisible w-0 absolute"
              name="view-mode"
              type="radio"
              value="fatigue"
            />
          </label>
          <label className="flex cursor-pointer h-full grow items-center justify-center overflow-hidden rounded-lg px-2 has-[:checked]:bg-white dark:has-[:checked]:bg-background-dark has-[:checked]:shadow-sm has-[:checked]:text-primary text-gray-500 dark:text-gray-400 text-sm font-bold transition-all">
            <span className="truncate">Strength</span>
            <input
              checked={viewMode === 'strength'}
              onChange={() => setViewMode('strength')}
              className="invisible w-0 absolute"
              name="view-mode"
              type="radio"
              value="strength"
            />
          </label>
          <label className="flex cursor-pointer h-full grow items-center justify-center overflow-hidden rounded-lg px-2 has-[:checked]:bg-white dark:has-[:checked]:bg-background-dark has-[:checked]:shadow-sm has-[:checked]:text-primary text-gray-500 dark:text-gray-400 text-sm font-bold transition-all">
            <span className="truncate">Activity</span>
            <input
              checked={viewMode === 'activity'}
              onChange={() => setViewMode('activity')}
              className="invisible w-0 absolute"
              name="view-mode"
              type="radio"
              value="activity"
            />
          </label>
        </div>
      </div>

      {/* 3D Canvas */}
      <div className="flex-1 relative w-full flex justify-center items-center py-6 min-h-[400px]">
        <div className="relative h-[450px] w-full max-w-sm flex items-center justify-center">
          <div className="h-full w-full bg-white dark:bg-background-dark rounded-xl border border-gray-200 dark:border-white/5">
            <ThreeJSMuscleModel
                  muscleStatuses={muscleStatuses}
                  selectedMuscle={selectedMuscle}
                  onMuscleClick={handleMuscleClick}
                  viewMode={viewMode}
                />
          </div>
        </div>
      </div>

      {/* Muscle Detail Card */}
      <div className="px-4 mt-2" ref={detailCardRef}>
        <MuscleDetailCard muscle={selectedMuscle} />
      </div>
    </div>
  );
}
