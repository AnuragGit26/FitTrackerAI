import { GoogleGenerativeAI } from '@google/generative-ai';
import { logger } from '@/utils/logger';
import { cleanPlainTextResponse } from '@/utils/aiResponseCleaner';

interface EmptyStateContext {
    userName: string;
    screenName: 'Home' | 'Analytics' | 'Insights' | 'History' | 'Templates';
    timeOfDay: 'morning' | 'afternoon' | 'evening';
}

const CACHE_KEY_PREFIX = 'ai_empty_state_';
const CACHE_DURATION_MS = 1000 * 60 * 60 * 12; // 12 hours

class AIEmptyStateService {
    private genAI: GoogleGenerativeAI | null = null;

    constructor() {
        const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
        if (apiKey) {
            this.genAI = new GoogleGenerativeAI(apiKey);
        }
    }

    private getCachedMessage(key: string): string | null {
        try {
            const cached = localStorage.getItem(key);
            if (!cached) {
    return null;
  }

            const { message, timestamp } = JSON.parse(cached);
            if (Date.now() - timestamp > CACHE_DURATION_MS) {
                localStorage.removeItem(key);
                return null;
            }
            return message;
        } catch (error) {
            return null;
        }
    }

    private setCachedMessage(key: string, message: string): void {
        try {
            localStorage.setItem(key, JSON.stringify({
                message,
                timestamp: Date.now(),
            }));
        } catch (error) {
            // Ignore storage errors
        }
    }

    private getFallbackMessage(context: EmptyStateContext): string {
        const { userName, screenName } = context;
        const greetings = {
            morning: 'Good morning',
            afternoon: 'Good afternoon',
            evening: 'Good evening',
        };
        const greeting = greetings[context.timeOfDay];

        switch (screenName) {
            case 'Home':
                return `${greeting}, ${userName}! Ready to start your fitness journey? Log your first workout to get started.`;
            case 'Analytics':
                return `Hey ${userName}, your analytics will appear here once you complete your first workout. Consistency is key!`;
            case 'Insights':
                return `Welcome, ${userName}! AI insights need a little data to work with. Log a workout and check back here.`;
            case 'History':
                return `Your workout history is a blank canvas, ${userName}. Let's paint it with some PRs!`;
            case 'Templates':
                return `Time to plan for success, ${userName}. Create your first workout template here.`;
            default:
                return `${greeting}, ${userName}! Let's get moving.`;
        }
    }

    async generateMessage(context: EmptyStateContext): Promise<string> {
        const cacheKey = `${CACHE_KEY_PREFIX}${context.screenName}_${context.userName}`;
        const cached = this.getCachedMessage(cacheKey);
        if (cached) {
    return cached;
  }

        if (!this.genAI) {
            return this.getFallbackMessage(context);
        }

        try {
            const model = this.genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

            const prompt = `
        Generate a short, motivational, and personalized message for a new user named "${context.userName}" who is looking at the empty "${context.screenName}" screen of a fitness app.
        It is currently ${context.timeOfDay}.
        The user has 0 workouts logged.
        
        Requirements:
        - Maximum 2 sentences.
        - Friendly, encouraging, and energetic tone.
        - Mention the specific screen purpose subtly (e.g. for Analytics mention tracking progress).
        - No emojis.
        - Output ONLY the raw text message.
      `;

            const result = await model.generateContent(prompt);
            const response = await result.response;
            const text = cleanPlainTextResponse(response.text());

            if (!text) {
    throw new Error('Empty response');
  }

            this.setCachedMessage(cacheKey, text);
            return text;
        } catch (error) {
            logger.warn('Failed to generate AI empty state message', error);
            return this.getFallbackMessage(context);
        }
    }
}

export const aiEmptyStateService = new AIEmptyStateService();
