import { Exercise } from '@/types/exercise';
import { MuscleGroup } from '@/types/muscle';

/**
 * Maps muscle group enum values to readable searchable names
 */
const MUSCLE_GROUP_NAMES: Record<MuscleGroup, string[]> = {
  [MuscleGroup.CHEST]: ['chest', 'pectoral', 'pecs'],
  [MuscleGroup.UPPER_CHEST]: ['upper chest', 'upper pec', 'upper pectoral'],
  [MuscleGroup.LOWER_CHEST]: ['lower chest', 'lower pec', 'lower pectoral'],
  [MuscleGroup.BACK]: ['back', 'lats', 'latissimus'],
  [MuscleGroup.LATS]: ['lats', 'latissimus', 'lat', 'back'],
  [MuscleGroup.TRAPS]: ['traps', 'trapezius', 'trap'],
  [MuscleGroup.RHOMBOIDS]: ['rhomboids', 'rhomboid'],
  [MuscleGroup.LOWER_BACK]: ['lower back', 'lumbar', 'erector'],
  [MuscleGroup.SHOULDERS]: ['shoulders', 'shoulder', 'delts', 'deltoids'],
  [MuscleGroup.FRONT_DELTS]: ['front delts', 'front deltoid', 'anterior delt'],
  [MuscleGroup.SIDE_DELTS]: ['side delts', 'side deltoid', 'lateral delt'],
  [MuscleGroup.REAR_DELTS]: ['rear delts', 'rear deltoid', 'posterior delt', 'rear delt'],
  [MuscleGroup.BICEPS]: ['biceps', 'bicep'],
  [MuscleGroup.TRICEPS]: ['triceps', 'tricep'],
  [MuscleGroup.FOREARMS]: ['forearms', 'forearm', 'wrist'],
  [MuscleGroup.ABS]: ['abs', 'abdominal', 'abdominals', 'core'],
  [MuscleGroup.OBLIQUES]: ['obliques', 'oblique', 'side abs'],
  [MuscleGroup.QUADS]: ['quads', 'quadriceps', 'quad', 'thigh'],
  [MuscleGroup.HAMSTRINGS]: ['hamstrings', 'hamstring', 'hams'],
  [MuscleGroup.GLUTES]: ['glutes', 'glute', 'gluteal', 'butt'],
  [MuscleGroup.CALVES]: ['calves', 'calf', 'gastrocnemius'],
  [MuscleGroup.HIP_FLEXORS]: ['hip flexors', 'hip flexor'],
};

/**
 * Simple fuzzy matching - checks if query characters appear in order in the text
 */
export function fuzzyMatch(text: string, query: string): boolean {
  if (!query) {
    return true;
  }
  
  const textLower = text.toLowerCase();
  const queryLower = query.toLowerCase();
  
  // Exact match
  if (textLower.includes(queryLower)) {return true;}
  
  // Fuzzy match: check if all query characters appear in order
  let queryIndex = 0;
  for (let i = 0; i < textLower.length && queryIndex < queryLower.length; i++) {
    if (textLower[i] === queryLower[queryIndex]) {
      queryIndex++;
    }
  }
  
  return queryIndex === queryLower.length;
}

/**
 * Calculate Levenshtein distance between two strings
 */
function levenshteinDistance(str1: string, str2: string): number {
  const m = str1.length;
  const n = str2.length;
  const dp: number[][] = Array(m + 1).fill(null).map(() => Array(n + 1).fill(0));
  
  for (let i = 0; i <= m; i++) {dp[i][0] = i;}
  for (let j = 0; j <= n; j++) {dp[0][j] = j;}
  
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (str1[i - 1] === str2[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1];
      } else {
        dp[i][j] = Math.min(
          dp[i - 1][j] + 1,     // deletion
          dp[i][j - 1] + 1,     // insertion
          dp[i - 1][j - 1] + 1  // substitution
        );
      }
    }
  }
  
  return dp[m][n];
}

/**
 * Check if text matches query with fuzzy matching (allows 2-3 character difference)
 */
function fuzzyMatchAdvanced(text: string, query: string): boolean {
  if (!query) {
    return true;
  }
  
  const textLower = text.toLowerCase();
  const queryLower = query.toLowerCase();
  
  // Exact or substring match
  if (textLower.includes(queryLower)) {return true;}
  
  // Check if query is similar to any word in text (max 2-3 char difference)
  const words = textLower.split(/\s+/);
  for (const word of words) {
    if (word.length >= queryLower.length - 3 && word.length <= queryLower.length + 3) {
      const distance = levenshteinDistance(word, queryLower);
      if (distance <= 2) {return true;}
    }
  }
  
  return false;
}

