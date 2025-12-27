import { create } from 'zustand';
import { dataService } from '@/services/dataService';
import { userContextManager } from '@/services/userContextManager';

export type ExperienceLevel = 'beginner' | 'intermediate' | 'advanced';
export type Goal = 'build_muscle' | 'gain_strength' | 'lose_fat' | 'improve_endurance' | 'general_fitness';
export type Gender = 'male' | 'female' | 'other';
export type UnitSystem = 'metric' | 'imperial';

interface UserProfile {
  id: string;
  name: string;
  experienceLevel: ExperienceLevel;
  goals: Goal[];
  equipment: string[];
  workoutFrequency: number; // days per week
  preferredUnit: 'kg' | 'lbs';
  defaultRestTime: number; // seconds
  age?: number;
  gender?: Gender;
  weight?: number; // stored in kg
  height?: number; // stored in cm
  profilePicture?: string; // Supabase Storage URL or base64 data URL (for backward compatibility)
  version?: number; // For optimistic locking
  deletedAt?: Date | null; // Soft delete timestamp
}

interface UserState {
  profile: UserProfile | null;
  isLoading: boolean;
  error: string | null;
  
  // Actions
  initializeUser: (clerkUser?: { id: string; firstName?: string | null; username?: string | null; emailAddresses?: Array<{ emailAddress: string }> }) => Promise<void>;
  syncWithClerk: (clerkUser: { id: string; firstName?: string | null; username?: string | null; emailAddresses?: Array<{ emailAddress: string }> }) => Promise<void>;
  updateProfile: (updates: Partial<UserProfile>) => Promise<void>;
  setExperienceLevel: (level: ExperienceLevel) => Promise<void>;
  setGoals: (goals: Goal[]) => Promise<void>;
  setEquipment: (equipment: string[]) => Promise<void>;
  setWorkoutFrequency: (frequency: number) => Promise<void>;
  setPreferredUnit: (unit: 'kg' | 'lbs') => Promise<void>;
  setDefaultRestTime: (seconds: number) => Promise<void>;
  setAge: (age: number) => Promise<void>;
  setGender: (gender: Gender) => Promise<void>;
  setWeight: (weight: number) => Promise<void>;
  setHeight: (height: number) => Promise<void>;
  setProfilePicture: (picture: string) => Promise<void>;
}

// Unit conversion helpers
export const unitHelpers = {
  // Weight conversions (always store in kg)
  kgToLbs: (kg: number): number => kg * 2.20462,
  lbsToKg: (lbs: number): number => lbs / 2.20462,
  
  // Height conversions (always store in cm)
  cmToInches: (cm: number): number => cm * 0.393701,
  inchesToCm: (inches: number): number => inches / 0.393701,
  cmToFeetInches: (cm: number): { feet: number; inches: number } => {
    const totalInches = unitHelpers.cmToInches(cm);
    const feet = Math.floor(totalInches / 12);
    const inches = Math.round(totalInches % 12);
    return { feet, inches };
  },
  feetInchesToCm: (feet: number, inches: number): number => {
    const totalInches = feet * 12 + inches;
    return unitHelpers.inchesToCm(totalInches);
  },
};

const DEFAULT_USER_ID = 'user-1';

const DEFAULT_PROFILE: UserProfile = {
  id: DEFAULT_USER_ID,
  name: 'User',
  experienceLevel: 'intermediate',
  goals: ['general_fitness'],
  equipment: ['Full Gym'],
  workoutFrequency: 3,
  preferredUnit: 'kg',
  defaultRestTime: 90,
};

export const useUserStore = create<UserState>((set, get) => ({
  profile: null,
  isLoading: false,
  error: null,

  initializeUser: async (clerkUser) => {
    set({ isLoading: true, error: null });

    try {
      let savedProfile = await dataService.getUserProfile();
      
      // If we have a Clerk user, sync the profile with Clerk data
      if (clerkUser) {
        const clerkUserId = clerkUser.id;
        const clerkName = clerkUser.firstName || clerkUser.username || clerkUser.emailAddresses?.[0]?.emailAddress || 'User';
        
        // If no saved profile exists, create one with Clerk data
        if (!savedProfile) {
          savedProfile = {
            ...DEFAULT_PROFILE,
            id: clerkUserId,
            name: clerkName,
          };
          await dataService.updateUserProfile(savedProfile);
        } else {
          // Update existing profile with Clerk ID and name if they differ
          if (savedProfile.id !== clerkUserId || savedProfile.name !== clerkName) {
            savedProfile = {
              ...savedProfile,
              id: clerkUserId,
              name: clerkName,
            };
            await dataService.updateUserProfile(savedProfile);
          }
        }
      } else if (!savedProfile) {
        // No Clerk user and no saved profile - use default
        savedProfile = DEFAULT_PROFILE;
      }
      
      // Set user ID in context manager for data operations
      userContextManager.setUserId(savedProfile.id);
      
      set({ profile: savedProfile, isLoading: false });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to initialize user',
        isLoading: false,
      });
    }
  },

  syncWithClerk: async (clerkUser) => {
    const { profile } = get();
    if (!profile) return;

    const clerkUserId = clerkUser.id;
    const clerkName = clerkUser.firstName || clerkUser.username || clerkUser.emailAddresses?.[0]?.emailAddress || 'User';

    // Update profile with Clerk data if needed
    if (profile.id !== clerkUserId || profile.name !== clerkName) {
      const updatedProfile = {
        ...profile,
        id: clerkUserId,
        name: clerkName,
      };
      await get().updateProfile(updatedProfile);
    }
  },

  updateProfile: async (updates: Partial<UserProfile>) => {
    const { profile } = get();
    if (!profile) return;

    const updatedProfile = { ...profile, ...updates };
    
    set({ isLoading: true, error: null });

    try {
      await dataService.updateUserProfile(updatedProfile);
      // Update user ID in context manager if it changed
      if (updatedProfile.id) {
        userContextManager.setUserId(updatedProfile.id);
      }
      set({ profile: updatedProfile, isLoading: false });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to update profile',
        isLoading: false,
      });
    }
  },

  setExperienceLevel: async (level: ExperienceLevel) => {
    await get().updateProfile({ experienceLevel: level });
  },

  setGoals: async (goals: Goal[]) => {
    await get().updateProfile({ goals });
  },

  setEquipment: async (equipment: string[]) => {
    await get().updateProfile({ equipment });
  },

  setWorkoutFrequency: async (frequency: number) => {
    await get().updateProfile({ workoutFrequency: frequency });
  },

  setPreferredUnit: async (unit: 'kg' | 'lbs') => {
    await get().updateProfile({ preferredUnit: unit });
  },

  setDefaultRestTime: async (seconds: number) => {
    await get().updateProfile({ defaultRestTime: seconds });
  },

  setAge: async (age: number) => {
    await get().updateProfile({ age });
  },

  setGender: async (gender: Gender) => {
    await get().updateProfile({ gender });
  },

  setWeight: async (weight: number) => {
    await get().updateProfile({ weight });
  },

  setHeight: async (height: number) => {
    await get().updateProfile({ height });
  },

  setProfilePicture: async (picture: string) => {
    await get().updateProfile({ profilePicture: picture });
  },
}));

