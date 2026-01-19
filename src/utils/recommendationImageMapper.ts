/**
 * Utility to map workout categories to appropriate images
 * Uses high-quality Unsplash images
 */

// Map of categories to number of available local images (mocked for now)
const LOCAL_IMAGE_COUNTS: Record<string, number> = {
    cardio: 0,
    push: 0,
    pull: 0,
    legs: 0,
    mixed: 0,
    yoga: 0,
    stretching: 0,
};

// Fallback images from Unsplash (curated for relevance)
const FALLBACK_IMAGES: Record<string, string[]> = {
    cardio: [
        'https://images.unsplash.com/photo-1552674605-46945596d946?auto=format&fit=crop&w=800&q=80', // Running outdoors
        'https://images.unsplash.com/photo-1538805060512-303002547a22?auto=format&fit=crop&w=800&q=80', // HIIT/Cardio
        'https://images.unsplash.com/photo-1541625602330-2277a4c46182?auto=format&fit=crop&w=800&q=80', // Cycling
    ],
    push: [
        'https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?auto=format&fit=crop&w=800&q=80', // Bench press/Chest
        'https://images.unsplash.com/photo-1581009146145-b5ef050c2e1e?auto=format&fit=crop&w=800&q=80', // Gym weightlifting
        'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?auto=format&fit=crop&w=800&q=80', // Pushups/Strength
    ],
    pull: [
        'https://images.unsplash.com/photo-1526506118085-60ce8714f8c5?auto=format&fit=crop&w=800&q=80', // Gym back/arms
        'https://images.unsplash.com/photo-1598532163257-ae3c6b2524b6?auto=format&fit=crop&w=800&q=80', // Pullups
        'https://images.unsplash.com/photo-1603287681836-96c668975dbd?auto=format&fit=crop&w=800&q=80', // Rows/Back
    ],
    legs: [
        'https://images.unsplash.com/photo-1574680096141-1cddd32e04ca?auto=format&fit=crop&w=800&q=80', // Squats
        'https://images.unsplash.com/photo-1434608519344-49d77a699ded?auto=format&fit=crop&w=800&q=80', // Running/Legs
        'https://images.unsplash.com/photo-1579758629938-03607ccdbaba?auto=format&fit=crop&w=800&q=80', // Lunges/Legs
    ],
    mixed: [
        'https://images.unsplash.com/photo-1517836357463-d25dfeac3438?auto=format&fit=crop&w=800&q=80', // Crossfit/Battle ropes
        'https://images.unsplash.com/photo-1584735935682-2f2b69dff9d2?auto=format&fit=crop&w=800&q=80', // General gym/Mixed
        'https://images.unsplash.com/photo-1605296867304-6f2b46b8a97f?auto=format&fit=crop&w=800&q=80', // Dumbbells/Mixed
    ],
    yoga: [
        'https://images.unsplash.com/photo-1544367563-12123d8965cd?auto=format&fit=crop&w=800&q=80', // Yoga pose 1
        'https://images.unsplash.com/photo-1575052814086-f385e2e2ad1b?auto=format&fit=crop&w=800&q=80', // Yoga pose 2
        'https://images.unsplash.com/photo-1506126613408-eca07ce68773?auto=format&fit=crop&w=800&q=80', // Yoga/Stretch
    ],
    stretching: [
        'https://images.unsplash.com/photo-1566241440091-ec10de8db2e1?auto=format&fit=crop&w=800&q=80', // Stretching
        'https://images.unsplash.com/photo-1552196563-55cd4e45efb3?auto=format&fit=crop&w=800&q=80', // Yoga/Flexibility
        'https://images.unsplash.com/photo-1599901860904-17e6ed7083a0?auto=format&fit=crop&w=800&q=80', // Stretching 2
    ],
};

export function getRecommendationImageUrl(category: string, workoutType?: string): string {
    // Normalize category
    let normalizedCategory = category.toLowerCase();

    // Map specific muscle groups or workout types to broad categories
    if (['chest', 'shoulders', 'triceps'].includes(normalizedCategory)) {
        normalizedCategory = 'push';
    }
    if (['back', 'biceps', 'lats'].includes(normalizedCategory)) {
        normalizedCategory = 'pull';
    }
    if (['quads', 'hamstrings', 'glutes', 'calves'].includes(normalizedCategory)) {
        normalizedCategory = 'legs';
    }
    if (['abs', 'core'].includes(normalizedCategory)) {
        normalizedCategory = 'mixed';
    }

    // Try to match workoutType if category is generic
    if (workoutType && ['strength', 'hypertrophy'].includes(normalizedCategory)) {
        if (['push', 'pull', 'legs'].includes(workoutType.toLowerCase())) {
            normalizedCategory = workoutType.toLowerCase();
        }
    }

    // Check if we have this category
    if (!FALLBACK_IMAGES[normalizedCategory] && !LOCAL_IMAGE_COUNTS[normalizedCategory]) {
        normalizedCategory = 'mixed'; // Default
    }

    // Randomly select an index to vary the images slightly
    const fallbackCount = FALLBACK_IMAGES[normalizedCategory]?.length || 0;

    // Use a pseudo-random selection
    const index = Math.floor(Math.random() * fallbackCount);
    return FALLBACK_IMAGES[normalizedCategory]?.[index] || FALLBACK_IMAGES['mixed'][0];
}
