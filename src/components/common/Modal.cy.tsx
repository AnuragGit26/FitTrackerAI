import React, { useState } from 'react'
import { Modal } from './Modal'

const ModalWrapper = () => {
  const [isOpen, setIsOpen] = useState(true)

  return (
    <Modal
      isOpen={isOpen}
      onClose={() => setIsOpen(false)}
      title="Test Modal"
    >
      <p>Modal content here</p>
      <button onClick={() => setIsOpen(false)}>Close</button>
    </Modal>
  )
}

describe('Modal Component', () => {
  it('should render when isOpen is true', () => {
    cy.mount(<ModalWrapper />)
    cy.contains('Test Modal').should('be.visible')
    cy.contains('Modal content here').should('be.visible')
  })

  it('should contain content', () => {
    cy.mount(<ModalWrapper />)
    cy.contains('Modal content here').should('exist')
  })

  it('should have close button', () => {
    cy.mount(<ModalWrapper />)
    cy.contains('Close').should('be.visible')
  })

  it('should be closable', () => {
    cy.mount(<ModalWrapper />)
    cy.contains('Test Modal').should('be.visible')
    cy.contains('Close').click()
    cy.contains('Test Modal').should('not.exist')
  })
})
