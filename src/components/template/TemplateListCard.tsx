import { useState } from 'react';
import { motion } from 'framer-motion';
import { ChevronRight, CheckCircle2, Dumbbell, Zap, Home, Activity } from 'lucide-react';
import { WorkoutTemplate, TemplateCategory } from '@/types/workout';
import { cn } from '@/utils/cn';

interface TemplateListCardProps {
    template: WorkoutTemplate;
    onClick: () => void;
}

const categoryIcons: Record<TemplateCategory, typeof Dumbbell> = {
    strength: Dumbbell,
    hypertrophy: Dumbbell,
    cardio: Zap,
    home: Home,
    flexibility: Activity,
};

export function TemplateListCard({ template, onClick }: TemplateListCardProps) {
    const [imageError, setImageError] = useState(false);
    const Icon = categoryIcons[template.category] || Dumbbell;
    const difficultyLabel = template.difficulty
        ? template.difficulty.charAt(0).toUpperCase() + template.difficulty.slice(1)
        : 'All Levels';
    const daysLabel = template.daysPerWeek ? `${template.daysPerWeek} Days/Week` : '';
    const durationLabel = template.estimatedDuration ? `${template.estimatedDuration} min` : '';

    const hasValidImage = template.imageUrl && !imageError;

    return (
        <motion.div
            onClick={onClick}
            className="group flex items-center gap-4 bg-white dark:bg-surface-dark p-4 rounded-xl border border-slate-100 dark:border-white/5 shadow-sm active:scale-[0.99] transition-transform cursor-pointer"
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.99 }}
        >
            {/* Visual Indicator - Image or Icon */}
            <div className="h-16 w-16 bg-slate-100 dark:bg-surface-highlight rounded-lg flex items-center justify-center shrink-0 relative overflow-hidden">
                {hasValidImage ? (
                    <img
                        src={template.imageUrl}
                        alt={template.name}
                        className="w-full h-full object-cover"
                        onError={() => setImageError(true)}
                    />
                ) : (
                    <>
                        <Icon className="w-10 h-10 text-slate-400 dark:text-white/20" />
                        <div className="absolute inset-0 bg-primary/10 flex items-center justify-center" />
                    </>
                )}
            </div>

            {/* Content */}
            <div className="flex flex-col flex-1 min-w-0">
                <div className="flex justify-between items-center mb-1">
                    <h4 className="text-slate-900 dark:text-white font-bold truncate">
                        {template.name}
                    </h4>
                </div>
                <p className="text-slate-500 dark:text-secondary-text text-xs mb-2">
                    {difficultyLabel}
                    {daysLabel && ` • ${daysLabel}`}
                </p>
                <div className="flex items-center gap-2">
                    {template.matchPercentage && template.matchPercentage > 0 && (
                        <div className="flex items-center gap-1 bg-primary/10 px-2 py-0.5 rounded text-primary text-[10px] font-bold uppercase tracking-wider">
                            <CheckCircle2 className="w-3 h-3" />
                            {template.matchPercentage}% Match
                        </div>
                    )}
                    {durationLabel && (
                        <span className="text-slate-400 text-[10px]">• {durationLabel}</span>
                    )}
                </div>
            </div>

            {/* Arrow */}
            <div className="flex items-center justify-center size-8 rounded-full bg-slate-100 dark:bg-white/5 group-hover:bg-primary group-hover:text-background-dark transition-colors">
                <ChevronRight className="w-5 h-5 text-slate-400 dark:text-white/40 group-hover:text-background-dark" />
            </div>
        </motion.div>
    );
}

