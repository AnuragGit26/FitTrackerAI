import { EmptyState } from './EmptyState';

describe('EmptyState Component', () => {
  describe('Rendering', () => {
    it('should render with title', () => {
      cy.mount(<EmptyState title="No Data" />);
      cy.contains('No Data').should('be.visible');
    });

    it('should render with title and message', () => {
      cy.mount(
        <EmptyState
          title="No Workouts"
          message="Start your first workout to see data here"
        />
      );
      cy.contains('No Workouts').should('be.visible');
      cy.contains('Start your first workout').should('be.visible');
    });

    it('should render with custom icon', () => {
      const CustomIcon = () => <svg data-cy="custom-icon" />;
      cy.mount(<EmptyState title="Empty" icon={<CustomIcon />} />);
      cy.get('[data-cy="custom-icon"]').should('exist');
    });
  });

  describe('Action Button', () => {
    it('should render action button when provided', () => {
      cy.mount(
        <EmptyState
          title="No Data"
          action={{
            label: 'Add Item',
            onClick: () => {},
          }}
        />
      );
      cy.contains('Add Item').should('be.visible');
    });

    it('should call action onClick when button is clicked', () => {
      const onClickSpy = cy.spy().as('onClickSpy');
      cy.mount(
        <EmptyState
          title="No Data"
          action={{
            label: 'Add Item',
            onClick: onClickSpy,
          }}
        />
      );
      cy.contains('Add Item').click();
      cy.get('@onClickSpy').should('have.been.calledOnce');
    });

    it('should not render action button when not provided', () => {
      cy.mount(<EmptyState title="No Data" />);
      cy.get('button').should('not.exist');
    });
  });

  describe('Size Variants', () => {
    it('should render small size', () => {
      cy.mount(<EmptyState title="Small" size="sm" />);
      cy.get('[data-cy="empty-state"]').should('have.class', 'py-8');
    });

    it('should render medium size', () => {
      cy.mount(<EmptyState title="Medium" size="md" />);
      cy.get('[data-cy="empty-state"]').should('have.class', 'py-12');
    });

    it('should render large size', () => {
      cy.mount(<EmptyState title="Large" size="lg" />);
      cy.get('[data-cy="empty-state"]').should('have.class', 'py-16');
    });
  });

  describe('Styling', () => {
    it('should apply custom className', () => {
      cy.mount(<EmptyState title="Custom" className="custom-class" />);
      cy.get('[data-cy="empty-state"]').should('have.class', 'custom-class');
    });

    it('should center content', () => {
      cy.mount(<EmptyState title="Centered" />);
      cy.get('[data-cy="empty-state"]').should('have.class', 'text-center');
    });
  });

  describe('Accessibility', () => {
    it('should have proper semantic structure', () => {
      cy.mount(
        <EmptyState
          title="No Results"
          message="Try adjusting your filters"
        />
      );
      cy.get('[data-cy="empty-state"]').should('exist');
      cy.get('h3').should('contain', 'No Results');
      cy.get('p').should('contain', 'Try adjusting your filters');
    });

    it('should have accessible button', () => {
      cy.mount(
        <EmptyState
          title="Empty"
          action={{
            label: 'Add Item',
            onClick: () => {},
          }}
        />
      );
      cy.get('button').should('be.visible').and('not.be.disabled');
    });
  });

  describe('Multiple Actions', () => {
    it('should render multiple action buttons', () => {
      cy.mount(
        <EmptyState
          title="No Data"
          actions={[
            { label: 'Action 1', onClick: () => {} },
            { label: 'Action 2', onClick: () => {} },
          ]}
        />
      );
      cy.contains('Action 1').should('be.visible');
      cy.contains('Action 2').should('be.visible');
    });

    it('should call correct action when each button is clicked', () => {
      const action1Spy = cy.spy().as('action1Spy');
      const action2Spy = cy.spy().as('action2Spy');

      cy.mount(
        <EmptyState
          title="No Data"
          actions={[
            { label: 'Action 1', onClick: action1Spy },
            { label: 'Action 2', onClick: action2Spy },
          ]}
        />
      );

      cy.contains('Action 1').click();
      cy.get('@action1Spy').should('have.been.calledOnce');
      cy.get('@action2Spy').should('not.have.been.called');

      cy.contains('Action 2').click();
      cy.get('@action2Spy').should('have.been.calledOnce');
    });
  });
});
