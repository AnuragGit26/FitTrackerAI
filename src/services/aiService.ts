import { GoogleGenerativeAI } from '@google/generative-ai';
import { Workout } from '@/types/workout';
import { MuscleStatus } from '@/types/muscle';
import { AIInsights } from '@/hooks/useAIInsights';
import {
  ProgressAnalysis,
  SmartAlerts,
  WorkoutRecommendations,
  BreakthroughInsight,
  Alert,
  Recommendation,
  TrainingPattern,
  NutritionEvent,
  RecoveryPrediction,
  WorkoutRecommendation,
  CorrectiveExercise,
  MuscleImbalance,
} from '@/types/insights';
import { PersonalRecord, StrengthProgression } from '@/types/analytics';
import { MuscleGroup } from '@/types/muscle';
import { aiDataProcessor } from './aiDataProcessor';
import { parseAIJSON, sanitizeAIResponse, cleanPlainTextResponse } from '@/utils/aiResponseCleaner';
import { withErrorHandling, AppError, logError, getUserFriendlyErrorMessage } from '@/utils/errorHandler';
import { canMakeAICall, getTimeUntilNextAICall } from '@/utils/rateLimiter';

interface AIAnalysisContext {
  recentWorkouts: Workout[];
  muscleStatuses: MuscleStatus[];
  userGoals: string[];
  userLevel: string;
  weakPoints: string[];
  progressTrends: any;
}

