# FitTrackAI Testing Infrastructure

## Overview

FitTrackAI uses a comprehensive testing strategy covering all layers of the application pyramid:

- **Unit Tests**: 50% - Core logic, utilities, and calculations
- **Component Tests**: 30% - React components in isolation
- **E2E Tests**: 20% - Critical user journeys and full workflows

## Quick Start

### Run All Tests
```bash
npm run test:all          # Run all test suites (unit + component + E2E)
```

### Run Individual Test Suites

#### Unit Tests (Vitest)
```bash
npm run test:unit         # Watch mode - re-run on file changes
npm run test:unit:run     # Run once and exit
npm run test:unit:ui      # Visual UI for test results
npm run test:unit:coverage # Generate coverage report
```

#### Component Tests (Cypress)
```bash
npm run test:component        # Run component tests headless
npm run test:component:open   # Open interactive Cypress UI for debugging
```

#### E2E Tests (Cypress)
```bash
npm run test:e2e              # Run all E2E tests headless
npm run test:e2e:headed       # Run with visible browser
npm run test:smoke            # Quick smoke tests only (~3 min)
npm run test:open             # Open interactive Cypress UI
```

## Test Suites

### 1. Unit Tests (Vitest)

Located in: `src/**/__tests__/*.test.ts(x)`

**Purpose**: Test individual functions, hooks, and utilities in isolation.

**Example Test Structure**:
```typescript
import { describe, it, expect } from 'vitest'
import { calculateVolume } from '@/utils/calculations'

describe('calculateVolume', () => {
  it('should return 0 for empty sets', () => {
    expect(calculateVolume([])).toBe(0)
  })

  it('should calculate volume correctly', () => {
    const sets = [{ reps: 10, weight: 50 }]
    expect(calculateVolume(sets)).toBeGreaterThan(0)
  })
})
```

**Current Test Coverage**:
- ✅ calculations.ts (12 tests)
- ✅ useCountUp hook (5 tests)
- ✅ Skeleton component (6 tests)

**Adding New Unit Tests**:
1. Create `__tests__/` directory in component/utility folder
2. Name file as `*.test.ts(x)`
3. Import test utilities from `@/test/test-utils`
4. Run `npm run test:unit:run` to verify

### 2. Component Tests (Cypress)

Located in: `src/**/*.cy.tsx`

**Purpose**: Test React components in isolation with visual verification.

**Example Test Structure**:
```typescript
import React from 'react'
import { Button } from './Button'

describe('Button Component', () => {
  it('should render button with text', () => {
    cy.mount(<Button>Click Me</Button>)
    cy.get('button').should('contain', 'Click Me')
  })

  it('should handle click events', () => {
    const onClick = cy.spy()
    cy.mount(<Button onClick={onClick}>Click</Button>)
    cy.get('button').click()
    cy.wrap(onClick).should('have.been.called')
  })
})
```

**Current Component Tests**:
- ✅ Button.cy.tsx (6 tests)
- ✅ EmptyState.cy.tsx (4 tests)
- ✅ Modal.cy.tsx (4 tests)

**Adding New Component Tests**:
1. Create `ComponentName.cy.tsx` in same folder as component
2. Use `cy.mount()` to render component
3. Use Cypress selectors to interact and assert
4. Run `npm run test:component:open` to test interactively

### 3. E2E Tests (Cypress)

Located in: `cypress/e2e/*/`

**Purpose**: Test complete user workflows and critical paths.

**Test Suites**:
- `00-smoke/` - Quick sanity checks (5 min)
- `01-authentication/` - Login, signup flows
- `02-workout/` - Workout logging
- `03-templates/` - Workout templates
- `04-recovery/` - Recovery features
- `accessibility/` - A11y compliance

**Running E2E Tests**:
```bash
npm run test:smoke        # Fast smoke tests only
npm run test:e2e          # All E2E tests
npm run test:a11y         # Accessibility tests
```

## Test Utilities

### Custom Render Function (for Vitest)

Located in: `src/test/test-utils.tsx`

Provides BrowserRouter wrapper and common test setup:
```typescript
import { render } from '@/test/test-utils'

// Automatically wrapped with BrowserRouter
render(<YourComponent />)
```

### Test Setup File

Located in: `src/test/setup.ts`

Sets up:
- Vitest globals
- jsdom environment
- Mock implementations for browser APIs
- Test cleanup

## Writing Tests - Best Practices

### Unit Tests

1. **One assertion focus per test**
   ```typescript
   // ✅ Good
   it('should return 0 for empty array', () => {
     expect(calculateStreak([])).toBe(0)
   })

   // ❌ Avoid
   it('should calculate streak', () => {
     expect(calculateStreak([])).toBe(0)
     expect(calculateStreak([today])).toBeGreaterThan(0)
     expect(calculateStreak(dates)).toBeLessThan(100)
   })
   ```

2. **Use descriptive test names**
   ```typescript
   // ✅ Clear intent
   it('should calculate total volume from multiple sets')

   // ❌ Vague
   it('tests volume calculation')
   ```