/**
 * Check if exercise matches muscle group search
 */
function searchMuscleGroups(exercise: Exercise, query: string): boolean {
  const queryLower = query.toLowerCase();
  const allMuscles = [...exercise.primaryMuscles, ...exercise.secondaryMuscles];
  
  for (const muscle of allMuscles) {
    const muscleNames = MUSCLE_GROUP_NAMES[muscle] || [];
    for (const name of muscleNames) {
      if (name.includes(queryLower) || queryLower.includes(name)) {
        return true;
      }
    }
  }
  
  return false;
}

/**
 * Calculate relevance score for an exercise based on search query
 */
export function calculateRelevanceScore(exercise: Exercise, query: string): number {
  if (!query.trim()) {return 0;}
  
  const queryLower = query.toLowerCase().trim();
  const exerciseNameLower = exercise.name.toLowerCase();
  let score = 0;
  
  // Exact name match (highest priority)
  if (exerciseNameLower === queryLower) {
    score += 100;
  }
  // Name starts with query
  else if (exerciseNameLower.startsWith(queryLower)) {
    score += 80;
  }
  // Name contains query
  else if (exerciseNameLower.includes(queryLower)) {
    score += 60;
  }
  // Fuzzy match on name
  else if (fuzzyMatchAdvanced(exerciseNameLower, queryLower)) {
    score += 50;
  }
  
  // Muscle group match
  if (searchMuscleGroups(exercise, queryLower)) {
    score += 40;
  }
  
  // Equipment match
  const equipmentMatch = exercise.equipment.some(eq => 
    eq.toLowerCase().includes(queryLower) || queryLower.includes(eq.toLowerCase())
  );
  if (equipmentMatch) {
    score += 30;
  }
  
  // Category match
  if (exercise.category.toLowerCase().includes(queryLower)) {
    score += 20;
  }
  
  return score;
}

/**
 * Search and rank exercises by relevance
 */
export function searchExercises(
  exercises: Exercise[],
  query: string,
  limit: number = 100
): Exercise[] {
  if (!query.trim()) {
    return exercises;
  }
  
  const queryLower = query.toLowerCase().trim();
  
  // Filter exercises that match the query
  const matchingExercises = exercises.filter(exercise => {
    const exerciseNameLower = exercise.name.toLowerCase();
    
    // Check name match (exact, contains, or fuzzy)
    if (exerciseNameLower.includes(queryLower) || 
        fuzzyMatchAdvanced(exerciseNameLower, queryLower)) {
      return true;
    }
    
    // Check muscle group match
    if (searchMuscleGroups(exercise, queryLower)) {
      return true;
    }
    
    // Check equipment match
    if (exercise.equipment.some(eq => eq.toLowerCase().includes(queryLower))) {
      return true;
    }
    
    // Check category match
    if (exercise.category.toLowerCase().includes(queryLower)) {
      return true;
    }
    
    return false;
  });
  
  // Calculate relevance scores and sort
  const scoredExercises = matchingExercises.map(exercise => ({
    exercise,
    score: calculateRelevanceScore(exercise, queryLower),
  }));
  
  // Sort by score (descending) and return top results
  scoredExercises.sort((a, b) => b.score - a.score);
  
  return scoredExercises
    .slice(0, limit)
    .map(item => item.exercise);
}

/**
 * Find all matching positions in text for highlighting
 */
export function findMatches(text: string, query: string): Array<{ start: number; end: number }> {
  if (!query.trim()) {return [];}
  
  const textLower = text.toLowerCase();
  const queryLower = query.toLowerCase();
  const matches: Array<{ start: number; end: number }> = [];
  
  // Find all occurrences
  let startIndex = 0;
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const index = textLower.indexOf(queryLower, startIndex);
    if (index === -1) {
    break;
  }
    matches.push({ start: index, end: index + queryLower.length });
    startIndex = index + 1;
  }
  
  // Also check for fuzzy matches (if no exact matches found)
  if (matches.length === 0 && fuzzyMatchAdvanced(textLower, queryLower)) {
    // For fuzzy matches, try to find the best substring match
    const words = textLower.split(/\s+/);
    let charIndex = 0;
    for (const word of words) {
      const distance = levenshteinDistance(word, queryLower);
      if (distance <= 2 && word.length >= queryLower.length - 2) {
        const start = textLower.indexOf(word, charIndex);
        if (start !== -1) {
          matches.push({ start, end: start + word.length });
          break;
        }
      }
      charIndex += word.length + 1; // +1 for space
    }
  }
  
  return matches;
}

