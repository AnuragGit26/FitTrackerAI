/**
 * AI Consistency Checker - Ensures consistent responses across different AI calls
 *
 * Tracks previous responses and validates that new responses don't contradict
 * earlier recommendations or use inconsistent terminology
 */

import { ProgressAnalysis, SmartAlerts, WorkoutRecommendations } from '@/types/insights';

interface ConsistencyRecord {
  userId: string;
  timestamp: number;
  type: 'progress' | 'alerts' | 'recommendations';
  keyPoints: string[];
  terminology: Map<string, string>; // e.g., "measurement_unit" -> "lbs"
  recommendations: string[];
}

interface ConsistencyCheckResult {
  consistent: boolean;
  score: number; // 0-100
  contradictions: Contradiction[];
  terminologyIssues: string[];
  recommendations: string[];
}

interface Contradiction {
  severity: 'high' | 'medium' | 'low';
  previousStatement: string;
  currentStatement: string;
  explanation: string;
}

const STORAGE_KEY = 'fitTrackAI_consistencyHistory';
const MAX_HISTORY_ITEMS = 10;
const HISTORY_TTL = 30 * 24 * 60 * 60 * 1000; // 30 days

class AIConsistencyChecker {
  private history: ConsistencyRecord[] = [];

  constructor() {
    this.loadHistory();
  }

