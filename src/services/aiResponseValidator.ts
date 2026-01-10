/**
 * AI Response Validator - Validates AI responses for quality, consistency, and personalization
 *
 * Ensures that AI-generated insights meet quality standards before being shown to users
 */

import { ProgressAnalysis, SmartAlerts, WorkoutRecommendations } from '@/types/insights';

interface ValidationResult {
  valid: boolean;
  score: number; // 0-100
  issues: ValidationIssue[];
  warnings: string[];
  suggestions: string[];
}

interface ValidationIssue {
  severity: 'critical' | 'major' | 'minor';
  category: 'personalization' | 'specificity' | 'actionability' | 'structure' | 'safety';
  message: string;
  field?: string;
}

class AIResponseValidator {
  /**
   * Validate progress analysis response
   */
  validateProgressAnalysis(
    response: ProgressAnalysis,
    _userName?: string,
    userGoals?: string[]
  ): ValidationResult {
    const issues: ValidationIssue[] = [];
    const warnings: string[] = [];
    const suggestions: string[] = [];
    let score = 100;

    // Validate breakthrough field
    if (!response.breakthrough || response.breakthrough.trim().length === 0) {
      issues.push({
        severity: 'critical',
        category: 'structure',
        message: 'Breakthrough message is empty',
        field: 'breakthrough',
      });
      score -= 20;
    } else if (response.breakthrough.length > 100) {
      issues.push({
        severity: 'minor',
        category: 'structure',
        message: 'Breakthrough message exceeds recommended 80 characters',
        field: 'breakthrough',
      });
      score -= 5;
    }

    // Check for personalization
    if (_userName && !response.breakthrough.toLowerCase().includes(_userName.toLowerCase())) {
      warnings.push('Breakthrough message does not use user name');
      score -= 10;
    }

    // Validate metrics are specific numbers
    if (response.consistencyScore === undefined || response.consistencyScore === null) {
      issues.push({
        severity: 'critical',
        category: 'specificity',
        message: 'Consistency score is missing',
        field: 'consistencyScore',
      });
      score -= 15;
    }

    if (response.workoutCount === undefined || response.workoutCount === null) {
      issues.push({
        severity: 'critical',
        category: 'specificity',
        message: 'Workout count is missing',
        field: 'workoutCount',
      });
      score -= 15;
    }

    // Validate volume trend has specific numbers
    if (!response.volumeTrend || !response.volumeTrend.current || !response.volumeTrend.previous) {
      issues.push({
        severity: 'major',
        category: 'specificity',
        message: 'Volume trend missing current or previous values',
        field: 'volumeTrend',
      });
      score -= 10;
    } else if (response.volumeTrend.changePercent === undefined) {
      issues.push({
        severity: 'minor',
        category: 'specificity',
        message: 'Volume trend change percentage missing',
        field: 'volumeTrend.changePercent',
      });
      score -= 5;
    }

    // Validate training patterns
    if (!response.trainingPatterns || response.trainingPatterns.length === 0) {
      warnings.push('No training patterns identified');
      score -= 5;
    } else {
      response.trainingPatterns.forEach((pattern, index) => {
        if (!pattern.title || pattern.title.trim().length === 0) {
          issues.push({
            severity: 'minor',
            category: 'structure',
            message: `Training pattern ${index} has empty title`,
            field: `trainingPatterns[${index}].title`,
          });
          score -= 3;
        }
        if (!pattern.description || pattern.description.trim().length === 0) {
          issues.push({
            severity: 'minor',
            category: 'structure',
            message: `Training pattern ${index} has empty description`,
            field: `trainingPatterns[${index}].description`,
          });
          score -= 3;
        }
        // Check for vague language
        if (pattern.description && this.containsVagueLanguage(pattern.description)) {
          warnings.push(`Training pattern "${pattern.title}" contains vague language`);
          score -= 2;
        }
      });
    }

    // Validate plateaus are actionable
    if (response.plateaus && response.plateaus.length > 0) {
      response.plateaus.forEach((plateau, index) => {
        if (!plateau.suggestion || plateau.suggestion.trim().length === 0) {
          issues.push({
            severity: 'major',
            category: 'actionability',
            message: `Plateau ${index} missing suggestion`,
            field: `plateaus[${index}].suggestion`,
          });
          score -= 8;
        } else if (this.containsVagueLanguage(plateau.suggestion)) {
          warnings.push(`Plateau suggestion "${plateau.exercise}" contains vague recommendations`);
          score -= 3;
        }
      });
    }

    // Check goal alignment
    if (userGoals && userGoals.length > 0) {
      const responseText = JSON.stringify(response).toLowerCase();
      const goalsReferenced = userGoals.filter(goal => responseText.includes(goal.toLowerCase()));
      if (goalsReferenced.length === 0) {
        warnings.push('Response does not reference any user goals');
        suggestions.push('Connect insights to user\'s stated goals for better personalization');
        score -= 10;
      }
    }

    return {
      valid: issues.filter(i => i.severity === 'critical').length === 0,
      score: Math.max(0, Math.min(100, score)),
      issues,
      warnings,
      suggestions,
    };
  }

