import { LoadingSpinner } from './LoadingSpinner';

describe('LoadingSpinner Component', () => {
  describe('Rendering', () => {
    it('should render with default size', () => {
      cy.mount(<LoadingSpinner />);
      cy.get('[data-cy="loading-spinner"]').should('be.visible');
    });

    it('should render with small size', () => {
      cy.mount(<LoadingSpinner size="sm" />);
      cy.get('[data-cy="loading-spinner"]').should('have.class', 'w-4');
    });

    it('should render with medium size', () => {
      cy.mount(<LoadingSpinner size="md" />);
      cy.get('[data-cy="loading-spinner"]').should('have.class', 'w-8');
    });

    it('should render with large size', () => {
      cy.mount(<LoadingSpinner size="lg" />);
      cy.get('[data-cy="loading-spinner"]').should('have.class', 'w-12');
    });

    it('should render with extra large size', () => {
      cy.mount(<LoadingSpinner size="xl" />);
      cy.get('[data-cy="loading-spinner"]').should('have.class', 'w-16');
    });
  });

  describe('Loading Message', () => {
    it('should render with loading message', () => {
      cy.mount(<LoadingSpinner message="Loading data..." />);
      cy.contains('Loading data...').should('be.visible');
    });

    it('should not render message when not provided', () => {
      cy.mount(<LoadingSpinner />);
      cy.get('[data-cy="loading-message"]').should('not.exist');
    });
  });

  describe('Centering', () => {
    it('should center spinner when centered prop is true', () => {
      cy.mount(<LoadingSpinner centered />);
      cy.get('[data-cy="loading-spinner-container"]').should(
        'have.class',
        'justify-center'
      );
    });

    it('should not center spinner by default', () => {
      cy.mount(<LoadingSpinner />);
      cy.get('[data-cy="loading-spinner"]').should('be.visible');
    });
  });

  describe('Full Screen', () => {
    it('should render full screen overlay when fullScreen is true', () => {
      cy.mount(<LoadingSpinner fullScreen />);
      cy.get('[data-cy="loading-overlay"]').should('have.class', 'fixed');
      cy.get('[data-cy="loading-overlay"]').should('have.class', 'inset-0');
    });
  });

  describe('Custom Color', () => {
    it('should apply custom color class', () => {
      cy.mount(<LoadingSpinner color="text-red-500" />);
      cy.get('[data-cy="loading-spinner"]').should('have.class', 'text-red-500');
    });

    it('should use default primary color', () => {
      cy.mount(<LoadingSpinner />);
      cy.get('[data-cy="loading-spinner"]').should('have.class', 'text-primary');
    });
  });

  describe('Animation', () => {
    it('should have spinning animation', () => {
      cy.mount(<LoadingSpinner />);
      cy.get('[data-cy="loading-spinner"]').should('have.class', 'animate-spin');
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA attributes', () => {
      cy.mount(<LoadingSpinner />);
      cy.get('[data-cy="loading-spinner"]').should('have.attr', 'role', 'status');
      cy.get('[data-cy="loading-spinner"]').should(
        'have.attr',
        'aria-label',
        'Loading'
      );
    });

    it('should have sr-only text for screen readers', () => {
      cy.mount(<LoadingSpinner />);
      cy.get('.sr-only').should('contain', 'Loading');
    });
  });
});
