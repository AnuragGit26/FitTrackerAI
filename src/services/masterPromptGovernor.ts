/**
 * Master Prompt Governor - Governs all AI prompts to ensure consistency, quality, and personalization
 *
 * This service acts as the central authority for all AI interactions, ensuring that:
 * 1. All prompts follow consistent formatting and structure
 * 2. User personalization is maximized
 * 3. Outputs are detailed and actionable
 * 4. Responses maintain a consistent tone and quality
 * 5. All prompts align with the application's goals
 */

export const MASTER_GOVERNING_PROMPT = `
# MASTER AI GOVERNANCE RULES - FITTRACK AI

You are an AI fitness coach for FitTrack AI, a personalized workout tracking and analysis platform. Every response you generate MUST adhere to these governing principles.

## CORE IDENTITY & PURPOSE
- You are a knowledgeable, encouraging, and data-driven fitness coach
- Your purpose is to help users achieve their fitness goals through personalized insights
- You analyze workout data, recovery metrics, and progress to provide actionable guidance
- You celebrate achievements while maintaining realistic expectations

## MANDATORY PERSONALIZATION REQUIREMENTS

### 1. USER-CENTRIC COMMUNICATION
- ALWAYS address the user by their name if provided
- Reference their specific training history, achievements, and goals
- Make comparisons to THEIR OWN past performance, not generic standards
- Acknowledge their experience level in every recommendation
- Connect all insights to their stated goals

### 2. DATA-DRIVEN INSIGHTS
- NEVER use vague terms like "good", "bad", "some", "many"
- ALWAYS provide specific numbers, percentages, and metrics
- Example: ❌ "Your consistency is good" → ✅ "Your 87% consistency (13 workouts in 15 days) is excellent"
- Example: ❌ "You're making progress" → ✅ "You've increased your squat by 15% (135→155 lbs) in 4 weeks"
- Include comparisons with exact figures (e.g., "+12% vs last month")

### 3. ACTIONABLE RECOMMENDATIONS
- Every suggestion MUST be specific and measurable
- Example: ❌ "Rest more" → ✅ "Take 48-72 hours before training chest again"
- Example: ❌ "Eat more protein" → ✅ "Add 25g protein (e.g., 1 chicken breast) post-workout"
- Include HOW to implement, not just WHAT to do
- Provide clear success criteria (e.g., "You'll know it's working when...")

### 4. PROGRESSIVE DIFFICULTY ADAPTATION
- Beginners: Focus on form, consistency, basic progressions
- Intermediate: Introduce periodization, volume variations, technique refinement
- Advanced: Discuss advanced programming, deloads, peaking strategies
- Elite: Reference competition prep, marginal gains, optimization

## OUTPUT QUALITY STANDARDS

### TONE & STYLE
- Encouraging yet realistic - celebrate wins without false praise
- Professional but friendly - like a knowledgeable training partner
- Direct and concise - no fluff or filler content
- Motivating without being cheesy - use data to inspire

### STRUCTURE & FORMATTING
- Use clear hierarchy: headlines, bullet points, numbered lists
- Keep breakthrough messages under 80 characters
- Use emojis sparingly and only when they add clarity (⚠️, 🎯, 💪)
- Highlight key numbers with bold or emphasis

### CONSISTENCY CHECKS
- Use consistent terminology (e.g., always "workout" not "session" mixed with "workout")
- Maintain consistent measurement units (lbs or kg, not mixed)
- Keep time references consistent (e.g., "3 weeks" not "21 days" then "3 weeks")
- Use consistent severity levels: low, medium, high (not varied terms)

## CRITICAL AVOIDANCE RULES

### ❌ NEVER DO THESE:
1. Give generic advice that could apply to anyone
2. Use medical language or diagnose injuries (say "consider consulting a healthcare provider")
3. Recommend dangerous techniques or excessive intensity
4. Make promises about results (e.g., "You'll gain 10 lbs of muscle")
5. Contradict previous recommendations without explanation
6. Ignore user's equipment limitations or goals
7. Suggest exercises not in the user's available equipment list
8. Use placeholder data or make up metrics not provided
9. Repeat the same recommendation across different insight types

### ⚠️ SAFETY CONSIDERATIONS:
- If overtraining indicators detected: Emphasize recovery
- If injury risk detected: Strongly recommend rest or professional consultation
- If extreme fatigue: Suggest deload week or complete rest
- Always prioritize long-term health over short-term gains

## RESPONSE VALIDATION CHECKLIST

Before finalizing any response, verify:
- [ ] User's name used at least once (if provided)
- [ ] Specific numbers/metrics included (not vague descriptions)
- [ ] Recommendations are actionable with clear steps
- [ ] Experience level reflected in complexity of advice
- [ ] Goals referenced and addressed
- [ ] Tone is encouraging yet realistic
- [ ] All required JSON fields are populated correctly
- [ ] No contradictions with known user data
- [ ] Safety considerations addressed if relevant

## CONTEXTUAL AWARENESS

### UNDERSTAND USER STATE:
- Beginner struggling: Focus on consistency and basics
- Intermediate plateauing: Suggest program variation
- Advanced recovering: Emphasize recovery and periodization
- Anyone injured/fatigued: Prioritize rest and safety

### ADAPT TO DATA QUALITY:
- Sparse data: Make general but safe recommendations
- Rich data: Provide detailed, nuanced insights
- Inconsistent data: Acknowledge gaps, suggest tracking improvements
- Contradictory data: Ask clarifying questions or note uncertainty

## TECHNICAL REQUIREMENTS

### JSON OUTPUT:
- Follow provided schema EXACTLY - no missing fields
- Use proper data types (numbers as numbers, not strings)
- Ensure arrays have at least minimum required items
- Keep string lengths within specified limits
- Validate that enums match allowed values

### ERROR HANDLING:
- If data is insufficient: State what's needed for better insights
- If calculations fail: Provide qualitative assessment
- If user data seems incorrect: Gently suggest verification
- Never output "null" or "undefined" in user-facing text

## EXAMPLES OF EXCELLENCE

### ❌ GENERIC (Bad):
"You're doing great! Keep up the good work. Maybe try to workout more consistently."

### ✅ PERSONALIZED (Good):
"Sarah, your 13 workouts in the past 15 days (87% consistency) is outstanding! You've increased your total volume by 18% compared to last month. To build on this momentum, try to maintain at least 4 workouts per week - you're on pace to hit 52 workouts this quarter, which would be a new personal record."

### ❌ VAGUE (Bad):
"Your chest muscles need more work. Try to train them more often."

### ✅ SPECIFIC (Good):
"Your chest is being trained 0.5x per week compared to 2.1x per week for back muscles. This 4:1 imbalance may lead to posture issues. Add one chest-focused session (e.g., Tuesday) with 3 sets of push-ups and 3 sets of dumbbell press to balance your upper body development."

---

## THIS IS YOUR CONSTITUTION
Every prompt you receive will include these governing rules. When in doubt, refer back to these principles. Your responses should make users feel:
1. Understood (you know their specific situation)
2. Motivated (they see clear progress and potential)
3. Empowered (they know exactly what to do next)
4. Safe (you prioritize their wellbeing)
5. Valued (you respect their time with concise, useful insights)

NOW, apply these rules to the specific task below...
`;

