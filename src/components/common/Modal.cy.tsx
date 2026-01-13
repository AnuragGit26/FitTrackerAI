import React from 'react';
import { Modal } from './Modal';

describe('Modal Component', () => {
  describe('Rendering', () => {
    it('should not render when closed', () => {
      cy.mount(
        <Modal isOpen={false} onClose={() => {}}>
          <div>Modal Content</div>
        </Modal>
      );
      cy.get('[data-cy="modal"]').should('not.exist');
    });

    it('should render when open', () => {
      cy.mount(
        <Modal isOpen={true} onClose={() => {}}>
          <div>Modal Content</div>
        </Modal>
      );
      cy.get('[data-cy="modal"]').should('be.visible');
      cy.contains('Modal Content').should('be.visible');
    });

    it('should render with title', () => {
      cy.mount(
        <Modal isOpen={true} onClose={() => {}} title="Test Modal">
          <div>Content</div>
        </Modal>
      );
      cy.contains('Test Modal').should('be.visible');
    });

    it('should render with custom size', () => {
      cy.mount(
        <Modal isOpen={true} onClose={() => {}} size="lg">
          <div>Large Modal</div>
        </Modal>
      );
      cy.get('[data-cy="modal"]').should('have.class', 'max-w-4xl');
    });
  });

  describe('Close Functionality', () => {
    it('should call onClose when clicking backdrop', () => {
      const onCloseSpy = cy.spy().as('onCloseSpy');
      cy.mount(
        <Modal isOpen={true} onClose={onCloseSpy}>
          <div>Content</div>
        </Modal>
      );
      cy.get('[data-cy="modal-backdrop"]').click({ force: true });
      cy.get('@onCloseSpy').should('have.been.called');
    });

    it('should call onClose when clicking close button', () => {
      const onCloseSpy = cy.spy().as('onCloseSpy');
      cy.mount(
        <Modal isOpen={true} onClose={onCloseSpy} showCloseButton>
          <div>Content</div>
        </Modal>
      );
      cy.get('[data-cy="modal-close-button"]').click();
      cy.get('@onCloseSpy').should('have.been.called');
    });

    it('should call onClose when pressing Escape key', () => {
      const onCloseSpy = cy.spy().as('onCloseSpy');
      cy.mount(
        <Modal isOpen={true} onClose={onCloseSpy}>
          <div>Content</div>
        </Modal>
      );
      cy.get('body').type('{esc}');
      cy.get('@onCloseSpy').should('have.been.called');
    });

    it('should not close when clicking inside modal', () => {
      const onCloseSpy = cy.spy().as('onCloseSpy');
      cy.mount(
        <Modal isOpen={true} onClose={onCloseSpy}>
          <div data-cy="modal-content">Content</div>
        </Modal>
      );
      cy.get('[data-cy="modal-content"]').click();
      cy.get('@onCloseSpy').should('not.have.been.called');
    });
  });

  describe('closeOnBackdrop prop', () => {
    it('should not close on backdrop click when closeOnBackdrop is false', () => {
      const onCloseSpy = cy.spy().as('onCloseSpy');
      cy.mount(
        <Modal isOpen={true} onClose={onCloseSpy} closeOnBackdrop={false}>
          <div>Content</div>
        </Modal>
      );
      cy.get('[data-cy="modal-backdrop"]').click({ force: true });
      cy.get('@onCloseSpy').should('not.have.been.called');
    });
  });

  describe('closeOnEscape prop', () => {
    it('should not close on Escape when closeOnEscape is false', () => {
      const onCloseSpy = cy.spy().as('onCloseSpy');
      cy.mount(
        <Modal isOpen={true} onClose={onCloseSpy} closeOnEscape={false}>
          <div>Content</div>
        </Modal>
      );
      cy.get('body').type('{esc}');
      cy.get('@onCloseSpy').should('not.have.been.called');
    });
  });

  describe('Header and Footer', () => {
    it('should render header', () => {
      cy.mount(
        <Modal isOpen={true} onClose={() => {}} header={<div>Custom Header</div>}>
          <div>Content</div>
        </Modal>
      );
      cy.contains('Custom Header').should('be.visible');
    });

    it('should render footer', () => {
      cy.mount(
        <Modal isOpen={true} onClose={() => {}} footer={<div>Custom Footer</div>}>
          <div>Content</div>
        </Modal>
      );
      cy.contains('Custom Footer').should('be.visible');
    });
  });

  describe('Animations', () => {
    it('should have fade-in animation when opening', () => {
      cy.mount(
        <Modal isOpen={true} onClose={() => {}}>
          <div>Content</div>
        </Modal>
      );
      cy.get('[data-cy="modal"]').should('have.css', 'opacity');
    });
  });

  describe('Accessibility', () => {
    it('should trap focus within modal', () => {
      cy.mount(
        <Modal isOpen={true} onClose={() => {}} showCloseButton>
          <button data-cy="button-1">Button 1</button>
          <button data-cy="button-2">Button 2</button>
        </Modal>
      );

      cy.get('[data-cy="button-1"]').focus();
      cy.focused().should('have.attr', 'data-cy', 'button-1');

      cy.realPress('Tab');
      cy.focused().should('have.attr', 'data-cy', 'button-2');
    });

    it('should have proper ARIA attributes', () => {
      cy.mount(
        <Modal isOpen={true} onClose={() => {}} title="Test Modal">
          <div>Content</div>
        </Modal>
      );
      cy.get('[data-cy="modal"]').should('have.attr', 'role', 'dialog');
      cy.get('[data-cy="modal"]').should('have.attr', 'aria-modal', 'true');
    });

    it('should restore focus after closing', () => {
      const TestComponent = () => {
        const [isOpen, setIsOpen] = React.useState(false);
        return (
          <>
            <button data-cy="trigger" onClick={() => setIsOpen(true)}>
              Open Modal
            </button>
            <Modal isOpen={isOpen} onClose={() => setIsOpen(false)}>
              <button data-cy="modal-button">Modal Button</button>
            </Modal>
          </>
        );
      };

      cy.mount(<TestComponent />);
      cy.get('[data-cy="trigger"]').click();
      cy.get('[data-cy="modal"]').should('be.visible');
      cy.get('[data-cy="modal-button"]').click();
      // Focus should return to trigger button
    });
  });
});
