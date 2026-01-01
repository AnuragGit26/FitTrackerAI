import { GoogleGenerativeAI } from '@google/generative-ai';
import { Workout } from '@/types/workout';
import { MuscleStatus, MuscleGroup, DEFAULT_RECOVERY_SETTINGS } from '@/types/muscle';
import { AIInsights } from '@/hooks/useAIInsights';
import {
  ProgressAnalysis,
  SmartAlerts,
  WorkoutRecommendations,
  BreakthroughInsight,
  Alert,
  RecoveryPrediction,
  WorkoutRecommendation,
} from '@/types/insights';
import { PersonalRecord, StrengthProgression } from '@/types/analytics';
import { aiDataProcessor } from './aiDataProcessor';
import { parseAIJSON, sanitizeAIResponse, cleanPlainTextResponse } from '@/utils/aiResponseCleaner';
import { logError } from '@/utils/errorHandler';
import { addDays, format, differenceInHours } from 'date-fns';
import { categorizeMuscleGroup, calculateMuscleImbalances } from '@/utils/analyticsHelpers';
import { WorkoutPatternAnalysis, WorkoutRecommendation as PatternRecommendation } from './workoutAnalysisService';

interface AIAnalysisContext {
  recentWorkouts: Workout[];
  muscleStatuses: MuscleStatus[];
  userGoals: string[];
  userLevel: string;
  weakPoints: string[];
  progressTrends: Record<string, unknown>;
  personalRecords?: PersonalRecord[];
  consistencyScore?: number;
  volumeTrend?: Array<{ date: string; totalVolume: number }>;
  readinessScore?: number;
  symmetryScore?: number;
  focusDistribution?: { legs: number; push: number; pull: number };
  workoutCount?: number;
  currentStreak?: number;
  equipment?: string[];
  workoutFrequency?: number;
  patternAnalysis?: WorkoutPatternAnalysis;
  recommendationContext?: PatternRecommendation;
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

      const workoutSummary = formatWorkoutSummary(context.recentWorkouts, context.personalRecords || []);
      const muscleSummary = formatMuscleStatus(context.muscleStatuses);
      
      // Calculate readiness score if not provided
      const readinessScore = context.readinessScore ?? ((context.muscleStatuses ?? []).length > 0
        ? Math.round((context.muscleStatuses ?? []).reduce((sum, m) => sum + m.recoveryPercentage, 0) / (context.muscleStatuses ?? []).length)
        : 85);
      
      // Build comprehensive context
      const prSummary = context.personalRecords && (context.personalRecords ?? []).length > 0
        ? `\nRecent Personal Records:\n${(context.personalRecords ?? []).slice(0, 5).map(pr => 
            `${pr.exerciseName}: ${pr.maxWeight}kg x ${pr.maxReps} reps (${new Date(pr.date).toLocaleDateString()})`
          ).join('\n')}`
        : '';
      
      const volumeInfo = context.volumeTrend && (context.volumeTrend ?? []).length > 0
        ? `\nVolume Trend: Current ${Math.round((context.volumeTrend ?? [])[(context.volumeTrend ?? []).length - 1]?.totalVolume || 0)}kg, Previous ${Math.round((context.volumeTrend ?? [])[0]?.totalVolume || 0)}kg${(context.volumeTrend ?? []).length > 1 ? ` (${(context.volumeTrend ?? [])[0]?.totalVolume > 0 ? Math.round((((context.volumeTrend ?? [])[(context.volumeTrend ?? []).length - 1].totalVolume - (context.volumeTrend ?? [])[0].totalVolume) / (context.volumeTrend ?? [])[0].totalVolume) * 100) : 0}% change)` : ''}`
        : '';
      
      const consistencyInfo = context.consistencyScore !== undefined
        ? `\nConsistency Score: ${context.consistencyScore}%`
        : '';
      
      const focusInfo = context.focusDistribution
        ? `\nTraining Focus: Legs ${context.focusDistribution.legs}%, Push ${context.focusDistribution.push}%, Pull ${context.focusDistribution.pull}%`
        : '';
      
      const symmetryInfo = context.symmetryScore !== undefined
        ? `\nSymmetry Score: ${context.symmetryScore}%`
        : '';
      
      const streakInfo = context.currentStreak !== undefined
        ? `\nCurrent Streak: ${context.currentStreak} days`
        : '';
      
      const workoutCountInfo = context.workoutCount !== undefined
        ? `\nWorkouts This Month: ${context.workoutCount}`
        : '';
      
      const equipmentInfo = context.equipment && (context.equipment ?? []).length > 0
        ? `\nAvailable Equipment: ${(context.equipment ?? []).join(', ')}`
        : '';
      