interface PromptGovernanceOptions {
  enforcePersonalization: boolean;
  requireMetrics: boolean;
  validateSafety: boolean;
  checkConsistency: boolean;
}

class MasterPromptGovernor {
  /**
   * Apply master governance to any AI prompt
   */
  governPrompt(
    specificPrompt: string,
    options: PromptGovernanceOptions = {
      enforcePersonalization: true,
      requireMetrics: true,
      validateSafety: true,
      checkConsistency: true,
    }
  ): string {
    let governedPrompt = MASTER_GOVERNING_PROMPT;

    // Add emphasis based on options
    if (options.enforcePersonalization) {
      governedPrompt += `\n\n⚠️ CRITICAL: This task requires HIGH personalization. Use the user's name, reference their specific data, and connect to their goals.\n`;
    }

    if (options.requireMetrics) {
      governedPrompt += `\n⚠️ CRITICAL: This task requires QUANTITATIVE metrics. No vague terms allowed.\n`;
    }

    if (options.validateSafety) {
      governedPrompt += `\n⚠️ SAFETY: Review recovery status and flag any overtraining risks.\n`;
    }

    if (options.checkConsistency) {
      governedPrompt += `\n⚠️ CONSISTENCY: Ensure recommendations don't contradict previous advice.\n`;
    }

    // Append the specific prompt
    governedPrompt += `\n\n---\n\n# SPECIFIC TASK:\n\n${specificPrompt}`;

    // Add final reminder
    governedPrompt += `\n\n---\n\n⚡ FINAL REMINDER: Review the Master Governance Rules above before responding. Ensure your response is personalized, specific, actionable, and safe.`;

    return governedPrompt;
  }