  /**
   * Validate smart alerts response
   */
  validateSmartAlerts(
    response: SmartAlerts,
    userName?: string
  ): ValidationResult {
    const issues: ValidationIssue[] = [];
    const warnings: string[] = [];
    const suggestions: string[] = [];
    let score = 100;

    // Validate critical alerts
    if (!response.criticalAlerts || !Array.isArray(response.criticalAlerts)) {
      issues.push({
        severity: 'critical',
        category: 'structure',
        message: 'Critical alerts array is missing or invalid',
        field: 'criticalAlerts',
      });
      score -= 20;
    } else {
      response.criticalAlerts.forEach((alert, index) => {
        if (!alert.title || alert.title.trim().length === 0) {
          issues.push({
            severity: 'major',
            category: 'structure',
            message: `Critical alert ${index} has empty title`,
            field: `criticalAlerts[${index}].title`,
          });
          score -= 10;
        }
        if (!alert.message || alert.message.trim().length === 0) {
          issues.push({
            severity: 'major',
            category: 'structure',
            message: `Critical alert ${index} has empty message`,
            field: `criticalAlerts[${index}].message`,
          });
          score -= 10;
        }
        if (!alert.actionLabel || alert.actionLabel.trim().length === 0) {
          issues.push({
            severity: 'critical',
            category: 'actionability',
            message: `Critical alert ${index} missing actionLabel`,
            field: `criticalAlerts[${index}].actionLabel`,
          });
          score -= 15;
        } else if (this.containsVagueLanguage(alert.actionLabel)) {
          warnings.push(`Critical alert "${alert.title}" has vague actionLabel`);
          score -= 5;
        }
        if (!['critical', 'warning', 'info'].includes(alert.type)) {
          issues.push({
            severity: 'minor',
            category: 'structure',
            message: `Critical alert ${index} has invalid type: ${alert.type}`,
            field: `criticalAlerts[${index}].type`,
          });
          score -= 5;
        }
      });
    }

    // Validate suggestions are actionable
    if (!response.suggestions || response.suggestions.length === 0) {
      warnings.push('No suggestions provided');
      score -= 10;
    } else {
      response.suggestions.forEach((suggestion, index) => {
        if (!suggestion.title || suggestion.title.trim().length === 0) {
          issues.push({
            severity: 'minor',
            category: 'structure',
            message: `Suggestion ${index + 1} has empty title`,
            field: `suggestions[${index}].title`,
          });
          score -= 3;
        }
        if (!suggestion.description || suggestion.description.trim().length === 0) {
          issues.push({
            severity: 'minor',
            category: 'structure',
            message: `Suggestion ${index + 1} has empty description`,
            field: `suggestions[${index}].description`,
          });
          score -= 3;
        }
        if (suggestion.description && this.containsVagueLanguage(suggestion.description)) {
          warnings.push(`Suggestion "${suggestion.title}" contains vague language`);
          score -= 3;
        }
        // Check for specificity indicators in description
        if (suggestion.description && !this.hasSpecificMetrics(suggestion.description)) {
          warnings.push(`Suggestion "${suggestion.title}" lacks specific metrics or targets`);
          score -= 3;
        }
      });
    }

    // Validate nutrition events are specific
    if (response.nutritionEvents && response.nutritionEvents.length > 0) {
      response.nutritionEvents.forEach((event, index) => {
        if (!event.time || event.time.trim().length === 0) {
          issues.push({
            severity: 'minor',
            category: 'specificity',
            message: `Nutrition event ${index} missing time`,
            field: `nutritionEvents[${index}].time`,
          });
          score -= 3;
        }
        if (event.description && this.containsVagueLanguage(event.description)) {
          warnings.push(`Nutrition event "${event.title}" has vague description`);
          score -= 2;
        }
      });
    }

    // Check for safety considerations
    if (response.criticalAlerts.some(alert => alert.type === 'critical')) {
      const hasRecoveryAction = response.criticalAlerts.some(alert =>
        (alert.actionLabel && (
          alert.actionLabel.toLowerCase().includes('rest') ||
          alert.actionLabel.toLowerCase().includes('recovery') ||
          alert.actionLabel.toLowerCase().includes('deload')
        )) ||
        (alert.message && (
          alert.message.toLowerCase().includes('rest') ||
          alert.message.toLowerCase().includes('recovery') ||
          alert.message.toLowerCase().includes('deload')
        ))
      );
      if (!hasRecoveryAction) {
        warnings.push('Critical alert exists but no recovery action specified');
        suggestions.push('Include specific recovery recommendations for critical alerts');
        score -= 5;
      }
    }

    return {
      valid: issues.filter(i => i.severity === 'critical').length === 0,
      score: Math.max(0, Math.min(100, score)),
      issues,
      warnings,
      suggestions,
    };
  }

