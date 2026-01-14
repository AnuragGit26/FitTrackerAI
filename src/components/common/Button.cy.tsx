import { Button } from './Button';

describe('Button Component', () => {
  describe('Rendering', () => {
    it('should render with default props', () => {
      cy.mount(<Button>Click Me</Button>);
      cy.get('button').should('exist').and('contain', 'Click Me');
    });

    it('should render with custom className', () => {
      cy.mount(<Button className="custom-class">Button</Button>);
      cy.get('button').should('have.class', 'custom-class');
    });

    it('should render disabled state', () => {
      cy.mount(<Button disabled>Disabled</Button>);
      cy.get('button').should('be.disabled');
    });

    it('should render loading state', () => {
      cy.mount(<Button loading>Loading</Button>);
      cy.get('button').should('be.disabled');
      cy.get('[data-cy="button-spinner"]').should('exist');
    });
  });

  describe('Variants', () => {
    it('should render primary variant', () => {
      cy.mount(<Button variant="primary">Primary</Button>);
      cy.get('button').should('have.class', 'bg-primary');
    });

    it('should render secondary variant', () => {
      cy.mount(<Button variant="secondary">Secondary</Button>);
      cy.get('button').should('exist');
    });

    it('should render danger variant', () => {
      cy.mount(<Button variant="danger">Danger</Button>);
      cy.get('button').should('have.class', 'bg-red-500');
    });

    it('should render outline variant', () => {
      cy.mount(<Button variant="outline">Outline</Button>);
      cy.get('button').should('have.class', 'border');
    });

    it('should render ghost variant', () => {
      cy.mount(<Button variant="ghost">Ghost</Button>);
      cy.get('button').should('exist');
    });
  });

  describe('Sizes', () => {
    it('should render small size', () => {
      cy.mount(<Button size="sm">Small</Button>);
      cy.get('button').should('have.class', 'text-sm');
    });

    it('should render medium size', () => {
      cy.mount(<Button size="md">Medium</Button>);
      cy.get('button').should('exist');
    });

    it('should render large size', () => {
      cy.mount(<Button size="lg">Large</Button>);
      cy.get('button').should('have.class', 'text-lg');
    });
  });

  describe('Interactions', () => {
    it('should call onClick when clicked', () => {
      const onClickSpy = cy.spy().as('onClickSpy');
      cy.mount(<Button onClick={onClickSpy}>Click Me</Button>);
      cy.get('button').click();
      cy.get('@onClickSpy').should('have.been.calledOnce');
    });

    it('should not call onClick when disabled', () => {
      const onClickSpy = cy.spy().as('onClickSpy');
      cy.mount(
        <Button onClick={onClickSpy} disabled>
          Disabled
        </Button>
      );
      cy.get('button').click({ force: true });
      cy.get('@onClickSpy').should('not.have.been.called');
    });

    it('should not call onClick when loading', () => {
      const onClickSpy = cy.spy().as('onClickSpy');
      cy.mount(
        <Button onClick={onClickSpy} loading>
          Loading
        </Button>
      );
      cy.get('button').click({ force: true });
      cy.get('@onClickSpy').should('not.have.been.called');
    });
  });

  describe('With Icons', () => {
    it('should render with left icon', () => {
      const Icon = () => <span data-cy="left-icon">→</span>;
      cy.mount(
        <Button leftIcon={<Icon />}>
          With Icon
        </Button>
      );
      cy.get('[data-cy="left-icon"]').should('exist');
    });

    it('should render with right icon', () => {
      const Icon = () => <span data-cy="right-icon">←</span>;
      cy.mount(
        <Button rightIcon={<Icon />}>
          With Icon
        </Button>
      );
      cy.get('[data-cy="right-icon"]').should('exist');
    });
  });

  describe('Full Width', () => {
    it('should render full width button', () => {
      cy.mount(<Button fullWidth>Full Width</Button>);
      cy.get('button').should('have.class', 'w-full');
    });
  });

  describe('Accessibility', () => {
    it('should be keyboard accessible', () => {
      const onClickSpy = cy.spy().as('onClickSpy');
      cy.mount(<Button onClick={onClickSpy}>Accessible</Button>);
      cy.get('button').focus().should('have.focus');
      cy.get('button').type('{enter}');
      cy.get('@onClickSpy').should('have.been.called');
    });

    it('should have proper ARIA attributes when disabled', () => {
      cy.mount(<Button disabled>Disabled</Button>);
      cy.get('button').should('have.attr', 'disabled');
    });

    it('should have proper ARIA attributes when loading', () => {
      cy.mount(<Button loading>Loading</Button>);
      cy.get('button').should('have.attr', 'aria-busy', 'true');
    });
  });
});