export const aiService = {
  async generateWorkoutInsights(context: AIAnalysisContext): Promise<AIInsights> {
    // Check if API key is available
    const apiKey = import.meta.env.VITE_GEMINI_API_KEY;

    if (!apiKey) {
      // Return mock insights if API key is not configured
      return {
        analysis: 'AI insights require a Gemini API key. Add VITE_GEMINI_API_KEY to your .env file.',
        recommendations: [
          'Continue with your current workout routine',
          'Focus on progressive overload',
          'Ensure adequate rest between sessions',
        ],
        motivation: 'Keep up the great work! Consistency is key to achieving your fitness goals.',
        tip: 'Track your workouts consistently to get better insights over time.',
      };
    }

    try {
      const genAI = new GoogleGenerativeAI(apiKey);
      const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

      const workoutSummary = formatWorkoutSummary(context.recentWorkouts);
      const muscleSummary = formatMuscleStatus(context.muscleStatuses);
      
      const prompt = `
You are a certified personal trainer analyzing a gym member's workout data.

Recent Training Summary:
${workoutSummary}

Muscle Recovery Status:
${muscleSummary}

User Profile:
- Experience Level: ${context.userLevel}
- Goals: ${context.userGoals.join(', ')}
- Identified Weak Points: ${context.weakPoints.join(', ') || 'None identified'}

Please provide a comprehensive analysis in JSON format with the following structure:
{
  "analysis": "A brief analysis of their training balance and volume",
  "recommendations": ["Recommendation 1", "Recommendation 2", "Recommendation 3"],
  "warnings": ["Any warnings about overtraining or imbalances"],
  "motivation": "A motivational message based on their progress",
  "tip": "One specific tip to optimize their training"
}

CRITICAL OUTPUT REQUIREMENTS:
- Output ONLY valid JSON, no markdown formatting, no code blocks, no explanatory text before or after
- All text must be clean, professional, and polished - no gibberish, typos, or unpolished content
- Ensure all strings are properly formatted and grammatically correct
- Return only the JSON object, nothing else
- Be concise, actionable, and encouraging.
      `;

      const tokenEstimate = estimatePromptTokens(prompt);
      if (tokenEstimate > 100000) {
        console.warn(`Prompt token estimate (${tokenEstimate}) exceeds safe limit. Consider reducing data.`);
      }

      const result = await model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();

      // Try to parse JSON from response with cleaning
      const parsed = parseAIJSON<any>(text);
      if (parsed) {
        const cleaned = sanitizeAIResponse(parsed);
        return {
          analysis: cleaned.analysis || 'Analysis generated successfully.',
          recommendations: (cleaned.recommendations || []).map((r: any) => 
            typeof r === 'string' ? cleanPlainTextResponse(r) : String(r)
          ),
          warnings: cleaned.warnings ? (cleaned.warnings || []).map((w: any) => 
            typeof w === 'string' ? cleanPlainTextResponse(w) : String(w)
          ) : undefined,
          motivation: cleaned.motivation ? cleanPlainTextResponse(cleaned.motivation) : undefined,
          tip: cleaned.tip ? cleanPlainTextResponse(cleaned.tip) : undefined,
        };
      }

      // Fallback: return text as analysis (cleaned)
      return {
        analysis: cleanPlainTextResponse(text.substring(0, 500)),
        recommendations: [
          'Continue with progressive overload',
          'Ensure adequate recovery time',
          'Maintain consistency in your training',
        ],
        motivation: 'Keep up the great work!',
        tip: 'Track your workouts consistently for better insights.',
      };
    } catch (error) {
      logError(error instanceof Error ? error : new Error(String(error)), {
        context: 'generateWorkoutInsights',
        userId: context.userGoals, // Add more context as needed
      });
      
      // Return fallback insights instead of throwing
      return {
        analysis: 'Unable to generate AI insights at this time. Please try again later.',
        recommendations: [
          'Continue with your current workout routine',
          'Focus on progressive overload',
          'Ensure adequate rest between sessions',
        ],
        motivation: 'Keep up the great work! Consistency is key to achieving your fitness goals.',
        tip: 'Track your workouts consistently to get better insights over time.',
      };
    }
  },

  async generateProgressInsight(
    totalVolume: number,
    workoutCount: number,
    trendPercentage: number,
    topMuscle?: string
  ): Promise<string> {
    const apiKey = import.meta.env.VITE_GEMINI_API_KEY;

    if (!apiKey) {
      return `Your ${topMuscle || 'chest'} volume is up ${trendPercentage}% this month. You're hitting new PRs consistently. Great consistency!`;
    }

    try {
      const genAI = new GoogleGenerativeAI(apiKey);
      const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

      const prompt = `Generate a brief, encouraging progress insight (1-2 sentences) for a fitness tracker user:
- Total volume: ${totalVolume} lbs
- Workouts this month: ${workoutCount}
- Trend: ${trendPercentage > 0 ? '+' : ''}${trendPercentage}% vs last month
- Top muscle group: ${topMuscle || 'N/A'}

CRITICAL OUTPUT REQUIREMENTS:
- Output ONLY clean, polished text - no markdown, no code blocks, no formatting
- Ensure the text is professional, grammatically correct, and free of gibberish or typos
- Keep it concise, positive, and specific
- Return only the insight text, nothing else.`;

      const result = await model.generateContent(prompt);
      const response = await result.response;
      return cleanPlainTextResponse(response.text());
    } catch (error) {
      logError(error instanceof Error ? error : new Error(String(error)), {
        context: 'generateProgressInsight',
        totalVolume,
        workoutCount,
      });
      return `Your ${topMuscle || 'chest'} volume is up ${trendPercentage}% this month. You're hitting new PRs consistently. Great consistency!`;
    }
  },

  async generateMuscleBalanceInsight(
    focusDistribution: { legs: number; push: number; pull: number },
    symmetryScore: number,
    topMuscles: string[]
  ): Promise<string> {
    const apiKey = import.meta.env.VITE_GEMINI_API_KEY;

    if (!apiKey) {
      const imbalance = focusDistribution.legs < 25 ? 'leg volume is high, but hamstring isolation' : 'training balance';
      return `Your ${imbalance} is notably lower than your quad work. Consider adding Romanian Deadlifts to balance knee stability.`;
    }

    try {
      const genAI = new GoogleGenerativeAI(apiKey);
      const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

      const prompt = `Generate a brief muscle balance insight (1-2 sentences) for a fitness tracker:
- Focus distribution: Legs ${focusDistribution.legs}%, Push ${focusDistribution.push}%, Pull ${focusDistribution.pull}%
- Symmetry score: ${symmetryScore}%
- Most active muscles: ${topMuscles.join(', ')}

CRITICAL OUTPUT REQUIREMENTS:
- Output ONLY clean, polished text - no markdown, no code blocks, no formatting
- Ensure the text is professional, grammatically correct, and free of gibberish or typos
- Provide a specific, actionable recommendation about muscle balance or symmetry
- Return only the insight text, nothing else.`;

      const result = await model.generateContent(prompt);
      const response = await result.response;
      return cleanPlainTextResponse(response.text());
    } catch (error) {
      console.error('AI service error:', error);
      const imbalance = focusDistribution.legs < 25 ? 'leg volume is high, but hamstring isolation' : 'training balance';
      return `Your ${imbalance} is notably lower than your quad work. Consider adding Romanian Deadlifts to balance knee stability.`;
    }
  },

  async generateProgressAnalysis(
    workouts: Workout[],
    personalRecords: PersonalRecord[],
    strengthProgression: StrengthProgression[],
    volumeTrend: Array<{ date: string; totalVolume: number }>,
    consistencyScore: number,
    previousConsistencyScore: number,
    workoutCount: number,
    previousWorkoutCount: number
  ): Promise<ProgressAnalysis> {
    const apiKey = import.meta.env.VITE_GEMINI_API_KEY;

    if (!apiKey) {
      return generateMockProgressAnalysis(
        workouts,
        personalRecords,
        volumeTrend,
        consistencyScore,
        previousConsistencyScore,
        workoutCount,
        previousWorkoutCount
      );
    }

    try {
      const genAI = new GoogleGenerativeAI(apiKey);
      const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

      const workoutSummary = formatWorkoutSummary(workouts, personalRecords);
      const prSummary = personalRecords.length > 0
        ? personalRecords.slice(0, 10).map(pr => `${pr.exerciseName}: ${pr.maxWeight}kg x ${pr.maxReps}`).join(', ')
        : 'No PRs yet';
      const volumeTrendSummary = volumeTrend.length > 20
        ? `${volumeTrend.slice(0, 10).map(v => `${v.date}: ${v.totalVolume}kg`).join(', ')}... (${volumeTrend.length} total weeks)`
        : volumeTrend.map(v => `${v.date}: ${v.totalVolume}kg`).join(', ');

      const prompt = `Analyze workout progress and provide insights in JSON format:
{
  "breakthrough": {
    "exercise": "exercise name or null",
    "projectedWeight": number or null,
    "improvementPercent": number or null,
    "reason": "brief explanation"
  },
  "plateaus": [{"exercise": "name", "weight": number, "weeksStuck": number, "suggestion": "tip"}],
  "formChecks": [{"exercise": "name", "issue": "description", "muscleGroup": "muscle"}],
  "trainingPatterns": [{"type": "sleep|caffeine|timing", "title": "title", "description": "description", "impact": "impact statement"}]
}

Workout data: ${workoutSummary}
PRs: ${prSummary}
Volume trend: ${volumeTrendSummary}
Consistency: ${consistencyScore}% (was ${previousConsistencyScore}%)
Workouts this month: ${workoutCount} (was ${previousWorkoutCount})

CRITICAL OUTPUT REQUIREMENTS:
- Output ONLY valid JSON, no markdown formatting, no code blocks, no explanatory text before or after
- All text fields must be clean, professional, and polished - no gibberish, typos, or unpolished content
- Ensure all strings are properly formatted and grammatically correct
- Return only the JSON object, nothing else.`;

      const tokenEstimate = estimatePromptTokens(prompt);
      if (tokenEstimate > 100000) {
        console.warn(`Prompt token estimate (${tokenEstimate}) exceeds safe limit. Consider reducing data.`);
      }

      const result = await model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();

      const parsed = parseAIJSON<any>(text);
      if (parsed) {
        const cleaned = sanitizeAIResponse(parsed);
        return {
          breakthrough: cleaned.breakthrough?.exercise ? {
            exercise: cleanPlainTextResponse(cleaned.breakthrough.exercise),
            projectedWeight: cleaned.breakthrough.projectedWeight,
            improvementPercent: cleaned.breakthrough.improvementPercent,
            reason: cleanPlainTextResponse(cleaned.breakthrough.reason || ''),
          } : undefined,
          consistencyScore,
          consistencyChange: consistencyScore - previousConsistencyScore,
          workoutCount,
          workoutCountChange: workoutCount - previousWorkoutCount,
          volumeTrend: {
            current: volumeTrend[volumeTrend.length - 1]?.totalVolume || 0,
            previous: volumeTrend[0]?.totalVolume || 0,
            changePercent: volumeTrend.length > 1
              ? ((volumeTrend[volumeTrend.length - 1].totalVolume - volumeTrend[0].totalVolume) / volumeTrend[0].totalVolume) * 100
              : 0,
            weeklyData: volumeTrend.map((v, i) => ({ week: `WEEK ${i + 1}`, volume: v.totalVolume })),
          },
          plateaus: (cleaned.plateaus || []).map((p: any) => ({
            exercise: cleanPlainTextResponse(p.exercise || ''),
            weight: p.weight,
            weeksStuck: p.weeksStuck,
            suggestion: cleanPlainTextResponse(p.suggestion || ''),
          })),
          formChecks: (cleaned.formChecks || []).map((f: any) => ({
            exercise: cleanPlainTextResponse(f.exercise || ''),
            issue: cleanPlainTextResponse(f.issue || ''),
            muscleGroup: cleanPlainTextResponse(f.muscleGroup || ''),
          })),
          trainingPatterns: (cleaned.trainingPatterns || []).map((t: any) => ({
            type: t.type,
            title: cleanPlainTextResponse(t.title || ''),
            description: cleanPlainTextResponse(t.description || ''),
            impact: cleanPlainTextResponse(t.impact || ''),
          })),
        };
      }
    } catch (error) {
      console.error('AI service error:', error);
    }

    return generateMockProgressAnalysis(
      workouts,
      personalRecords,
      volumeTrend,
      consistencyScore,
      previousConsistencyScore,
      workoutCount,
      previousWorkoutCount
    );
  },

  async generateSmartAlerts(
    workouts: Workout[],
    muscleStatuses: MuscleStatus[],
    readinessScore: number
  ): Promise<SmartAlerts> {
    const apiKey = import.meta.env.VITE_GEMINI_API_KEY;

    if (!apiKey) {
      return generateMockSmartAlerts(workouts, muscleStatuses, readinessScore);
    }

    try {
      const genAI = new GoogleGenerativeAI(apiKey);
      const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

      const muscleSummary = formatMuscleStatus(muscleStatuses);
      const workoutSummary = formatWorkoutSummary(workouts);

      const prompt = `Generate smart alerts in JSON format:
{
  "readinessStatus": "optimal|good|moderate|low",
  "readinessMessage": "actionable message",
  "criticalAlerts": [{"type": "critical|warning", "title": "title", "message": "message", "muscleGroup": "muscle"}],
  "suggestions": [{"type": "deload|sleep|nutrition", "title": "title", "description": "description"}],
  "nutritionEvents": [{"time": "HH:MM", "relativeTime": "In X mins", "title": "title", "description": "description", "type": "protein|carb|meal"}]
}

Readiness: ${readinessScore}%
Muscle status: ${muscleSummary}
Recent workouts: ${workoutSummary}

CRITICAL OUTPUT REQUIREMENTS:
- Output ONLY valid JSON, no markdown formatting, no code blocks, no explanatory text before or after
- All text fields must be clean, professional, and polished - no gibberish, typos, or unpolished content
- Ensure all strings are properly formatted and grammatically correct
- Return only the JSON object, nothing else.`;

      const tokenEstimate = estimatePromptTokens(prompt);
      if (tokenEstimate > 100000) {
        console.warn(`Prompt token estimate (${tokenEstimate}) exceeds safe limit. Consider reducing data.`);
      }

      const result = await model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();

      const parsed = parseAIJSON<any>(text);
      if (parsed) {
        const cleaned = sanitizeAIResponse(parsed);
        return {
          readinessScore,
          readinessStatus: cleaned.readinessStatus || 'good',
          readinessMessage: cleanPlainTextResponse(cleaned.readinessMessage || 'System is operating normally.'),
          criticalAlerts: (cleaned.criticalAlerts || []).map((a: any, i: number) => ({
            id: `alert-${i}`,
            type: a.type,
            title: cleanPlainTextResponse(a.title || ''),
            message: cleanPlainTextResponse(a.message || ''),
            muscleGroup: cleanPlainTextResponse(a.muscleGroup || ''),
          })),
          suggestions: (cleaned.suggestions || []).map((s: any, i: number) => ({
            id: `suggestion-${i}`,
            type: s.type,
            title: cleanPlainTextResponse(s.title || ''),
            description: cleanPlainTextResponse(s.description || ''),
          })),
          nutritionEvents: (cleaned.nutritionEvents || []).map((e: any, i: number) => ({
            id: `nutrition-${i}`,
            time: e.time,
            relativeTime: cleanPlainTextResponse(e.relativeTime || ''),
            title: cleanPlainTextResponse(e.title || ''),
            description: cleanPlainTextResponse(e.description || ''),
            type: e.type,
          })),
        };
      }
    } catch (error) {
      console.error('AI service error:', error);
    }

    return generateMockSmartAlerts(workouts, muscleStatuses, readinessScore);
  },

  async generateWorkoutRecommendations(
    workouts: Workout[],
    muscleStatuses: MuscleStatus[],
    readinessScore: number,
    symmetryScore: number,
    focusDistribution: { legs: number; push: number; pull: number }
  ): Promise<WorkoutRecommendations> {
    const apiKey = import.meta.env.VITE_GEMINI_API_KEY;

    if (!apiKey) {
      return generateMockWorkoutRecommendations(workouts, muscleStatuses, readinessScore, symmetryScore, focusDistribution);
    }

    try {
      const genAI = new GoogleGenerativeAI(apiKey);
      const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

      const muscleSummary = formatMuscleStatus(muscleStatuses);

      const prompt = `Generate workout recommendations in JSON format:
{
  "readinessStatus": "Go Heavy|Moderate|Rest",
  "recommendedWorkout": {
    "name": "workout name",
    "description": "why this workout",
    "duration": number in minutes,
    "intensity": "low|medium|high",
    "muscleGroups": ["muscle1", "muscle2"],
    "reason": "explanation"
  },
  "imbalances": [{"muscle": "muscle", "leftVolume": number, "rightVolume": number, "imbalancePercent": number}],
  "correctiveExercises": [{"name": "exercise", "description": "why", "targetMuscle": "muscle", "category": "imbalance|posture|weakness"}],
  "recoveryPredictions": [{"dayLabel": "Mon", "workoutType": "push|pull|legs|rest", "recoveryPercentage": number, "prPotential": ["exercise"], "fatigueWarnings": ["warning"]}]
}

Readiness: ${readinessScore}%
Symmetry: ${symmetryScore}%
Focus: Legs ${focusDistribution.legs}%, Push ${focusDistribution.push}%, Pull ${focusDistribution.pull}%
Muscle status: ${muscleSummary}

CRITICAL OUTPUT REQUIREMENTS:
- Output ONLY valid JSON, no markdown formatting, no code blocks, no explanatory text before or after
- All text fields must be clean, professional, and polished - no gibberish, typos, or unpolished content
- Ensure all strings are properly formatted and grammatically correct
- Return only the JSON object, nothing else.`;

      const tokenEstimate = estimatePromptTokens(prompt);
      if (tokenEstimate > 100000) {
        console.warn(`Prompt token estimate (${tokenEstimate}) exceeds safe limit. Consider reducing data.`);
      }

      const result = await model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();

      const parsed = parseAIJSON<any>(text);
      if (parsed) {
        const cleaned = sanitizeAIResponse(parsed);
        return {
          readinessScore,
          readinessStatus: cleaned.readinessStatus || 'Moderate',
          recommendedWorkout: cleaned.recommendedWorkout ? {
            id: 'rec-1',
            name: cleanPlainTextResponse(cleaned.recommendedWorkout.name || ''),
            description: cleanPlainTextResponse(cleaned.recommendedWorkout.description || ''),
            duration: cleaned.recommendedWorkout.duration,
            intensity: cleaned.recommendedWorkout.intensity,
            muscleGroups: (cleaned.recommendedWorkout.muscleGroups || []).map((m: any) => cleanPlainTextResponse(String(m))),
            reason: cleanPlainTextResponse(cleaned.recommendedWorkout.reason || ''),
          } : undefined,
          muscleBalance: {
            imbalances: (cleaned.imbalances || []).map((im: any) => ({
              muscle: cleanPlainTextResponse(im.muscle || ''),
              leftVolume: im.leftVolume,
              rightVolume: im.rightVolume,
              imbalancePercent: im.imbalancePercent,
              status: im.imbalancePercent > 10 ? 'imbalanced' : 'balanced',
            })),
            overallScore: symmetryScore,
          },
          correctiveExercises: (cleaned.correctiveExercises || []).map((ex: any, i: number) => ({
            id: `exercise-${i}`,
            name: cleanPlainTextResponse(ex.name || ''),
            description: cleanPlainTextResponse(ex.description || ''),
            targetMuscle: cleanPlainTextResponse(ex.targetMuscle || ''),
            category: ex.category,
          })),
          recoveryPredictions: (cleaned.recoveryPredictions || []).map((pred: any, i: number) => ({
            date: new Date(Date.now() + i * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            dayLabel: cleanPlainTextResponse(pred.dayLabel || ''),
            workoutType: pred.workoutType,
            recoveryPercentage: pred.recoveryPercentage,
            prPotential: (pred.prPotential || []).map((p: any) => cleanPlainTextResponse(String(p))),
            fatigueWarnings: (pred.fatigueWarnings || []).map((w: any) => cleanPlainTextResponse(String(w))),
          })),
        };
      }
    } catch (error) {
      console.error('AI service error:', error);
    }

    return generateMockWorkoutRecommendations(workouts, muscleStatuses, readinessScore, symmetryScore, focusDistribution);
  },
};

function formatWorkoutSummary(workouts: Workout[], personalRecords: PersonalRecord[] = []): string {
  const processed = aiDataProcessor.processWorkouts(workouts, personalRecords);
  return processed.summary;
}

function formatMuscleStatus(statuses: MuscleStatus[]): string {
  const processed = aiDataProcessor.processMuscleStatuses(statuses);
  return processed.summary;
}

function estimatePromptTokens(prompt: string): number {
  // Rough estimation: ~1.3 tokens per character
  return Math.ceil(prompt.length * 1.3);
}

function generateMockProgressAnalysis(
  workouts: Workout[],
  personalRecords: PersonalRecord[],
  volumeTrend: Array<{ date: string; totalVolume: number }>,
  consistencyScore: number,
  previousConsistencyScore: number,
  workoutCount: number,
  previousWorkoutCount: number
): ProgressAnalysis {
  if (workouts.length === 0) {
    return {
      breakthrough: undefined,
      consistencyScore: 0,
      consistencyChange: 0,
      workoutCount: 0,
      workoutCountChange: 0,
      volumeTrend: {
        current: 0,
        previous: 0,
        changePercent: 0,
        weeklyData: [],
      },
      plateaus: [],
      formChecks: [],
      trainingPatterns: [],
    };
  }

  const latestPR = personalRecords.length > 0 
    ? personalRecords.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0]
    : undefined;
  
  const breakthrough: BreakthroughInsight | undefined = latestPR ? {
    exercise: latestPR.exerciseName,
    projectedWeight: latestPR.maxWeight + (latestPR.maxWeight * 0.05),
    improvementPercent: 5,
    reason: 'Based on your recent progress, you may be ready for a slight increase.',
  } : undefined;

  return {
    breakthrough,
    consistencyScore,
    consistencyChange: consistencyScore - previousConsistencyScore,
    workoutCount,
    workoutCountChange: workoutCount - previousWorkoutCount,
    volumeTrend: {
      current: volumeTrend[volumeTrend.length - 1]?.totalVolume || 0,
      previous: volumeTrend[0]?.totalVolume || 0,
      changePercent: volumeTrend.length > 1 && volumeTrend[0].totalVolume > 0
        ? ((volumeTrend[volumeTrend.length - 1].totalVolume - volumeTrend[0].totalVolume) / volumeTrend[0].totalVolume) * 100
        : 0,
      weeklyData: volumeTrend.map((v, i) => ({ week: `WEEK ${i + 1}`, volume: v.totalVolume })),
    },
    plateaus: [],
    formChecks: [],
    trainingPatterns: [],
  };
}