3. **Arrange-Act-Assert pattern**
   ```typescript
   it('should calculate volume correctly', () => {
     // Arrange
     const sets = [{ reps: 10, weight: 50 }]

     // Act
     const result = calculateVolume(sets)

     // Assert
     expect(result).toBe(500)
   })
   ```

### Component Tests

1. **Test user interactions**
   ```typescript
   it('should navigate when button clicked', () => {
     cy.mount(<NavButton />)
     cy.get('button').click()
     cy.url().should('include', '/dashboard')
   })
   ```

2. **Test visual states**
   ```typescript
   it('should show disabled state', () => {
     cy.mount(<Button disabled>Click</Button>)
     cy.get('button').should('be.disabled')
   })
   ```

3. **Test accessibility**
   ```typescript
   it('should have proper labels', () => {
     cy.mount(<Button>Submit</Button>)
     cy.get('button').should('have.attr', 'aria-label')
   })
   ```

### E2E Tests

1. **Test complete user flows**
   ```typescript
   it('should allow user to log a workout', () => {
     cy.visit('/')
     cy.get('[data-testid="start-workout"]').click()
     cy.get('[data-testid="exercise-selector"]').select('Squats')
     cy.get('[data-testid="save-workout"]').click()
     cy.contains('Workout saved').should('be.visible')
   })
   ```

2. **Use data-testid for reliable selectors**
   ```typescript
   // In component
   <button data-testid="save-button">Save</button>

   // In test
   cy.get('[data-testid="save-button"]').click()
   ```

## Coverage Reports

### Generate Coverage
```bash
npm run test:unit:coverage
```

Coverage report generated at: `coverage/`

### View Coverage Report
```bash
# Open in browser
open coverage/index.html
```

**Coverage Targets**:
- Statements: 80%+
- Branches: 75%+
- Functions: 80%+
- Lines: 80%+

## CI/CD Integration

### GitHub Actions

Tests run on every push and PR to main branch:

1. **Lint check** - ESLint validation
2. **Type check** - TypeScript compilation
3. **Unit tests** - Vitest suite
4. **Build** - Vite production build

### Pre-commit Hooks

Runs lint check before commit (via husky):
```bash
git commit -m "message"  # Lint runs automatically
```

## Debugging Tests

### Unit Tests

1. **Watch mode** for quick iteration:
   ```bash
   npm run test:unit
   ```

2. **VS Code Debugger**:
   - Set breakpoints in test file
   - Use VS Code debug configuration

### Component Tests

1. **Interactive Cypress UI**:
   ```bash
   npm run test:component:open
   ```
   - See component render in real browser
   - Step through test commands
   - Inspect elements

2. **Debug logs**:
   ```typescript
   cy.get('button').then($btn => {
     console.log('Button text:', $btn.text())
   })
   ```

### E2E Tests

1. **Headed mode** to watch browser:
   ```bash
   npm run test:e2e:headed
   ```

2. **Cypress UI**:
   ```bash
   npm run test:open
   ```

## Common Issues

### "Cannot find module" errors

**Cause**: Path alias not configured in test setup

**Fix**: Verify `vite.config.ts` and `vitest.config.ts` have same path aliases

### Tests timeout

**Cause**: Async operations not completed

**Fix**: Ensure proper `cy.wait()` or `await` usage

### Component not rendering

**Cause**: Missing providers (Router, Context)

**Fix**: Use custom `render` function with providers

## Resources

- [Vitest Documentation](https://vitest.dev/)
- [Cypress Component Testing](https://docs.cypress.io/guides/component-testing/overview)
- [React Testing Library](https://testing-library.com/react)
- [Test Pyramid Pattern](https://martinfowler.com/bliki/TestPyramid.html)

## Adding Tests to Your Workflow

### For New Features
1. Write test FIRST (TDD approach)
2. Implement feature to pass test
3. Refactor for code quality

### For Bug Fixes
1. Create test that reproduces bug (test fails)
2. Fix code to make test pass
3. Verify test passes and prevents regression

### Before Submitting PR
1. Run full test suite: `npm run test:all`
2. Check coverage: `npm run test:unit:coverage`
3. All tests must pass
4. No lint errors: `npm run lint:strict`

## Test Performance

### Optimization Tips

1. **Unit tests should be fast** (~1-5ms each)
   - Mock external dependencies
   - Test pure functions
   - Avoid real network calls

2. **Component tests should be visual** (~50-200ms each)
   - Use Cypress for realistic interactions
   - Test with actual component rendering
   - Verify visual states

3. **E2E tests should be critical paths only** (~30s-5min total)
   - Focus on user workflows
   - Don't duplicate component tests
   - Use `cy.visit()` instead of full page reloads

### Running Tests in Parallel

```bash
npm run test:unit:run &   # Unit tests
npm run test:component &  # Component tests
wait                      # Wait for all to complete
```

## Continuous Improvement

### Metrics to Track
- Test coverage percentage
- Test execution time
- Test flakiness (retries)
- Code coverage trends

### Regular Review
- Quarterly: Review test strategy
- Monthly: Update test documentation
- Weekly: Monitor test performance
