/**
 * Enhanced AI Service - Integrates all AI enhancement components
 *
 * Provides a complete pipeline for AI interactions:
 * 1. Master Prompt Governance
 * 2. User Context Enrichment
 * 3. Prompt Enhancement
 * 4. Automatic Model Selection
 * 5. Response Validation
 * 6. Consistency Checking
 */

import { GoogleGenerativeAI } from '@google/generative-ai';
import { masterPromptGovernor } from './masterPromptGovernor';
import { aiPromptEnhancer } from './aiPromptEnhancer';
import { aiResponseValidator } from './aiResponseValidator';
import { aiConsistencyChecker } from './aiConsistencyChecker';
import { UserProfile } from '@/types/user';
import { Workout } from '@/types/workout';
import { MuscleStatus } from '@/types/muscle';
import { PersonalRecord } from '@/types/analytics';
import { ProgressAnalysis, SmartAlerts, WorkoutRecommendations } from '@/types/insights';

interface EnhancedGenerationOptions {
  validateResponse?: boolean;
  checkConsistency?: boolean;
  autoRetryOnFailure?: boolean;
  maxRetries?: number;
  logMetrics?: boolean;
}

interface GenerationMetrics {
  modelUsed: string;
  modelSelectionReasoning: string;
  estimatedCost: number;
  promptEnhancementApplied: boolean;
  validationScore: number;
  consistencyScore: number;
  retries: number;
  totalTimeMs: number;
}

class AIServiceEnhanced {
  private genAI: GoogleGenerativeAI | null = null;

  constructor() {
    const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
    if (apiKey) {
      this.genAI = new GoogleGenerativeAI(apiKey);
    }
  }

