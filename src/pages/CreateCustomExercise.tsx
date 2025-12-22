import { useState } from 'react';
import { X, Sparkles, Dumbbell, Activity, Heart, Zap, ChevronDown, CheckCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Exercise, ExerciseCategory } from '@/types/exercise';
import { MuscleGroup } from '@/types/muscle';
import { exerciseLibrary } from '@/services/exerciseLibrary';
import { useUserStore } from '@/store/userStore';
import { cn } from '@/utils/cn';

// Map simplified muscle names to MuscleGroup enum
const muscleGroupMap: Record<string, MuscleGroup[]> = {
  chest: [MuscleGroup.CHEST],
  back: [MuscleGroup.BACK, MuscleGroup.LATS],
  legs: [MuscleGroup.QUADS, MuscleGroup.GLUTES],
  shoulders: [MuscleGroup.SHOULDERS, MuscleGroup.FRONT_DELTS],
  arms: [MuscleGroup.BICEPS, MuscleGroup.TRICEPS],
  core: [MuscleGroup.ABS, MuscleGroup.OBLIQUES],
};

const categories: Array<{
  value: ExerciseCategory;
  label: string;
  icon: typeof Dumbbell;
}> = [
    { value: 'strength', label: 'Strength', icon: Dumbbell },
    { value: 'cardio', label: 'Cardio', icon: Activity },
    { value: 'flexibility', label: 'Flexibility', icon: Heart },
    { value: 'plyometric', label: 'Plyometrics', icon: Zap },
  ];

