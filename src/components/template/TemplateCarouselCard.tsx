import { useState } from 'react';
import { motion } from 'framer-motion';
import { Sparkles, Flame } from 'lucide-react';
import { WorkoutTemplate } from '@/types/workout';
import { logger } from '@/utils/logger';

interface TemplateCarouselCardProps {
    template: WorkoutTemplate;
    onClick: () => void;
}

export function TemplateCarouselCard({ template, onClick }: TemplateCarouselCardProps) {
    const [imageError, setImageError] = useState(false);
    const [imageLoading, setImageLoading] = useState(true);
    const difficultyLabel = template.difficulty
        ? template.difficulty.charAt(0).toUpperCase() + template.difficulty.slice(1)
        : 'All Levels';
    const daysLabel = template.daysPerWeek ? `${template.daysPerWeek} Days/Week` : '';
    const durationLabel = template.estimatedDuration ? `${template.estimatedDuration} min` : '';

    const hasValidImage = template.imageUrl && !imageError;

    return (
        <motion.div
            onClick={onClick}
            className="snap-center flex flex-col gap-3 shrink-0 w-[280px] bg-white dark:bg-surface-dark p-3 rounded-xl border border-slate-100 dark:border-white/5 shadow-sm cursor-pointer"
            whileHover={{ scale: 1.02, y: -2 }}
            whileTap={{ scale: 0.98 }}
        >
            {/* Image/Visual */}
            <div className="relative w-full aspect-video rounded-lg overflow-hidden bg-gradient-to-br from-primary to-background-dark">
                {hasValidImage ? (
                    <img
                        src={template.imageUrl}
                        alt={template.name}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                            logger.error(`Failed to load image for "${template.name}":`, e, { imageUrl: template.imageUrl });
                            setImageError(true);
                            setImageLoading(false);
                        }}
                        onLoad={() => {
                            logger.debug(`Successfully loaded image for "${template.name}"`);
                            setImageLoading(false);
                        }}
                        crossOrigin="anonymous"
                    />
                ) : (
                    <div className="w-full h-full flex items-center justify-center">
                        <div className="text-background-dark/20 text-4xl font-bold">
                            {template.name.charAt(0)}
                        </div>
                        {template.imageUrl && (
                            <div className="absolute bottom-0 left-0 right-0 bg-black/50 text-white text-xs p-1">
                                No image: {template.imageUrl ? 'URL exists' : 'No URL'}
                            </div>
                        )}
                    </div>
                )}
                {template.isFeatured && (
                    <div className="absolute top-2 left-2 bg-primary/90 text-background-dark text-xs font-bold px-2 py-1 rounded backdrop-blur-md">
                        AI Recommended
                    </div>
                )}
                {template.isTrending && !template.isFeatured && (
                    <div className="absolute top-2 left-2 bg-black/60 text-white text-xs font-bold px-2 py-1 rounded backdrop-blur-md">
                        Trending
                    </div>
                )}
            </div>

            {/* Content */}
            <div>
                <div className="flex justify-between items-start">
                    <p className="text-slate-900 dark:text-white text-lg font-bold leading-tight">
                        {template.name}
                    </p>
                    {template.isFeatured && (
                        <Sparkles className="w-5 h-5 text-primary shrink-0" />
                    )}
                    {template.isTrending && !template.isFeatured && (
                        <Flame className="w-5 h-5 text-orange-500 shrink-0" />
                    )}
                </div>
                <p className="text-slate-500 dark:text-secondary-text text-sm mt-1">
                    {difficultyLabel}
                    {daysLabel && ` • ${daysLabel}`}
                    {durationLabel && !daysLabel && ` • ${durationLabel}`}
                </p>
            </div>
        </motion.div>
    );
}