  /**
   * Validate workout recommendations response
   */
  validateWorkoutRecommendations(
    response: WorkoutRecommendations,
    userName?: string,
    availableEquipment?: string[]
  ): ValidationResult {
    const issues: ValidationIssue[] = [];
    const warnings: string[] = [];
    const suggestions: string[] = [];
    let score = 100;

    // Validate readiness score
    if (response.readinessScore === undefined || response.readinessScore === null) {
      issues.push({
        severity: 'critical',
        category: 'specificity',
        message: 'Readiness score is missing',
        field: 'readinessScore',
      });
      score -= 15;
    } else if (response.readinessScore < 0 || response.readinessScore > 100) {
      issues.push({
        severity: 'major',
        category: 'specificity',
        message: `Readiness score ${response.readinessScore} is out of range (0-100)`,
        field: 'readinessScore',
      });
      score -= 10;
    }

    // Validate recommended workout
    if (!response.recommendedWorkout) {
      issues.push({
        severity: 'critical',
        category: 'structure',
        message: 'Recommended workout is missing',
        field: 'recommendedWorkout',
      });
      score -= 20;
    } else {
      const workout = response.recommendedWorkout;
      if (!workout.name || workout.name.trim().length === 0) {
        issues.push({
          severity: 'major',
          category: 'structure',
          message: 'Recommended workout name is missing',
          field: 'recommendedWorkout.name',
        });
        score -= 10;
      }
      if (!workout.description || workout.description.trim().length === 0) {
        issues.push({
          severity: 'major',
          category: 'structure',
          message: 'Recommended workout description is missing',
          field: 'recommendedWorkout.description',
        });
        score -= 10;
      }
      if (!workout.muscleGroups || workout.muscleGroups.length === 0) {
        issues.push({
          severity: 'major',
          category: 'structure',
          message: 'Recommended workout has no muscle groups specified',
          field: 'recommendedWorkout.muscleGroups',
        });
        score -= 10;
      }
      if (workout.intensity && !['low', 'medium', 'high'].includes(workout.intensity)) {
        issues.push({
          severity: 'minor',
          category: 'structure',
          message: `Recommended workout has invalid intensity: ${workout.intensity}`,
          field: 'recommendedWorkout.intensity',
        });
        score -= 5;
      }
      if (workout.duration !== undefined && workout.duration <= 0) {
        issues.push({
          severity: 'minor',
          category: 'specificity',
          message: 'Recommended workout has invalid duration',
          field: 'recommendedWorkout.duration',
        });
        score -= 5;
      }
    }

    // Validate corrective exercises
    if (!response.correctiveExercises || response.correctiveExercises.length === 0) {
      warnings.push('No corrective exercises provided');
      score -= 5;
    } else {
      response.correctiveExercises.forEach((exercise, index) => {
        if (!exercise.name || exercise.name.trim().length === 0) {
          issues.push({
            severity: 'minor',
            category: 'structure',
            message: `Corrective exercise ${index} has no name`,
            field: `correctiveExercises[${index}].name`,
          });
          score -= 3;
        }
        if (!exercise.description || exercise.description.trim().length === 0) {
          issues.push({
            severity: 'minor',
            category: 'structure',
            message: `Corrective exercise "${exercise.name}" missing description`,
            field: `correctiveExercises[${index}].description`,
          });
          score -= 3;
        }
        if (!exercise.targetMuscle) {
          issues.push({
            severity: 'minor',
            category: 'structure',
            message: `Corrective exercise "${exercise.name}" missing target muscle`,
            field: `correctiveExercises[${index}].targetMuscle`,
          });
          score -= 3;
        }
        if (!exercise.category || !['imbalance', 'posture', 'weakness', 'mobility'].includes(exercise.category)) {
          warnings.push(`Corrective exercise "${exercise.name}" has invalid or missing category`);
          score -= 2;
        }
      });
    }

    // Validate recovery predictions
    if (!response.recoveryPredictions || response.recoveryPredictions.length === 0) {
      warnings.push('No recovery predictions provided');
      score -= 10;
    } else {
      response.recoveryPredictions.forEach((pred, index) => {
        if (!pred.dayLabel || pred.dayLabel.trim().length === 0) {
          issues.push({
            severity: 'minor',
            category: 'structure',
            message: `Recovery prediction ${index} missing day label`,
            field: `recoveryPredictions[${index}].dayLabel`,
          });
          score -= 2;
        }
        if (pred.recoveryPercentage === undefined || pred.recoveryPercentage === null) {
          issues.push({
            severity: 'minor',
            category: 'specificity',
            message: `Recovery prediction "${pred.dayLabel}" missing recovery percentage`,
            field: `recoveryPredictions[${index}].recoveryPercentage`,
          });
          score -= 2;
        }
        if (!pred.workoutType || !['push', 'pull', 'legs', 'rest'].includes(pred.workoutType)) {
          warnings.push(`Recovery prediction "${pred.dayLabel}" has invalid workout type`);
          score -= 1;
        }
      });
    }

    return {
      valid: issues.filter(i => i.severity === 'critical').length === 0,
      score: Math.max(0, Math.min(100, score)),
      issues,
      warnings,
      suggestions,
    };
  }