      const frequencyInfo = context.workoutFrequency !== undefined
        ? `\nTarget Frequency: ${context.workoutFrequency} days/week`
        : '';

      // Build pattern analysis info
      let patternInfo = '';
      let todayStatusInfo = '';
      let recommendationContextInfo = '';

      if (context.patternAnalysis) {
        const pattern = context.patternAnalysis;
        
        todayStatusInfo = pattern.hasWorkoutToday
          ? `\nTODAY'S STATUS: User has ALREADY completed a workout today. ${pattern.todayWorkout ? `Workout type: ${pattern.todayWorkout.workoutType || 'mixed'}` : ''}`
          : `\nTODAY'S STATUS: User has NOT completed a workout today.`;

        patternInfo = `
Workout Pattern Analysis:
- Workout Frequency: ${pattern.workoutFrequency.workoutsPerWeek} workouts/week (average), ${pattern.workoutFrequency.consecutiveDays} consecutive days
- This Week: ${pattern.workoutTypeDistribution.strengthCount} strength, ${pattern.workoutTypeDistribution.cardioCount} cardio workouts
- Last 14 Days: ${pattern.workoutTypeDistribution.strengthCount14Days} strength, ${pattern.workoutTypeDistribution.cardioCount14Days} cardio workouts
- Recent Workout Types: ${pattern.workoutTypeDistribution.recentTypes.join(', ')}
- Volume Trend: ${pattern.volumeTrends.trend} (${pattern.volumeTrends.trendPercentage > 0 ? '+' : ''}${pattern.volumeTrends.trendPercentage}% change)
- Average Volume per Workout: ${pattern.volumeTrends.averageVolumePerWorkout}kg
- Rest Days: ${pattern.restDayPatterns.restDaysLastWeek} last week, ${pattern.restDayPatterns.averageRestDaysPerWeek} average/week`;

        if (context.recommendationContext) {
          const rec = context.recommendationContext;
          recommendationContextInfo = `
RECOMMENDATION CONTEXT:
- Recommended Type: ${rec.type.toUpperCase()}
- Confidence: ${rec.confidence}
- Reasoning: ${rec.reasoning}
- Key Data Points: ${rec.dataPoints.join('; ')}`;
        }
      }

      const prompt = `
You are a certified personal trainer providing TODAY'S FOCUS - a single, actionable, data-packed recommendation for this user's workout today.

${todayStatusInfo}

Recent Training Summary:
${workoutSummary}${prSummary}

Muscle Recovery Status:
${muscleSummary}
Readiness Score: ${readinessScore}%${volumeInfo}${consistencyInfo}${focusInfo}${symmetryInfo}${streakInfo}${workoutCountInfo}${patternInfo}${recommendationContextInfo}

User Profile:
- Experience Level: ${context.userLevel}
- Goals: ${(context.userGoals ?? []).join(', ')}${equipmentInfo}${frequencyInfo}
- Identified Weak Points: ${(context.weakPoints ?? []).join(', ') || 'None identified'}

CRITICAL DECISION LOGIC:
${context.patternAnalysis?.hasWorkoutToday 
  ? 'User has ALREADY worked out today. Recommend REST or light activity (walking, stretching, yoga). Emphasize recovery importance.'
  : 'User has NOT worked out today. Analyze recovery status, workout patterns, and type balance to recommend: REST, CARDIO, or STRENGTH training.'}

Provide a JSON response with this structure:
{
  "analysis": "A brief analysis (2-3 sentences) referencing specific metrics like recovery percentages, volume trends, PRs, consistency scores, workout patterns, or today's status",
  "recommendations": ["ONE primary recommendation for TODAY that is data-packed and specific. ${context.patternAnalysis?.hasWorkoutToday ? 'Since user already worked out, recommend rest or light activity with reasoning.' : 'Include concrete numbers like workout frequency, type distribution, or recovery percentages. Keep it to 1-2 sentences max.'}", "Secondary recommendation if relevant", "Third recommendation if relevant"],
  "warnings": ["Any warnings about overtraining, imbalances, or excessive training with specific data"],
  "motivation": "A motivational message referencing their actual progress (mention specific achievements like PRs, consistency, volume increases, or workout patterns)",
  "tip": "One specific, actionable tip with data context (e.g., 'You've done 4 strength workouts this week - balance with cardio' or 'Your quads are 90% recovered - perfect for leg day')"
}

CRITICAL OUTPUT REQUIREMENTS:
- The FIRST recommendation MUST be the "Today's Focus" - make it crisp, clear, and data-packed (1-2 sentences)
- ${context.patternAnalysis?.hasWorkoutToday ? 'Since user already worked out today, the recommendation MUST be rest or light activity.' : 'Consider workout patterns, type balance, recovery status, and frequency when recommending.'}
- Include specific metrics, percentages, or numbers in recommendations when possible
- Reference concrete data points (PRs, recovery percentages, volume changes, consistency scores, workout frequency, type distribution)
- Output ONLY valid JSON, no markdown formatting, no code blocks, no explanatory text
- All text must be clean, professional, and polished - no gibberish, typos, or unpolished content
- Return only the JSON object, nothing else
      `;

