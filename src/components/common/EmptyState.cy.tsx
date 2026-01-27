import React from 'react'
import { Activity } from 'lucide-react'
import { EmptyState } from './EmptyState'

describe('EmptyState Component', () => {
  it('should render title and description', () => {
    cy.mount(
      <EmptyState
        title="No Data"
        description="There is no data to display"
        icon={Activity}
      />
    )
    cy.contains('No Data').should('be.visible')
    cy.contains('There is no data to display').should('be.visible')
  })

  it('should render with action button', () => {
    cy.mount(
      <EmptyState
        title="No Data"
        description="There is no data to display"
        icon={Activity}
        action={<button>Create New</button>}
      />
    )
    cy.contains('Create New').should('be.visible')
  })

  it('should render with custom className', () => {
    cy.mount(
      <EmptyState
        title="No Data"
        description="There is no data to display"
        icon={Activity}
        className="custom-empty-state"
      />
    )
    cy.get('[class*="custom-empty-state"]').should('exist')
  })

  it('should display icon', () => {
    cy.mount(
      <EmptyState
        title="No Data"
        description="There is no data to display"
        icon={Activity}
      />
    )
    // Check that SVG (from lucide-react) is rendered
    cy.get('svg').should('exist')
  })
})
