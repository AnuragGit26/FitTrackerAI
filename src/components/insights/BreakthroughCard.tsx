import { TrendingUp } from 'lucide-react';
import { BreakthroughInsight } from '@/types/insights';
import { cleanPlainTextResponse } from '@/utils/aiResponseCleaner';
import { useUserStore, unitHelpers } from '@/store/userStore';

interface BreakthroughCardProps {
  breakthrough?: BreakthroughInsight;
}

export function BreakthroughCard({ breakthrough }: BreakthroughCardProps) {
  const { profile } = useUserStore();

  if (!breakthrough || !breakthrough.exercise || !breakthrough.projectedWeight) return null;

  // Convert weight based on user's preferred unit
  const preferredUnit = profile?.preferredUnit || 'kg';
  const displayWeight = preferredUnit === 'lbs' 
    ? Math.round(unitHelpers.kgToLbs(breakthrough.projectedWeight))
    : Math.round(breakthrough.projectedWeight);
  const unitLabel = preferredUnit === 'lbs' ? 'lbs' : 'kg';

  return (
    <section>
      <div className="flex flex-col items-stretch justify-start rounded-xl shadow-lg bg-white dark:bg-surface-dark overflow-hidden ring-1 ring-black/5 dark:ring-white/5">
        <div
          className="relative w-full h-40 bg-center bg-no-repeat bg-cover"
          style={{
            backgroundImage: 'url("https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=800")',
          }}
        >
          <div className="absolute inset-0 bg-gradient-to-t from-surface-dark via-surface-dark/60 to-transparent" />
          <div className="absolute bottom-4 left-4 right-4">
            <span className="inline-flex items-center gap-1 bg-primary text-background-dark text-xs font-bold px-2 py-0.5 rounded mb-2">
              <TrendingUp className="w-3.5 h-3.5" />
              BREAKTHROUGH
            </span>
            <h3 className="text-white text-xl font-bold leading-tight drop-shadow-md">
              New PR Projected: {cleanPlainTextResponse(breakthrough.exercise)}
            </h3>
          </div>
        </div>
        <div className="flex w-full flex-col items-stretch justify-center gap-3 p-4">
          <p className="text-slate-600 dark:text-secondary-text text-sm font-normal leading-relaxed">
            Based on your velocity trends, you are ready to attempt a new max of{' '}
            <span className="text-slate-900 dark:text-white font-bold">{displayWeight} {unitLabel}</span>.
            {breakthrough.improvementPercent !== undefined && (
              <>
                {' '}Your speed out of the hole has improved by{' '}
                <span className="text-green-600 dark:text-primary font-bold">{breakthrough.improvementPercent}%</span>.
              </>
            )}
          </p>
        </div>
      </div>
    </section>
  );
}