      const tokenEstimate = estimatePromptTokens(prompt);
      if (tokenEstimate > 100000) {
        console.warn(`Prompt token estimate (${tokenEstimate}) exceeds safe limit. Consider reducing data.`);
      }

      const result = await model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();

      // Try to parse JSON from response with cleaning
      const parsed = parseAIJSON<Record<string, unknown>>(text);
      if (parsed) {
        const cleaned = sanitizeAIResponse(parsed) as Record<string, unknown>;
        return {
          analysis: (typeof cleaned.analysis === 'string' ? cleaned.analysis : 'Analysis generated successfully.'),
          recommendations: (Array.isArray(cleaned.recommendations) ? cleaned.recommendations : []).map((r: unknown) =>
            typeof r === 'string' ? cleanPlainTextResponse(r) : String(r)
          ),
          warnings: cleaned.warnings ? (Array.isArray(cleaned.warnings) ? cleaned.warnings : []).map((w: unknown) =>
            typeof w === 'string' ? cleanPlainTextResponse(w) : String(w)
          ) : undefined,
          motivation: (typeof cleaned.motivation === 'string') ? cleanPlainTextResponse(cleaned.motivation) : undefined,
          tip: (typeof cleaned.tip === 'string') ? cleanPlainTextResponse(cleaned.tip) : undefined,
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
    topMuscle?: string,
    unit: 'kg' | 'lbs' = 'kg'
  ): Promise<string> {
    const apiKey = import.meta.env.VITE_GEMINI_API_KEY;

    // Convert volume from kg to user's preferred unit if needed
    const displayVolume = unit === 'lbs' ? totalVolume * 2.20462 : totalVolume;
    const formattedVolume = Math.round(displayVolume).toLocaleString();

    if (!apiKey) {
      return `Your ${topMuscle || 'chest'} volume is up ${trendPercentage}% this month. You're hitting new PRs consistently. Great consistency!`;
    }

    try {
      const genAI = new GoogleGenerativeAI(apiKey);
      const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

      const prompt = `Generate a brief, encouraging progress insight (1-2 sentences) for a fitness tracker user:
- Total volume: ${formattedVolume} ${unit}
- Workouts this month: ${workoutCount}
- Trend: ${trendPercentage > 0 ? '+' : ''}${trendPercentage}% vs last month
- Top muscle group: ${topMuscle || 'N/A'}

CRITICAL OUTPUT REQUIREMENTS:
- Output ONLY clean, polished text - no markdown, no code blocks, no formatting
- Ensure the text is professional, grammatically correct, and free of gibberish or typos
- Keep it concise, positive, and specific
- Use the same unit (${unit}) when mentioning volume in your response
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
    _strengthProgression: StrengthProgression[],
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

      const workoutSummary = formatWorkoutSummary(workouts ?? [], personalRecords ?? []);
      const prSummary = (personalRecords ?? []).length > 0
        ? (personalRecords ?? []).slice(0, 10).map(pr => `${pr.exerciseName}: ${pr.maxWeight}kg x ${pr.maxReps} reps (${new Date(pr.date).toLocaleDateString()})`).join('\n')
        : 'No PRs yet';
      const volumeTrendSummary = (volumeTrend ?? []).length > 20
        ? `${(volumeTrend ?? []).slice(0, 10).map(v => `${v.date}: ${v.totalVolume}kg`).join(', ')}... (${(volumeTrend ?? []).length} total weeks)`
        : (volumeTrend ?? []).map(v => `${v.date}: ${v.totalVolume}kg`).join(', ');
      
      const volumeChange = (volumeTrend ?? []).length > 1 && (volumeTrend ?? [])[0]?.totalVolume > 0
        ? Math.round((((volumeTrend ?? [])[(volumeTrend ?? []).length - 1].totalVolume - (volumeTrend ?? [])[0].totalVolume) / (volumeTrend ?? [])[0].totalVolume) * 100)
        : 0;
      const consistencyChange = consistencyScore - previousConsistencyScore;
      const workoutCountChange = workoutCount - previousWorkoutCount;
      const prCount = (personalRecords ?? []).length;
      const recentPRs = (personalRecords ?? []).filter(pr => {
        const prDate = new Date(pr.date);
        const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
        return prDate >= sevenDaysAgo;
      }).length;

      const prompt = `Analyze workout progress and provide detailed insights in JSON format:
{
  "breakthrough": {
    "exercise": "exercise name or null",
    "projectedWeight": number or null,
    "improvementPercent": number or null,
    "reason": "brief explanation with specific data points"
  },
  "plateaus": [{"exercise": "name", "weight": number, "weeksStuck": number, "suggestion": "specific tip with data context"}],
  "formChecks": [{"exercise": "name", "issue": "description", "muscleGroup": "muscle"}],
  "trainingPatterns": [{"type": "sleep|caffeine|timing", "title": "title", "description": "description", "impact": "impact statement with metrics"}]
}

Performance Metrics:
- Consistency Score: ${consistencyScore}% (${consistencyChange >= 0 ? '+' : ''}${consistencyChange}% change from previous period)
- Workout Count: ${workoutCount} workouts this month (${workoutCountChange >= 0 ? '+' : ''}${workoutCountChange} vs previous)
- Volume Trend: ${volumeChange >= 0 ? '+' : ''}${volumeChange}% change (Current: ${Math.round((volumeTrend ?? [])[(volumeTrend ?? []).length - 1]?.totalVolume || 0)}kg, Previous: ${Math.round((volumeTrend ?? [])[0]?.totalVolume || 0)}kg)
- Personal Records: ${prCount} total PRs, ${recentPRs} in last 7 days

Workout Data:
${workoutSummary}

Personal Records:
${prSummary}

Volume Trend (${(volumeTrend ?? []).length} data points):
${volumeTrendSummary}

CRITICAL OUTPUT REQUIREMENTS:
- Output ONLY valid JSON, no markdown formatting, no code blocks, no explanatory text before or after
- All text fields must be clean, professional, and polished - no gibberish, typos, or unpolished content
- Include specific metrics, percentages, and data points in explanations
- Ensure all strings are properly formatted and grammatically correct
- Return only the JSON object, nothing else.`;

      const tokenEstimate = estimatePromptTokens(prompt);
      if (tokenEstimate > 100000) {
        console.warn(`Prompt token estimate (${tokenEstimate}) exceeds safe limit. Consider reducing data.`);
      }

      const result = await model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();

      const parsed = parseAIJSON<Record<string, unknown>>(text);
      if (parsed) {
        const cleaned = sanitizeAIResponse(parsed) as Record<string, unknown>;
        const breakthrough = cleaned.breakthrough as Record<string, unknown> | undefined;
        const projectedWeight = typeof breakthrough?.projectedWeight === 'number' ? breakthrough.projectedWeight : undefined;
        const improvementPercent = typeof breakthrough?.improvementPercent === 'number' ? breakthrough.improvementPercent : undefined;
        return {
          breakthrough: breakthrough?.exercise && projectedWeight !== undefined && improvementPercent !== undefined ? {
            exercise: cleanPlainTextResponse(String(breakthrough.exercise)),
            projectedWeight,
            improvementPercent,
            reason: cleanPlainTextResponse(String(breakthrough.reason || '')),
          } : undefined,
          consistencyScore,
          consistencyChange: consistencyScore - previousConsistencyScore,
          workoutCount,
          workoutCountChange: workoutCount - previousWorkoutCount,
          volumeTrend: {
            current: (volumeTrend ?? [])[(volumeTrend ?? []).length - 1]?.totalVolume || 0,
            previous: (volumeTrend ?? [])[0]?.totalVolume || 0,
            changePercent: (volumeTrend ?? []).length > 1
              ? (((volumeTrend ?? [])[(volumeTrend ?? []).length - 1].totalVolume - (volumeTrend ?? [])[0].totalVolume) / (volumeTrend ?? [])[0].totalVolume) * 100
              : 0,
            weeklyData: (volumeTrend ?? []).map((v, i) => ({ week: `WEEK ${i + 1}`, volume: v.totalVolume })),
          },
          plateaus: (Array.isArray(cleaned.plateaus) ? cleaned.plateaus : []).map((p: unknown) => {
            const plateau = p as Record<string, unknown>;
            return {
              exercise: cleanPlainTextResponse(String(plateau.exercise || '')),
              weight: typeof plateau.weight === 'number' ? plateau.weight : 0,
              weeksStuck: typeof plateau.weeksStuck === 'number' ? plateau.weeksStuck : 0,
              suggestion: cleanPlainTextResponse(String(plateau.suggestion || '')),
            };
          }),
          formChecks: (Array.isArray(cleaned.formChecks) ? cleaned.formChecks : []).map((f: unknown) => {
            const formCheck = f as Record<string, unknown>;
            return {
              exercise: cleanPlainTextResponse(String(formCheck.exercise || '')),
              issue: cleanPlainTextResponse(String(formCheck.issue || '')),
              muscleGroup: cleanPlainTextResponse(String(formCheck.muscleGroup || '')) as MuscleGroup,
            };
          }),
          trainingPatterns: (Array.isArray(cleaned.trainingPatterns) ? cleaned.trainingPatterns : []).map((t: unknown, i: number) => {
            const pattern = t as Record<string, unknown>;
            return {
              id: `pattern-${i}`,
              type: String(pattern.type || '') as 'sleep' | 'caffeine' | 'timing' | 'other',
              title: cleanPlainTextResponse(String(pattern.title || '')),
              description: cleanPlainTextResponse(String(pattern.description || '')),
              impact: cleanPlainTextResponse(String(pattern.impact || '')),
            };
          }),
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
      
      // Calculate recovery details
      const overworkedMuscles = (muscleStatuses ?? []).filter(m => m.recoveryStatus === 'overworked');
      const readyMuscles = (muscleStatuses ?? []).filter(m => m.recoveryStatus === 'ready');
      const avgRecovery = (muscleStatuses ?? []).length > 0
        ? Math.round((muscleStatuses ?? []).reduce((sum, m) => sum + m.recoveryPercentage, 0) / (muscleStatuses ?? []).length)
        : 85;
      const avgWorkload = (muscleStatuses ?? []).length > 0
        ? Math.round((muscleStatuses ?? []).reduce((sum, m) => sum + m.workloadScore, 0) / (muscleStatuses ?? []).length)
        : 0;
      
      // Get recent workout intensity
      const recentWorkouts = (workouts ?? []).slice(0, 5);
      const avgRecentVolume = recentWorkouts.length > 0
        ? Math.round(recentWorkouts.reduce((sum, w) => sum + w.totalVolume, 0) / recentWorkouts.length)
        : 0;

      const prompt = `Generate smart alerts with detailed context in JSON format:
{
  "readinessStatus": "optimal|good|moderate|low",
  "readinessMessage": "actionable message with specific readiness score and recovery data",
  "criticalAlerts": [{"type": "critical|warning", "title": "title", "message": "message with specific metrics (recovery %, workload, hours since workout)", "muscleGroup": "muscle"}],
  "suggestions": [{"type": "deload|sleep|nutrition", "title": "title", "description": "description with data context"}],
  "nutritionEvents": [{"time": "HH:MM", "relativeTime": "In X mins", "title": "title", "description": "description", "type": "protein|carb|meal"}]
}

Recovery Metrics:
- Readiness Score: ${readinessScore}%
- Average Recovery: ${avgRecovery}%
- Average Workload: ${avgWorkload}
- Overworked Muscles: ${overworkedMuscles.length}
- Ready Muscles: ${readyMuscles.length}

Muscle Status Details:
${muscleSummary}

Recent Training:
${workoutSummary}
- Average Recent Volume: ${avgRecentVolume}kg per workout
- Recent Workouts: ${recentWorkouts.length} in last period

CRITICAL OUTPUT REQUIREMENTS:
- Output ONLY valid JSON, no markdown formatting, no code blocks, no explanatory text before or after
- Include specific metrics (percentages, hours, volumes) in messages and descriptions
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

      const parsed = parseAIJSON<Record<string, unknown>>(text);
      if (parsed) {
        const cleaned = sanitizeAIResponse(parsed) as Record<string, unknown>;
        return {
          readinessScore,
          readinessStatus: (cleaned.readinessStatus as 'optimal' | 'good' | 'moderate' | 'low') ?? 'good',
          readinessMessage: cleanPlainTextResponse(String(cleaned.readinessMessage ?? 'System is operating normally.')),
          criticalAlerts: (Array.isArray(cleaned.criticalAlerts) ? cleaned.criticalAlerts : []).map((a: unknown, i: number) => {
            const alert = a as Record<string, unknown>;
            return {
              id: `alert-${i}`,
              type: String(alert.type ?? '') as 'critical' | 'warning' | 'info',
              title: cleanPlainTextResponse(String(alert.title ?? '')),
              message: cleanPlainTextResponse(String(alert.message ?? '')),
              muscleGroup: cleanPlainTextResponse(String(alert.muscleGroup ?? '')) as MuscleGroup,
            };
          }),
          suggestions: (Array.isArray(cleaned.suggestions) ? cleaned.suggestions : []).map((s: unknown, i: number) => {
            const suggestion = s as Record<string, unknown>;
            return {
              id: `suggestion-${i}`,
              type: String(suggestion.type ?? '') as 'deload' | 'sleep' | 'nutrition' | 'workout',
              title: cleanPlainTextResponse(String(suggestion.title ?? '')),
              description: cleanPlainTextResponse(String(suggestion.description ?? '')),
            };
          }),
          nutritionEvents: (Array.isArray(cleaned.nutritionEvents) ? cleaned.nutritionEvents : []).map((e: unknown, i: number) => {
            const event = e as Record<string, unknown>;
            return {
              id: `nutrition-${i}`,
              time: String(event.time ?? ''),
              relativeTime: cleanPlainTextResponse(String(event.relativeTime ?? '')),
              title: cleanPlainTextResponse(String(event.title ?? '')),
              description: cleanPlainTextResponse(String(event.description ?? '')),
              type: String(event.type ?? '') as 'protein' | 'carb' | 'meal' | 'supplement',
            };
          }),
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
    focusDistribution: { legs: number; push: number; pull: number },
    userLevel: 'beginner' | 'intermediate' | 'advanced' = 'intermediate',
    baseRestInterval: number = 48
  ): Promise<WorkoutRecommendations> {
    const apiKey = import.meta.env.VITE_GEMINI_API_KEY;

    // Calculate recovery predictions (always use calculated ones for accuracy)
    const calculatedPredictions = calculateRecoveryPredictions(muscleStatuses, userLevel, baseRestInterval);
    
    // Calculate muscle imbalances from actual workout data (data-driven)
    const calculatedImbalances = calculateMuscleImbalances(workouts);

    if (!apiKey) {
      return generateMockWorkoutRecommendations(workouts, muscleStatuses, readinessScore, symmetryScore, focusDistribution, userLevel, baseRestInterval);
    }

    try {
      const genAI = new GoogleGenerativeAI(apiKey);
      const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

      const muscleSummary = formatMuscleStatus(muscleStatuses);
      
      // Get ready muscle groups with recovery percentages
      const readyMuscles = (muscleStatuses ?? [])
        .filter(m => m.recoveryPercentage >= 75)
        .sort((a, b) => b.recoveryPercentage - a.recoveryPercentage)
        .slice(0, 10);
      const readyMusclesList = readyMuscles.length > 0
        ? readyMuscles.map(m => `${m.muscle} (${m.recoveryPercentage}%)`).join(', ')
        : 'None ready';
      
      // Get recent workout types to avoid repetition
      const recentWorkoutTypes = (workouts ?? []).slice(0, 5).map(w => {
        const exercises = (w.exercises ?? []).map(e => e.exerciseName).join(', ');
        return `${new Date(w.date).toLocaleDateString()}: ${exercises.substring(0, 50)}...`;
      }).join('\n');

      const prompt = `Generate workout recommendations with comprehensive context in JSON format:
{
  "readinessStatus": "Go Heavy|Moderate|Rest",
  "recommendedWorkout": {
    "name": "workout name",
    "description": "why this workout with specific recovery data",
    "duration": number in minutes,
    "intensity": "low|medium|high",
    "muscleGroups": ["muscle1", "muscle2"],
    "reason": "explanation with specific recovery percentages and readiness score"
  },
  "imbalances": [{"muscle": "muscle", "leftVolume": number, "rightVolume": number, "imbalancePercent": number}],
  "correctiveExercises": [{"name": "exercise", "description": "why with data context", "targetMuscle": "muscle", "category": "imbalance|posture|weakness"}],
  "recoveryPredictions": [{"dayLabel": "Mon", "workoutType": "push|pull|legs|rest", "recoveryPercentage": number, "prPotential": ["exercise"], "fatigueWarnings": ["warning"]}]
}

Recovery & Readiness:
- Readiness Score: ${readinessScore}%
- Ready Muscle Groups: ${readyMusclesList}
- User Level: ${userLevel}
- Base Rest Interval: ${baseRestInterval} hours

Balance Metrics:
- Symmetry Score: ${symmetryScore}%
- Focus Distribution: Legs ${focusDistribution.legs}%, Push ${focusDistribution.push}%, Pull ${focusDistribution.pull}%

Muscle Status Details:
${muscleSummary}

Recent Workouts (to avoid repetition):
${recentWorkoutTypes || 'No recent workouts'}

CRITICAL OUTPUT REQUIREMENTS:
- Output ONLY valid JSON, no markdown formatting, no code blocks, no explanatory text before or after
- Include specific recovery percentages and readiness data in recommendations
- Reference ready muscle groups with their recovery percentages
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

      const parsed = parseAIJSON<Record<string, unknown>>(text);
      if (parsed) {
        const cleaned = sanitizeAIResponse(parsed) as Record<string, unknown>;
        const recommendedWorkout = cleaned.recommendedWorkout as Record<string, unknown> | undefined;
        // Always use calculated predictions for accurate day labels and recovery percentages
        // But merge AI-generated workoutType if available
        const finalRecoveryPredictions = calculatedPredictions.map((calcPred, i) => {
          if (Array.isArray(cleaned.recoveryPredictions) && cleaned.recoveryPredictions.length > i) {
            const aiPred = cleaned.recoveryPredictions[i] as Record<string, unknown>;
            // Use AI workoutType if available, but always use calculated dayLabel and recoveryPercentage
            return {
              ...calcPred,
              workoutType: (String(aiPred.workoutType || calcPred.workoutType || 'rest') as 'push' | 'pull' | 'legs' | 'rest'),
              prPotential: (Array.isArray(aiPred.prPotential) ? aiPred.prPotential : calcPred.prPotential || []).map((p: unknown) => cleanPlainTextResponse(String(p))),
              fatigueWarnings: (Array.isArray(aiPred.fatigueWarnings) ? aiPred.fatigueWarnings : calcPred.fatigueWarnings || []).map((w: unknown) => cleanPlainTextResponse(String(w))),
            };
          }
          return calcPred;
        });
        return {
          readinessScore,
          readinessStatus: String(cleaned.readinessStatus || 'Moderate'),
          recommendedWorkout: recommendedWorkout ? {
            id: 'rec-1',
            name: cleanPlainTextResponse(String(recommendedWorkout.name || '')),
            description: cleanPlainTextResponse(String(recommendedWorkout.description || '')),
            duration: typeof recommendedWorkout.duration === 'number' ? recommendedWorkout.duration : 45,
            intensity: String(recommendedWorkout.intensity || 'medium') as 'low' | 'medium' | 'high',
            muscleGroups: (Array.isArray(recommendedWorkout.muscleGroups) ? recommendedWorkout.muscleGroups : []).map((m: unknown) => cleanPlainTextResponse(String(m)) as MuscleGroup),
            reason: cleanPlainTextResponse(String(recommendedWorkout.reason || '')),
          } : undefined,
          muscleBalance: {
            // Use calculated imbalances (data-driven) instead of AI-generated ones
            imbalances: calculatedImbalances.length > 0 
              ? calculatedImbalances 
              : (Array.isArray(cleaned.imbalances) ? cleaned.imbalances : []).map((im: unknown) => {
                  const imbalance = im as Record<string, unknown>;
                  const imbalancePercent = typeof imbalance.imbalancePercent === 'number' ? imbalance.imbalancePercent : 0;
                  return {
                    muscle: cleanPlainTextResponse(String(imbalance.muscle || '')) as MuscleGroup,
                    leftVolume: typeof imbalance.leftVolume === 'number' ? imbalance.leftVolume : 0,
                    rightVolume: typeof imbalance.rightVolume === 'number' ? imbalance.rightVolume : 0,
                    imbalancePercent,
                    status: (imbalancePercent > 10 ? 'imbalanced' : 'balanced') as 'balanced' | 'imbalanced',
                  };
                }),
            overallScore: symmetryScore,
          },
          correctiveExercises: (Array.isArray(cleaned.correctiveExercises) ? cleaned.correctiveExercises : []).map((ex: unknown, i: number) => {
            const exercise = ex as Record<string, unknown>;
            return {
              id: `exercise-${i}`,
              name: cleanPlainTextResponse(String(exercise.name || '')),
              description: cleanPlainTextResponse(String(exercise.description || '')),
              targetMuscle: cleanPlainTextResponse(String(exercise.targetMuscle || '')) as MuscleGroup,
              category: String(exercise.category || '') as 'imbalance' | 'posture' | 'weakness' | 'mobility',
              reason: cleanPlainTextResponse(String(exercise.reason || exercise.description || '')),
            };
          }),
          recoveryPredictions: finalRecoveryPredictions,
        };
      }
    } catch (error) {
      console.error('AI service error:', error);
    }

    return generateMockWorkoutRecommendations(workouts, muscleStatuses, readinessScore, symmetryScore, focusDistribution, userLevel, baseRestInterval);
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

/**
 * Calculate recovery predictions for the next 7 days
 */
function calculateRecoveryPredictions(
  muscleStatuses: MuscleStatus[],
  userLevel: 'beginner' | 'intermediate' | 'advanced',
  baseRestInterval: number
): RecoveryPrediction[] {
  const predictions: RecoveryPrediction[] = [];
  const today = new Date();

  for (let i = 0; i < 7; i++) {
    const targetDate = addDays(today, i);
    const dayLabel = format(targetDate, 'EEE'); // Mon, Tue, etc.

    // Calculate average recovery for all muscles on this day
    let totalRecovery = 0;
    let count = 0;
    const readyMusclesByCategory: { legs: MuscleGroup[]; push: MuscleGroup[]; pull: MuscleGroup[] } = {
      legs: [],
      push: [],
      pull: [],
    };

    muscleStatuses.forEach((status) => {
      if (!status.lastWorked) {
        totalRecovery += 100;
        count++;
        const category = categorizeMuscleGroup(status.muscle);
        readyMusclesByCategory[category].push(status.muscle);
        return;
      }

      const lastWorked = status.lastWorked instanceof Date 
        ? status.lastWorked 
        : new Date(status.lastWorked);

      // Calculate hours between target date and last workout
      const hoursSinceWorkout = differenceInHours(targetDate, lastWorked);

      if (hoursSinceWorkout < 0) {
        // Target date is before last workout, use current recovery
        totalRecovery += status.recoveryPercentage;
        count++;
        if (status.recoveryPercentage >= 75) {
          const category = categorizeMuscleGroup(status.muscle);
          readyMusclesByCategory[category].push(status.muscle);
        }
        return;
      }

      // Calculate projected recovery for this date
      const recoverySettings = DEFAULT_RECOVERY_SETTINGS;
      let baseRecoveryHours = 48;

      if (userLevel === 'beginner') {
        baseRecoveryHours = (recoverySettings.beginnerRestDays[status.muscle] || 2) * 24;
      } else if (userLevel === 'intermediate') {
        baseRecoveryHours = (recoverySettings.intermediateRestDays[status.muscle] || 2) * 24;
      } else {
        baseRecoveryHours = (recoverySettings.advancedRestDays[status.muscle] || 1) * 24;
      }

      // Apply BaseRestInterval setting
      if (baseRestInterval !== undefined) {
        const defaultBase = 48;
        const ratio = baseRestInterval / defaultBase;
        baseRecoveryHours = baseRecoveryHours * ratio;
      }

      const workloadMultiplier = 1 + (status.workloadScore / 100);
      const adjustedRecoveryHours = baseRecoveryHours * workloadMultiplier;

      const projectedRecovery = Math.min(
        100,
        Math.max(0, (hoursSinceWorkout / adjustedRecoveryHours) * 100)
      );

      totalRecovery += projectedRecovery;
      count++;

      if (projectedRecovery >= 75) {
        const category = categorizeMuscleGroup(status.muscle);
        readyMusclesByCategory[category].push(status.muscle);
      }
    });

    const avgRecovery = count > 0 ? Math.round(totalRecovery / count) : 85;

    // Determine workout type based on ready muscles
    let workoutType: 'push' | 'pull' | 'legs' | 'rest' = 'rest';
    if (readyMusclesByCategory.legs.length >= 2) {
      workoutType = 'legs';
    } else if (readyMusclesByCategory.push.length >= 2) {
      workoutType = 'push';
    } else if (readyMusclesByCategory.pull.length >= 2) {
      workoutType = 'pull';
    } else if (avgRecovery >= 75) {
      // If overall recovery is good but no specific category is ready, suggest rest or light work
      workoutType = 'rest';
    }

    const prediction = {
      date: targetDate.toISOString().split('T')[0],
      dayLabel,
      workoutType,
      recoveryPercentage: Math.max(1, avgRecovery), // Ensure minimum 1% so bar is always visible
      prPotential: avgRecovery >= 90 ? ['Optimal recovery for PR attempts'] : [],
      fatigueWarnings: avgRecovery < 50 ? ['High fatigue - consider rest'] : [],
    };
    predictions.push(prediction);
  }

  return predictions;
}

function generateMockWorkoutRecommendations(
  workouts: Workout[],
  muscleStatuses: MuscleStatus[],
  readinessScore: number,
  symmetryScore: number,
  _focusDistribution: { legs: number; push: number; pull: number },
  userLevel: 'beginner' | 'intermediate' | 'advanced' = 'intermediate',
  baseRestInterval: number = 48
): WorkoutRecommendations {
  // Calculate imbalances from actual workout data (data-driven)
  const calculatedImbalances = calculateMuscleImbalances(workouts);
  
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
      recoveryPredictions: calculateRecoveryPredictions(muscleStatuses, userLevel, baseRestInterval),
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
      imbalances: calculatedImbalances,
      overallScore: symmetryScore,
    },
    correctiveExercises: [],
    recoveryPredictions: calculateRecoveryPredictions(muscleStatuses, userLevel, baseRestInterval),
  };
}

