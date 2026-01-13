/**
 * Example: Import Your Real User Data
 *
 * Copy this entire file content and paste it into the browser console
 * when your app is running in development mode (http://localhost:5173)
 *
 * Or run it line by line to understand each step
 */

// Your exported data (replace this with your actual export)
// This is a sample structure - paste your complete JSON export here
const YOUR_DATA = {
  "version": "2.0.0",
  "exportDate": "2026-01-06T12:28:45.583Z",
  "appVersion": "1.0.0",
  "dataCounts": {
    "workouts": 11,
    "templates": 68,
    "plannedWorkouts": 0,
    "customExercises": 0,
    "muscleStatuses": 12,
    "sleepLogs": 9,
    "recoveryLogs": 8,
    "settings": 1
  },
  // Note: Include your full data here
  // workouts: [ /* your workouts */ ],
  // templates: [ /* your templates */ ],
  // etc.
  "userProfile": {
    "id": "auth0|695049ee1195e9080590da44",
    "name": "Anurag",
    "experienceLevel": "intermediate",
    "goals": ["gain_strength", "improve_endurance", "lose_fat", "general_fitness"],
    "equipment": ["Full Gym"],
    "workoutFrequency": 3,
    "preferredUnit": "kg",
    "defaultRestTime": 90,
    "age": 25,
    "gender": "male",
    "weight": 88,
    "height": 180
  }
};

// ============================================
// STEP-BY-STEP IMPORT PROCESS
// ============================================

console.group('🏋️ FitTrackAI Test Data Import');

// Step 1: Verify utilities are loaded
console.log('Step 1: Checking if utilities are loaded...');
if (typeof window.importTestData !== 'function') {
  console.error('❌ ERROR: Import utilities not loaded!');
  console.log('Make sure:');
  console.log('1. You are in development mode (npm run dev)');
  console.log('2. The app is fully loaded');
  console.log('3. You are on http://localhost:5173');
  console.groupEnd();
  throw new Error('Import utilities not available');
}
console.log('✅ Utilities loaded successfully');

// Step 2: Validate data structure
console.log('\nStep 2: Validating data structure...');
if (!YOUR_DATA.userProfile?.id) {
  console.error('❌ ERROR: User profile ID missing!');
  console.groupEnd();
  throw new Error('User profile ID required');
}
console.log('✅ Data structure valid');
console.log('User ID:', YOUR_DATA.userProfile.id);

// Step 3: Show what will be imported
console.log('\nStep 3: Data summary:');
console.table(YOUR_DATA.dataCounts);

// Step 4: Run dry run test
console.log('\nStep 4: Running dry run test...');
console.log('This will validate without importing');

const testResult = await window.importTestData(YOUR_DATA, {
  dryRun: true,
  clearExisting: true
});

console.log('\nDry run results:');
console.table(testResult.imported);

if (testResult.errors.length > 0) {
  console.warn('\n⚠️ Dry run found errors:');
  testResult.errors.forEach((error, i) => {
    console.warn(`${i + 1}. ${error}`);
  });

  const shouldContinue = confirm(
    `Found ${testResult.errors.length} errors during dry run.\n\nDo you want to continue anyway?`
  );

  if (!shouldContinue) {
    console.log('Import cancelled by user');
    console.groupEnd();
    throw new Error('Import cancelled');
  }
} else {
  console.log('✅ No errors found in dry run');
}

// Step 5: Confirm before importing
console.log('\nStep 5: Ready to import!');
const confirmed = confirm(
  '⚠️ This will REPLACE all existing data in IndexedDB.\n\n' +
  'Data to import:\n' +
  `- ${testResult.imported.workouts} workouts\n` +
  `- ${testResult.imported.templates} templates\n` +
  `- ${testResult.imported.muscleStatuses} muscle statuses\n` +
  `- ${testResult.imported.sleepLogs} sleep logs\n` +
  `- ${testResult.imported.recoveryLogs} recovery logs\n\n` +
  'Continue?'
);

if (!confirmed) {
  console.log('Import cancelled by user');
  console.groupEnd();
  throw new Error('Import cancelled');
}

// Step 6: Perform actual import
console.log('\nStep 6: Importing data...');
console.log('This may take a few seconds...');

const importResult = await window.importTestData(YOUR_DATA, {
  clearExisting: true,
  skipUserProfile: false,
  skipSettings: false
});

// Step 7: Show results
console.log('\n✅ Import complete!');
console.log('\nImport results:');
console.table(importResult.imported);

if (importResult.errors.length > 0) {
  console.warn('\n⚠️ Some errors occurred:');
  importResult.errors.forEach((error, i) => {
    console.warn(`${i + 1}. ${error}`);
  });
} else {
  console.log('✅ No errors during import');
}

// Step 8: Next steps
console.log('\n📝 Next steps:');
console.log('1. Refresh the page to see your imported data');
console.log('2. Check your workouts, templates, etc.');
console.log('3. Verify everything looks correct');

console.groupEnd();

// Auto-refresh option
const autoRefresh = confirm('Import complete!\n\nRefresh the page now to see your data?');
if (autoRefresh) {
  window.location.reload();
}

// ============================================
// ALTERNATIVE: QUICK ONE-LINE IMPORT
// ============================================
// If you just want to import quickly without all the checks:
//
// await window.importTestData(YOUR_DATA, { clearExisting: true });
// window.location.reload();

// ============================================
// EXPORT CURRENT DATA (FOR BACKUP)
// ============================================
// To export your current data before importing:
//
// const backup = await window.exportUserData('auth0|695049ee1195e9080590da44');
// console.log(JSON.stringify(backup, null, 2));
// // Copy the output and save it to a file

// ============================================
// CLEAR ALL DATA
// ============================================
// To clear all data for a user:
//
// await window.clearAllData('auth0|695049ee1195e9080590da44');
