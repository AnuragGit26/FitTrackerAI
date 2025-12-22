import { Sparkles, Brain } from 'lucide-react';
import { useEffect, useState } from 'react';
import { aiService } from '@/services/aiService';
import { aiChangeDetector } from '@/services/aiChangeDetector';
import { aiRefreshService } from '@/services/aiRefreshService';
import { useWorkoutStore } from '@/store/workoutStore';
import { useMuscleRecovery } from '@/hooks/useMuscleRecovery';
import { useUserStore } from '@/store/userStore';
import { cleanPlainTextResponse } from '@/utils/aiResponseCleaner';

export function SmartCoachInsight() {
  const [insight, setInsight] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { workouts } = useWorkoutStore();
  const { muscleStatuses } = useMuscleRecovery();
  const { profile } = useUserStore();

  useEffect(() => {
    async function generateInsight() {
      const recentWorkouts = workouts.slice(0, 5);
      
      // Get fingerprint for caching
      const fingerprint = aiChangeDetector.getFingerprint(
        recentWorkouts,
        muscleStatuses,
        0,
        []
      );

      setIsLoading(true);
      try {
        const insights = await aiRefreshService.refreshIfNeeded(
          'insights',
          `smart-coach:${fingerprint}`,
          () => aiService.generateWorkoutInsights({
            recentWorkouts,
            muscleStatuses,
            userGoals: profile?.goals || [],
            userLevel: profile?.experienceLevel || 'intermediate',
            weakPoints: [],
            progressTrends: {},
          }),
          profile?.id,
          0
        );

        // Use tip or recommendations for the insight
        const rawInsightText = insights.tip ||
          insights.recommendations?.[0] ||
          'Your CNS recovery is faster than expected. Consider moving your Leg Day to tomorrow evening for peak performance.';
        
        // Clean the text to remove markdown formatting
        const cleanedInsight = cleanPlainTextResponse(rawInsightText);
        setInsight(cleanedInsight);
      } catch (error) {
        console.error('Failed to generate insight:', error);
        setInsight(
          'Your CNS recovery is faster than expected. Consider moving your Leg Day to tomorrow evening for peak performance.'
        );
      } finally {
        setIsLoading(false);
      }
    }

    if (workouts.length > 0 || muscleStatuses.length > 0) {
      generateInsight();
    } else {
      setInsight(
        'Your CNS recovery is faster than expected. Consider moving your Leg Day to tomorrow evening for peak performance.'
      );
      setIsLoading(false);
    }
  }, [workouts.length, muscleStatuses.length, profile?.id]);

  return (
    <div className="bg-slate-200/50 dark:bg-white/5 border border-primary/30 rounded-xl p-4 flex gap-4 items-start relative overflow-hidden">
      <div className="absolute top-0 right-0 p-2 opacity-20 pointer-events-none">
        <Brain className="w-16 h-16 text-primary" />
      </div>
      <div className="bg-primary/20 text-primary rounded-lg p-2 h-10 w-10 flex items-center justify-center shrink-0">
        <Sparkles className="w-5 h-5" />
      </div>
      <div className="flex-1 z-10">
        <h3 className="text-primary font-bold text-sm mb-1 uppercase tracking-wide">
          Smart Coach Insight
        </h3>
        {isLoading ? (
          <p className="text-slate-700 dark:text-slate-200 text-sm leading-relaxed">
            Generating insight...
          </p>
        ) : (
          <p className="text-slate-700 dark:text-slate-200 text-sm leading-relaxed">
            {insight?.split('Leg Day').map((part, index) =>
              index === 0 ? (
                <span key={index}>
                  {part}
                  <span className="text-primary font-medium">Leg Day</span>
                </span>
              ) : (
                <span key={index}>{part}</span>
              )
            ) || insight}
          </p>
        )}
      </div>
    </div>
  );
}