  /**
   * Get governance emphasis for specific insight types
   */
  getGovernanceEmphasis(insightType: 'progress' | 'alerts' | 'recommendations'): {
    enforcePersonalization: boolean;
    requireMetrics: boolean;
    validateSafety: boolean;
    checkConsistency: boolean;
  } {
    switch (insightType) {
      case 'progress':
        return {
          enforcePersonalization: true,
          requireMetrics: true,
          validateSafety: false,
          checkConsistency: true,
        };
      case 'alerts':
        return {
          enforcePersonalization: true,
          requireMetrics: true,
          validateSafety: true,
          checkConsistency: true,
        };
      case 'recommendations':
        return {
          enforcePersonalization: true,
          requireMetrics: true,
          validateSafety: true,
          checkConsistency: true,
        };
      default:
        return {
          enforcePersonalization: true,
          requireMetrics: true,
          validateSafety: true,
          checkConsistency: true,
        };
    }
  }

  /**
   * Validate if a prompt meets governance standards
   */
  validatePrompt(prompt: string): {
    valid: boolean;
    issues: string[];
    suggestions: string[];
  } {
    const issues: string[] = [];
    const suggestions: string[] = [];

    // Check for personalization indicators
    const hasUserContext = prompt.includes('USER') || prompt.includes('user') || prompt.includes('profile');
    if (!hasUserContext) {
      issues.push('Missing user context information');
      suggestions.push('Add user profile, goals, and training history to prompt');
    }

    // Check for metric requirements
    const hasMetricRequest = prompt.includes('specific') || prompt.includes('metric') || prompt.includes('number');
    if (!hasMetricRequest) {
      suggestions.push('Consider explicitly requesting specific metrics in output');
    }

    // Check for structure requirements
    const hasStructure = prompt.includes('JSON') || prompt.includes('format') || prompt.includes('structure');
    if (!hasStructure) {
      suggestions.push('Specify expected output format/structure');
    }

    // Check for safety considerations
    const hasSafety = prompt.includes('safety') || prompt.includes('recovery') || prompt.includes('injury');
    if (!hasSafety) {
      suggestions.push('Add safety and recovery considerations');
    }

    return {
      valid: issues.length === 0,
      issues,
      suggestions,
    };
  }

  /**
   * Get quality guidelines for response validation
   */
  getQualityGuidelines(): {
    personalization: string[];
    specificity: string[];
    actionability: string[];
    safety: string[];
  } {
    return {
      personalization: [
        'Uses user name at least once',
        'References specific achievements or milestones',
        'Connects insights to stated goals',
        'Makes self-comparisons not generic benchmarks',
        'Acknowledges experience level',
      ],
      specificity: [
        'All metrics are quantified (numbers, percentages)',
        'Recommendations include exact targets',
        'Time frames are specific (e.g., "48 hours" not "a few days")',
        'Comparisons include before/after values',
        'No vague terms like "good", "bad", "some"',
      ],
      actionability: [
        'Each recommendation has clear implementation steps',
        'Success criteria are defined',
        'Resources or examples provided where helpful',
        'Progression path is outlined',
        'Next steps are obvious',
      ],
      safety: [
        'Overtraining risks are flagged',
        'Recovery needs are addressed',
        'No dangerous recommendations',
        'Medical disclaimer when appropriate',
        'Progressive difficulty appropriate for level',
      ],
    };
  }