export function CreateCustomExercise() {
  const navigate = useNavigate();
  const { profile } = useUserStore();
  const [showAIInsight, setShowAIInsight] = useState(true);
  const [exerciseName, setExerciseName] = useState('');
  const [category, setCategory] = useState<ExerciseCategory>('strength');
  const [primaryMuscle, setPrimaryMuscle] = useState<string>('');
  const [defaultTargetsEnabled, setDefaultTargetsEnabled] = useState(true);
  const [defaultSets, setDefaultSets] = useState(3);
  const [defaultReps, setDefaultReps] = useState(10);
  const [defaultWeight, setDefaultWeight] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    if (!exerciseName.trim() || !primaryMuscle) {
      return;
    }

    setIsSaving(true);

    try {
      const primaryMuscles = muscleGroupMap[primaryMuscle] || [MuscleGroup.CHEST];

      const exerciseData: Omit<Exercise, 'id' | 'isCustom'> = {
        name: exerciseName.trim(),
        category,
        primaryMuscles,
        secondaryMuscles: [],
        equipment: [],
        difficulty: 'intermediate',
        instructions: [],
        trackingType: 'weight_reps',
      };

      await exerciseLibrary.createCustomExercise(exerciseData);

      // Navigate back to log workout page
      navigate('/log-workout');
    } catch (error) {
      console.error('Failed to create custom exercise:', error);
      // TODO: Show error toast
    } finally {
      setIsSaving(false);
    }
  };

  const canSave = exerciseName.trim().length > 0 && primaryMuscle.length > 0;

  return (
    <div className="relative flex h-full min-h-screen w-full flex-col max-w-md mx-auto shadow-2xl bg-background-light dark:bg-background-dark">
      {/* Header */}
      <header className="sticky top-0 z-40 flex items-center justify-between px-4 py-3 bg-background-light/90 dark:bg-background-dark/90 backdrop-blur-md border-b border-black/5 dark:border-[#316847]/30">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center justify-center size-10 rounded-full hover:bg-black/5 dark:hover:bg-white/5 transition-colors group"
          aria-label="Close"
        >
          <X className="w-6 h-6 text-slate-500 dark:text-gray-400 group-hover:text-slate-800 dark:group-hover:text-white" />
        </button>
        <h1 className="text-lg font-bold tracking-tight text-slate-900 dark:text-white">
          New Exercise
        </h1>
        <button
          onClick={handleSave}
          disabled={!canSave || isSaving}
          className="flex items-center justify-center h-10 px-2 rounded-lg text-primary font-bold text-base hover:text-primary/80 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Save
        </button>
      </header>

      <main className="flex-1 flex flex-col p-4 gap-6 pb-40 overflow-y-auto">
        {/* AI Insight Banner */}
        {showAIInsight && (
          <div className="w-full">
            <div className="flex flex-col items-start gap-3 rounded-xl border border-primary/20 bg-primary/5 p-4 relative overflow-hidden">
              <div className="absolute -right-4 -top-4 size-24 bg-primary/10 rounded-full blur-2xl"></div>
              <div className="flex items-start gap-3 w-full z-10">
                <Sparkles className="text-primary mt-0.5 w-5 h-5 shrink-0" />
                <div className="flex flex-col gap-1 flex-1">
                  <p className="text-primary font-bold text-sm uppercase tracking-wider">
                    AI Insight
                  </p>
                  <p className="text-slate-600 dark:text-gray-300 text-sm leading-relaxed">
                    Use specific names like{' '}
                    <span className="text-slate-900 dark:text-white font-medium">
                      &quot;Incline Bench Press&quot;
                    </span>{' '}
                    instead of &quot;Chest Press&quot; for better muscle tracking.
                  </p>
                </div>
                <button
                  onClick={() => setShowAIInsight(false)}
                  className="text-slate-400 hover:text-slate-600 dark:hover:text-white transition-colors shrink-0"
                  aria-label="Dismiss"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Exercise Name */}
        <div className="flex flex-col gap-2">
          <label
            htmlFor="exercise-name"
            className="text-base font-semibold text-slate-800 dark:text-gray-100"
          >
            Exercise Name
          </label>
          <div className="relative group">
            <input
              id="exercise-name"
              type="text"
              value={exerciseName}
              onChange={(e) => setExerciseName(e.target.value)}
              placeholder="e.g., Barbell Squat"
              className="w-full h-14 pl-4 pr-10 rounded-xl bg-white dark:bg-surface-dark border border-slate-200 dark:border-[#316847] focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all placeholder:text-slate-400 dark:placeholder:text-gray-500 text-base text-slate-900 dark:text-white"
            />
            <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none opacity-0 group-focus-within:opacity-100 transition-opacity">
              <Sparkles className="w-5 h-5 text-primary" />
            </div>
          </div>
        </div>

        {/* Category Selection */}
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold text-slate-800 dark:text-gray-100">
              Category
            </h2>
            <span className="text-xs font-medium text-slate-500 dark:text-gray-400">
              Select one
            </span>
          </div>
          <div className="flex gap-3 overflow-x-auto pb-2 -mx-4 px-4 hide-scrollbar">
            {categories.map((cat) => {
              const Icon = cat.icon;
              const isSelected = category === cat.value;
              return (
                <button
                  key={cat.value}
                  onClick={() => setCategory(cat.value)}
                  className={cn(
                    'flex h-10 shrink-0 items-center justify-center gap-2 rounded-full pl-5 pr-5 transition-transform active:scale-95',
                    isSelected
                      ? 'bg-primary shadow-lg shadow-primary/20'
                      : 'bg-white dark:bg-surface-dark border border-slate-200 dark:border-[#316847] hover:border-primary/50'
                  )}
                >
                  <Icon
                    className={cn(
                      'text-lg',
                      isSelected
                        ? 'text-background-dark font-bold'
                        : 'text-slate-500 dark:text-gray-400'
                    )}
                  />
                  <p
                    className={cn(
                      'text-sm',
                      isSelected
                        ? 'text-background-dark font-bold'
                        : 'text-slate-600 dark:text-gray-300 font-medium'
                    )}
                  >
                    {cat.label}
                  </p>
                </button>
              );
            })}
          </div>
        </div>

        {/* Primary Muscle */}
        <div className="flex flex-col gap-2">
          <label className="text-base font-semibold text-slate-800 dark:text-gray-100">
            Primary Muscle
          </label>
          <div className="relative">
            <select
              value={primaryMuscle}
              onChange={(e) => setPrimaryMuscle(e.target.value)}
              className="w-full h-14 pl-4 pr-10 appearance-none rounded-xl bg-white dark:bg-surface-dark border border-slate-200 dark:border-[#316847] focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all text-slate-900 dark:text-white text-base"
            >
              <option disabled value="">
                Select a muscle group
              </option>
              <option value="chest">Chest (Pectoralis)</option>
              <option value="back">Back (Latissimus Dorsi)</option>
              <option value="legs">Legs (Quadriceps)</option>
              <option value="shoulders">Shoulders (Deltoids)</option>
              <option value="arms">Arms (Biceps/Triceps)</option>
              <option value="core">Core (Abs)</option>
            </select>
            <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-500 dark:text-gray-400">
              <ChevronDown className="w-5 h-5" />
            </div>
          </div>
        </div>

        <div className="h-px bg-slate-200 dark:bg-[#316847] my-2"></div>

        {/* Default Targets */}
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <div className="flex flex-col">
              <h2 className="text-base font-semibold text-slate-800 dark:text-gray-100">
                Default Targets
              </h2>
              <p className="text-xs text-slate-500 dark:text-gray-400">
                Autofill sets & reps for this exercise
              </p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={defaultTargetsEnabled}
                onChange={(e) => setDefaultTargetsEnabled(e.target.checked)}
                className="sr-only peer"
              />
              <div
                className={cn(
                  'w-11 h-6 rounded-full peer-focus:outline-none transition-colors relative',
                  'after:content-[""] after:absolute after:top-[2px] after:start-[2px]',
                  'after:bg-white after:border after:border-gray-300 dark:after:border-[#316847] after:rounded-full after:h-5 after:w-5',
                  'after:transition-all',
                  defaultTargetsEnabled
                    ? 'bg-primary after:translate-x-full rtl:after:-translate-x-full after:border-white'
                    : 'bg-slate-200 dark:bg-gray-700'
                )}
              />
            </label>
          </div>

          {defaultTargetsEnabled && (
            <div className="grid grid-cols-3 gap-3">
              <label className="flex flex-col gap-1.5">
                <span className="text-xs font-medium text-slate-500 dark:text-gray-400 uppercase tracking-wide">
                  Sets
                </span>
                <div className="relative">
                  <input
                    type="number"
                    value={defaultSets}
                    onChange={(e) => setDefaultSets(parseInt(e.target.value) || 0)}
                    className="w-full h-12 rounded-lg bg-white dark:bg-surface-dark border border-slate-200 dark:border-[#316847] text-center focus:border-primary focus:ring-0 outline-none text-lg font-bold font-display placeholder:text-gray-600 text-slate-900 dark:text-white"
                  />
                </div>
              </label>
              <label className="flex flex-col gap-1.5">
                <span className="text-xs font-medium text-slate-500 dark:text-gray-400 uppercase tracking-wide">
                  Reps
                </span>
                <div className="relative">
                  <input
                    type="number"
                    value={defaultReps}
                    onChange={(e) => setDefaultReps(parseInt(e.target.value) || 0)}
                    className="w-full h-12 rounded-lg bg-white dark:bg-surface-dark border border-slate-200 dark:border-[#316847] text-center focus:border-primary focus:ring-0 outline-none text-lg font-bold font-display placeholder:text-gray-600 text-slate-900 dark:text-white"
                  />
                </div>
              </label>
              <label className="flex flex-col gap-1.5">
                <span className="text-xs font-medium text-slate-500 dark:text-gray-400 uppercase tracking-wide">
                  Weight
                </span>
                <div className="relative">
                  <input
                    type="text"
                    value={defaultWeight}
                    onChange={(e) => setDefaultWeight(e.target.value)}
                    placeholder={profile?.preferredUnit || 'kg'}
                    className="w-full h-12 rounded-lg bg-white dark:bg-surface-dark border border-slate-200 dark:border-[#316847] text-center focus:border-primary focus:ring-0 outline-none text-lg font-bold font-display placeholder:text-slate-400 dark:placeholder:text-gray-600 text-slate-900 dark:text-white"
                  />
                </div>
              </label>
            </div>
          )}

          <button
            onClick={handleSave}
            disabled={!canSave || isSaving}
            className={cn(
              'w-full h-14 bg-primary rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-primary/25 hover:bg-primary/90 active:scale-[0.98] transition-all mt-4',
              (!canSave || isSaving) && 'opacity-50 cursor-not-allowed'
            )}
          >
            <CheckCircle className="w-5 h-5 text-background-dark" />
            <span className="text-background-dark font-bold text-lg">
              {isSaving ? 'Creating...' : 'Create Exercise'}
            </span>
          </button>
        </div>
      </main>
    </div>
  );
}

