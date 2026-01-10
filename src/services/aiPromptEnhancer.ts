/**
 * AI Prompt Enhancer - Enriches prompts with user context and personalization
 * Ensures prompts are optimized for detailed, consistent, and personalized AI responses
 */

import { UserProfile } from '@/types/user';
import { Workout } from '@/types/workout';
import { MuscleStatus } from '@/types/muscle';
import { PersonalRecord } from '@/types/analytics';

interface UserContext {
  profile: UserProfile;
  workoutHistory: {
    totalWorkouts: number;
    averageWorkoutsPerWeek: number;
    primaryFocus: string[];
    consistencyScore: number;
    longestStreak: number;
    currentStreak: number;
  };
  experienceLevel: {
    level: 'beginner' | 'intermediate' | 'advanced' | 'elite';
    indicators: string[];
  };
  goals: {
    primary: string[];
    secondary: string[];
    timeframe: string;
  };
  preferences: {
    equipment: string[];
    workoutDuration: string;
    trainingStyle: string[];
  };
  achievements: {
    personalRecords: PersonalRecord[];
    milestones: string[];
  };
  challenges: {
    plateaus: string[];
    imbalances: string[];
    recoveryIssues: string[];
  };
}

interface PromptEnhancementOptions {
  includeDetailedContext: boolean;
  emphasizePersonalization: boolean;
  requestSpecificMetrics: boolean;
  enforceStructuredOutput: boolean;
}

class AIPromptEnhancer {
  /**
   * Analyze user profile and workout data to build rich context
   */
  buildUserContext(
    profile: UserProfile,
    workouts: Workout[],
    muscleStatuses: MuscleStatus[],
    personalRecords: PersonalRecord[]
  ): UserContext {
    // Calculate workout history metrics
    const totalWorkouts = workouts.length;
    const oldestWorkout = workouts.length > 0 ? new Date(workouts[workouts.length - 1].date) : new Date();
    const newestWorkout = workouts.length > 0 ? new Date(workouts[0].date) : new Date();
    const daysDiff = Math.max(1, (newestWorkout.getTime() - oldestWorkout.getTime()) / (1000 * 60 * 60 * 24));
    const weeksActive = Math.max(1, daysDiff / 7);
    const averageWorkoutsPerWeek = totalWorkouts / weeksActive;

    // Determine primary focus from recent workouts
    const muscleFrequency = new Map<string, number>();
    workouts.slice(0, 30).forEach(w => {
      w.exercises.forEach(ex => {
        ex.musclesWorked.forEach(muscle => {
          muscleFrequency.set(muscle, (muscleFrequency.get(muscle) || 0) + 1);
        });
      });
    });
    const primaryFocus = Array.from(muscleFrequency.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([muscle]) => muscle);

    // Calculate consistency score
    const last30Days = new Date();
    last30Days.setDate(last30Days.getDate() - 30);
    const recentWorkouts = workouts.filter(w => new Date(w.date) >= last30Days);
    const consistencyScore = Math.min(100, (recentWorkouts.length / 12) * 100); // 3x/week = 100%

    // Calculate streaks
    let currentStreak = 0;
    let longestStreak = 0;
    let tempStreak = 0;
    const sortedWorkouts = [...workouts].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    for (let i = 0; i < sortedWorkouts.length; i++) {
      const currentDate = new Date(sortedWorkouts[i].date);
      const nextDate = i < sortedWorkouts.length - 1 ? new Date(sortedWorkouts[i + 1].date) : null;

      if (nextDate) {
        const daysDiff = Math.abs((currentDate.getTime() - nextDate.getTime()) / (1000 * 60 * 60 * 24));
        if (daysDiff <= 3) { // Allow 3 days between workouts for streak
          tempStreak++;
        } else {
          if (tempStreak > longestStreak) longestStreak = tempStreak;
          tempStreak = 0;
        }
      }

      if (i === 0) {
        const today = new Date();
        const daysSinceLastWorkout = (today.getTime() - currentDate.getTime()) / (1000 * 60 * 60 * 24);
        if (daysSinceLastWorkout <= 3) {
          currentStreak = tempStreak + 1;
        }
      }
    }
    if (tempStreak > longestStreak) longestStreak = tempStreak;

    // Determine experience level indicators
    const indicators: string[] = [];
    if (totalWorkouts > 100) indicators.push('high volume training history');
    if (personalRecords.length > 10) indicators.push('multiple personal records achieved');
    if (averageWorkoutsPerWeek >= 5) indicators.push('high training frequency');
    if (consistencyScore > 80) indicators.push('excellent consistency');

    let experienceLevel: 'beginner' | 'intermediate' | 'advanced' | 'elite' = profile.experienceLevel || 'intermediate';

    // Auto-adjust based on actual data
    if (totalWorkouts < 20) {
      experienceLevel = 'beginner';
    } else if (totalWorkouts >= 200 && personalRecords.length > 15) {
      experienceLevel = 'elite';
    } else if (totalWorkouts >= 100 && personalRecords.length > 8) {
      experienceLevel = 'advanced';
    }

    // Identify challenges
    const challenges = {
      plateaus: [] as string[],
      imbalances: [] as string[],
      recoveryIssues: [] as string[],
    };

    // Check for plateaus (no PRs in recent workouts)
    const recentPRs = personalRecords.filter(pr => {
      const prDate = new Date(pr.achievedDate);
      return (new Date().getTime() - prDate.getTime()) / (1000 * 60 * 60 * 24) <= 30;
    });
    if (recentPRs.length === 0 && totalWorkouts > 30) {
      challenges.plateaus.push('No recent personal records in past 30 days');
    }

    // Check for muscle imbalances
    const topMuscles = Array.from(muscleFrequency.entries()).sort((a, b) => b[1] - a[1]);
    if (topMuscles.length >= 2) {
      const ratio = topMuscles[0][1] / (topMuscles[1][1] || 1);
      if (ratio > 2) {
        challenges.imbalances.push(`Overtraining ${topMuscles[0][0]}, undertraining ${topMuscles[1][0]}`);
      }
    }

    // Check for recovery issues
    const overwOrkedMuscles = muscleStatuses.filter(m => m.status === 'overworked');
    if (overwOrkedMuscles.length > 0) {
      challenges.recoveryIssues.push(`${overwOrkedMuscles.length} muscle groups overworked`);
    }

    // Build achievements
    const milestones: string[] = [];
    if (totalWorkouts >= 50) milestones.push(`Completed ${totalWorkouts} workouts`);
    if (longestStreak >= 7) milestones.push(`${longestStreak} day workout streak`);
    if (personalRecords.length >= 5) milestones.push(`${personalRecords.length} personal records set`);

    return {
      profile,
      workoutHistory: {
        totalWorkouts,
        averageWorkoutsPerWeek: parseFloat(averageWorkoutsPerWeek.toFixed(1)),
        primaryFocus,
        consistencyScore: Math.round(consistencyScore),
        longestStreak,
        currentStreak,
      },
      experienceLevel: {
        level: experienceLevel,
        indicators,
      },
      goals: {
        primary: profile.goals || [],
        secondary: [],
        timeframe: '12 weeks',
      },
      preferences: {
        equipment: profile.equipment || [],
        workoutDuration: profile.workoutDuration || 'Not specified',
        trainingStyle: [],
      },
      achievements: {
        personalRecords,
        milestones,
      },
      challenges,
    };
  }

