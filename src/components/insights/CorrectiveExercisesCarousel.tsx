import { CorrectiveExercise } from '@/types/insights';
import { cleanPlainTextResponse } from '@/utils/aiResponseCleaner';

interface CorrectiveExercisesCarouselProps {
  exercises: CorrectiveExercise[];
}

export function CorrectiveExercisesCarousel({ exercises }: CorrectiveExercisesCarouselProps) {
  if (exercises.length === 0) return null;

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'imbalance':
        return 'text-primary border-primary/20';
      case 'posture':
        return 'text-blue-400 border-blue-400/20';
      default:
        return 'text-gray-400 border-gray-400/20';
    }
  };

  return (
    <div className="mt-6">
      <h3 className="px-4 pb-3 text-slate-900 dark:text-white text-lg font-bold">Corrective Exercises</h3>
      <div className="flex overflow-x-auto px-4 pb-4 gap-4 no-scrollbar snap-x scroll-smooth">
        {exercises.map((exercise) => (
          <div
            key={exercise.id}
            className="snap-center min-w-[260px] max-w-[260px] rounded-xl bg-white dark:bg-card-dark p-3 shadow-sm border border-gray-100 dark:border-white/5 flex flex-col hover:shadow-md transition-shadow"
          >
            <div
              className="h-32 w-full rounded-lg bg-cover bg-center mb-3 relative"
              style={{
                backgroundImage: exercise.imageUrl || 'url("https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=400")',
              }}
            >
              <div className={`absolute top-2 left-2 bg-black/60 backdrop-blur-sm px-2 py-0.5 rounded text-[10px] border ${getCategoryColor(exercise.category)}`}>
                {exercise.category === 'imbalance' ? 'Fix Imbalance' : exercise.category === 'posture' ? 'Posture' : 'Corrective'}
              </div>
            </div>
            <h4 className="text-slate-900 dark:text-white font-bold text-base truncate">{cleanPlainTextResponse(exercise.name)}</h4>
            <p className="text-slate-500 dark:text-text-muted text-xs line-clamp-2 mt-1 mb-3">{cleanPlainTextResponse(exercise.description)}</p>
            <button className="mt-auto w-full py-2 rounded-lg bg-primary/10 hover:bg-primary/20 text-primary text-xs font-bold transition-colors">
              Add to Plan
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