function generateMockSmartAlerts(
  workouts: Workout[],
  muscleStatuses: MuscleStatus[],
  readinessScore: number
): SmartAlerts {
  if (workouts.length === 0) {
    return {
      readinessScore: 0,
      readinessStatus: 'low',
      readinessMessage: 'Log workouts to get readiness insights.',
      criticalAlerts: [],
      suggestions: [],
      nutritionEvents: [],
    };
  }

  const overworkedMuscles = muscleStatuses.filter(m => m.recoveryStatus === 'overworked');
  const criticalAlerts: Alert[] = overworkedMuscles.length > 0 ? [{
    id: 'alert-1',
    type: 'critical',
    title: 'High Fatigue Detected',
    message: `${overworkedMuscles[0].muscle} are showing signs of overtraining. Consider additional rest.`,
    muscleGroup: overworkedMuscles[0].muscle,
  }] : [];

  return {
    readinessScore,
    readinessStatus: readinessScore >= 80 ? 'optimal' : readinessScore >= 60 ? 'good' : readinessScore >= 40 ? 'moderate' : 'low',
    readinessMessage: readinessScore >= 80 
      ? 'Readiness is high. Push for PRs today.' 
      : readinessScore >= 60 
      ? 'Readiness is good. You can train with moderate intensity.'
      : readinessScore >= 40
      ? 'Readiness is moderate. Consider lighter training or rest.'
      : 'Readiness is low. Rest is recommended.',
    criticalAlerts,
    suggestions: [],
    nutritionEvents: [],
  };
}

