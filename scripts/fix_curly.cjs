const fs = require('fs');
const path = require('path');

const files = [
    'src/components/exercise/CurrentSetCard.tsx',
    'src/components/exercise/ExerciseSelectorDropdown.tsx',
    'src/components/home/AIFocusCard.tsx',
    'src/components/insights/PredictedRecoveryChart.tsx',
    'src/components/workout/LogExercise.tsx',
    'src/pages/Onboarding.tsx',
    'src/pages/Profile.tsx',
    'src/utils/analyticsHelpers.ts',
    'src/services/firestoreSyncService.ts',
    'src/services/workoutSummaryService.ts',
    'src/components/workout/summary/ExerciseBreakdown.tsx',
    'src/components/workout/summary/SessionAnalysisCard.tsx',
    'src/components/workout/summary/MuscleDistributionChart.tsx',
    'src/components/workout/summary/SessionTrends.tsx',
    'src/services/dataService.ts',
    'src/utils/workoutStatePersistence.ts',
    'src/hooks/useAIInsights.ts',
    'src/hooks/useInsightsData.ts',
    'src/hooks/useMuscleRecovery.ts',
    'src/hooks/useWorkoutDuration.ts',
    'src/pages/Analytics.tsx',
    'src/pages/CreateTemplate.tsx',
    'src/pages/EditWorkout.tsx',
    'src/pages/LogWorkout.tsx',
    'src/pages/Planner.tsx',
    'src/pages/SleepRecovery.tsx',
    'src/pages/WorkoutHistory.tsx',
    'src/pages/WorkoutSummary.tsx',
    'src/pages/WorkoutTemplates.tsx',
    'src/services/advancedRecoveryModeling.ts',
    'src/services/aiCallManager.ts',
    'src/services/aiEmptyStateService.ts',
    'src/services/analyticsService.ts',
    'src/services/errorLogService.ts',
    'src/services/exerciseIdMigration.ts',
    'src/services/muscleMapping.ts',
    'src/services/muscleRecoveryService.ts',
    'src/services/restTimerService.ts',
    'src/services/rpeService.ts',
    'src/services/sleepRecoveryService.ts',
    'src/services/supersetService.ts',
    'src/services/swCommunication.ts',
    'src/services/versionManager.ts',
    'src/services/workoutAnalysisService.ts',
    'src/services/workoutEventTracker.ts',
    'src/services/workoutHistoryService.ts',
    'src/services/workoutIdMigration.ts',
    'src/store/workoutStore.ts',
    'src/utils/accessibility.ts',
    'src/utils/aiResponseCleaner.ts',
    'src/utils/analytics.ts',
    'src/utils/dateHelpers.ts',
    'src/utils/exerciseSearch.ts',
    'src/utils/recoveryHelpers.ts',
    'src/utils/rpeHelpers.ts',
    'src/utils/seedWorkoutLogs.ts',
    'src/utils/validationSchemas.ts',
    'src/utils/workoutErrorRecovery.ts',
    'src/utils/workoutHistoryHelpers.ts',
    'src/components/common/EmptyStateAIMessage.tsx',
    'src/components/common/ErrorBoundary.tsx',
    'src/components/common/InstallPrompt.tsx',
    'src/components/common/Modal.tsx',
    'src/components/common/NotificationPanel.tsx',
    'src/components/common/Skeleton.tsx',
    'src/components/common/TimeWheelPicker.tsx',
    'src/components/common/WorkoutRecoveryModal.tsx',
    'src/components/exercise/CardioRepsSetCard.tsx',
    'src/components/exercise/CardioSetCard.tsx',
    'src/components/exercise/ExerciseMuscleDiagram.tsx',
    'src/components/exercise/HIITSetCard.tsx',
    'src/components/exercise/RestTimer.tsx',
    'src/components/exercise/SetCompletionCelebration.tsx',
    'src/components/exercise/SetInput.tsx',
    'src/components/exercise/SmartRestTimer.tsx',
    'src/components/exercise/WeightChangeBadge.tsx',
    'src/components/exercise/YogaSetCard.tsx',
    'src/components/home/MuscleGroupCards.tsx',
    'src/components/home/PlannedWorkoutsSection.tsx',
    'src/components/home/RecoveryInsightsCard.tsx',
    'src/components/home/RecoveryScoreCard.tsx',
    'src/components/insights/BreakthroughCard.tsx',
    'src/components/insights/CorrectiveExercisesCarousel.tsx',
    'src/components/insights/CriticalAlertsCard.tsx',
    'src/components/insights/MuscleBalanceSection.tsx',
    'src/components/insights/NutritionTimingTimeline.tsx',
    'src/components/insights/ProgressionPlanCard.tsx',
    'src/components/insights/RecommendedWorkoutCard.tsx',
    'src/components/insights/SuggestionsSection.tsx',
    'src/components/insights/TrainingPatternsSection.tsx',
    'src/components/insights/VolumeTrendChart.tsx',
    'src/components/layout/BottomNavigation.tsx',
    'src/components/layout/HomeHeader.tsx',
    'src/components/planner/PlanWorkoutModal.tsx',
    'src/components/profile/ExportProgressModal.tsx',
    'src/components/profile/ImportProgressModal.tsx',
    'src/components/profile/ProfilePictureUpload.tsx',
    'src/components/rest/RecoveryGraph.tsx',
    'src/components/rest/SuggestedWorkoutCard.tsx',
    'src/components/workout/QuickCardioLog.tsx',
    'src/components/workout/WorkoutErrorRecoveryModal.tsx',
    'src/components/workout/edit/CopySetsModal.tsx',
    'src/components/workout/edit/EditExerciseItem.tsx',
    'src/components/workout/edit/EditExerciseList.tsx',
];

