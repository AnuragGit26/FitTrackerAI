import { create } from 'zustand';
import { dataService } from '@/services/dataService';
import { userContextManager } from '@/services/userContextManager';
import { auth0ManagementService } from '@/services/auth0ManagementService';

export type ExperienceLevel = 'beginner' | 'intermediate' | 'advanced';
export type Goal = 'build_muscle' | 'gain_strength' | 'lose_fat' | 'improve_endurance' | 'general_fitness';
export type Gender = 'male' | 'female' | 'other';
export type UnitSystem = 'metric' | 'imperial';

export interface UserProfile {
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
  auth0SyncStatus: 'idle' | 'syncing' | 'success' | 'error';
  auth0SyncError: string | null;
  
  // Actions
  initializeUser: (auth0User?: { id: string; firstName?: string | null; username?: string | null; emailAddresses?: Array<{ emailAddress: string }> }) => Promise<void>;
  syncWithAuth0: (auth0User: { id: string; firstName?: string | null; username?: string | null; emailAddresses?: Array<{ emailAddress: string }> }) => Promise<void>;
  syncToAuth0: (auth0User: { sub?: string; email?: string }, accessToken: string) => Promise<void>;
  updateProfile: (updates: Partial<UserProfile>) => Promise<void>;
  clearProfile: () => Promise<void>;
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
  auth0SyncStatus: 'idle',
  auth0SyncError: null,

  initializeUser: async (auth0User) => {
    set({ isLoading: true, error: null });

    try {
      // REQUIRE Auth0 user for authenticated sessions
      if (!auth0User?.id) {
        // No Auth0 user - cannot initialize without user ID
        set({ profile: null, isLoading: false });
        return;
      }

      const auth0UserId = auth0User.id;
      const auth0Name = auth0User.firstName || auth0User.username || auth0User.emailAddresses?.[0]?.emailAddress || 'User';
      
      // Get profile for this specific user ID (strictly user-specific)
      let savedProfile = await dataService.getUserProfile(auth0UserId);
      
      // If no saved profile exists, create one with Auth0 data
      if (!savedProfile) {
        savedProfile = {
          ...DEFAULT_PROFILE,
          id: auth0UserId,
          name: auth0Name,
        };
        await dataService.updateUserProfile(savedProfile);
      } else {
        // Profile exists - ensure it's up to date with Auth0 data if needed
        // Only update name if it's empty or default, preserve user-saved custom names
        const shouldUpdateName = !savedProfile.name || savedProfile.name === 'User' || savedProfile.name === DEFAULT_PROFILE.name;
        const shouldUpdateId = savedProfile.id !== auth0UserId;
        
        if (shouldUpdateId || shouldUpdateName) {
          const nameToUse = shouldUpdateName ? auth0Name : savedProfile.name;
          savedProfile = {
            ...savedProfile,
            id: auth0UserId,
            name: nameToUse,
          };
          await dataService.updateUserProfile(savedProfile);
        }
      }
      
      // Migrate profile picture from IndexedDB to LocalStorage if it exists and user has an ID
      // This ensures backward compatibility and dual storage
      // Only migrate if not already in LocalStorage to prevent infinite loops
      if (savedProfile.profilePicture && savedProfile.id) {
        // Check if already in LocalStorage to avoid unnecessary update
        const existingInLocalStorage = dataService.getProfilePictureFromLocalStorage(savedProfile.id);
        if (!existingInLocalStorage || existingInLocalStorage !== savedProfile.profilePicture) {
          // The updateUserProfile will handle writing to LocalStorage, but we ensure it's there
          await dataService.updateUserProfile({ 
            id: savedProfile.id, // REQUIRED: must include id
            profilePicture: savedProfile.profilePicture 
          });
          // Re-fetch to get the updated profile
          savedProfile = await dataService.getUserProfile(auth0UserId) || savedProfile;
        }
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

  syncWithAuth0: async (auth0User) => {
    const { profile } = get();
    if (!profile) return;

    const auth0UserId = auth0User.id;
    const auth0Name = auth0User.firstName || auth0User.username || auth0User.emailAddresses?.[0]?.emailAddress || 'User';

    // Update profile with Auth0 ID, but only update name if it's empty or default
    // Preserve user-saved custom names
    const shouldUpdateName = !profile.name || profile.name === 'User' || profile.name === DEFAULT_PROFILE.name;
    const shouldUpdateId = profile.id !== auth0UserId;
    
    if (shouldUpdateId || shouldUpdateName) {
      const nameToUse = shouldUpdateName ? auth0Name : profile.name;
      const updatedProfile = {
        ...profile,
        id: auth0UserId,
        name: nameToUse,
      };
      await get().updateProfile(updatedProfile);
    }
  },

  syncToAuth0: async (auth0User, accessToken) => {
    const { profile } = get();
    if (!profile) {
      throw new Error('No profile to sync');
    }

    set({ auth0SyncStatus: 'syncing', auth0SyncError: null });

    try {
      await auth0ManagementService.updateUserProfile(auth0User, accessToken, profile);
      set({ auth0SyncStatus: 'success', auth0SyncError: null });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to sync to Auth0';
      set({ auth0SyncStatus: 'error', auth0SyncError: errorMessage });
      throw error;
    }
  },

  updateProfile: async (updates: Partial<UserProfile>) => {
    const { profile } = get();
    if (!profile || !profile.id) {
      throw new Error('Cannot update profile: no profile or user ID found');
    }

    // Ensure updates include the user ID (required for user-specific storage)
    const updatedProfile = { ...profile, ...updates, id: profile.id };
    
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
      throw error;
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

  clearProfile: async () => {
    const { profile } = get();
    const userId = profile?.id;
    
    set({ profile: null });
    userContextManager.clear();
    
    // Also delete profile from IndexedDB to prevent cross-user contamination
    if (userId) {
      try {
        await dataService.deleteUserProfile(userId);
      } catch (error) {
        console.error('Failed to delete profile from IndexedDB:', error);
        // Don't throw - clearing from memory is more important
      }
    }
  },
}));

