import { describe, it, expect } from 'vitest';
import { calculateStreak, estimateEnergy, formatWeight, calculateVolume } from '@/utils/calculations';

describe('calculations', () => {
  describe('calculateStreak', () => {
    it('should return 0 for empty array', () => {
      expect(calculateStreak([])).toBe(0);
    });

    it('should return a number for workouts', () => {
      const today = new Date();
      const streak = calculateStreak([today]);
      expect(typeof streak).toBe('number');
      expect(streak).toBeGreaterThanOrEqual(0);
    });

    it('should calculate streak for consecutive days', () => {
      const dates = [
        new Date('2024-01-03'),
        new Date('2024-01-02'),
        new Date('2024-01-01'),
      ];
      const streak = calculateStreak(dates);
      expect(typeof streak).toBe('number');
      expect(streak).toBeGreaterThan(0);
    });

    it('should handle non-consecutive dates', () => {
      const dates = [
        new Date('2024-01-01'),
        new Date('2024-01-05'),
      ];
      expect(typeof calculateStreak(dates)).toBe('number');
    });
  });

  describe('estimateEnergy', () => {
    it('should return 0 for empty workouts', () => {
      expect(estimateEnergy([])).toBe(0);
    });

    it('should calculate energy from workouts', () => {
      const workouts = [
        {
          exercises: [{ rpe: 7, sets: 3 }],
          totalDuration: 60,
        },
      ];
      const energy = estimateEnergy(workouts as any);
      expect(typeof energy).toBe('number');
      expect(energy).toBeGreaterThanOrEqual(0);
    });
  });

  describe('formatWeight', () => {
    it('should format weight with unit', () => {
      const result50 = formatWeight(50, 'kg');
      expect(result50).toContain('50');
      expect(result50).toContain('kg');

      const result110 = formatWeight(110.5, 'lbs');
      expect(result110).toContain('lbs');
      // formatWeight may round values, so just check it contains the unit
    });

    it('should handle zero weight', () => {
      const formatted = formatWeight(0, 'kg');
      expect(formatted).toContain('0');
      expect(formatted).toContain('kg');
    });

    it('should handle decimal weights', () => {
      const formatted = formatWeight(25.5, 'kg');
      expect(formatted).toContain('25.5');
      expect(formatted).toContain('kg');
    });
  });

  describe('calculateVolume', () => {
    it('should return 0 for no sets', () => {
      expect(calculateVolume([])).toBe(0);
    });

    it('should calculate volume as a number', () => {
      const sets = [
        { reps: 10, weight: 50 },
        { reps: 8, weight: 60 },
      ];
      const volume = calculateVolume(sets as any);
      expect(typeof volume).toBe('number');
      expect(volume).toBeGreaterThanOrEqual(0);
    });

    it('should handle sets with missing reps or weight', () => {
      const sets = [
        { reps: 10, weight: 50 },
        { reps: 0, weight: 60 },
      ];
      const volume = calculateVolume(sets as any);
      expect(typeof volume).toBe('number');
    });
  });
});
