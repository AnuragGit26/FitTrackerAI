import puppeteer, { Page } from 'puppeteer';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface StrengthLogExercise {
  name: string;
  category: 'strength'; // Always 'strength'
  muscleCategory: string; // From directory page (e.g., "Chest", "Shoulder")
  strengthlogSlug: string;
  strengthlogUrl: string;
  primaryMuscles: string[]; // Will be MuscleGroup[] in generated file
  secondaryMuscles: string[]; // Will be MuscleGroup[] in generated file
  anatomyImageUrl?: string; // Extracted from exercise page
}

const STRENGTHLOG_BASE_URL = 'https://www.strengthlog.com';

/**
 * Normalize exercise name to match our naming conventions
 */
function normalizeExerciseName(name: string): string {
  // Remove extra whitespace
  return name.trim();
}

/**
 * Map muscle name to MuscleGroup enum string
 * This is a simplified version - full mapping happens in strengthlogMuscleMapper
 */
function mapMuscleNameToGroup(muscleName: string): string | null {
  const normalized = muscleName.toLowerCase().trim();
  
  const muscleMap: Record<string, string> = {
    'chest': 'CHEST',
    'upper chest': 'UPPER_CHEST',
    'lower chest': 'LOWER_CHEST',
    'shoulder': 'SHOULDERS',
    'shoulders': 'SHOULDERS',
    'front delts': 'FRONT_DELTS',
    'front deltoids': 'FRONT_DELTS',
    'lateral delts': 'SIDE_DELTS',
    'side delts': 'SIDE_DELTS',
    'rear delts': 'REAR_DELTS',
    'rear deltoids': 'REAR_DELTS',
    'deltoids': 'SHOULDERS',
    'deltoid': 'SHOULDERS',
    'back': 'BACK',
    'lats': 'LATS',
    'latissimus dorsi': 'LATS',
    'traps': 'TRAPS',
    'trapezius': 'TRAPS',
    'rhomboids': 'RHOMBOIDS',
    'lower back': 'LOWER_BACK',
    'bicep': 'BICEPS',
    'biceps': 'BICEPS',
    'tricep': 'TRICEPS',
    'triceps': 'TRICEPS',
    'forearm flexors': 'FOREARMS',
    'forearm extensors': 'FOREARMS',
    'forearms': 'FOREARMS',
    'grip': 'FOREARMS',
    'abs': 'ABS',
    'abdominal': 'ABS',
    'abdominals': 'ABS',
    'core': 'ABS',
    'obliques': 'OBLIQUES',
    'quads': 'QUADS',
    'quadriceps': 'QUADS',
    'hamstrings': 'HAMSTRINGS',
    'hamstring': 'HAMSTRINGS',
    'glutes': 'GLUTES',
    'glute': 'GLUTES',
    'calves': 'CALVES',
    'calf': 'CALVES',
    'hip flexors': 'HIP_FLEXORS',
  };

  // Check exact match
  if (muscleMap[normalized]) {
    return muscleMap[normalized];
  }

  // Check partial matches
  for (const [key, group] of Object.entries(muscleMap)) {
    if (normalized.includes(key) || key.includes(normalized)) {
      return group;
    }
  }

  return null;
}

/**
 * Scrape individual exercise page to extract muscle groups and anatomy image
 */
