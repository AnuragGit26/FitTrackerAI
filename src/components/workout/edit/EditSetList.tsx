import { WorkoutSet } from '@/types/exercise';

interface EditSetListProps {
  sets: WorkoutSet[];
  onSetsChange: (sets: WorkoutSet[]) => void;
}

export function EditSetList({ sets, onSetsChange }: EditSetListProps) {
  const handleSetChange = (setNumber: number, updates: Partial<WorkoutSet>) => {
    const updatedSets = sets.map(set =>
      set.setNumber === setNumber
        ? { ...set, ...updates }
        : set
    );
    onSetsChange(updatedSets);
  };

  const handleAddSet = () => {
    const lastSet = sets[sets.length - 1];
    const newSetNumber = sets.length + 1;
    
    // Create new set based on last set's structure
    const newSet: WorkoutSet = {
      setNumber: newSetNumber,
      reps: lastSet?.reps,
      weight: lastSet?.weight,
      unit: lastSet?.unit || 'kg',
      distance: lastSet?.distance,
      distanceUnit: lastSet?.distanceUnit || 'km',
      time: lastSet?.time,
      duration: lastSet?.duration,
      calories: lastSet?.calories,
      rpe: lastSet?.rpe,
      restTime: lastSet?.restTime,
      completed: false,
    };

    onSetsChange([...sets, newSet]);
  };


  const inferTrackingType = (set: WorkoutSet): 'weight_reps' | 'reps_only' | 'cardio' | 'duration' => {
    if (set.weight !== undefined || (set.reps !== undefined && set.weight !== undefined)) {
      return 'weight_reps';
    }
    if (set.distance !== undefined) {
      return 'cardio';
    }
    if (set.duration !== undefined) {
      return 'duration';
    }
    return 'reps_only';
  };

  const firstSet = sets[0];
  const trackingType = firstSet ? inferTrackingType(firstSet) : 'weight_reps';
  const isWeightReps = trackingType === 'weight_reps';

  return (
    <div className="flex flex-col gap-3">
      {/* Header - only show for weight_reps */}
      {isWeightReps && (
        <div className="grid grid-cols-[1fr_2fr_2fr_auto] gap-3 mb-2 text-xs font-bold text-slate-500 dark:text-[#FF9933] uppercase tracking-wider text-center">
          <span>Set</span>
          <span>kg</span>
          <span>Reps</span>
          <span className="w-8"></span>
        </div>
      )}

      {/* Sets */}
      {sets.map((set) => {
        const setTrackingType = inferTrackingType(set);
        const setIsWeightReps = setTrackingType === 'weight_reps';

        return (
          <div
            key={set.setNumber}
            className={setIsWeightReps 
              ? "grid grid-cols-[1fr_2fr_2fr_auto] gap-3 items-center mb-3"
              : "flex items-center gap-3 mb-3"
            }
          >
            {/* Set Number */}
            <div className="flex justify-center">
              <span className="flex items-center justify-center w-6 h-6 rounded-full bg-slate-200 dark:bg-white/10 text-xs font-bold text-slate-600 dark:text-slate-300">
                {set.setNumber}
              </span>
            </div>

            {/* Weight and Reps (for weight_reps) */}
            {setIsWeightReps ? (
              <>
                <input
                  type="number"
                  value={set.weight || ''}
                  onChange={(e) => handleSetChange(set.setNumber, {
                    weight: e.target.value ? parseFloat(e.target.value) : undefined,
                  })}
                  placeholder="0"
                  min="0"
                  step="0.5"
                  className="w-full bg-white dark:bg-[#224932] border-none rounded-lg text-center py-2 font-semibold focus:ring-1 focus:ring-primary text-slate-900 dark:text-white"
                />
                <input
                  type="number"
                  value={set.reps || ''}
                  onChange={(e) => handleSetChange(set.setNumber, {
                    reps: e.target.value ? parseInt(e.target.value, 10) : undefined,
                  })}
                  placeholder="0"
                  min="0"
                  className="w-full bg-white dark:bg-[#224932] border-none rounded-lg text-center py-2 font-semibold focus:ring-1 focus:ring-primary text-slate-900 dark:text-white"
                />
              </>
            ) : (
              <div className="flex-1 grid grid-cols-2 gap-2">
                {setTrackingType === 'reps_only' && (
                  <input
                    type="number"
                    value={set.reps || ''}
                    onChange={(e) => handleSetChange(set.setNumber, {
                      reps: e.target.value ? parseInt(e.target.value, 10) : undefined,
                    })}
                    placeholder="Reps"
                    min="0"
                    className="w-full bg-white dark:bg-[#224932] border-none rounded-lg text-center py-2 font-semibold focus:ring-1 focus:ring-primary text-slate-900 dark:text-white"
                  />
                )}
                {setTrackingType === 'cardio' && (
                  <>
                    <input
                      type="number"
                      value={set.distance || ''}
                      onChange={(e) => handleSetChange(set.setNumber, {
                        distance: e.target.value ? parseFloat(e.target.value) : undefined,
                      })}
                      placeholder="Distance"
                      min="0"
                      step="0.1"
                      className="w-full bg-white dark:bg-[#224932] border-none rounded-lg text-center py-2 font-semibold focus:ring-1 focus:ring-primary text-slate-900 dark:text-white"
                    />
                    <input
                      type="number"
                      value={set.time || ''}
                      onChange={(e) => handleSetChange(set.setNumber, {
                        time: e.target.value ? parseInt(e.target.value, 10) : undefined,
                      })}
                      placeholder="Time (s)"
                      min="0"
                      className="w-full bg-white dark:bg-[#224932] border-none rounded-lg text-center py-2 font-semibold focus:ring-1 focus:ring-primary text-slate-900 dark:text-white"
                    />
                  </>
                )}
                {setTrackingType === 'duration' && (
                  <input
                    type="number"
                    value={set.duration || ''}
                    onChange={(e) => handleSetChange(set.setNumber, {
                      duration: e.target.value ? parseInt(e.target.value, 10) : undefined,
                    })}
                    placeholder="Duration (s)"
                    min="0"
                    className="w-full bg-white dark:bg-[#224932] border-none rounded-lg text-center py-2 font-semibold focus:ring-1 focus:ring-primary text-slate-900 dark:text-white"
                  />
                )}
              </div>
            )}

            {/* Check/Completed Button */}
            <button
              onClick={() => handleSetChange(set.setNumber, { completed: !set.completed })}
              className="flex items-center justify-center w-8 text-primary opacity-50 hover:opacity-100 transition-opacity"
            >
              <span className={`material-symbols-outlined text-lg ${set.completed ? 'opacity-100' : 'opacity-50'}`}>
                {set.completed ? 'check_circle' : 'radio_button_unchecked'}
              </span>
            </button>
          </div>
        );
      })}

      {/* Add Set Button */}
      <button
        onClick={handleAddSet}
        className="w-full py-2 flex items-center justify-center gap-2 text-sm font-semibold text-primary bg-primary/10 hover:bg-primary/20 rounded-lg transition-colors border border-dashed border-primary/30 mt-2"
      >
        <span className="material-symbols-outlined text-lg">add</span>
        Add Set
      </button>
    </div>
  );
}