  /**
   * Load consistency history from localStorage
   */
  private loadHistory(): void {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as {
          userId: string;
          timestamp: number;
          type: string;
          keyPoints: string[];
          terminology: Record<string, string>;
          recommendations: string[];
        }[];
        // Convert plain objects back to Maps
        this.history = parsed.map((record) => ({
          ...record,
          terminology: new Map(Object.entries(record.terminology || {})),
        }));

        // Remove expired entries
        const now = Date.now();
        this.history = this.history.filter(
          record => now - record.timestamp < HISTORY_TTL
        );
      }
    } catch (error) {
      console.warn('[AIConsistencyChecker] Failed to load history:', error);
      this.history = [];
    }
  }

  /**
   * Save consistency history to localStorage
   */
  private saveHistory(): void {
    try {
      // Convert Maps to plain objects for JSON serialization
      const serializable = this.history.map(record => ({
        ...record,
        terminology: Object.fromEntries(record.terminology),
      }));

      localStorage.setItem(STORAGE_KEY, JSON.stringify(serializable));
    } catch (error) {
      console.warn('[AIConsistencyChecker] Failed to save history:', error);
    }
  }

  /**
   * Extract key points from progress analysis
   */
  private extractProgressKeyPoints(response: ProgressAnalysis): string[] {
    const keyPoints: string[] = [];

    // Extract breakthrough
    if (response.breakthrough) {
      keyPoints.push(`breakthrough: ${response.breakthrough}`);
    }

    // Extract consistency trend
    if (response.consistencyChange !== undefined) {
      keyPoints.push(`consistency_trend: ${response.consistencyChange > 0 ? 'improving' : 'declining'}`);
    }

    // Extract training patterns
    if (response.trainingPatterns) {
      response.trainingPatterns.forEach(pattern => {
        keyPoints.push(`pattern: ${pattern.title}`);
      });
    }

    // Extract plateaus
    if (response.plateaus && response.plateaus.length > 0) {
      response.plateaus.forEach(plateau => {
        keyPoints.push(`plateau: ${plateau.exercise}`);
      });
    }

    return keyPoints;
  }

  /**
   * Extract key points from smart alerts
   */
  private extractAlertsKeyPoints(response: SmartAlerts): string[] {
    const keyPoints: string[] = [];

    // Extract critical alerts
    if (response.criticalAlerts) {
      response.criticalAlerts.forEach(alert => {
        keyPoints.push(`alert_${alert.type}: ${alert.title}`);
      });
    }

    // Extract suggestions
    if (response.suggestions) {
      response.suggestions.forEach(suggestion => {
        keyPoints.push(`suggestion: ${suggestion.description.substring(0, 100)}`);
      });
    }

    return keyPoints;
  }

  /**
   * Extract key points from workout recommendations
   */
  private extractRecommendationsKeyPoints(response: WorkoutRecommendations): string[] {
    const keyPoints: string[] = [];

    // Extract readiness interpretation
    if (response.readinessScore !== undefined) {
      if (response.readinessScore >= 85) {
        keyPoints.push('readiness: excellent');
      } else if (response.readinessScore >= 70) {
        keyPoints.push('readiness: good');
      } else if (response.readinessScore >= 50) {
        keyPoints.push('readiness: moderate');
      } else {
        keyPoints.push('readiness: low');
      }
    }

    // Extract workout type
    if (response.recommendedWorkout) {
      keyPoints.push(`workout_name: ${response.recommendedWorkout.name}`);
      keyPoints.push(`workout_intensity: ${response.recommendedWorkout.intensity}`);
    }

    // Extract muscle balance issues
    if (response.muscleBalance && response.muscleBalance.imbalances) {
      response.muscleBalance.imbalances.forEach(imbalance => {
        keyPoints.push(`imbalance: ${imbalance.muscle} (${imbalance.imbalancePercent}%)`);
      });
    }

    return keyPoints;
  }

  /**
   * Extract terminology used in response
   */
  private extractTerminology(response: unknown): Map<string, string> {
    const terminology = new Map<string, string>();

    const responseText = JSON.stringify(response);

    // Check measurement units
    if (responseText.includes(' lbs')) {
      terminology.set('weight_unit', 'lbs');
    } else if (responseText.includes(' kg')) {
      terminology.set('weight_unit', 'kg');
    }

    // Check time format
    if (responseText.match(/\d+h\s*\d+m/)) {
      terminology.set('time_format', 'hours_minutes');
    } else if (responseText.match(/\d+\s*(hours?|hrs?)/i)) {
      terminology.set('time_format', 'hours');
    }

    // Check workout terminology
    if (responseText.includes('workout') && responseText.includes('session')) {
      terminology.set('workout_term', 'mixed'); // Inconsistent!
    } else if (responseText.includes('workout')) {
      terminology.set('workout_term', 'workout');
    } else if (responseText.includes('session')) {
      terminology.set('workout_term', 'session');
    }

    // Check exercise terminology
    if (responseText.includes('exercise') && responseText.includes('movement')) {
      terminology.set('exercise_term', 'mixed'); // Inconsistent!
    } else if (responseText.includes('exercise')) {
      terminology.set('exercise_term', 'exercise');
    }

    return terminology;
  }

  /**
   * Check consistency of progress analysis
   */
  checkProgressConsistency(
    response: ProgressAnalysis,
    userId: string
  ): ConsistencyCheckResult {
    const contradictions: Contradiction[] = [];
    const terminologyIssues: string[] = [];
    const recommendations: string[] = [];
    let score = 100;

    // Get previous records for this user
    const previousRecords = this.history
      .filter(r => r.userId === userId)
      .sort((a, b) => b.timestamp - a.timestamp);

    if (previousRecords.length === 0) {
      // No history yet, just record this response
      this.recordResponse(userId, 'progress', response);
      return {
        consistent: true,
        score: 100,
        contradictions: [],
        terminologyIssues: [],
        recommendations: ['First progress analysis - no consistency checks performed'],
      };
    }

    const currentKeyPoints = this.extractProgressKeyPoints(response);
    const currentTerminology = this.extractTerminology(response);

    // Check for contradictions with recent records
    const recentProgress = previousRecords.filter(r => r.type === 'progress')[0];
    if (recentProgress) {
      // Check consistency trend flip
      const prevConsistencyImproving = recentProgress.keyPoints.some(kp =>
        kp.includes('consistency_trend: improving')
      );
      const prevConsistencyDeclining = recentProgress.keyPoints.some(kp =>
        kp.includes('consistency_trend: declining')
      );
      const currConsistencyImproving = currentKeyPoints.some(kp =>
        kp.includes('consistency_trend: improving')
      );
      const currConsistencyDeclining = currentKeyPoints.some(kp =>
        kp.includes('consistency_trend: declining')
      );

      const daysSince = (Date.now() - recentProgress.timestamp) / (1000 * 60 * 60 * 24);

      // Only flag if trend flipped within a short time
      if (daysSince < 7) {
        if (prevConsistencyImproving && currConsistencyDeclining) {
          contradictions.push({
            severity: 'medium',
            previousStatement: 'Consistency was improving',
            currentStatement: 'Consistency is now declining',
            explanation: `Consistency trend reversed within ${Math.round(daysSince)} days`,
          });
          score -= 10;
        } else if (prevConsistencyDeclining && currConsistencyImproving) {
          // This is actually good! Not a contradiction
          recommendations.push('Consistency has improved since last check - great progress!');
        }
      }

      // Check if plateau was mentioned before and is resolved
      const prevPlateaus = recentProgress.keyPoints.filter(kp => kp.startsWith('plateau:'));
      const currPlateaus = currentKeyPoints.filter(kp => kp.startsWith('plateau:'));

      prevPlateaus.forEach(prevPlateau => {
        if (!currPlateaus.includes(prevPlateau) && daysSince < 14) {
          recommendations.push(`Plateau in ${prevPlateau.split(':')[1]} appears to be resolved`);
        }
      });
    }

    // Check terminology consistency
    previousRecords.slice(0, 3).forEach(record => {
      record.terminology.forEach((value, key) => {
        const currentValue = currentTerminology.get(key);
        if (currentValue && currentValue !== value && value !== 'mixed' && currentValue !== 'mixed') {
          terminologyIssues.push(
            `Inconsistent ${key}: previously used "${value}", now using "${currentValue}"`
          );
          score -= 5;
        }
      });
    });

    // Record this response
    this.recordResponse(userId, 'progress', response);

    return {
      consistent: contradictions.filter(c => c.severity === 'high').length === 0,
      score: Math.max(0, Math.min(100, score)),
      contradictions,
      terminologyIssues,
      recommendations,
    };
  }

  /**
   * Check consistency of smart alerts
   */
  checkAlertsConsistency(
    response: SmartAlerts,
    userId: string
  ): ConsistencyCheckResult {
    const contradictions: Contradiction[] = [];
    const terminologyIssues: string[] = [];
    const recommendations: string[] = [];
    let score = 100;

    const previousRecords = this.history
      .filter(r => r.userId === userId)
      .sort((a, b) => b.timestamp - a.timestamp);

    if (previousRecords.length === 0) {
      this.recordResponse(userId, 'alerts', response);
      return {
        consistent: true,
        score: 100,
        contradictions: [],
        terminologyIssues: [],
        recommendations: [],
      };
    }

    const currentKeyPoints = this.extractAlertsKeyPoints(response);
    const currentTerminology = this.extractTerminology(response);

    // Check for alert escalation or de-escalation
    const recentAlerts = previousRecords.filter(r => r.type === 'alerts')[0];
    if (recentAlerts) {
      const daysSince = (Date.now() - recentAlerts.timestamp) / (1000 * 60 * 60 * 24);

      // Check if critical alert disappeared too quickly
      const prevHighAlerts = recentAlerts.keyPoints.filter(kp => kp.startsWith('alert_critical:'));
      const currHighAlerts = currentKeyPoints.filter(kp => kp.startsWith('alert_critical:'));

      prevHighAlerts.forEach(prevAlert => {
        if (!currHighAlerts.some(ca => ca.includes(prevAlert.split(':')[1])) && daysSince < 2) {
          contradictions.push({
            severity: 'medium',
            previousStatement: prevAlert,
            currentStatement: 'Alert resolved',
            explanation: `Critical alert resolved in less than ${Math.round(daysSince)} days - verify this is accurate`,
          });
          score -= 8;
        }
      });
    }

    // Check terminology
    previousRecords.slice(0, 3).forEach(record => {
      record.terminology.forEach((value, key) => {
        const currentValue = currentTerminology.get(key);
        if (currentValue && currentValue !== value && value !== 'mixed') {
          terminologyIssues.push(
            `Inconsistent ${key}: previously "${value}", now "${currentValue}"`
          );
          score -= 5;
        }
      });
    });

    this.recordResponse(userId, 'alerts', response);

    return {
      consistent: contradictions.filter(c => c.severity === 'high').length === 0,
      score: Math.max(0, Math.min(100, score)),
      contradictions,
      terminologyIssues,
      recommendations,
    };
  }

  /**
   * Check consistency of workout recommendations
   */
  checkRecommendationsConsistency(
    response: WorkoutRecommendations,
    userId: string
  ): ConsistencyCheckResult {
    const contradictions: Contradiction[] = [];
    const terminologyIssues: string[] = [];
    const recommendations: string[] = [];
    let score = 100;

    const previousRecords = this.history
      .filter(r => r.userId === userId)
      .sort((a, b) => b.timestamp - a.timestamp);

    if (previousRecords.length === 0) {
      this.recordResponse(userId, 'recommendations', response);
      return {
        consistent: true,
        score: 100,
        contradictions: [],
        terminologyIssues: [],
        recommendations: [],
      };
    }

    const currentKeyPoints = this.extractRecommendationsKeyPoints(response);
    const currentTerminology = this.extractTerminology(response);

    // Check for readiness interpretation consistency
    const recentRecs = previousRecords.filter(r => r.type === 'recommendations')[0];
    if (recentRecs) {
      const daysSince = (Date.now() - recentRecs.timestamp) / (1000 * 60 * 60 * 24);

      const prevReadiness = recentRecs.keyPoints.find(kp => kp.startsWith('readiness:'));
      const currReadiness = currentKeyPoints.find(kp => kp.startsWith('readiness:'));

      if (prevReadiness && currReadiness && daysSince < 7) {
        const prevLevel = prevReadiness.split(':')[1].trim();
        const currLevel = currReadiness.split(':')[1].trim();

        // Check for major readiness drops
        if (prevLevel === 'excellent' && currLevel === 'low') {
          contradictions.push({
            severity: 'high',
            previousStatement: 'Readiness was excellent',
            currentStatement: 'Readiness is now low',
            explanation: `Major readiness drop within ${Math.round(daysSince)} days - verify data accuracy`,
          });
          score -= 15;
        }

        // Check for unrealistic improvements
        if (prevLevel === 'low' && currLevel === 'excellent' && daysSince < 3) {
          contradictions.push({
            severity: 'medium',
            previousStatement: 'Readiness was low',
            currentStatement: 'Readiness is now excellent',
            explanation: `Very rapid improvement in ${Math.round(daysSince)} days - ensure sufficient recovery occurred`,
          });
          score -= 10;
        }
      }

      // Check for workout intensity recommendations
      const prevIntensity = recentRecs.keyPoints.find(kp => kp.startsWith('workout_intensity:'));
      const currIntensity = currentKeyPoints.find(kp => kp.startsWith('workout_intensity:'));

      if (prevIntensity && currIntensity && daysSince < 3) {
        if (prevIntensity.includes('low') && currIntensity.includes('high')) {
          contradictions.push({
            severity: 'medium',
            previousStatement: 'Recommended low intensity',
            currentStatement: 'Now recommending high intensity',
            explanation: `Intensity recommendation changed significantly within ${Math.round(daysSince)} days`,
          });
          score -= 8;
        }
      }
    }

    // Check terminology
    previousRecords.slice(0, 3).forEach(record => {
      record.terminology.forEach((value, key) => {
        const currentValue = currentTerminology.get(key);
        if (currentValue && currentValue !== value && value !== 'mixed') {
          terminologyIssues.push(
            `Inconsistent ${key}: previously "${value}", now "${currentValue}"`
          );
          score -= 5;
        }
      });
    });

    this.recordResponse(userId, 'recommendations', response);

    return {
      consistent: contradictions.filter(c => c.severity === 'high').length === 0,
      score: Math.max(0, Math.min(100, score)),
      contradictions,
      terminologyIssues,
      recommendations,
    };
  }

  /**
   * Record a response in history
   */
  private recordResponse(
    userId: string,
    type: 'progress' | 'alerts' | 'recommendations',
    response: ProgressAnalysis | SmartAlerts | WorkoutRecommendations
  ): void {
    let keyPoints: string[] = [];

    switch (type) {
      case 'progress':
        keyPoints = this.extractProgressKeyPoints(response);
        break;
      case 'alerts':
        keyPoints = this.extractAlertsKeyPoints(response);
        break;
      case 'recommendations':
        keyPoints = this.extractRecommendationsKeyPoints(response);
        break;
    }

    const record: ConsistencyRecord = {
      userId,
      timestamp: Date.now(),
      type,
      keyPoints,
      terminology: this.extractTerminology(response),
      recommendations: [], // Could extract specific recommendations if needed
    };

    this.history.unshift(record);

    // Keep only recent history
    this.history = this.history.slice(0, MAX_HISTORY_ITEMS);

    this.saveHistory();
  }

  /**
   * Clear history for a user
   */
  clearUserHistory(userId: string): void {
    this.history = this.history.filter(r => r.userId !== userId);
    this.saveHistory();
  }

  /**
   * Get consistency statistics for a user
   */
  getUserConsistencyStats(userId: string): {
    totalChecks: number;
    averageScore: number;
    recentContradictions: number;
    terminologyIssues: number;
  } {
    const userRecords = this.history.filter(r => r.userId === userId);

    return {
      totalChecks: userRecords.length,
      averageScore: 100, // Would need to track scores to calculate
      recentContradictions: 0, // Would need to track contradictions
      terminologyIssues: 0, // Would need to track issues
    };
  }
}

export const aiConsistencyChecker = new AIConsistencyChecker();
