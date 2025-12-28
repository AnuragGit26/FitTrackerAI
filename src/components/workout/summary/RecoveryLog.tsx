import { useState } from 'react';
import { RecoveryLogData } from '@/types/workoutSummary';

interface RecoveryLogProps {
  workoutId: number;
  initialData?: RecoveryLogData;
  onSave: (data: RecoveryLogData) => Promise<void>;
}

export function RecoveryLog({ workoutId, initialData, onSave }: RecoveryLogProps) {
  const [mood, setMood] = useState<RecoveryLogData['mood']>(initialData?.mood);
  const [soreness, setSoreness] = useState<number>(initialData?.predictedSoreness || 60);
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await onSave({
        mood,
        predictedSoreness: soreness,
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="px-4 pb-8">
      <div className="bg-white dark:bg-[#162e21] border border-gray-200 dark:border-[#316847] rounded-xl p-5">
        <h3 className="text-slate-900 dark:text-white text-sm font-bold mb-4">
          How do you feel post-workout?
        </h3>
        <div className="flex justify-between gap-2 mb-6">
          <button
            onClick={() => setMood('drained')}
            className={`flex-1 flex flex-col items-center gap-2 p-3 rounded-lg border transition-all group ${
              mood === 'drained'
                ? 'bg-primary/10 border-primary/50'
                : 'bg-gray-50 dark:bg-black/20 border-transparent hover:border-primary/50'
            }`}
          >
            <span
              className={`material-symbols-outlined text-3xl transition-colors ${
                mood === 'drained'
                  ? 'text-primary'
                  : 'text-gray-400 group-hover:text-primary'
              }`}
            >
              sentiment_dissatisfied
            </span>
            <span
              className={`text-[10px] font-medium transition-colors ${
                mood === 'drained'
                  ? 'text-primary'
                  : 'text-gray-500 group-hover:text-primary'
              }`}
            >
              Drained
            </span>
          </button>
          <button
            onClick={() => setMood('okay')}
            className={`flex-1 flex flex-col items-center gap-2 p-3 rounded-lg border transition-all group ${
              mood === 'okay'
                ? 'bg-primary/10 border-primary/50'
                : 'bg-gray-50 dark:bg-black/20 border-transparent hover:border-primary/50'
            }`}
          >
            <span
              className={`material-symbols-outlined text-3xl transition-colors ${
                mood === 'okay' ? 'text-primary' : 'text-gray-400 group-hover:text-primary'
              }`}
            >
              sentiment_neutral
            </span>
            <span
              className={`text-[10px] font-medium transition-colors ${
                mood === 'okay' ? 'text-primary' : 'text-gray-500 group-hover:text-primary'
              }`}
            >
              Okay
            </span>
          </button>
          <button
            onClick={() => setMood('energized')}
            className={`flex-1 flex flex-col items-center gap-2 p-3 rounded-lg border transition-all group ${
              mood === 'energized'
                ? 'bg-primary/10 border-primary ring-1 ring-primary/20'
                : 'bg-gray-50 dark:bg-black/20 border-transparent hover:border-primary/50'
            }`}
          >
            <span
              className={`material-symbols-outlined text-3xl transition-colors drop-shadow-sm ${
                mood === 'energized' ? 'text-primary' : 'text-gray-400 group-hover:text-primary'
              }`}
            >
              sentiment_satisfied
            </span>
            <span
              className={`text-[10px] transition-colors ${
                mood === 'energized'
                  ? 'text-primary font-bold'
                  : 'text-gray-500 group-hover:text-primary font-medium'
              }`}
            >
              Energized
            </span>
          </button>
        </div>
        <div className="flex flex-col gap-2">
          <label className="text-xs text-slate-500 dark:text-gray-400 font-medium">
            Predicted Soreness
          </label>
          <div className="h-2 w-full bg-gray-200 dark:bg-black/40 rounded-full relative">
            <div
              className="absolute left-0 top-0 h-full bg-gradient-to-r from-primary to-yellow-400 rounded-full"
              style={{ width: `${soreness}%` }}
            ></div>
            <input
              type="range"
              min="0"
              max="100"
              value={soreness}
              onChange={(e) => setSoreness(Number(e.target.value))}
              className="absolute left-0 top-1/2 -translate-y-1/2 w-full h-2 opacity-0 cursor-pointer"
            />
            <div
              className="absolute left-[var(--thumb-position)] top-1/2 -translate-y-1/2 size-4 bg-white border-2 border-yellow-400 rounded-full shadow-md cursor-pointer pointer-events-none"
              style={{
                left: `${soreness}%`,
                transform: 'translate(-50%, -50%)',
              }}
            ></div>
          </div>
          <div className="flex justify-between text-[10px] text-gray-500 mt-1">
            <span>None</span>
            <span>Moderate</span>
            <span>Extreme</span>
          </div>
        </div>
        <button
          onClick={handleSave}
          disabled={isSaving || !mood}
          className="w-full mt-6 bg-primary hover:bg-[#0bb850] text-black font-bold py-3 rounded-lg text-sm transition-colors shadow-[0_4px_12px_rgba(13,242,105,0.3)] disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isSaving ? 'Saving...' : 'Save & Finish Workout'}
        </button>
      </div>
    </div>
  );
}