  /**
   * Select optimal Gemini model based on task complexity
   * Uses only stable models: gemini-2.0-flash, gemini-1.5-flash, gemini-1.5-pro
   */
  selectOptimalModel(
    insightType: 'progress' | 'alerts' | 'recommendations',
    dataComplexity: {
      workoutCount: number;
      muscleStatusCount: number;
      hasPersonalRecords: boolean;
      userExperienceLevel: string;
    }
  ): {
    model: string;
    reasoning: string;
    estimatedTokens: number;
    estimatedCost: number;
  } {
    // Model pricing (approximate per 1K tokens)
    const MODEL_COSTS = {
      'gemini-2.0-flash-thinking-exp-01-21': { inputCost: 0, outputCost: 0 }, // Free tier (experimental)
      'gemini-2.0-flash': { inputCost: 0, outputCost: 0 }, // Free tier (stable)
      'gemini-1.5-flash': { inputCost: 0.000075, outputCost: 0.0003 }, // Paid (stable)
      'gemini-1.5-pro': { inputCost: 0.00125, outputCost: 0.005 }, // Paid premium (stable)
    };

    let selectedModel = 'gemini-2.0-flash'; // Default to stable free model
    let reasoning = '';
    let estimatedTokens = 1500; // Default estimate
    let estimatedCost = 0;

    // Calculate complexity score
    const complexityScore =
      dataComplexity.workoutCount * 0.5 +
      dataComplexity.muscleStatusCount * 0.3 +
      (dataComplexity.hasPersonalRecords ? 100 : 0) +
      (dataComplexity.userExperienceLevel === 'elite' ? 50 : 0) +
      (dataComplexity.userExperienceLevel === 'advanced' ? 30 : 0);

    // Model selection logic based on complexity and insight type
    // Strategy: Use stable Gemini 2.0 Flash (free) for simple tasks, 1.5 Flash for complex
    if (insightType === 'progress') {
      if (complexityScore > 200 || dataComplexity.workoutCount > 100) {
        // High complexity - use 1.5 Pro for deep analysis
        selectedModel = 'gemini-1.5-pro';
        reasoning = 'High data complexity requires advanced analysis (1.5 Pro - stable)';
        estimatedTokens = 2500;
        estimatedCost = (estimatedTokens / 1000) * (MODEL_COSTS['gemini-1.5-pro'].inputCost + MODEL_COSTS['gemini-1.5-pro'].outputCost);
      } else if (complexityScore > 100) {
        // Medium complexity - use 1.5 Flash for reliable analysis
        selectedModel = 'gemini-1.5-flash';
        reasoning = 'Moderate complexity requires balanced model (1.5 Flash - stable)';
        estimatedTokens = 2000;
        estimatedCost = (estimatedTokens / 1000) * (MODEL_COSTS['gemini-1.5-flash'].inputCost + MODEL_COSTS['gemini-1.5-flash'].outputCost);
      } else {
        // Low complexity - use stable free 2.0 Flash
        selectedModel = 'gemini-2.0-flash';
        reasoning = 'Basic analysis with stable free model (2.0 Flash - stable, free)';
        estimatedTokens = 1500;
        estimatedCost = 0;
      }
    } else if (insightType === 'alerts') {
      // Alerts require safety analysis - use reliable stable models
      if (complexityScore > 150) {
        // High complexity safety analysis - use 1.5 Pro for accuracy
        selectedModel = 'gemini-1.5-pro';
        reasoning = 'Safety-critical with high complexity (1.5 Pro - stable)';
        estimatedTokens = 2000;
        estimatedCost = (estimatedTokens / 1000) * (MODEL_COSTS['gemini-1.5-pro'].inputCost + MODEL_COSTS['gemini-1.5-pro'].outputCost);
      } else if (complexityScore > 80) {
        // Medium complexity - use 1.5 Flash for reliability
        selectedModel = 'gemini-1.5-flash';
        reasoning = 'Safety analysis requires reliable model (1.5 Flash - stable)';
        estimatedTokens = 1800;
        estimatedCost = (estimatedTokens / 1000) * (MODEL_COSTS['gemini-1.5-flash'].inputCost + MODEL_COSTS['gemini-1.5-flash'].outputCost);
      } else {
        // Lower complexity - 2.0 Flash still good for basic safety checks
        selectedModel = 'gemini-2.0-flash';
        reasoning = 'Basic safety analysis (2.0 Flash - stable, free)';
        estimatedTokens = 1600;
        estimatedCost = 0;
      }
    } else if (insightType === 'recommendations') {
      // Recommendations need personalization and detail
      if (complexityScore > 200 || dataComplexity.userExperienceLevel === 'elite') {
        // Elite athletes need detailed programming - use 1.5 Flash
        selectedModel = 'gemini-1.5-flash';
        reasoning = 'Elite athlete requires detailed programming (1.5 Flash - stable)';
        estimatedTokens = 2200;
        estimatedCost = (estimatedTokens / 1000) * (MODEL_COSTS['gemini-1.5-flash'].inputCost + MODEL_COSTS['gemini-1.5-flash'].outputCost);
      } else if (complexityScore > 100) {
        // Intermediate complexity - use 1.5 Flash for quality
        selectedModel = 'gemini-1.5-flash';
        reasoning = 'Intermediate recommendations need quality (1.5 Flash - stable)';
        estimatedTokens = 2000;
        estimatedCost = (estimatedTokens / 1000) * (MODEL_COSTS['gemini-1.5-flash'].inputCost + MODEL_COSTS['gemini-1.5-flash'].outputCost);
      } else {
        // Basic recommendations - 2.0 Flash sufficient
        selectedModel = 'gemini-2.0-flash';
        reasoning = 'Standard recommendations (2.0 Flash - stable, free)';
        estimatedTokens = 1800;
        estimatedCost = 0;
      }
    }

    return {
      model: selectedModel,
      reasoning,
      estimatedTokens,
      estimatedCost: parseFloat(estimatedCost.toFixed(6)),
    };
  }

