import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Search, Filter, Plus } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTemplateStore } from '@/store/templateStore';
import { useUserStore } from '@/store/userStore';
import { useWorkoutStore } from '@/store/workoutStore';
import { TemplateCategory } from '@/types/workout';
import { CategoryChip } from '@/components/template/CategoryChip';
import { TemplateCarouselCard } from '@/components/template/TemplateCarouselCard';
import { TemplateListCard } from '@/components/template/TemplateListCard';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { EmptyState } from '@/components/common/EmptyState';
import { useToast } from '@/hooks/useToast';
import { prefersReducedMotion } from '@/utils/animations';

const CATEGORIES: Array<{ value: TemplateCategory | 'all'; label: string }> = [
    { value: 'all', label: 'All' },
    { value: 'strength', label: 'Strength' },
    { value: 'hypertrophy', label: 'Hypertrophy' },
    { value: 'cardio', label: 'Cardio' },
    { value: 'home', label: 'Home Workout' },
    { value: 'flexibility', label: 'Flexibility' },
];

export function WorkoutTemplates() {
    const navigate = useNavigate();
    const { profile } = useUserStore();
    const { startWorkoutFromTemplate } = useWorkoutStore();
    const { success, error: showError } = useToast();
    const {
        templates,
        featuredTemplates,
        trendingTemplates,
        isLoading,
        selectedCategory,
        setSelectedCategory,
        loadTemplates,
        loadFeaturedTemplates,
        loadTrendingTemplates,
        searchTemplates,
        getTemplatesByCategory,
    } = useTemplateStore();

    const [searchQuery, setSearchQuery] = useState('');
    const [isSearching, setIsSearching] = useState(false);
    const shouldReduceMotion = prefersReducedMotion();

    useEffect(() => {
        if (profile) {
            loadTemplates(profile.id);
            loadFeaturedTemplates(profile.id);
            loadTrendingTemplates(profile.id);
        }
    }, [profile, loadTemplates, loadFeaturedTemplates, loadTrendingTemplates]);

    useEffect(() => {
        if (!profile) {
    return;
  }

        const timeoutId = setTimeout(() => {
            if (searchQuery.trim()) {
                setIsSearching(true);
                searchTemplates(profile.id, searchQuery);
            } else {
                setIsSearching(false);
                if (selectedCategory === 'all') {
                    loadTemplates(profile.id);
                } else {
                    getTemplatesByCategory(profile.id, selectedCategory);
                }
            }
        }, 300);

        return () => clearTimeout(timeoutId);
    }, [searchQuery, selectedCategory, profile, searchTemplates, loadTemplates, getTemplatesByCategory]);

    const handleCategorySelect = (category: TemplateCategory | 'all') => {
        setSelectedCategory(category);
        setSearchQuery('');
        if (profile) {
            if (category === 'all') {
                loadTemplates(profile.id);
            } else {
                getTemplatesByCategory(profile.id, category);
            }
        }
    };

    const handleTemplateSelect = async (templateId: string) => {
        if (!profile) {
    return;
  }

        try {
            await startWorkoutFromTemplate(templateId);
            success('Workout started from template!');
            navigate('/log-workout');
        } catch (error) {
            showError(error instanceof Error ? error.message : 'Failed to start workout from template');
        }
    };

    const handleCreateTemplate = () => {
        navigate('/create-template');
    };

    const displayedTemplates = useMemo(() => {
        if (isSearching && searchQuery.trim()) {
            return templates;
        }
        return templates;
    }, [templates, isSearching, searchQuery]);

    const combinedFeatured = useMemo(() => {
        // Combine featured and trending, removing duplicates by ID
        const allFeatured = [...featuredTemplates, ...trendingTemplates];
        const uniqueTemplates = Array.from(
            new Map(allFeatured.map((template) => [template.id, template])).values()
        );
        return uniqueTemplates.slice(0, 5);
    }, [featuredTemplates, trendingTemplates]);

    return (
        <div className="relative flex h-full min-h-screen w-full flex-col mx-auto max-w-md bg-background-light dark:bg-background-dark overflow-hidden pb-24">
            {/* Sticky Header */}
            <div className="sticky top-0 z-20 bg-background-light/95 dark:bg-background-dark/95 backdrop-blur-sm pt-4 pb-2">
                {/* Top Bar */}
                <div className="flex items-center h-12 justify-between px-4">
                    <div className="flex items-center justify-start">
                        <button
                            onClick={() => navigate(-1)}
                            className="text-slate-900 dark:text-white flex size-12 shrink-0 items-center justify-center rounded-full hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
                        >
                            <ArrowLeft className="w-6 h-6" />
                        </button>
                    </div>
                    <h1 className="text-xl font-bold tracking-tight text-center flex-1 text-slate-900 dark:text-white">
                        Find your Program
                    </h1>
                    <div className="flex w-12 items-center justify-end">
                        <button className="flex size-12 cursor-pointer items-center justify-center overflow-hidden rounded-full hover:bg-black/5 dark:hover:bg-white/10 transition-colors">
                            <Filter className="w-6 h-6 text-slate-900 dark:text-white" />
                        </button>
                    </div>
                </div>

                {/* Search Bar */}
                <div className="px-4 py-2">
                    <label className="flex flex-col min-w-40 h-12 w-full">
                        <div className="flex w-full flex-1 items-stretch rounded-lg h-full bg-white dark:bg-surface-dark shadow-sm">
                            <div className="text-slate-400 dark:text-secondary-text flex border-none items-center justify-center pl-4 rounded-l-lg border-r-0">
                                <Search className="w-6 h-6" />
                            </div>
                            <input
                                type="text"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="flex w-full min-w-0 flex-1 resize-none overflow-hidden rounded-lg bg-transparent text-slate-900 dark:text-white focus:outline-0 focus:ring-0 border-none h-full placeholder:text-slate-400 dark:placeholder:text-secondary-text/60 px-4 rounded-l-none border-l-0 pl-2 text-base font-normal leading-normal"
                                placeholder="Search for '5x5 Stronglifts'..."
                            />
                        </div>
                    </label>
                </div>
            </div>

            {/* Scrollable Content */}
            <div className="flex flex-col gap-6 overflow-y-auto">
                {/* Quick Action: Create Custom */}
                <div className="px-4">
                    <motion.button
                        onClick={handleCreateTemplate}
                        className="w-full h-14 flex items-center justify-center gap-3 bg-primary rounded-lg shadow-lg hover:brightness-110 active:scale-[0.98] transition-all"
                        whileHover={shouldReduceMotion ? {} : { scale: 1.02 }}
                        whileTap={shouldReduceMotion ? {} : { scale: 0.98 }}
                    >
                        <Plus className="w-6 h-6 text-background-dark font-bold" />
                        <span className="text-background-dark text-base font-bold tracking-wide">
                            Create Custom Template
                        </span>
                    </motion.button>
                </div>

                {/* Categories Chips */}
                <div className="flex gap-3 px-4 overflow-x-auto no-scrollbar pb-1">
                    {CATEGORIES.map((category) => (
                        <CategoryChip
                            key={category.value}
                            label={category.label}
                            isActive={selectedCategory === category.value}
                            onClick={() => handleCategorySelect(category.value)}
                        />
                    ))}
                </div>

                {/* Featured Carousel */}
                {combinedFeatured.length > 0 && (
                    <div className="flex flex-col gap-3">
                        <h3 className="text-slate-900 dark:text-white tracking-tight text-xl font-bold leading-tight px-4">
                            Featured & Trending
                        </h3>
                        <div className="flex overflow-x-auto no-scrollbar px-4 pb-4 -mx-4 md:mx-0 pl-4 gap-4 snap-x">
                            <AnimatePresence>
                                {combinedFeatured.map((template) => (
                                    <TemplateCarouselCard
                                        key={template.id}
                                        template={template}
                                        onClick={() => handleTemplateSelect(template.id)}
                                    />
                                ))}
                            </AnimatePresence>
                        </div>
                    </div>
                )}

                {/* Vertical Program List */}
                <div className="flex flex-col gap-3 px-4">
                    <h3 className="text-slate-900 dark:text-white tracking-tight text-xl font-bold leading-tight">
                        All Programs
                    </h3>

                    {isLoading ? (
                        <div className="flex justify-center items-center py-12">
                            <LoadingSpinner />
                        </div>
                    ) : displayedTemplates.length === 0 ? (
                        <EmptyState
                            title="No templates found"
                            description={
                                searchQuery.trim()
                                    ? 'Try a different search term'
                                    : selectedCategory !== 'all'
                                        ? 'No templates in this category'
                                        : 'Create your first template to get started'
                            }
                        />
                    ) : (
                        <div className="space-y-3">
                            <AnimatePresence>
                                {displayedTemplates.map((template) => (
                                    <TemplateListCard
                                        key={template.id}
                                        template={template}
                                        onClick={() => handleTemplateSelect(template.id)}
                                    />
                                ))}
                            </AnimatePresence>
                        </div>
                    )}
                </div>

                <div className="h-8" />
            </div>
        </div>
    );
}

