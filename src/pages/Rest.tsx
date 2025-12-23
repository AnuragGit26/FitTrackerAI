import { useEffect } from 'react';
import { ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useWorkoutStore } from '@/store/workoutStore';
import { useUserStore } from '@/store/userStore';
import { useSettingsStore } from '@/store/settingsStore';
import { RecoveryStatusHeader } from '@/components/rest/RecoveryStatusHeader';
import { RecoveryGraph } from '@/components/rest/RecoveryGraph';
import { SmartCoachInsight } from '@/components/rest/SmartCoachInsight';
import { StrainWarningCard } from '@/components/rest/StrainWarningCard';
import { MuscleGroupStatusCards } from '@/components/rest/MuscleGroupStatusCards';
import { SuggestedWorkoutCard } from '@/components/rest/SuggestedWorkoutCard';
import { RecoveryCalendar } from '@/components/rest/RecoveryCalendar';
import { RestConfigurationPanel } from '@/components/rest/RestConfigurationPanel';

export function Rest() {
  const navigate = useNavigate();
  const { loadWorkouts } = useWorkoutStore();
  const { profile } = useUserStore();
  const { loadSettings } = useSettingsStore();

  useEffect(() => {
    if (profile) {
      loadWorkouts(profile.id);
    }
    loadSettings();
  }, [profile, loadWorkouts, loadSettings]);

  return (
    <div className="relative flex min-h-screen w-full max-w-md mx-auto flex-col overflow-x-hidden bg-background-light dark:bg-background-dark pb-24">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-background-light/90 dark:bg-background-dark/90 backdrop-blur-md border-b border-white/5 p-4 flex items-center justify-between">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center justify-center text-slate-900 dark:text-white hover:text-primary transition-colors"
          aria-label="Back"
        >
          <ArrowLeft className="w-6 h-6" />
        </button>
        <h2 className="text-lg font-bold leading-tight tracking-[-0.015em] flex-1 text-center">
          Recovery & Rest
        </h2>
        <div className="w-6 h-6" /> {/* Spacer for centering */}
      </header>

      {/* System Status Section */}
      <section className="px-4 pt-6 pb-2">
        <RecoveryStatusHeader />
        <div className="w-full h-40 mt-6 relative">
          <RecoveryGraph />
        </div>
      </section>

      {/* Smart Coach Insight */}
      <section className="px-4 py-4">
        <SmartCoachInsight />
      </section>

      {/* Strain Warning */}
      <section className="px-4 pb-6">
        <StrainWarningCard />
      </section>

      {/* Muscle Group Status */}
      <section className="border-t border-slate-200 dark:border-white/5 py-6">
        <div className="flex items-center justify-between px-4 mb-4">
          <h3 className="text-lg font-bold leading-tight">Muscle Group Status</h3>
          <button className="text-primary text-sm font-medium hover:underline">
            View All
          </button>
        </div>
        <MuscleGroupStatusCards />
      </section>

      {/* Suggested Workout */}
      <SuggestedWorkoutCard />

      {/* Calendar Schedule */}
      <section className="px-4 py-6">
        <RecoveryCalendar />
      </section>

      {/* Configuration */}
      <section className="px-4 pb-10">
        <RestConfigurationPanel />
      </section>
    </div>
  );
}