  /**
   * Enhance progress analysis prompt with personalized context
   */
  enhanceProgressPrompt(
    basePrompt: string,
    context: UserContext,
    options: PromptEnhancementOptions = {
      includeDetailedContext: true,
      emphasizePersonalization: true,
      requestSpecificMetrics: true,
      enforceStructuredOutput: true,
    }
  ): string {
    let enhancedPrompt = basePrompt;

    if (options.includeDetailedContext) {
      enhancedPrompt += `\n\n## USER CONTEXT (Critical for Personalization):\n`;
      enhancedPrompt += `- Name: ${context.profile.name || 'User'}\n`;
      enhancedPrompt += `- Experience Level: ${context.experienceLevel.level.toUpperCase()}`;
      if (context.experienceLevel.indicators.length > 0) {
        enhancedPrompt += ` (${context.experienceLevel.indicators.join(', ')})`;
      }
      enhancedPrompt += `\n`;
      enhancedPrompt += `- Training History: ${context.workoutHistory.totalWorkouts} total workouts, averaging ${context.workoutHistory.averageWorkoutsPerWeek}/week\n`;
      enhancedPrompt += `- Current Streak: ${context.workoutHistory.currentStreak} workouts (Longest: ${context.workoutHistory.longestStreak})\n`;
      enhancedPrompt += `- Consistency: ${context.workoutHistory.consistencyScore}%\n`;

      if (context.goals.primary.length > 0) {
        enhancedPrompt += `- Primary Goals: ${context.goals.primary.join(', ')}\n`;
      }

      if (context.workoutHistory.primaryFocus.length > 0) {
        enhancedPrompt += `- Training Focus: ${context.workoutHistory.primaryFocus.join(', ')}\n`;
      }

      if (context.achievements.milestones.length > 0) {
        enhancedPrompt += `- Recent Achievements: ${context.achievements.milestones.join('; ')}\n`;
      }

      if (context.challenges.plateaus.length > 0 || context.challenges.imbalances.length > 0) {
        enhancedPrompt += `- Current Challenges: `;
        const allChallenges = [
          ...context.challenges.plateaus,
          ...context.challenges.imbalances,
          ...context.challenges.recoveryIssues,
        ];
        enhancedPrompt += allChallenges.join('; ') + '\n';
      }
    }

    if (options.emphasizePersonalization) {
      enhancedPrompt += `\n## PERSONALIZATION REQUIREMENTS:\n`;
      enhancedPrompt += `1. Address the user by name: "${context.profile.name || 'there'}"\n`;
      enhancedPrompt += `2. Reference their specific training history and achievements\n`;
      enhancedPrompt += `3. Acknowledge their experience level (${context.experienceLevel.level}) in recommendations\n`;
      enhancedPrompt += `4. Connect insights to their stated goals\n`;
      enhancedPrompt += `5. Use motivational language that resonates with their progress\n`;
      enhancedPrompt += `6. Make comparisons to their own past performance, not generic standards\n`;
    }

    if (options.requestSpecificMetrics) {
      enhancedPrompt += `\n## REQUIRED ANALYSIS DEPTH:\n`;
      enhancedPrompt += `- Provide quantitative metrics (percentages, numbers) not just qualitative descriptions\n`;
      enhancedPrompt += `- Compare current performance to previous periods with specific numbers\n`;
      enhancedPrompt += `- Identify trends with concrete data points\n`;
      enhancedPrompt += `- Give actionable recommendations with measurable targets\n`;
      enhancedPrompt += `- Explain the "why" behind each insight, not just the "what"\n`;
    }

    if (options.enforceStructuredOutput) {
      enhancedPrompt += `\n## OUTPUT REQUIREMENTS:\n`;
      enhancedPrompt += `- Follow the exact JSON structure provided\n`;
      enhancedPrompt += `- Ensure all required fields are populated\n`;
      enhancedPrompt += `- Use consistent tone: encouraging yet realistic\n`;
      enhancedPrompt += `- Keep breakthrough messages under 80 characters\n`;
      enhancedPrompt += `- Make all recommendations specific and actionable\n`;
      enhancedPrompt += `- Avoid generic advice - everything must be personalized to this user's data\n`;
    }

    return enhancedPrompt;
  }

