import { WorkoutExercise, ExerciseGroupType } from '@/types/exercise';

export interface SupersetGroup {
  groupId: string;
  groupType: ExerciseGroupType;
  exercises: WorkoutExercise[];
  restTime?: number; // seconds between exercises in group
  groupRestTime?: number; // seconds between rounds
}

export const supersetService = {
  /**
   * Generate unique group ID
   */
  generateGroupId(): string {
    return `group-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  },

  /**
   * Create a new superset/circuit group
   */
  createGroup(
    exercises: WorkoutExercise[],
    groupType: ExerciseGroupType = 'superset',
    restTime?: number,
    groupRestTime?: number
  ): SupersetGroup {
    if (exercises.length < 2) {
      throw new Error('A group must contain at least 2 exercises');
    }
    if (exercises.length > 5) {
      throw new Error('A group cannot contain more than 5 exercises');
    }

    const groupId = this.generateGroupId();
    const groupedExercises = exercises.map((exercise, index) => ({
      ...exercise,
      groupType,
      groupId,
      groupOrder: index,
    }));

    return {
      groupId,
      groupType,
      exercises: groupedExercises,
      restTime,
      groupRestTime,
    };
  },

  /**
   * Add exercise to existing group
   */
  addExerciseToGroup(
    group: SupersetGroup,
    exercise: WorkoutExercise
  ): SupersetGroup {
    if (group.exercises.length >= 5) {
      throw new Error('Group cannot contain more than 5 exercises');
    }

    const newExercise = {
      ...exercise,
      groupType: group.groupType,
      groupId: group.groupId,
      groupOrder: group.exercises.length,
    };

    return {
      ...group,
      exercises: [...group.exercises, newExercise],
    };
  },

  /**
   * Remove exercise from group
   */
  removeExerciseFromGroup(
    group: SupersetGroup,
    exerciseId: string
  ): SupersetGroup | null {
    const filtered = group.exercises.filter((ex) => ex.id !== exerciseId);
    
    if (filtered.length < 2) {
      return null; // Group is too small, should be dissolved
    }

    // Reorder remaining exercises
    const reordered = filtered.map((ex, index) => ({
      ...ex,
      groupOrder: index,
    }));

    return {
      ...group,
      exercises: reordered,
    };
  },

  /**
   * Reorder exercises within group
   */
  reorderGroup(
    group: SupersetGroup,
    newOrder: string[] // Array of exercise IDs in new order
  ): SupersetGroup {
    const reordered = newOrder
      .map((exerciseId, index) => {
        const exercise = group.exercises.find((ex) => ex.id === exerciseId);
        if (!exercise) {
    return null;
  }
        return {
          ...exercise,
          groupOrder: index,
        } as WorkoutExercise;
      })
      .filter((ex): ex is WorkoutExercise => ex !== null && ex !== undefined);

    return {
      ...group,
      exercises: reordered,
    };
  },

  /**
   * Calculate total volume for a group
   */
  calculateGroupVolume(group: SupersetGroup): number {
    return group.exercises.reduce((total, exercise) => {
      return total + exercise.totalVolume;
    }, 0);
  },

  /**
   * Calculate average volume per exercise in group
   */
  calculateAverageVolume(group: SupersetGroup): number {
    if (group.exercises.length === 0) {
    return 0;
  }
    return this.calculateGroupVolume(group) / group.exercises.length;
  },

  /**
   * Get exercises in a group from workout
   */
  getGroupExercises(
    exercises: WorkoutExercise[],
    groupId: string
  ): WorkoutExercise[] {
    return exercises
      .filter((ex) => ex.groupId === groupId)
      .sort((a, b) => (a.groupOrder || 0) - (b.groupOrder || 0));
  },

  /**
   * Get all groups from workout
   */
  getAllGroups(exercises: WorkoutExercise[]): Map<string, SupersetGroup> {
    const groups = new Map<string, SupersetGroup>();

    exercises.forEach((exercise) => {
      if (exercise.groupId && exercise.groupType) {
        if (!groups.has(exercise.groupId)) {
          groups.set(exercise.groupId, {
            groupId: exercise.groupId,
            groupType: exercise.groupType,
            exercises: [],
          });
        }
        const group = groups.get(exercise.groupId)!;
        group.exercises.push(exercise);
      }
    });

    // Sort exercises within each group
    groups.forEach((group) => {
      group.exercises.sort((a, b) => (a.groupOrder || 0) - (b.groupOrder || 0));
    });

    return groups;
  },

  /**
   * Validate group structure
   */
  validateGroup(group: SupersetGroup): {
    valid: boolean;
    errors: string[];
  } {
    const errors: string[] = [];

    if (group.exercises.length < 2) {
      errors.push('Group must contain at least 2 exercises');
    }
    if (group.exercises.length > 5) {
      errors.push('Group cannot contain more than 5 exercises');
    }
    if (!group.groupType || !['superset', 'circuit'].includes(group.groupType)) {
      errors.push('Invalid group type');
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  },

  /**
   * Get next exercise in group
   */
  getNextExercise(
    group: SupersetGroup,
    currentExerciseId: string
  ): WorkoutExercise | null {
    const currentIndex = group.exercises.findIndex(
      (ex) => ex.id === currentExerciseId
    );
    if (currentIndex === -1 || currentIndex === group.exercises.length - 1) {
      return null; // Last exercise or not found
    }
    return group.exercises[currentIndex + 1];
  },

  /**
   * Get previous exercise in group
   */
  getPreviousExercise(
    group: SupersetGroup,
    currentExerciseId: string
  ): WorkoutExercise | null {
    const currentIndex = group.exercises.findIndex(
      (ex) => ex.id === currentExerciseId
    );
    if (currentIndex <= 0) {
      return null; // First exercise or not found
    }
    return group.exercises[currentIndex - 1];
  },

  /**
   * Check if exercise is part of a group
   */
  isPartOfGroup(exercise: WorkoutExercise): boolean {
    return !!exercise.groupId && exercise.groupType !== 'single';
  },

  /**
   * Get group position string (e.g., "1 of 3")
   */
  getGroupPosition(
    exercise: WorkoutExercise,
    allExercises: WorkoutExercise[]
  ): string | null {
    if (!exercise.groupId) {
    return null;
  }

    const groupExercises = this.getGroupExercises(allExercises, exercise.groupId);
    const position = groupExercises.findIndex((ex) => ex.id === exercise.id) + 1;

    return `${position} of ${groupExercises.length}`;
  },
};

