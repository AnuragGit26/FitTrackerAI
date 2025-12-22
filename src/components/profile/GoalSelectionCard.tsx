import { Goal } from '@/store/userStore';
import { Dumbbell, Activity, Zap, Heart } from 'lucide-react';
import { cn } from '@/utils/cn';

interface GoalOption {
  id: Goal;
  label: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
}

const goalOptions: GoalOption[] = [
  {
    id: 'gain_strength',
    label: 'Strength',
    description: 'Build raw power & muscle mass',
    icon: Dumbbell,
  },
  {
    id: 'improve_endurance',
    label: 'Endurance',
    description: 'Improve cardio & stamina',
    icon: Activity,
  },
  {
    id: 'lose_fat',
    label: 'Weight Loss',
    description: 'Burn fat & get lean',
    icon: Zap,
  },
  {
    id: 'general_fitness',
    label: 'Flexibility',
    description: 'Mobility & movement',
    icon: Heart,
  },
];

interface GoalSelectionCardProps {
  goal: GoalOption;
  isSelected: boolean;
  onSelect: () => void;
}

function GoalCard({ goal, isSelected, onSelect }: GoalSelectionCardProps) {
  const Icon = goal.icon;

  return (
    <div
      onClick={onSelect}
      className={cn(
        'cursor-pointer group relative overflow-hidden rounded-xl border-2 p-4 transition-all',
        isSelected
          ? 'border-primary bg-primary/10 hover:bg-primary/20'
          : 'border-transparent bg-white dark:bg-surface-dark hover:border-primary/50 hover:bg-gray-50 dark:hover:bg-surface-border/50'
      )}
    >
      <div
        className={cn(
          'mb-2 inline-flex rounded-full p-2',
          isSelected
            ? 'bg-primary/20 text-primary'
            : 'bg-gray-100 dark:bg-background-dark text-slate-500 dark:text-slate-300'
        )}
      >
        <Icon className="w-5 h-5" />
      </div>
      <h4 className="text-base font-bold text-slate-900 dark:text-white">{goal.label}</h4>
      <p
        className={cn(
          'text-xs mt-1',
          isSelected
            ? 'text-slate-600 dark:text-slate-300'
            : 'text-slate-500 dark:text-slate-400'
        )}
      >
        {goal.description}
      </p>
      {isSelected && (
        <div className="absolute top-3 right-3 text-primary">
          <svg
            className="w-6 h-6"
            fill="currentColor"
            viewBox="0 0 20 20"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              fillRule="evenodd"
              d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
              clipRule="evenodd"
            />
          </svg>
        </div>
      )}
    </div>
  );
}

interface GoalSelectionProps {
  selectedGoals: Goal[];
  onGoalsChange: (goals: Goal[]) => void;
}

export function GoalSelection({ selectedGoals, onGoalsChange }: GoalSelectionProps) {
  const handleGoalToggle = (goalId: Goal) => {
    if (selectedGoals.includes(goalId)) {
      onGoalsChange(selectedGoals.filter((g) => g !== goalId));
    } else {
      onGoalsChange([...selectedGoals, goalId]);
    }
  };

  return (
    <div className="grid grid-cols-2 gap-3">
      {goalOptions.map((goal) => (
        <GoalCard
          key={goal.id}
          goal={goal}
          isSelected={selectedGoals.includes(goal.id)}
          onSelect={() => handleGoalToggle(goal.id)}
        />
      ))}
    </div>
  );
}

