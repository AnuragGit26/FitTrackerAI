import { useState, useCallback, useRef } from 'react';
import { aiService } from '@/services/aiService';
import { aiChangeDetector } from '@/services/aiChangeDetector';
import { aiRefreshService } from '@/services/aiRefreshService';
import { workoutAnalysisService } from '@/services/workoutAnalysisService';
import { useWorkoutStore } from '@/store/workoutStore';
import { useUserStore } from '@/store/userStore';
import { useMuscleRecovery } from './useMuscleRecovery';
import { calculateStreak } from '@/utils/calculations';

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

  const generateInsights = useCallback(async () => {
    if (!profile || workouts.length === 0) {
      setInsights({
        analysis: 'Start logging workouts to get personalized AI insights!',
        recommendations: [],
      });
      return;
    }

    if (isGeneratingRef.current) {
    return;
  }
    
    const recentWorkouts = workouts.slice(0, 10);
    
    // Analyze workout patterns
    const patternAnalysis = workoutAnalysisService.analyzeWorkoutPatterns(workouts);
    
    // Calculate readiness score from muscle statuses
    const readinessScore = muscleStatuses.length > 0
      ? Math.round(muscleStatuses.reduce((sum, m) => sum + m.recoveryPercentage, 0) / muscleStatuses.length)
      : 85;
    
    // Get overworked muscles
    const overworkedMuscles = muscleStatuses
      .filter(m => m.recoveryStatus === 'overworked')
      .map(m => m.muscle);
    
    // Get muscle recovery percentages
    const muscleRecoveryPercentages = muscleStatuses.map(m => m.recoveryPercentage);
    
    // Calculate recommendation context
    const recommendationContext = workoutAnalysisService.calculateWorkoutRecommendation({
      hasWorkoutToday: patternAnalysis.hasWorkoutToday,
      todayWorkout: patternAnalysis.todayWorkout,
      patternAnalysis,
      readinessScore,
      muscleRecoveryPercentages,
      overworkedMuscles,
      userWorkoutFrequencyGoal: profile.workoutFrequency || 3,
      userExperienceLevel: profile.experienceLevel,
    });
    
    // Calculate current streak
    const workoutDates = workouts
      .map(w => {
        const d = new Date(w.date);
        return isNaN(d.getTime()) ? null : d;
      })
      .filter((d): d is Date => d !== null);
      
    const currentStreak = calculateStreak(workoutDates);
    
    // Get fingerprint for caching (include pattern analysis in fingerprint)
    const patternFingerprint = patternAnalysis.hasWorkoutToday 
      ? `has-workout-today-${patternAnalysis.todayWorkout?.id || ''}`
      : `no-workout-today-${readinessScore}`;
    
    const fingerprint = aiChangeDetector.getFingerprint(
      recentWorkouts,
      muscleStatuses,
      0,
      []
    ) + `-${patternFingerprint}`;

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
          readinessScore,
          patternAnalysis,
          recommendationContext,
          currentStreak,
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
  }, [workouts, profile, muscleStatuses]);

  return { insights, isLoading, generateInsights };
}

