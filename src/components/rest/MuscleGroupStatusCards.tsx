import { CheckCircle2 } from 'lucide-react';
import { useMuscleRecovery } from '@/hooks/useMuscleRecovery';
import { MuscleGroup, RecoveryStatus } from '@/types/muscle';
import { cn } from '@/utils/cn';
import { MuscleGroupIcon } from './MuscleGroupIcon';

interface MuscleGroupStatusCardProps {
  muscle: MuscleGroup;
  recoveryPercentage: number;
  recoveryStatus: RecoveryStatus;
  remainingHours?: number;
}

function MuscleGroupStatusCard({
  muscle,
  recoveryPercentage,
  recoveryStatus,
  remainingHours,
}: MuscleGroupStatusCardProps) {
  // Ensure recoveryPercentage is valid to prevent rendering issues
  const validPercentage = Math.max(0, Math.min(100, isNaN(recoveryPercentage) ? 0 : recoveryPercentage));
  const isReady = recoveryStatus === 'ready' || validPercentage >= 100;
  const isRecovering = recoveryStatus === 'recovering' || recoveryStatus === 'fresh';
  const isOverworked = recoveryStatus === 'overworked' || recoveryStatus === 'sore';

  let statusColor = 'text-primary';
  let statusText = 'Ready to Train';
  let borderColor = 'border-primary/30';

  if (isOverworked) {
    statusColor = 'text-warning';
    statusText = remainingHours ? `${Math.ceil(remainingHours / 24)}h remaining` : 'Rest Needed';
    borderColor = 'border-slate-200 dark:border-white/5';
  } else if (isRecovering) {
    statusColor = 'text-caution';
    statusText = remainingHours ? `${Math.ceil(remainingHours)}h remaining` : 'Recovering';
    borderColor = 'border-slate-200 dark:border-white/5';
  }

  const muscleName = muscle
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');

  // Calculate stroke-dasharray for circular progress
  const circumference = 2 * Math.PI * 15.9155; // radius * 2 * PI
  const strokeDasharray = `${(validPercentage / 100) * circumference}, ${circumference}`;

  return (
    <div
      className={cn(
        'snap-center min-w-[140px] flex flex-col gap-3 rounded-2xl bg-slate-100 dark:bg-white/5 p-4 border relative',
        isReady
          ? 'border-primary/30 shadow-[0_0_15px_rgba(13,242,105,0.1)]'
          : borderColor
      )}
    >
      {isReady && (
        <div className="absolute top-2 right-2 text-primary">
          <CheckCircle2 className="w-5 h-5" />
        </div>
      )}
      <div className="relative w-24 h-24 mx-auto">
        <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
          {/* Background circle */}
          <path
            className="text-slate-300 dark:text-slate-700"
            d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
            fill="none"
            stroke="currentColor"
            strokeWidth="3"
          />
          {/* Progress circle */}
          <path
            className={cn(
              isReady ? 'text-primary' : isOverworked ? 'text-warning' : 'text-caution'
            )}
            d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
            fill="none"
            stroke="currentColor"
            strokeDasharray={strokeDasharray}
            strokeWidth="3"
          />
        </svg>
        {/* Muscle group icon */}
        <MuscleGroupIcon muscle={muscle} recoveryStatus={recoveryStatus} />
      </div>
      <div className="text-center">
        <p className="font-bold text-slate-900 dark:text-white">{muscleName}</p>
        <p className={cn('text-xs font-medium', statusColor)}>{statusText}</p>
      </div>
    </div>
  );
}

export function MuscleGroupStatusCards() {
  const { muscleStatuses, isLoading } = useMuscleRecovery();

  if (isLoading) {
    return (
      <div className="flex overflow-x-auto gap-4 px-4 pb-4 [-ms-scrollbar-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden snap-x snap-mandatory">
        <div className="snap-center min-w-[140px] h-40 bg-slate-100 dark:bg-white/5 rounded-2xl animate-pulse" />
        <div className="snap-center min-w-[140px] h-40 bg-slate-100 dark:bg-white/5 rounded-2xl animate-pulse" />
        <div className="snap-center min-w-[140px] h-40 bg-slate-100 dark:bg-white/5 rounded-2xl animate-pulse" />
      </div>
    );
  }

  // Deduplicate muscle groups - keep the most recent entry for each muscle
  const uniqueStatuses = muscleStatuses.reduce((acc, status) => {
    const existing = acc.find(s => s.muscle === status.muscle);
    
    if (!existing) {
      acc.push(status);
    } else {
      // Keep the one with the most recent lastWorked date
      const existingDate = existing.lastWorked ? new Date(existing.lastWorked).getTime() : 0;
      const currentDate = status.lastWorked ? new Date(status.lastWorked).getTime() : 0;
      
      if (currentDate > existingDate) {
        // Replace with more recent entry
        const index = acc.indexOf(existing);
        acc[index] = status;
      }
    }
    
    return acc;
  }, [] as typeof muscleStatuses);

  // Sort by recovery percentage (highest first), then by muscle name for consistency
  const sortedStatuses = [...uniqueStatuses].sort((a, b) => {
    // First sort by recovery percentage (descending)
    if (b.recoveryPercentage !== a.recoveryPercentage) {
      return b.recoveryPercentage - a.recoveryPercentage;
    }
    // If recovery is the same, sort alphabetically by muscle name
    return a.muscle.localeCompare(b.muscle);
  });

  // Show top 6 muscle groups or all if less than 6
  const displayStatuses = sortedStatuses.slice(0, 6);

  if (displayStatuses.length === 0) {
    return (
      <div className="px-4 pb-4">
        <p className="text-slate-500 dark:text-slate-400 text-sm text-center py-8">
          No muscle group data available. Log a workout to see recovery status.
        </p>
      </div>
    );
  }

  return (
    <div className="flex overflow-x-auto gap-4 px-4 pb-4 scrollbar-hide snap-x snap-mandatory">
      {displayStatuses.map((status, index) => {
        const remainingHours = status.recommendedRestDays * 24;
        return (
          <MuscleGroupStatusCard
            key={`${status.muscle}-${index}-${status.recoveryPercentage}`}
            muscle={status.muscle}
            recoveryPercentage={status.recoveryPercentage}
            recoveryStatus={status.recoveryStatus}
            remainingHours={remainingHours}
          />
        );
      })}
    </div>
  );
}