const projectRoot = path.resolve(__dirname, '..');

files.forEach(file => {
    const filePath = path.join(projectRoot, file);
    if (!fs.existsSync(filePath)) {
        console.log(`Skipping ${file} (not found)`);
        return;
    }

    let content = fs.readFileSync(filePath, 'utf8');
    let changed = false;

    // Replace if (...) return; or if (...) {return;} with multi-line
    // Regex: if \s*\(.*?\)\s*(\{?)\s*return;?\s*(\}?)
    // We need to match balanced parens for if condition. This is hard with regex.
    // We'll use a simpler heuristic for now: match single line ifs

    // Case 1: if (...) return; (no braces)
    const regexNoBraces = /if\s*\(([^)]+)\)\s*(return|continue|break)\s*;/g;
    if (regexNoBraces.test(content)) {
        content = content.replace(regexNoBraces, (match, condition, stmt) => {
            changed = true;
            return `if (${condition}) {\n    ${stmt};\n  }`;
        });
    }

    // Case 2: if (...) {return;} (single line braces)
    const regexBraces = /if\s*\(([^)]+)\)\s*\{\s*(return|continue|break)\s*;?\s*\}/g;
    if (regexBraces.test(content)) {
        content = content.replace(regexBraces, (match, condition, stmt) => {
            changed = true;
            return `if (${condition}) {\n    ${stmt};\n  }`;
        });
    }

    // Handle single line statements (assignments/calls) with braces
    const regexBracesStmt = /if\s*\(([^)]+)\)\s*\{\s*([^}]+?);\s*\}/g;
    if (regexBracesStmt.test(content)) {
        content = content.replace(regexBracesStmt, (match, condition, stmt) => {
            // Avoid matching if it's already multi-line (contains newline)
            if (match.includes('\n')) return match;
            changed = true;
            return `if (${condition}) {\n    ${stmt};\n  }`;
        });
    }

    if (changed) {
        fs.writeFileSync(filePath, content, 'utf8');
        console.log(`Fixed ${file}`);
    }
});
