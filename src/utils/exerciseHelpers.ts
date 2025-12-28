import { Exercise } from '@/types/exercise';

/**
 * Detect if an exercise is HIIT based on name patterns and category
 */
export function detectHIIT(exercise: Exercise): boolean {
  const hiitKeywords = ['hiit', 'tabata', 'interval', 'sprint', 'burpee', 'circuit', 'amrap', 'emom'];
  const nameLower = exercise.name.toLowerCase();
  
  // Check if name contains HIIT keywords
  const hasHIITKeyword = hiitKeywords.some(keyword => nameLower.includes(keyword));
  
  // Check if it's a cardio exercise with interval/sprint in the name
  const isIntervalCardio = exercise.category === 'cardio' && 
    (nameLower.match(/interval|sprint|burst/i) !== null);
  
  return hasHIITKeyword || isIntervalCardio;
}