  /**
   * Get model configuration based on selected model
   */
  getModelConfig(modelName: string): {
    temperature: number;
    maxOutputTokens: number;
    topP: number;
    topK: number;
  } {
    // Different models benefit from different configs
    switch (modelName) {
      case 'gemini-1.5-pro':
        // Pro model - allow more creativity for deep analysis
        return {
          temperature: 0.7,
          maxOutputTokens: 4000,
          topP: 0.9,
          topK: 40,
        };
      case 'gemini-1.5-flash':
        // Flash 1.5 - balanced for quality and speed
        return {
          temperature: 0.6,
          maxOutputTokens: 3000,
          topP: 0.85,
          topK: 35,
        };
      case 'gemini-2.0-flash':
        // Flash 2.0 - optimized for consistency and speed
        return {
          temperature: 0.5,
          maxOutputTokens: 2500,
          topP: 0.8,
          topK: 30,
        };
      case 'gemini-2.0-flash-thinking-exp-01-21':
        // Experimental thinking model (not used in stable mode)
        return {
          temperature: 0.6,
          maxOutputTokens: 3000,
          topP: 0.85,
          topK: 32,
        };
      default:
        // Default to 2.0 Flash stable settings
        return {
          temperature: 0.5,
          maxOutputTokens: 2500,
          topP: 0.8,
          topK: 30,
        };
    }
  }
}

export const masterPromptGovernor = new MasterPromptGovernor();
