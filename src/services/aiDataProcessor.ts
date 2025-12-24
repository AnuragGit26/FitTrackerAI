import { Workout } from '@/types/workout';
import { MuscleStatus } from '@/types/muscle';
import { PersonalRecord } from '@/types/analytics';

interface ProcessedWorkoutData {
  summary: string;
  tokenEstimate: number;
  workoutCount: number;
}

interface ProcessedMuscleData {
  summary: string;
  tokenEstimate: number;
}

const TOKEN_LIMIT = 100000; // Target: Stay under 100K tokens for safety
const TOKEN_WARNING_THRESHOLD = 80000; // 80% of limit

// Rough token estimation: ~4 tokens per word, ~1.3 tokens per character
function estimateTokens(text: string): number {
  return Math.ceil(text.length * 1.3);
}

function formatWorkoutAbbreviated(workout: Workout): string {
  const date = new Date(workout.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  const caloriesInfo = workout.calories ? `, ${workout.calories} cal` : '';
  return `${date}: ${workout.exercises.length}ex, ${Math.round(workout.totalVolume)}kg${caloriesInfo}`;
}

function formatWorkoutDetailed(workout: Workout, isPR: boolean = false): string {
  const date = new Date(workout.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  const exercises = workout.exercises
    .slice(0, 5)
    .map(e => `${e.exerciseName} (${e.sets.length} sets)`)
    .join(', ');
  const caloriesInfo = workout.calories ? `, ${workout.calories} cal` : '';
  const prIndicator = isPR ? ' [PR]' : '';
  const duration = workout.duration ? `, ${Math.round(workout.duration)}min` : '';
  return `${date}: ${exercises}${workout.exercises.length > 5 ? '...' : ''}, ${Math.round(workout.totalVolume)}kg${duration}${caloriesInfo}${prIndicator}`;
}

class AIDataProcessor {
  processWorkouts(workouts: Workout[], personalRecords: PersonalRecord[]): ProcessedWorkoutData {
    if (workouts.length === 0) {
      return {
        summary: 'No recent workouts.',
        tokenEstimate: estimateTokens('No recent workouts.'),
        workoutCount: 0,
      };
    }

    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const fourteenDaysAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);

    // Identify PR workouts
    const prWorkoutDates = new Set(
      personalRecords.map(pr => new Date(pr.date).toISOString().split('T')[0])
    );

    // Categorize workouts
    const recentWorkouts = workouts.filter(w => new Date(w.date) >= sevenDaysAgo);
    const last14Days = workouts.filter(
      w => new Date(w.date) >= fourteenDaysAgo && new Date(w.date) < sevenDaysAgo
    );
    const olderWorkouts = workouts.filter(w => new Date(w.date) < fourteenDaysAgo);
    const prWorkouts = workouts.filter(w => 
      prWorkoutDates.has(new Date(w.date).toISOString().split('T')[0])
    );

    let summary: string;
    let tokenEstimate: number;

    if (workouts.length < 20) {
      // Small dataset: Include all workouts with details
      summary = workouts
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
        .map(w => formatWorkoutDetailed(w))
        .join('\n');
      tokenEstimate = estimateTokens(summary);
    } else if (workouts.length < 50) {
      // Medium dataset: All recent + sample older
      const recentSummary = recentWorkouts
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
        .map(w => formatWorkoutDetailed(w))
        .join('\n');

      const last14Summary = last14Days
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
        .slice(0, 10)
        .map(w => formatWorkoutAbbreviated(w))
        .join('\n');

      // Sample older workouts (representative sample)
      const sampleSize = Math.min(10, Math.floor(olderWorkouts.length * 0.2));
      const sampledOlder = olderWorkouts
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
        .slice(0, sampleSize)
        .map(w => formatWorkoutAbbreviated(w))
        .join('\n');

      summary = [
        'Recent workouts (last 7 days):',
        recentSummary,
        last14Days.length > 0 ? `\nLast 14 days (${last14Days.length} workouts):\n${last14Summary}` : '',
        olderWorkouts.length > 0 ? `\nOlder workouts (sample of ${sampledOlder.split('\n').length} from ${olderWorkouts.length}):\n${sampledOlder}` : '',
      ]
        .filter(Boolean)
        .join('\n');

      tokenEstimate = estimateTokens(summary);
    } else if (workouts.length < 100) {
      // Large dataset: Aggressive sampling + aggregation
      const recentSummary = recentWorkouts
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
        .slice(0, 10)
        .map(w => formatWorkoutDetailed(w))
        .join('\n');

      // Aggregate older workouts by week
      const weeklyAggregates = new Map<string, { count: number; volume: number; dates: Date[] }>();
      olderWorkouts.forEach(w => {
        const weekKey = getWeekKey(new Date(w.date));
        const existing = weeklyAggregates.get(weekKey) || { count: 0, volume: 0, dates: [] };
        existing.count++;
        existing.volume += w.totalVolume;
        existing.dates.push(new Date(w.date));
        weeklyAggregates.set(weekKey, existing);
      });

      const weeklySummary = Array.from(weeklyAggregates.entries())
        .sort((a, b) => {
          const dateA = a[1].dates.sort((d1, d2) => d2.getTime() - d1.getTime())[0];
          const dateB = b[1].dates.sort((d1, d2) => d2.getTime() - d1.getTime())[0];
          return dateB.getTime() - dateA.getTime();
        })
        .slice(0, 8)
        .map(([week, data]) => {
          const avgDate = new Date(
            data.dates.reduce((sum, d) => sum + d.getTime(), 0) / data.dates.length
          );
          return `${week}: ${data.count} workouts, ${Math.round(data.volume)}kg total`;
        })
        .join('\n');

      summary = [
        'Recent workouts (last 7 days):',
        recentSummary,
        `\nWeekly aggregates (${weeklyAggregates.size} weeks):\n${weeklySummary}`,
      ]
        .filter(Boolean)
        .join('\n');

      tokenEstimate = estimateTokens(summary);
    } else {
      // Very large dataset: Monthly summaries only
      const recentSummary = recentWorkouts
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
        .slice(0, 5)
        .map(w => formatWorkoutDetailed(w))
        .join('\n');

      // Aggregate by month
      const monthlyAggregates = new Map<string, { count: number; volume: number }>();
      olderWorkouts.forEach(w => {
        const monthKey = new Date(w.date).toLocaleDateString('en-US', { year: 'numeric', month: 'short' });
        const existing = monthlyAggregates.get(monthKey) || { count: 0, volume: 0 };
        existing.count++;
        existing.volume += w.totalVolume;
        monthlyAggregates.set(monthKey, existing);
      });

      const monthlySummary = Array.from(monthlyAggregates.entries())
        .sort((a, b) => {
          const dateA = new Date(a[0]);
          const dateB = new Date(b[0]);
          return dateB.getTime() - dateA.getTime();
        })
        .slice(0, 6)
        .map(([month, data]) => `${month}: ${data.count} workouts, ${Math.round(data.volume)}kg`)
        .join('\n');

      summary = [
        'Recent workouts (last 7 days):',
        recentSummary,
        `\nMonthly aggregates (${monthlyAggregates.size} months):\n${monthlySummary}`,
      ]
        .filter(Boolean)
        .join('\n');

      tokenEstimate = estimateTokens(summary);
    }

    // Add PR information if available
    if (personalRecords.length > 0) {
      const prSummary = `\n\nPersonal Records:\n${personalRecords
        .slice(0, 10)
        .map(pr => `${pr.exerciseName}: ${pr.maxWeight}kg x ${pr.maxReps} reps (${new Date(pr.date).toLocaleDateString()})`)
        .join('\n')}`;
      summary += prSummary;
      tokenEstimate += estimateTokens(prSummary);
    }

    // Apply progressive compression if approaching token limit
    if (tokenEstimate > TOKEN_WARNING_THRESHOLD) {
      return this.compressData(summary, tokenEstimate, workouts.length);
    }

    return {
      summary,
      tokenEstimate,
      workoutCount: workouts.length,
    };
  }

  private compressData(
    summary: string,
    currentTokens: number,
    workoutCount: number
  ): ProcessedWorkoutData {
    // More aggressive compression
    const compressionRatio = TOKEN_WARNING_THRESHOLD / currentTokens;
    const lines = summary.split('\n');
    
    // Keep first 5 lines (recent workouts), compress rest
    const keptLines = lines.slice(0, 5);
    const compressedLines = lines.slice(5).filter((_, i) => i % Math.ceil(1 / compressionRatio) === 0);
    
    const compressed = [...keptLines, ...compressedLines].join('\n');
    const newTokenEstimate = estimateTokens(compressed);

    return {
      summary: compressed,
      tokenEstimate: newTokenEstimate,
      workoutCount,
    };
  }

  processMuscleStatuses(muscleStatuses: MuscleStatus[]): ProcessedMuscleData {
    if (muscleStatuses.length === 0) {
      return {
        summary: 'No muscle status data available.',
        tokenEstimate: estimateTokens('No muscle status data available.'),
      };
    }

    // Group by recovery status
    const byStatus = new Map<string, MuscleStatus[]>();
    muscleStatuses.forEach(ms => {
      const status = ms.recoveryStatus;
      if (!byStatus.has(status)) {
        byStatus.set(status, []);
      }
      byStatus.get(status)!.push(ms);
    });

    // Format: Prioritize overworked and ready muscles
    const overworked = byStatus.get('overworked') || [];
    const ready = byStatus.get('ready') || [];
    const recovering = byStatus.get('recovering') || [];
    const others = muscleStatuses.filter(
      ms => !overworked.includes(ms) && !ready.includes(ms) && !recovering.includes(ms)
    );

    const parts: string[] = [];

    if (overworked.length > 0) {
      parts.push(
        `Overworked: ${overworked.map(m => {
          const hoursAgo = m.lastWorked 
            ? `${Math.round((Date.now() - new Date(m.lastWorked).getTime()) / (1000 * 60 * 60))}h ago`
            : 'never worked';
          return `${m.muscle} (${m.recoveryPercentage}%, workload: ${m.workloadScore}, ${hoursAgo})`;
        }).join(', ')}`
      );
    }

    if (ready.length > 0) {
      parts.push(
        `Ready: ${ready.map(m => {
          const hoursAgo = m.lastWorked 
            ? `${Math.round((Date.now() - new Date(m.lastWorked).getTime()) / (1000 * 60 * 60))}h ago`
            : 'never worked';
          return `${m.muscle} (${m.recoveryPercentage}%, ${hoursAgo})`;
        }).join(', ')}`
      );
    }

    if (recovering.length > 0) {
      const avgRecovery = Math.round(
        recovering.reduce((sum, m) => sum + m.recoveryPercentage, 0) / recovering.length
      );
      const avgWorkload = Math.round(
        recovering.reduce((sum, m) => sum + m.workloadScore, 0) / recovering.length
      );
      parts.push(`Recovering: ${recovering.length} muscles (avg ${avgRecovery}% recovery, ${avgWorkload} workload)`);
    }

    if (others.length > 0) {
      parts.push(`Other: ${others.length} muscles`);
    }

    const summary = parts.join('\n');
    const tokenEstimate = estimateTokens(summary);

    return {
      summary,
      tokenEstimate,
    };
  }

  estimateTotalTokens(workoutData: ProcessedWorkoutData, muscleData: ProcessedMuscleData): number {
    return workoutData.tokenEstimate + muscleData.tokenEstimate;
  }
}

function getWeekKey(date: Date): string {
  const year = date.getFullYear();
  const week = getWeekNumber(date);
  return `Week ${week}, ${year}`;
}

function getWeekNumber(date: Date): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
}

export const aiDataProcessor = new AIDataProcessor();

