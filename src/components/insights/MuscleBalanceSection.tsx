import { AlertTriangle } from 'lucide-react';
import { MuscleImbalance } from '@/types/insights';
import { useNavigate } from 'react-router-dom';
import { MuscleGroup } from '@/types/muscle';

interface MuscleBalanceSectionProps {
  imbalances: MuscleImbalance[];
}

function formatMuscleName(muscle: MuscleGroup): string {
  return muscle
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}

export function MuscleBalanceSection({ imbalances }: MuscleBalanceSectionProps) {
  const navigate = useNavigate();

  if (imbalances.length === 0) {
    return null;
  }

  const imbalance = imbalances[0];
  const maxVolume = Math.max(imbalance.leftVolume, imbalance.rightVolume, 1);
  const leftPercent = (imbalance.leftVolume / maxVolume) * 100;
  const rightPercent = (imbalance.rightVolume / maxVolume) * 100;

  return (
    <div className="mt-2">
      <div className="flex items-center justify-between px-4 pb-3 pt-2">
        <h3 className="text-slate-900 dark:text-white text-lg font-bold">Muscle Balance</h3>
        <button
          onClick={() => navigate('/anatomy')}
          className="text-primary text-sm font-medium"
        >
          View Body Map
        </button>
      </div>
      <div className="px-4">
        <div className="rounded-xl bg-white dark:bg-card-dark p-4 shadow-sm border border-gray-100 dark:border-white/5 flex flex-col gap-4">
          <div className="flex gap-3 p-3 rounded-lg bg-red-500/10 border border-red-500/20 items-start">
            <AlertTriangle className="w-5 h-5 text-red-500 shrink-0" />
            <div>
              <h4 className="text-red-500 text-sm font-bold">Imbalance Detected</h4>
              <p className="text-slate-400 dark:text-gray-400 text-xs leading-relaxed mt-1">
                Left {formatMuscleName(imbalance.muscle)} is lagging by {imbalance.imbalancePercent}% in total volume compared to the right.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-4 mt-1">
            <div
              className="w-1/3 aspect-[3/4] rounded-lg bg-center bg-cover relative overflow-hidden"
              style={{
                backgroundImage: 'url("https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=200")',
              }}
            >
              <div className="absolute inset-0 bg-black/40" />
              <div className="absolute bottom-2 left-2 text-white text-xs font-bold">Legs</div>
            </div>
            <div className="flex-1 flex flex-col justify-center gap-4">
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-white font-medium">Left Leg</span>
                  <span className="text-red-400">Low Volume</span>
                </div>
                <div className="w-full h-2 bg-black/40 rounded-full">
                  <div className="h-full bg-red-500 rounded-full transition-all" style={{ width: `${leftPercent}%` }} />
                </div>
              </div>
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-white font-medium">Right Leg</span>
                  <span className="text-primary">Optimal</span>
                </div>
                <div className="w-full h-2 bg-black/40 rounded-full">
                  <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${rightPercent}%` }} />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

