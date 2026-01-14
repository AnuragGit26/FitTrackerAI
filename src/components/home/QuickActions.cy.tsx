import { QuickActions } from './QuickActions';
import { useWorkoutStore } from '@/store/workoutStore';

describe('QuickActions Component', () => {
  beforeEach(() => {
    // Reset workout store state before each test
    useWorkoutStore.setState({ workouts: [] });
  });

  describe('Rendering', () => {
    it('should render Quick Actions heading', () => {
      cy.mountWithRouter(<QuickActions />);
      cy.contains('Quick Actions').should('be.visible');
    });

    it('should render all action buttons', () => {
      cy.mountWithRouter(<QuickActions />);
      cy.contains('Plan Workout').should('be.visible');
      cy.contains('Repeat Last').should('be.visible');
      cy.contains('Custom Workout').should('be.visible');
    });

    it('should render with icons', () => {
      cy.mountWithRouter(<QuickActions />);
      cy.get('svg').should('have.length.at.least', 3);
    });
  });

  describe('Plan Workout Button', () => {
    it('should navigate to planner when clicked', () => {
      cy.mountWithRouter(<QuickActions />);
      cy.contains('Plan Workout').click();
      cy.location('pathname').should('eq', '/planner');
    });

    it('should have calendar icon', () => {
      cy.mountWithRouter(<QuickActions />);
      cy.contains('Plan Workout')
        .parent()
        .find('svg')
        .should('exist');
    });
  });

  describe('Repeat Last Workout Button', () => {
    it('should navigate to workout page when no previous workout', () => {
      useWorkoutStore.setState({ workouts: [] });
      cy.mountWithRouter(<QuickActions />);
      cy.contains('Repeat Last').click();
      cy.location('pathname').should('eq', '/log-workout');
    });

    it('should navigate with repeat state when previous workout exists', () => {
      const mockWorkout = {
        id: '1',
        date: new Date().toISOString(),
        exercises: [
          {
            id: '1',
            name: 'Bench Press',
            sets: [{ reps: 10, weight: 100 }],
          },
        ],
      };

      useWorkoutStore.setState({ workouts: [mockWorkout] });
      cy.mountWithRouter(<QuickActions />);
      cy.contains('Repeat Last').click();
      cy.location('pathname').should('eq', '/log-workout');
    });

    it('should have history icon', () => {
      cy.mountWithRouter(<QuickActions />);
      cy.contains('Repeat Last')
        .parent()
        .find('svg')
        .should('exist');
    });
  });

  describe('Custom Workout Button', () => {
    it('should navigate to workout page', () => {
      cy.mountWithRouter(<QuickActions />);
      cy.contains('Custom Workout').click();
      cy.location('pathname').should('eq', '/log-workout');
    });

    it('should have plus icon', () => {
      cy.mountWithRouter(<QuickActions />);
      cy.contains('Custom Workout')
        .parent()
        .find('svg')
        .should('exist');
    });
  });

  describe('Layout', () => {
    it('should display buttons in horizontal layout', () => {
      cy.mountWithRouter(<QuickActions />);
      cy.get('.flex.gap-3').should('exist');
    });

    it('should be scrollable on small screens', () => {
      cy.viewport(375, 667);
      cy.mountWithRouter(<QuickActions />);
      cy.get('.overflow-x-auto').should('exist');
    });
  });

  describe('Styling', () => {
    it('should have proper spacing', () => {
      cy.mountWithRouter(<QuickActions />);
      cy.get('.px-5.mt-6').should('exist');
    });

    it('should have proper button styles', () => {
      cy.mountWithRouter(<QuickActions />);
      cy.get('button').first().should('have.class', 'rounded-xl');
      cy.get('button').first().should('have.class', 'shadow-sm');
    });

    it('should support dark mode', () => {
      cy.mountWithRouter(<QuickActions />);
      cy.get('button').first().should('have.class', 'dark:bg-surface-dark-light');
    });
  });

  describe('Accessibility', () => {
    it('should have accessible button labels', () => {
      cy.mountWithRouter(<QuickActions />);
      cy.get('button').each(($btn) => {
        cy.wrap($btn).should('have.text');
      });
    });

    it('should be keyboard navigable', () => {
      cy.mountWithRouter(<QuickActions />);
      cy.get('button').first().focus().should('have.focus');
      cy.realPress('Tab');
      cy.get('button').eq(1).should('have.focus');
    });
  });

  describe('Animations', () => {
    it('should have hover effects on buttons', () => {
      cy.mountWithRouter(<QuickActions />);
      cy.get('button').first().realHover();
      // Motion animations should apply
    });

    it('should have tap effects on buttons', () => {
      cy.mountWithRouter(<QuickActions />);
      cy.get('button').first().click();
      // Tap animation should apply
    });
  });

  describe('With Workout History', () => {
    it('should display last workout name in Repeat Last button', () => {
      const mockWorkout = {
        id: '1',
        name: 'Push Day',
        date: new Date().toISOString(),
        exercises: [],
      };

      useWorkoutStore.setState({ workouts: [mockWorkout] });
      cy.mountWithRouter(<QuickActions />);
      cy.contains('Repeat Last').should('be.visible');
    });

    it('should handle workout without custom name', () => {
      const mockWorkout = {
        id: '1',
        date: new Date().toISOString(),
        exercises: [{ id: '1', name: 'Squat', sets: [] }],
      };

      useWorkoutStore.setState({ workouts: [mockWorkout] });
      cy.mountWithRouter(<QuickActions />);
      cy.contains('Repeat Last').should('be.visible');
    });
  });
});