  /**
   * Enhance smart alerts prompt with user-specific context
   */
  enhanceAlertsPrompt(
    basePrompt: string,
    context: UserContext,
    options: PromptEnhancementOptions = {
      includeDetailedContext: true,
      emphasizePersonalization: true,
      requestSpecificMetrics: true,
      enforceStructuredOutput: true,
    }
  ): string {
    let enhancedPrompt = basePrompt;

    if (options.includeDetailedContext) {
      enhancedPrompt += `\n\n## USER CONTEXT:\n`;
      enhancedPrompt += `- Training Level: ${context.experienceLevel.level}\n`;
      enhancedPrompt += `- Recovery Capacity: `;

      const totalChallenges =
        context.challenges.recoveryIssues.length +
        context.challenges.imbalances.length +
        context.challenges.plateaus.length;

      if (totalChallenges === 0) {
        enhancedPrompt += `Excellent - no current recovery issues\n`;
      } else if (totalChallenges <= 2) {
        enhancedPrompt += `Good - minor recovery considerations\n`;
      } else {
        enhancedPrompt += `Needs attention - multiple recovery/training issues\n`;
      }

      if (context.preferences.equipment.length > 0) {
        enhancedPrompt += `- Available Equipment: ${context.preferences.equipment.join(', ')}\n`;
      }
    }

    if (options.emphasizePersonalization) {
      enhancedPrompt += `\n## ALERT PERSONALIZATION:\n`;
      enhancedPrompt += `1. Prioritize alerts based on user's goals: ${context.goals.primary.join(', ')}\n`;
      enhancedPrompt += `2. Consider their training frequency: ${context.workoutHistory.averageWorkoutsPerWeek}x/week\n`;
      enhancedPrompt += `3. Account for experience level when determining alert severity\n`;
      enhancedPrompt += `4. Reference their recent achievements to maintain motivation\n`;
      enhancedPrompt += `5. Make nutrition recommendations aligned with their workout intensity\n`;
    }

    if (options.requestSpecificMetrics) {
      enhancedPrompt += `\n## ALERT SPECIFICITY REQUIREMENTS:\n`;
      enhancedPrompt += `- Provide specific recovery times (e.g., "48-72 hours" not "a few days")\n`;
      enhancedPrompt += `- Give exact targets (e.g., "increase protein by 20g" not "eat more protein")\n`;
      enhancedPrompt += `- Include measurable indicators (e.g., "workout volume increased by 15%")\n`;
      enhancedPrompt += `- Specify timing precisely (e.g., "within 30 minutes post-workout")\n`;
    }

    if (options.enforceStructuredOutput) {
      enhancedPrompt += `\n## OUTPUT STRUCTURE:\n`;
      enhancedPrompt += `- Severity must be: 'low', 'medium', or 'high'\n`;
      enhancedPrompt += `- Critical alerts should have clear, immediate action items\n`;
      enhancedPrompt += `- Suggestions must be specific to user's current state\n`;
      enhancedPrompt += `- Avoid generic advice like "stay hydrated" - be specific\n`;
    }

    return enhancedPrompt;
  }