async function scrapeExercisePage(
  page: Page,
  exerciseSlug: string,
  exerciseUrl: string
): Promise<{ primaryMuscles: string[]; secondaryMuscles: string[]; anatomyImageUrl?: string }> {
  try {
    console.log(`  📄 Scraping: ${exerciseSlug}`);
    
    await page.goto(exerciseUrl, {
      waitUntil: 'networkidle2',
      timeout: 15000,
    });

    await page.waitForSelector('body', { timeout: 5000 });

    const exerciseData = await page.evaluate(() => {
      const result: { primaryMuscles: string[]; secondaryMuscles: string[]; anatomyImageUrl?: string } = {
        primaryMuscles: [],
        secondaryMuscles: [],
      };

      // Extract primary muscles
      const primaryHeading = document.querySelector('h3#h-primary-muscles-worked');
      if (primaryHeading) {
        const nextList = primaryHeading.nextElementSibling;
        if (nextList && (nextList.tagName === 'UL' || nextList.tagName === 'OL')) {
          const items = Array.from(nextList.querySelectorAll('li'));
          items.forEach((item) => {
            const link = item.querySelector('a');
            const muscleName = link ? link.textContent?.trim() : item.textContent?.trim();
            if (muscleName) {
              result.primaryMuscles.push(muscleName);
            }
          });
        }
      }

      // Extract secondary muscles
      const secondaryHeading = document.querySelector('h3#h-secondary-muscles-worked');
      if (secondaryHeading) {
        const nextList = secondaryHeading.nextElementSibling;
        if (nextList && (nextList.tagName === 'UL' || nextList.tagName === 'OL')) {
          const items = Array.from(nextList.querySelectorAll('li'));
          items.forEach((item) => {
            const link = item.querySelector('a');
            const muscleName = link ? link.textContent?.trim() : item.textContent?.trim();
            if (muscleName) {
              result.secondaryMuscles.push(muscleName);
            }
          });
        }
      }

      // Extract anatomy image URL
      const images = Array.from(document.querySelectorAll('img'));
      for (const img of images) {
        const src = img.getAttribute('src') || '';
        const srcset = img.getAttribute('srcset') || '';
        const alt = img.getAttribute('alt') || '';
        
        // Look for muscles-worked-by pattern
        if (src.includes('muscles-worked-by') || srcset.includes('muscles-worked-by') || alt.toLowerCase().includes('muscles worked')) {
          // Try to get the full resolution URL from srcset or src
          if (srcset) {
            // Extract the largest image from srcset
            const srcsetParts = srcset.split(',').map(s => s.trim());
            const largest = srcsetParts[srcsetParts.length - 1];
            if (largest) {
              const url = largest.split(' ')[0];
              if (url.includes('muscles-worked-by')) {
                result.anatomyImageUrl = url;
                break;
              }
            }
          }
          if (src && src.includes('muscles-worked-by')) {
            result.anatomyImageUrl = src;
            break;
          }
        }
      }

      return result;
    });

    // Map muscle names to MuscleGroup enum strings
    exerciseData.primaryMuscles = exerciseData.primaryMuscles
      .map(name => mapMuscleNameToGroup(name))
      .filter((group): group is string => group !== null);
    
    exerciseData.secondaryMuscles = exerciseData.secondaryMuscles
      .map(name => mapMuscleNameToGroup(name))
      .filter((group): group is string => group !== null);

    // If no anatomy image found, try pattern-based URL
    if (!exerciseData.anatomyImageUrl) {
      exerciseData.anatomyImageUrl = `https://i0.wp.com/www.strengthlog.com/wp-content/uploads/2023/04/muscles-worked-by-${exerciseSlug}-male.png?w=1126&ssl=1`;
    }

    return exerciseData;
  } catch (error) {
    console.warn(`  ⚠️  Failed to scrape ${exerciseSlug}:`, error);
    // Return empty data on error
    return {
      primaryMuscles: [],
      secondaryMuscles: [],
      anatomyImageUrl: `https://i0.wp.com/www.strengthlog.com/wp-content/uploads/2023/04/muscles-worked-by-${exerciseSlug}-male.png?w=1126&ssl=1`,
    };
  }
}

async function scrapeStrengthLogDirectory(): Promise<StrengthLogExercise[]> {
  console.log('🚀 Starting StrengthLog directory scraping...');
  
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  try {
    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36');
    
    console.log('📄 Loading exercise directory page...');
    await page.goto(`${STRENGTHLOG_BASE_URL}/exercise-directory/`, {
      waitUntil: 'networkidle2',
      timeout: 30000,
    });

    // Wait for the content to load
    await page.waitForSelector('h2, h3, ul, ol', { timeout: 10000 });

    console.log('🔍 Extracting exercise data...');

    // Extract exercises by category
    const exercises = await page.evaluate((baseUrl) => {
      const results: StrengthLogExercise[] = [];
      
      // Find all category sections (h2 or h3 headings)
      const headings = Array.from(document.querySelectorAll('h2, h3'));
      
      headings.forEach((heading) => {
        const categoryText = heading.textContent?.trim() || '';
        
        // Skip if not a muscle category
        if (!categoryText.toLowerCase().includes('exercises') && 
            !categoryText.toLowerCase().includes('exercise')) {
          return;
        }

        // Extract category name (remove "Exercises" suffix)
        const category = categoryText
          .replace(/\s*exercises?\s*$/i, '')
          .trim();

        // Find the next list (ul or ol) after this heading
        let currentElement: Element | null = heading.nextElementSibling;
        let listElement: HTMLUListElement | HTMLOListElement | null = null;

        // Look for a list within the next few siblings
        while (currentElement && !listElement) {
          if (currentElement.tagName === 'UL' || currentElement.tagName === 'OL') {
            listElement = currentElement as HTMLUListElement | HTMLOListElement;
            break;
          }
          currentElement = currentElement.nextElementSibling;
        }

        if (!listElement) {return;}

        // Extract exercises from the list
        const listItems = Array.from(listElement.querySelectorAll('li'));
        
        listItems.forEach((item) => {
          // Try to find a link
          const link = item.querySelector('a');
          if (!link) {return;}

          const exerciseName = link.textContent?.trim() || '';
          const href = link.getAttribute('href') || '';
          
          if (!exerciseName || !href) {return;}

          // Build full URL
          const fullUrl = href.startsWith('http') 
            ? href 
            : `${baseUrl}${href.startsWith('/') ? '' : '/'}${href}`;

          // Extract slug from URL (remove leading/trailing slashes and get last part)
          const cleanUrl = href.replace(/^\/|\/$/g, '');
          const parts = cleanUrl.split('/');
          const slug = parts[parts.length - 1] || '';

          results.push({
            name: exerciseName,
            category: 'strength' as const,
            muscleCategory: category, // Store the muscle category (e.g., "Chest", "Shoulder")
            strengthlogSlug: slug,
            strengthlogUrl: fullUrl,
            primaryMuscles: [], // Will be populated from exercise page
            secondaryMuscles: [], // Will be populated from exercise page
          });
        });
      });

      return results;
    }, STRENGTHLOG_BASE_URL);

    console.log(`✅ Found ${exercises.length} exercises`);

    // Remove duplicates based on slug
    const uniqueExercises = new Map<string, StrengthLogExercise>();
    exercises.forEach((ex) => {
      if (ex.strengthlogSlug && !uniqueExercises.has(ex.strengthlogSlug)) {
        uniqueExercises.set(ex.strengthlogSlug, ex);
      }
    });

    const finalExercises = Array.from(uniqueExercises.values());
    console.log(`✅ After deduplication: ${finalExercises.length} unique exercises`);

    // Phase 2: Visit each exercise page to extract muscle groups and anatomy image
    console.log('\n🔍 Phase 2: Scraping individual exercise pages...');
    console.log(`📊 Processing ${finalExercises.length} exercises (this may take a while)...\n`);

    for (let i = 0; i < finalExercises.length; i++) {
      const exercise = finalExercises[i];
      const progress = `[${i + 1}/${finalExercises.length}]`;
      
      try {
        const exerciseData = await scrapeExercisePage(page, exercise.strengthlogSlug, exercise.strengthlogUrl);
        exercise.primaryMuscles = exerciseData.primaryMuscles;
        exercise.secondaryMuscles = exerciseData.secondaryMuscles;
        exercise.anatomyImageUrl = exerciseData.anatomyImageUrl;
        
        console.log(`  ✅ ${progress} ${exercise.name}`);
        
        // Rate limiting: wait 500ms between requests to be respectful
        if (i < finalExercises.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 500));
        }
      } catch (error) {
        console.warn(`  ⚠️  ${progress} Failed to scrape ${exercise.name}:`, error);
        // Continue with next exercise even if one fails
      }
    }

    console.log(`\n✅ Completed scraping ${finalExercises.length} exercise pages`);

    return finalExercises;
  } finally {
    await browser.close();
  }
}

