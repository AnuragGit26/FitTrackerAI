import { useState, useCallback, useMemo, useRef } from 'react';
import { aiService } from '@/services/aiService';
import { aiChangeDetector } from '@/services/aiChangeDetector';
import { aiRefreshService } from '@/services/aiRefreshService';
import { useWorkoutStore } from '@/store/workoutStore';
import { useUserStore } from '@/store/userStore';
import { useMuscleRecovery } from './useMuscleRecovery';

export interface AIInsights {
  analysis: string;
  recommendations: string[];
  warnings?: string[];
  motivation?: string;
  tip?: string;
}

export function useAIInsights() {
  const [insights, setInsights] = useState<AIInsights | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const { workouts } = useWorkoutStore();
  const { profile } = useUserStore();
  const { muscleStatuses } = useMuscleRecovery();
  const isGeneratingRef = useRef(false);
  
  const muscleStatusesKey = useMemo(() =>
    muscleStatuses.map(s => `${s.muscle}-${s.recoveryPercentage}`).join(','),
    [muscleStatuses]
  );

  const generateInsights = useCallback(async () => {
    if (!profile || workouts.length === 0) {
      setInsights({
        analysis: 'Start logging workouts to get personalized AI insights!',
        recommendations: [],
      });
      return;
    }

    if (isGeneratingRef.current) return;
    
    const recentWorkouts = workouts.slice(0, 10);
    
    // Get fingerprint for caching
    const fingerprint = aiChangeDetector.getFingerprint(
      recentWorkouts,
      muscleStatuses,
      0,
      []
    );

    isGeneratingRef.current = true;
    setIsLoading(true);
    try {
      // Use refresh service which handles 24hr rule and new workout detection
      const generatedInsights = await aiRefreshService.refreshIfNeeded(
        'insights',
        fingerprint,
        () => aiService.generateWorkoutInsights({
          recentWorkouts,
          muscleStatuses,
          userGoals: profile.goals,
          userLevel: profile.experienceLevel,
          weakPoints: [],
          progressTrends: {},
        }),
        profile.id,
        0
      );
      setInsights(generatedInsights);
    } catch (error) {
      console.error('Failed to generate insights:', error);
      setInsights({
        analysis: 'Unable to generate insights at this time. Please try again later.',
        recommendations: [],
      });
    } finally {
      setIsLoading(false);
      isGeneratingRef.current = false;
    }
  }, [workouts, profile, muscleStatuses, muscleStatusesKey]);

  return { insights, isLoading, generateInsights };
}