  /**
   * Check if text contains vague language
   */
  private containsVagueLanguage(text: string): boolean {
    const vagueTerms = [
      /\bgood\b/i,
      /\bbad\b/i,
      /\bsome\b/i,
      /\bmany\b/i,
      /\bfew\b/i,
      /\ba lot\b/i,
      /\bmaybe\b/i,
      /\bpossibly\b/i,
      /\bperhaps\b/i,
      /\bsomewhat\b/i,
      /\bfairly\b/i,
      /\bquite\b/i,
      /\bvery\b(?! specific|exact)/i, // "very" is vague unless followed by specific/exact
      /\bmore or less\b/i,
      /\baround\b(?!\d)/i, // "around" without a number
      /\babout\b(?!\d)/i, // "about" without a number
    ];

    return vagueTerms.some(term => term.test(text));
  }

  /**
   * Check if text contains specific metrics
   */
  private hasSpecificMetrics(text: string): boolean {
    const metricIndicators = [
      /\d+%/,           // Percentages
      /\d+\s*(lbs?|kg|g|oz|ml|minutes?|hours?|days?|weeks?|sets?|reps?)/i, // Numbers with units
      /\d+[-–]\d+/,     // Ranges (e.g., 8-12)
      /\d+\.\d+/,       // Decimals
      /\d{2,}/,         // Multi-digit numbers
    ];

    return metricIndicators.some(pattern => pattern.test(text));
  }

  /**
   * Generate validation report
   */
  generateValidationReport(result: ValidationResult): string {
    let report = `## Validation Report\n\n`;
    report += `**Overall Score: ${result.score}/100**\n`;
    report += `**Status: ${result.valid ? '✅ Valid' : '❌ Invalid'}**\n\n`;

    if (result.issues.length > 0) {
      report += `### Issues (${result.issues.length})\n`;
      const criticalIssues = result.issues.filter(i => i.severity === 'critical');
      const majorIssues = result.issues.filter(i => i.severity === 'major');
      const minorIssues = result.issues.filter(i => i.severity === 'minor');

      if (criticalIssues.length > 0) {
        report += `\n**Critical (${criticalIssues.length}):**\n`;
        criticalIssues.forEach(issue => {
          report += `- 🔴 [${issue.category}] ${issue.message}${issue.field ? ` (${issue.field})` : ''}\n`;
        });
      }

      if (majorIssues.length > 0) {
        report += `\n**Major (${majorIssues.length}):**\n`;
        majorIssues.forEach(issue => {
          report += `- 🟠 [${issue.category}] ${issue.message}${issue.field ? ` (${issue.field})` : ''}\n`;
        });
      }

      if (minorIssues.length > 0) {
        report += `\n**Minor (${minorIssues.length}):**\n`;
        minorIssues.forEach(issue => {
          report += `- 🟡 [${issue.category}] ${issue.message}${issue.field ? ` (${issue.field})` : ''}\n`;
        });
      }
    }

    if (result.warnings.length > 0) {
      report += `\n### Warnings (${result.warnings.length})\n`;
      result.warnings.forEach(warning => {
        report += `- ⚠️ ${warning}\n`;
      });
    }

    if (result.suggestions.length > 0) {
      report += `\n### Suggestions (${result.suggestions.length})\n`;
      result.suggestions.forEach(suggestion => {
        report += `- 💡 ${suggestion}\n`;
      });
    }

    return report;
  }
}

export const aiResponseValidator = new AIResponseValidator();
