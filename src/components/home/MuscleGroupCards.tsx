import { CheckCircle2 } from 'lucide-react';
import { useMuscleRecovery } from '@/hooks/useMuscleRecovery';
import { MuscleGroup, RecoveryStatus } from '@/types/muscle';
import { cn } from '@/utils/cn';
import { cardStyles } from '@/utils/styleHelpers';
import { spacing, borderRadius, typography, transitions } from '@/styles/designSystem';
import { MuscleGroupIcon } from '@/components/rest/MuscleGroupIcon';
import { getTopMusclesByStatus } from '@/utils/recoveryHelpers';
import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';

interface MuscleGroupCardProps {
  muscle: MuscleGroup;
  recoveryPercentage: number;
  recoveryStatus: RecoveryStatus;
  remainingHours?: number;
  onClick?: () => void;
}

function MuscleGroupCard({
  muscle,
  recoveryPercentage,
  recoveryStatus,
  remainingHours,
  onClick,
}: MuscleGroupCardProps) {
  const validPercentage = Math.max(0, Math.min(100, isNaN(recoveryPercentage) ? 0 : recoveryPercentage));
  const isOverworked = recoveryStatus === 'overworked' || recoveryStatus === 'sore';
  const isReady = (recoveryStatus === 'ready' || validPercentage >= 100) && !isOverworked;
  const isRecovering = recoveryStatus === 'recovering' || (recoveryStatus === 'fresh' && validPercentage < 100);

  let statusColor = 'text-primary';
  let statusText = 'Ready';
  let borderColor = 'border-primary/30';

  if (isOverworked) {
    statusColor = 'text-warning';
    statusText = remainingHours ? `${Math.ceil(remainingHours / 24)}d` : 'Rest';
    borderColor = 'border-slate-200 dark:border-white/5';
  } else if (isReady) {
    statusColor = 'text-primary';
    statusText = 'Ready';
    borderColor = 'border-primary/30';
  } else if (isRecovering) {
    statusColor = 'text-caution';
    statusText = remainingHours ? `${Math.ceil(remainingHours)}h` : 'Recovering';
    borderColor = 'border-slate-200 dark:border-white/5';
  }

  const muscleName = muscle
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');

  const circumference = 2 * Math.PI * 15.9155;
  const strokeDasharray = `${(validPercentage / 100) * circumference}, ${circumference}`;

  return (
    <div
      className={cn(
        'snap-center min-w-[120px] flex flex-col relative border cursor-pointer hover:scale-105',
        cardStyles('compact'),
        spacing.tight,
        borderRadius.card,
        transitions.base,
        isReady
          ? 'border-primary/30 shadow-[0_0_10px_rgba(255,153,51,0.1)]'
          : borderColor
      )}
      onClick={onClick}
    >
      {isReady && (
        <div className="absolute top-1.5 right-1.5 text-primary">
          <CheckCircle2 className="w-4 h-4" />
        </div>
      )}
      <div className="relative w-16 h-16 mx-auto">
        <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
          <path
            className="text-slate-300 dark:text-slate-700"
            d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
          />
          <path
            className={cn(
              isReady ? 'text-primary' : isOverworked ? 'text-warning' : 'text-caution'
            )}
            d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
            fill="none"
            stroke="currentColor"
            strokeDasharray={strokeDasharray}
            strokeWidth="2.5"
          />
        </svg>
        <MuscleGroupIcon muscle={muscle} recoveryStatus={recoveryStatus} />
      </div>
      <div className="text-center">
        <p className={cn(typography.cardTitle, 'text-xs')}>{muscleName}</p>
        <p className={cn(typography.bodySmall, 'font-medium', statusColor)}>{statusText}</p>
      </div>
    </div>
  );
}

export function MuscleGroupCards() {
  const { muscleStatuses, isLoading } = useMuscleRecovery();
  const navigate = useNavigate();

  const displayStatuses = useMemo(() => {
    if (isLoading || muscleStatuses.length === 0) {
    return [];
  }

    const uniqueStatuses = muscleStatuses.reduce((acc, status) => {
      const existing = acc.find(s => s.muscle === status.muscle);
      
      if (!existing) {
        acc.push(status);
      } else {
        const existingDate = existing.lastWorked 
          ? (existing.lastWorked instanceof Date ? existing.lastWorked.getTime() : new Date(existing.lastWorked).getTime())
          : 0;
        const currentDate = status.lastWorked 
          ? (status.lastWorked instanceof Date ? status.lastWorked.getTime() : new Date(status.lastWorked).getTime())
          : 0;
        
        // Handle invalid dates
        const t1 = isNaN(existingDate) ? 0 : existingDate;
        const t2 = isNaN(currentDate) ? 0 : currentDate;
        
        if (t2 > t1) {
          const index = acc.indexOf(existing);
          acc[index] = status;
        }
      }
      
      return acc;
    }, [] as typeof muscleStatuses);

    return getTopMusclesByStatus(uniqueStatuses, 6, 'all');
  }, [muscleStatuses, isLoading]);

  if (isLoading) {
    return (
      <div className={cn('flex overflow-x-auto px-5 pb-4 snap-x snap-mandatory scrollbar-hide', spacing.normal)}>
        <div className={cn('snap-center min-w-[120px] h-32 animate-pulse', cardStyles('compact'), borderRadius.card)} />
        <div className={cn('snap-center min-w-[120px] h-32 animate-pulse', cardStyles('compact'), borderRadius.card)} />
        <div className={cn('snap-center min-w-[120px] h-32 animate-pulse', cardStyles('compact'), borderRadius.card)} />
      </div>
    );
  }

  if (displayStatuses.length === 0) {
    return null;
  }

  return (
    <div className={cn('flex overflow-x-auto px-5 pb-4 scrollbar-hide snap-x snap-mandatory', spacing.normal)}>
      {displayStatuses.map((status, index) => {
        const remainingHours = status.recommendedRestDays * 24;
        return (
          <MuscleGroupCard
            key={`${status.muscle}-${index}-${status.recoveryPercentage}`}
            muscle={status.muscle}
            recoveryPercentage={status.recoveryPercentage}
            recoveryStatus={status.recoveryStatus}
            remainingHours={remainingHours}
            onClick={() => navigate('/rest')}
          />
        );
      })}
    </div>
  );
}

