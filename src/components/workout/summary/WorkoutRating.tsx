import { WorkoutRating as WorkoutRatingType } from '@/types/workoutSummary';

interface WorkoutRatingProps {
  rating: WorkoutRatingType;
}

export function WorkoutRating({ rating }: WorkoutRatingProps) {
  const percentage = (rating.score / 10) * 100;
  const circumference = 2 * Math.PI * 15.9155; // radius = 15.9155 for 36x36 viewBox
  const strokeDasharray = `${(percentage / 100) * circumference}, ${circumference}`;

  return (
    <div className="px-4 pb-6">
      <h3 className="text-slate-900 dark:text-white text-lg font-bold mb-3 px-1">Workout Rating</h3>
      <div className="relative w-full rounded-2xl bg-gradient-to-br from-[#18181b] to-black border border-[#27272a] p-6 overflow-hidden">
        {/* Background Decoration */}
        <div className="absolute -top-10 -right-10 w-40 h-40 bg-primary/20 rounded-full blur-3xl"></div>
        <div className="flex items-center justify-between relative z-10">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-primary font-bold tracking-widest text-sm uppercase">
                {rating.tier} Performance
              </span>
              <span className="material-symbols-outlined text-primary text-sm">verified</span>
            </div>
            <h2 className="text-4xl font-bold text-white mb-2">
              {rating.score.toFixed(1)}
              <span className="text-xl text-gray-400 font-normal">/10</span>
            </h2>
            <p className="text-gray-400 text-xs leading-relaxed max-w-[80%]">{rating.summary}</p>
          </div>
          {/* Circular Progress SVG */}
          <div className="relative size-20 shrink-0">
            <svg
              className="size-full -rotate-90"
              viewBox="0 0 36 36"
              xmlns="http://www.w3.org/2000/svg"
            >
              {/* Background Circle */}
              <path
                className="text-gray-700"
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                fill="none"
                stroke="currentColor"
                strokeDasharray="100, 100"
                strokeWidth="4"
              />
              {/* Progress Circle */}
              <path
                className="text-primary drop-shadow-[0_0_8px_rgba(255,153,51,0.6)]"
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                fill="none"
                stroke="currentColor"
                strokeDasharray={strokeDasharray}
                strokeWidth="4"
              />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="material-symbols-outlined text-white text-3xl">emoji_events</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

