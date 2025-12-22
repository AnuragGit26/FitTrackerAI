import { MuscleStatus } from '@/types/muscle';
import { getMuscleDisplayName } from '@/utils/musclePositions';
import { getRecoveryColor } from '@/services/recoveryCalculator';
import { formatWorkoutDate } from '@/utils/dateHelpers';
import { Sparkles } from 'lucide-react';
import { aiService } from '@/services/aiService';
import { useState, useEffect } from 'react';

interface MuscleDetailCardProps {
  muscle: MuscleStatus | null;
  onClose?: () => void;
}

export function MuscleDetailCard({ muscle, onClose }: MuscleDetailCardProps) {
  const [aiInsight, setAiInsight] = useState<string>('');
  const [loadingInsight, setLoadingInsight] = useState(false);

  useEffect(() => {
    if (muscle) {
      generateInsight();
    }
  }, [muscle]);

  async function generateInsight() {
    if (!muscle) return;
    
    setLoadingInsight(true);
    try {
      const insight = await aiService.generateMuscleBalanceInsight(
        { legs: 0, push: 0, pull: 0 },
        0,
        [getMuscleDisplayName(muscle.muscle)]
      );
      setAiInsight(insight);
    } catch (error) {
      console.error('Failed to generate AI insight:', error);
      const status = muscle.recoveryStatus;
      const muscleName = getMuscleDisplayName(muscle.muscle).toLowerCase();
      
      if (status === 'overworked' || status === 'sore') {
        setAiInsight(
          `Your ${muscleName} muscles are under high fatigue. It is recommended to avoid heavy training today. Consider active recovery or focusing on other muscle groups.`
        );
      } else if (status === 'recovering') {
        setAiInsight(
          `Your ${muscleName} are recovering well. You can train them with moderate intensity, but avoid maximum effort.`
        );
      } else {
        setAiInsight(
          `Your ${muscleName} are ready for training. You can push for new personal records or increase volume.`
        );
      }
    } finally {
      setLoadingInsight(false);
    }
  }

  if (!muscle) return null;

  const color = getRecoveryColor(muscle.recoveryStatus);
  const statusText = muscle.recoveryStatus === 'ready' || muscle.recoveryStatus === 'fresh' 
    ? 'Ready' 
    : muscle.recoveryStatus === 'recovering' 
    ? 'Recovering' 
    : muscle.recoveryStatus === 'sore'
    ? 'Sore'
    : 'Fatigued';

  const lastTrained = muscle.lastWorked 
    ? formatWorkoutDate(muscle.lastWorked)
    : 'Never';

  return (
    <div className="bg-white dark:bg-surface-dark rounded-2xl p-5 shadow-lg border border-gray-100 dark:border-white/5 animate-in fade-in zoom-in duration-500">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div 
            className="size-10 rounded-full flex items-center justify-center"
            style={{ backgroundColor: `${color}20` }}
          >
            <Sparkles className="size-5" style={{ color }} />
          </div>
          <div>
            <h3 className="text-gray-900 dark:text-white font-bold text-lg">
              {getMuscleDisplayName(muscle.muscle)}
            </h3>
            <p className="text-gray-500 dark:text-gray-400 text-sm">
              Last trained: {lastTrained}
            </p>
          </div>
        </div>
        <div className="text-right">
          <span 
            className="block text-2xl font-bold"
            style={{ color }}
          >
            {muscle.recoveryPercentage}%
          </span>
          <span className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide">
            {statusText}
          </span>
        </div>
      </div>

      <div className="w-full bg-gray-200 dark:bg-black/40 rounded-full h-2.5 mb-4 overflow-hidden">
        <div
          className="h-2.5 rounded-full transition-all duration-500"
          style={{
            width: `${muscle.recoveryPercentage}%`,
            background: `linear-gradient(to right, ${color}, ${color}dd)`,
          }}
        />
      </div>

      <div className="bg-background-light dark:bg-background-dark rounded-xl p-3 flex gap-3 items-start border border-primary/20">
        <Sparkles className="size-5 text-primary mt-0.5 flex-shrink-0" />
        <div className="flex-1">
          <p className="text-gray-900 dark:text-white text-sm font-medium mb-1">
            AI Insight
          </p>
          {loadingInsight ? (
            <p className="text-gray-600 dark:text-gray-300 text-xs leading-relaxed">
              Generating insight...
            </p>
          ) : (
            <p className="text-gray-600 dark:text-gray-300 text-xs leading-relaxed">
              {aiInsight || 'Analyzing muscle status...'}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

