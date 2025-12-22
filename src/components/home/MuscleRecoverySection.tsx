import { useState } from 'react';
import { Check, User, Dumbbell } from 'lucide-react';
import { useMuscleRecovery } from '@/hooks/useMuscleRecovery';
import { useNavigate } from 'react-router-dom';
import { EmptyState } from '@/components/common/EmptyState';

export function MuscleRecoverySection() {
  const [view, setView] = useState<'front' | 'back'>('front');
  const { muscleStatuses, isLoading } = useMuscleRecovery();
  const navigate = useNavigate();

  const getMostRecoveredMuscle = () => {
    if (muscleStatuses.length === 0) {
      return null;
    }

    const sorted = [...muscleStatuses].sort((a, b) => b.recoveryPercentage - a.recoveryPercentage);
    return {
      muscle: sorted[0].muscle,
      recovery: sorted[0].recoveryPercentage,
    };
  };

  const mostRecovered = getMostRecoveredMuscle();

  if (!isLoading && muscleStatuses.length === 0) {
    return (
      <div className="mt-8">
        <h2 className="text-slate-900 dark:text-white tracking-tight text-xl font-bold px-5 pb-2">
          Muscle Recovery
        </h2>
        <div className="px-5">
          <div className="rounded-2xl bg-surface-dark-light/30 border border-gray-200 dark:border-surface-dark-light p-6">
            <EmptyState
              icon={Dumbbell}
              title="No recovery data yet"
              description="Log workouts to track muscle recovery and optimize your training schedule."
              action={
                <button
                  onClick={() => navigate('/log-workout')}
                  className="px-4 py-2 rounded-lg bg-primary text-background-dark font-bold text-sm hover:bg-primary/90 transition-colors"
                >
                  Log a Workout
                </button>
              }
              className="py-8"
            />
          </div>
        </div>
      </div>
    );
  }

  if (!mostRecovered) {
    return null;
  }

  return (
    <div className="mt-8">
      <h2 className="text-slate-900 dark:text-white tracking-tight text-xl font-bold px-5 pb-2">
        Muscle Recovery
      </h2>
      {/* Tabs */}
      <div className="px-5 border-b border-gray-200 dark:border-[#316847]">
        <div className="flex w-full">
          <button
            onClick={() => setView('front')}
            className={`flex flex-1 flex-col items-center justify-center border-b-[3px] pb-3 pt-2 transition-colors ${
              view === 'front'
                ? 'border-primary text-slate-900 dark:text-white'
                : 'border-transparent text-gray-400 dark:text-[#90cba8] hover:text-primary dark:hover:text-white'
            }`}
          >
            <p className="text-sm font-bold tracking-wide">Front View</p>
          </button>
          <button
            onClick={() => setView('back')}
            className={`flex flex-1 flex-col items-center justify-center border-b-[3px] pb-3 pt-2 transition-colors ${
              view === 'back'
                ? 'border-primary text-slate-900 dark:text-white'
                : 'border-transparent text-gray-400 dark:text-[#90cba8] hover:text-primary dark:hover:text-white'
            }`}
          >
            <p className="text-sm font-bold tracking-wide">Back View</p>
          </button>
        </div>
      </div>
      {/* Recovery Visualization Area */}
      <div className="p-5">
        <div className="relative w-full aspect-[4/3] bg-surface-dark-light/30 rounded-2xl border border-gray-200 dark:border-surface-dark-light flex items-center justify-center overflow-hidden">
          {/* Background gradient with grid */}
          <div className="absolute inset-0 bg-gradient-to-br from-surface-dark-light/50 via-surface-dark-light/30 to-transparent"></div>
          <div className="absolute inset-0 bg-[linear-gradient(rgba(13,242,105,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(13,242,105,0.03)_1px,transparent_1px)] bg-[size:20px_20px]"></div>
          
          {/* Placeholder for muscle visualization */}
          <div className="relative z-10 text-center">
            <User className="w-24 h-24 text-primary/20 mx-auto" />
          </div>

          {/* Floating Recovery Badge */}
          <div className="absolute bottom-4 left-4 right-4 bg-background-dark/90 backdrop-blur-md border border-surface-dark-light p-3 rounded-xl flex items-center gap-3 shadow-lg z-20">
            <div className="size-10 rounded-full bg-surface-dark flex items-center justify-center shrink-0">
              <User className="w-5 h-5 text-primary" />
            </div>
            <div className="flex-1">
              <p className="text-white text-sm font-bold">{mostRecovered.muscle}</p>
              <p className="text-[#90cba8] text-xs">{mostRecovered.recovery}% Recovered</p>
            </div>
            <div className="size-8 rounded-full bg-primary/20 flex items-center justify-center">
              <Check className="w-4 h-4 text-primary" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