/**
 * Generate TypeScript file with exercise data
 */
function generateTypeScriptFile(exercises: StrengthLogExercise[]): void {
  console.log('📝 Generating TypeScript file...');

  const imports = `import { MuscleGroup } from '@/types/muscle';

export interface StrengthLogExerciseData {
  name: string;
  category: 'strength';
  muscleCategory: string;
  strengthlogSlug: string;
  strengthlogUrl: string;
  primaryMuscles: MuscleGroup[];
  secondaryMuscles: MuscleGroup[];
  anatomyImageUrl?: string;
}

`;

  const exercisesCode = exercises
    .map((ex) => {
      const primaryMusclesCode = ex.primaryMuscles.length > 0
        ? ex.primaryMuscles.map((mg) => `MuscleGroup.${mg}`).join(', ')
        : '';
      const secondaryMusclesCode = ex.secondaryMuscles.length > 0
        ? ex.secondaryMuscles.map((mg) => `MuscleGroup.${mg}`).join(', ')
        : '';
      
      const anatomyImageUrlLine = ex.anatomyImageUrl
        ? `\n    anatomyImageUrl: ${JSON.stringify(ex.anatomyImageUrl)},`
        : '';

      return `  {
    name: ${JSON.stringify(normalizeExerciseName(ex.name))},
    category: 'strength',
    muscleCategory: ${JSON.stringify(ex.muscleCategory)},
    strengthlogSlug: ${JSON.stringify(ex.strengthlogSlug)},
    strengthlogUrl: ${JSON.stringify(ex.strengthlogUrl)},
    primaryMuscles: [${primaryMusclesCode}],
    secondaryMuscles: [${secondaryMusclesCode}],${anatomyImageUrlLine}
  }`;
    })
    .join(',\n');

  const fileContent = `${imports}export const STRENGTHLOG_EXERCISES: StrengthLogExerciseData[] = [
${exercisesCode}
];

// Total exercises: ${exercises.length}
`;

  const outputPath = path.join(__dirname, '../src/data/strengthlogExercises.ts');
  const outputDir = path.dirname(outputPath);

  // Ensure directory exists
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  fs.writeFileSync(outputPath, fileContent, 'utf-8');
  console.log(`✅ Generated file: ${outputPath}`);
}


/**
 * Main execution
 */
async function main() {
  try {
    const exercises = await scrapeStrengthLogDirectory();
    
    if (exercises.length === 0) {
      console.error('❌ No exercises found. Please check the scraping logic.');
      process.exit(1);
    }

    generateTypeScriptFile(exercises);
    
    console.log('\n✨ Scraping completed successfully!');
    console.log(`📊 Total exercises: ${exercises.length}`);
  } catch (error) {
    console.error('❌ Error during scraping:', error);
    process.exit(1);
  }
}

// Run if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export { scrapeStrengthLogDirectory, generateTypeScriptFile };

