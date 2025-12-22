/**
 * Data export/import service for user data portability
 */

import { dataService } from './dataService';
import { templateService } from './templateService';
import { plannedWorkoutService } from './plannedWorkoutService';
import { useUserStore } from '@/store/userStore';
import { Workout } from '@/types/workout';
import { WorkoutTemplate } from '@/types/workout';
import { PlannedWorkout } from '@/types/workout';

export interface ExportData {
  version: string;
  exportDate: string;
  workouts: Workout[];
  templates: WorkoutTemplate[];
  plannedWorkouts: PlannedWorkout[];
  userProfile?: {
    name?: string;
    email?: string;
  };
}

export const dataExport = {
  /**
   * Export all user data to JSON
   */
  async exportData(userId: string): Promise<string> {
    try {
      const workouts = await dataService.getWorkouts(userId);
      const templates = await templateService.getTemplates(userId);
      const plannedWorkouts = await plannedWorkoutService.getPlannedWorkouts(userId);
      const user = useUserStore.getState().profile;

      const exportData: ExportData = {
        version: '1.0.0',
        exportDate: new Date().toISOString(),
        workouts,
        templates,
        plannedWorkouts,
        userProfile: user ? {
          name: user.name,
          email: user.emailAddresses?.[0]?.emailAddress,
        } : undefined,
      };

      return JSON.stringify(exportData, null, 2);
    } catch (error) {
      throw new Error(`Failed to export data: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  },

  /**
   * Export data and download as file
   */
  async downloadExport(userId: string, filename?: string): Promise<void> {
    const data = await this.exportData(userId);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename || `fittrackai-export-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  },

  /**
   * Import data from JSON
   */
  async importData(userId: string, jsonData: string): Promise<{ imported: number; errors: string[] }> {
    try {
      const data: ExportData = JSON.parse(jsonData);
      const errors: string[] = [];
      let imported = 0;

      // Validate version
      if (!data.version) {
        throw new Error('Invalid export file: missing version');
      }

      // Import workouts
      if (Array.isArray(data.workouts)) {
        for (const workout of data.workouts) {
          try {
            await dataService.saveWorkout({ ...workout, userId });
            imported++;
          } catch (error) {
            errors.push(`Failed to import workout: ${error instanceof Error ? error.message : 'Unknown error'}`);
          }
        }
      }

      // Import templates
      if (Array.isArray(data.templates)) {
        for (const template of data.templates) {
          try {
            await templateService.createTemplate({ ...template, userId });
            imported++;
          } catch (error) {
            errors.push(`Failed to import template: ${error instanceof Error ? error.message : 'Unknown error'}`);
          }
        }
      }

      // Import planned workouts
      if (Array.isArray(data.plannedWorkouts)) {
        for (const plannedWorkout of data.plannedWorkouts) {
          try {
            await plannedWorkoutService.createPlannedWorkout({ ...plannedWorkout, userId });
            imported++;
          } catch (error) {
            errors.push(`Failed to import planned workout: ${error instanceof Error ? error.message : 'Unknown error'}`);
          }
        }
      }

      return { imported, errors };
    } catch (error) {
      throw new Error(`Failed to import data: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  },

  /**
   * Import data from file
   */
  async importFromFile(userId: string, file: File): Promise<{ imported: number; errors: string[] }> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          const result = await this.importData(userId, e.target?.result as string);
          resolve(result);
        } catch (error) {
          reject(error);
        }
      };
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsText(file);
    });
  },
};

