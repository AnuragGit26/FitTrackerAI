import { create } from 'zustand';
import { WorkoutTemplate, TemplateCategory } from '@/types/workout';
import { templateService } from '@/services/templateService';

interface TemplateState {
    templates: WorkoutTemplate[];
    featuredTemplates: WorkoutTemplate[];
    trendingTemplates: WorkoutTemplate[];
    isLoading: boolean;
    error: string | null;
    selectedCategory: TemplateCategory | 'all';

    // Actions
    loadTemplates: (userId: string) => Promise<void>;
    loadFeaturedTemplates: (userId: string) => Promise<void>;
    loadTrendingTemplates: (userId: string) => Promise<void>;
    searchTemplates: (userId: string, query: string) => Promise<void>;
    getTemplatesByCategory: (userId: string, category: TemplateCategory) => Promise<void>;
    createTemplate: (template: Omit<WorkoutTemplate, 'id' | 'createdAt' | 'updatedAt'>) => Promise<string>;
    updateTemplate: (id: string, updates: Partial<Omit<WorkoutTemplate, 'id' | 'createdAt'>>) => Promise<void>;
    deleteTemplate: (id: string) => Promise<void>;
    getTemplateById: (id: string) => Promise<WorkoutTemplate | undefined>;
    setSelectedCategory: (category: TemplateCategory | 'all') => void;
    clearError: () => void;
}

export const useTemplateStore = create<TemplateState>((set) => ({
    templates: [],
    featuredTemplates: [],
    trendingTemplates: [],
    isLoading: false,
    error: null,
    selectedCategory: 'all',

    loadTemplates: async (userId: string) => {
        set({ isLoading: true, error: null });
        try {
            const templates = await templateService.getAllTemplates(userId);
            set({ templates: templates ?? [], isLoading: false });
        } catch (error) {
            set({
                error: error instanceof Error ? error.message : 'Failed to load templates',
                isLoading: false,
            });
        }
    },

    loadFeaturedTemplates: async (userId: string) => {
        set({ isLoading: true, error: null });
        try {
            const featured = await templateService.getFeaturedTemplates(userId);
            set({ featuredTemplates: featured ?? [], isLoading: false });
        } catch (error) {
            set({
                error: error instanceof Error ? error.message : 'Failed to load featured templates',
                isLoading: false,
            });
        }
    },

    loadTrendingTemplates: async (userId: string) => {
        set({ isLoading: true, error: null });
        try {
            const trending = await templateService.getTrendingTemplates(userId);
            set({ trendingTemplates: trending ?? [], isLoading: false });
        } catch (error) {
            set({
                error: error instanceof Error ? error.message : 'Failed to load trending templates',
                isLoading: false,
            });
        }
    },

    searchTemplates: async (userId: string, query: string) => {
        set({ isLoading: true, error: null });
        try {
            const templates = await templateService.searchTemplates(userId, query);
            set({ templates: templates ?? [], isLoading: false });
        } catch (error) {
            set({
                error: error instanceof Error ? error.message : 'Failed to search templates',
                isLoading: false,
            });
        }
    },

    getTemplatesByCategory: async (userId: string, category: TemplateCategory) => {
        set({ isLoading: true, error: null });
        try {
            const templates = await templateService.getTemplatesByCategory(userId, category);
            set({ templates: templates ?? [], isLoading: false });
        } catch (error) {
            set({
                error: error instanceof Error ? error.message : 'Failed to get templates by category',
                isLoading: false,
            });
        }
    },

    createTemplate: async (template: Omit<WorkoutTemplate, 'id' | 'createdAt' | 'updatedAt'>) => {
        set({ isLoading: true, error: null });
        try {
            const id = await templateService.createTemplate(template);
            const newTemplate = await templateService.getTemplate(id);
            if (newTemplate) {
                set((state) => ({
                    templates: [newTemplate, ...(state.templates ?? [])],
                    isLoading: false,
                }));
            }
            return id;
        } catch (error) {
            set({
                error: error instanceof Error ? error.message : 'Failed to create template',
                isLoading: false,
            });
            throw error;
        }
    },

    updateTemplate: async (id: string, updates: Partial<Omit<WorkoutTemplate, 'id' | 'createdAt'>>) => {
        set({ isLoading: true, error: null });
        try {
            await templateService.updateTemplate(id, updates);
            const updatedTemplate = await templateService.getTemplate(id);
            if (updatedTemplate) {
                set((state) => ({
                    templates: (state.templates ?? []).map((t) => (t.id === id ? updatedTemplate : t)),
                    featuredTemplates: (state.featuredTemplates ?? []).map((t) => (t.id === id ? updatedTemplate : t)),
                    trendingTemplates: (state.trendingTemplates ?? []).map((t) => (t.id === id ? updatedTemplate : t)),
                    isLoading: false,
                }));
            }
        } catch (error) {
            set({
                error: error instanceof Error ? error.message : 'Failed to update template',
                isLoading: false,
            });
        }
    },

    deleteTemplate: async (id: string) => {
        set({ isLoading: true, error: null });
        try {
            await templateService.deleteTemplate(id);
            set((state) => ({
                templates: (state.templates ?? []).filter((t) => t.id !== id),
                featuredTemplates: (state.featuredTemplates ?? []).filter((t) => t.id !== id),
                trendingTemplates: (state.trendingTemplates ?? []).filter((t) => t.id !== id),
                isLoading: false,
            }));
        } catch (error) {
            set({
                error: error instanceof Error ? error.message : 'Failed to delete template',
                isLoading: false,
            });
        }
    },

    getTemplateById: async (id: string) => {
        try {
            return await templateService.getTemplate(id);
        } catch (error) {
            set({
                error: error instanceof Error ? error.message : 'Failed to get template',
            });
            return undefined;
        }
    },

    setSelectedCategory: (category: TemplateCategory | 'all') => {
        set({ selectedCategory: category });
    },

    clearError: () => {
        set({ error: null });
    },
}));