  /**
   * Generate enhanced progress analysis
   */
  async generateProgressAnalysisEnhanced(
    profile: UserProfile,
    workouts: Workout[],
    muscleStatuses: MuscleStatus[],
    personalRecords: PersonalRecord[],
    basePrompt: string,
    options: EnhancedGenerationOptions = {}
  ): Promise<{
    result: ProgressAnalysis | null;
    metrics: GenerationMetrics;
  }> {
    const startTime = Date.now();
    const {
      validateResponse = true,
      checkConsistency = true,
      autoRetryOnFailure = true,
      maxRetries = 2,
      logMetrics = false,
    } = options;

    let retries = 0;
    let result: ProgressAnalysis | null = null;
    let validationScore = 0;
    let consistencyScore = 100;

    // Build user context
    const userContext = aiPromptEnhancer.buildUserContext(
      profile,
      workouts,
      muscleStatuses,
      personalRecords
    );

    // Select optimal model
    const modelSelection = masterPromptGovernor.selectOptimalModel('progress', {
      workoutCount: workouts.length,
      muscleStatusCount: muscleStatuses.length,
      hasPersonalRecords: personalRecords.length > 0,
      userExperienceLevel: userContext.experienceLevel.level,
    });

    // Enhance prompt with user context
    const enhancedPrompt = aiPromptEnhancer.enhanceProgressPrompt(basePrompt, userContext);

    // Apply master governance
    const governanceOptions = masterPromptGovernor.getGovernanceEmphasis('progress');
    const governedPrompt = masterPromptGovernor.governPrompt(enhancedPrompt, governanceOptions);

    if (!this.genAI) {
      console.warn('[AIServiceEnhanced] Gemini API key not configured');
      return {
        result: null,
        metrics: {
          modelUsed: 'none',
          modelSelectionReasoning: 'API key not configured',
          estimatedCost: 0,
          promptEnhancementApplied: true,
          validationScore: 0,
          consistencyScore: 0,
          retries: 0,
          totalTimeMs: Date.now() - startTime,
        },
      };
    }

    // Get model configuration
    const modelConfig = masterPromptGovernor.getModelConfig(modelSelection.model);
    const model = this.genAI.getGenerativeModel({
      model: modelSelection.model,
      generationConfig: {
        temperature: modelConfig.temperature,
        topP: modelConfig.topP,
        topK: modelConfig.topK,
        maxOutputTokens: modelConfig.maxOutputTokens,
      },
    });

    // Generation loop with retry
    while (retries <= maxRetries) {
      try {
        const aiResult = await model.generateContent(governedPrompt);
        const responseText = aiResult.response.text();

        // Parse JSON response
        const jsonMatch = responseText.match(/\{[\s\S]*\}/);
        if (!jsonMatch) {
          throw new Error('No JSON found in response');
        }

        result = JSON.parse(jsonMatch[0]) as ProgressAnalysis;

        // Validate response
        if (validateResponse) {
          const validation = aiResponseValidator.validateProgressAnalysis(
            result,
            userContext.profile.name,
            userContext.goals.primary
          );

          validationScore = validation.score;

          if (!validation.valid && autoRetryOnFailure && retries < maxRetries) {
            if (logMetrics) {
              // eslint-disable-next-line no-console
              console.warn(
                `[AIServiceEnhanced] Validation failed (score: ${validation.score}/100), retrying... (${retries + 1}/${maxRetries})`
              );
              // eslint-disable-next-line no-console
              console.warn('Validation issues:', validation.issues);
            }
            retries++;
            continue;
          }

          if (logMetrics && validation.warnings.length > 0) {
            // eslint-disable-next-line no-console
            console.warn('[AIServiceEnhanced] Validation warnings:', validation.warnings);
          }
        }

        // Check consistency
        if (checkConsistency && result) {
          const consistency = aiConsistencyChecker.checkProgressConsistency(result, profile.id);
          consistencyScore = consistency.score;

          if (logMetrics && consistency.contradictions.length > 0) {
            // eslint-disable-next-line no-console
            console.warn('[AIServiceEnhanced] Consistency issues:', consistency.contradictions);
          }
        }

        // Success - break retry loop
        break;
      } catch (error) {
        console.error('[AIServiceEnhanced] Generation error:', error);
        retries++;

        if (retries > maxRetries || !autoRetryOnFailure) {
          result = null;
          break;
        }

        // Wait before retry (exponential backoff)
        await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, retries)));
      }
    }

    const totalTimeMs = Date.now() - startTime;

    const metrics: GenerationMetrics = {
      modelUsed: modelSelection.model,
      modelSelectionReasoning: modelSelection.reasoning,
      estimatedCost: modelSelection.estimatedCost,
      promptEnhancementApplied: true,
      validationScore,
      consistencyScore,
      retries,
      totalTimeMs,
    };

    if (logMetrics) {
      // eslint-disable-next-line no-console
      console.log('[AIServiceEnhanced] Progress Analysis Metrics:', metrics);
    }

    return { result, metrics };
  }

  /**
   * Generate enhanced smart alerts
   */
  async generateSmartAlertsEnhanced(
    profile: UserProfile,
    workouts: Workout[],
    muscleStatuses: MuscleStatus[],
    basePrompt: string,
    options: EnhancedGenerationOptions = {}
  ): Promise<{
    result: SmartAlerts | null;
    metrics: GenerationMetrics;
  }> {
    const startTime = Date.now();
    const {
      validateResponse = true,
      checkConsistency = true,
      autoRetryOnFailure = true,
      maxRetries = 2,
      logMetrics = false,
    } = options;

    let retries = 0;
    let result: SmartAlerts | null = null;
    let validationScore = 0;
    let consistencyScore = 100;

    // Build user context
    const userContext = aiPromptEnhancer.buildUserContext(
      profile,
      workouts,
      muscleStatuses,
      []
    );

    // Select optimal model
    const modelSelection = masterPromptGovernor.selectOptimalModel('alerts', {
      workoutCount: workouts.length,
      muscleStatusCount: muscleStatuses.length,
      hasPersonalRecords: false,
      userExperienceLevel: userContext.experienceLevel.level,
    });

    // Enhance prompt
    const enhancedPrompt = aiPromptEnhancer.enhanceAlertsPrompt(basePrompt, userContext);

    // Apply governance
    const governanceOptions = masterPromptGovernor.getGovernanceEmphasis('alerts');
    const governedPrompt = masterPromptGovernor.governPrompt(enhancedPrompt, governanceOptions);

    if (!this.genAI) {
      return {
        result: null,
        metrics: {
          modelUsed: 'none',
          modelSelectionReasoning: 'API key not configured',
          estimatedCost: 0,
          promptEnhancementApplied: true,
          validationScore: 0,
          consistencyScore: 0,
          retries: 0,
          totalTimeMs: Date.now() - startTime,
        },
      };
    }

    const modelConfig = masterPromptGovernor.getModelConfig(modelSelection.model);
    const model = this.genAI.getGenerativeModel({
      model: modelSelection.model,
      generationConfig: {
        temperature: modelConfig.temperature,
        topP: modelConfig.topP,
        topK: modelConfig.topK,
        maxOutputTokens: modelConfig.maxOutputTokens,
      },
    });

    // Generation loop
    while (retries <= maxRetries) {
      try {
        const aiResult = await model.generateContent(governedPrompt);
        const responseText = aiResult.response.text();

        const jsonMatch = responseText.match(/\{[\s\S]*\}/);
        if (!jsonMatch) {
          throw new Error('No JSON found in response');
        }

        result = JSON.parse(jsonMatch[0]) as SmartAlerts;

        if (validateResponse) {
          const validation = aiResponseValidator.validateSmartAlerts(
            result,
            userContext.profile.name
          );
          validationScore = validation.score;

          if (!validation.valid && autoRetryOnFailure && retries < maxRetries) {
            if (logMetrics) {
              // eslint-disable-next-line no-console
              console.warn(`[AIServiceEnhanced] Alerts validation failed, retrying...`);
            }
            retries++;
            continue;
          }
        }

        if (checkConsistency && result) {
          const consistency = aiConsistencyChecker.checkAlertsConsistency(result, profile.id);
          consistencyScore = consistency.score;
        }

        break;
      } catch (error) {
        console.error('[AIServiceEnhanced] Alerts generation error:', error);
        retries++;

        if (retries > maxRetries || !autoRetryOnFailure) {
          result = null;
          break;
        }

        await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, retries)));
      }
    }

    const metrics: GenerationMetrics = {
      modelUsed: modelSelection.model,
      modelSelectionReasoning: modelSelection.reasoning,
      estimatedCost: modelSelection.estimatedCost,
      promptEnhancementApplied: true,
      validationScore,
      consistencyScore,
      retries,
      totalTimeMs: Date.now() - startTime,
    };

    if (logMetrics) {
      // eslint-disable-next-line no-console
      console.log('[AIServiceEnhanced] Smart Alerts Metrics:', metrics);
    }

    return { result, metrics };
  }

  /**
   * Generate enhanced workout recommendations
   */
  async generateWorkoutRecommendationsEnhanced(
    profile: UserProfile,
    workouts: Workout[],
    muscleStatuses: MuscleStatus[],
    basePrompt: string,
    options: EnhancedGenerationOptions = {}
  ): Promise<{
    result: WorkoutRecommendations | null;
    metrics: GenerationMetrics;
  }> {
    const startTime = Date.now();
    const {
      validateResponse = true,
      checkConsistency = true,
      autoRetryOnFailure = true,
      maxRetries = 2,
      logMetrics = false,
    } = options;

    let retries = 0;
    let result: WorkoutRecommendations | null = null;
    let validationScore = 0;
    let consistencyScore = 100;

    const userContext = aiPromptEnhancer.buildUserContext(
      profile,
      workouts,
      muscleStatuses,
      []
    );

    const modelSelection = masterPromptGovernor.selectOptimalModel('recommendations', {
      workoutCount: workouts.length,
      muscleStatusCount: muscleStatuses.length,
      hasPersonalRecords: false,
      userExperienceLevel: userContext.experienceLevel.level,
    });

    const enhancedPrompt = aiPromptEnhancer.enhanceRecommendationsPrompt(basePrompt, userContext);
    const governanceOptions = masterPromptGovernor.getGovernanceEmphasis('recommendations');
    const governedPrompt = masterPromptGovernor.governPrompt(enhancedPrompt, governanceOptions);

    if (!this.genAI) {
      return {
        result: null,
        metrics: {
          modelUsed: 'none',
          modelSelectionReasoning: 'API key not configured',
          estimatedCost: 0,
          promptEnhancementApplied: true,
          validationScore: 0,
          consistencyScore: 0,
          retries: 0,
          totalTimeMs: Date.now() - startTime,
        },
      };
    }

    const modelConfig = masterPromptGovernor.getModelConfig(modelSelection.model);
    const model = this.genAI.getGenerativeModel({
      model: modelSelection.model,
      generationConfig: {
        temperature: modelConfig.temperature,
        topP: modelConfig.topP,
        topK: modelConfig.topK,
        maxOutputTokens: modelConfig.maxOutputTokens,
      },
    });

    while (retries <= maxRetries) {
      try {
        const aiResult = await model.generateContent(governedPrompt);
        const responseText = aiResult.response.text();

        const jsonMatch = responseText.match(/\{[\s\S]*\}/);
        if (!jsonMatch) {
          throw new Error('No JSON found in response');
        }

        result = JSON.parse(jsonMatch[0]) as WorkoutRecommendations;

        if (validateResponse) {
          const validation = aiResponseValidator.validateWorkoutRecommendations(
            result,
            userContext.profile.name,
            userContext.preferences.equipment
          );
          validationScore = validation.score;

          if (!validation.valid && autoRetryOnFailure && retries < maxRetries) {
            if (logMetrics) {
              // eslint-disable-next-line no-console
              console.warn(`[AIServiceEnhanced] Recommendations validation failed, retrying...`);
            }
            retries++;
            continue;
          }
        }

        if (checkConsistency && result) {
          const consistency = aiConsistencyChecker.checkRecommendationsConsistency(result, profile.id);
          consistencyScore = consistency.score;
        }

        break;
      } catch (error) {
        console.error('[AIServiceEnhanced] Recommendations generation error:', error);
        retries++;

        if (retries > maxRetries || !autoRetryOnFailure) {
          result = null;
          break;
        }

        await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, retries)));
      }
    }

    const metrics: GenerationMetrics = {
      modelUsed: modelSelection.model,
      modelSelectionReasoning: modelSelection.reasoning,
      estimatedCost: modelSelection.estimatedCost,
      promptEnhancementApplied: true,
      validationScore,
      consistencyScore,
      retries,
      totalTimeMs: Date.now() - startTime,
    };

    if (logMetrics) {
      // eslint-disable-next-line no-console
      console.log('[AIServiceEnhanced] Workout Recommendations Metrics:', metrics);
    }

    return { result, metrics };
  }
}

export const aiServiceEnhanced = new AIServiceEnhanced();