function generateMockWorkoutRecommendations(
  workouts: Workout[],
  muscleStatuses: MuscleStatus[],
  readinessScore: number,
  symmetryScore: number,
  focusDistribution: { legs: number; push: number; pull: number }
): WorkoutRecommendations {
  if (workouts.length === 0) {
    return {
      readinessScore: 0,
      readinessStatus: 'Rest',
      recommendedWorkout: undefined,
      muscleBalance: {
        imbalances: [],
        overallScore: 0,
      },
      correctiveExercises: [],
      recoveryPredictions: [],
    };
  }

  const recoveredMuscles = muscleStatuses.filter(m => m.recoveryPercentage >= 90);
  const recommendedMuscle = recoveredMuscles.length > 0 ? recoveredMuscles[0].muscle : undefined;

  const recommendedWorkout: WorkoutRecommendation | undefined = recommendedMuscle ? {
    id: 'rec-1',
    name: `${recommendedMuscle} Focus`,
    description: `${recommendedMuscle} is fully recovered and ready for training.`,
    duration: 45,
    intensity: readinessScore >= 80 ? 'high' : readinessScore >= 60 ? 'medium' : 'low',
    muscleGroups: [recommendedMuscle],
    reason: 'Optimal recovery window',
  } : undefined;

  return {
    readinessScore,
    readinessStatus: readinessScore >= 80 ? 'Go Heavy' : readinessScore >= 60 ? 'Moderate' : 'Rest',
    recommendedWorkout,
    muscleBalance: {
      imbalances: [],
      overallScore: symmetryScore,
    },
    correctiveExercises: [],
    recoveryPredictions: [],
  };
}