  /**
   * Enhance workout recommendations prompt
   */
  enhanceRecommendationsPrompt(
    basePrompt: string,
    context: UserContext,
    options: PromptEnhancementOptions = {
      includeDetailedContext: true,
      emphasizePersonalization: true,
      requestSpecificMetrics: true,
      enforceStructuredOutput: true,
    }
  ): string {
    let enhancedPrompt = basePrompt;

    if (options.includeDetailedContext) {
      enhancedPrompt += `\n\n## USER PROFILE:\n`;
      enhancedPrompt += `- Experience: ${context.experienceLevel.level} (${context.workoutHistory.totalWorkouts} workouts completed)\n`;
      enhancedPrompt += `- Equipment Access: ${context.preferences.equipment.length > 0 ? context.preferences.equipment.join(', ') : 'Bodyweight only'}\n`;
      enhancedPrompt += `- Current Focus: ${context.workoutHistory.primaryFocus.join(', ')}\n`;
      enhancedPrompt += `- Goals: ${context.goals.primary.join(', ')}\n`;

      if (context.challenges.imbalances.length > 0) {
        enhancedPrompt += `- Muscle Imbalances: ${context.challenges.imbalances.join('; ')}\n`;
      }
    }

    if (options.emphasizePersonalization) {
      enhancedPrompt += `\n## RECOMMENDATION PERSONALIZATION:\n`;
      enhancedPrompt += `1. Recommend exercises that match available equipment\n`;
      enhancedPrompt += `2. Suggest workout intensity appropriate for ${context.experienceLevel.level} level\n`;
      enhancedPrompt += `3. Address identified muscle imbalances with corrective exercises\n`;
      enhancedPrompt += `4. Build on their current training focus while expanding variety\n`;
      enhancedPrompt += `5. Set realistic progression targets based on their history\n`;
      enhancedPrompt += `6. Consider their training frequency when programming volume\n`;
    }

    if (options.requestSpecificMetrics) {
      enhancedPrompt += `\n## SPECIFICITY REQUIREMENTS:\n`;
      enhancedPrompt += `- Provide exact set/rep ranges (e.g., "3 sets of 8-12 reps")\n`;
      enhancedPrompt += `- Specify rest periods (e.g., "90 seconds between sets")\n`;
      enhancedPrompt += `- Give progression targets (e.g., "increase weight by 5% when completing all reps")\n`;
      enhancedPrompt += `- Include time-based goals (e.g., "master this in 2 weeks")\n`;
      enhancedPrompt += `- Quantify readiness scores precisely (0-100 scale)\n`;
    }

    if (options.enforceStructuredOutput) {
      enhancedPrompt += `\n## STRUCTURED OUTPUT:\n`;
      enhancedPrompt += `- Recommended workout must include specific exercises (name, sets, reps)\n`;
      enhancedPrompt += `- Muscle balance section must list specific imbalances with severity\n`;
      enhancedPrompt += `- Corrective exercises must include exercise name, sets, reps, and target muscle\n`;
      enhancedPrompt += `- Recovery predictions must be day-by-day (not vague ranges)\n`;
      enhancedPrompt += `- All text must be actionable, not theoretical\n`;
    }

    return enhancedPrompt;
  }
}

export const aiPromptEnhancer = new AIPromptEnhancer();
