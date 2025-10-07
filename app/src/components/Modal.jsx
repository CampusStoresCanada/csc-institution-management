import * as Dialog from '@radix-ui/react-dialog';
import './Modal.css';

/**
 * Modal Component
 *
 * Built on Radix UI Dialog for bulletproof accessibility
 * Styled with CSC brand aesthetics
 *
 * Handles: focus trapping, escape key, scroll locking, ARIA
 * We just provide the pretty wrapper
 *
 * @param {boolean} isOpen - Modal open state
 * @param {function} onClose - Close handler
 * @param {string} title - Modal title
 * @param {ReactNode} children - Modal content
 */
export default function Modal({ isOpen, onClose, title, children }) {
  return (
    <Dialog.Root open={isOpen} onOpenChange={onClose}>
      <Dialog.Portal>
        <Dialog.Overlay className="csc-modal-overlay" />
        <Dialog.Content className="csc-modal-content">
          <div className="csc-modal-header">
            <Dialog.Title className="csc-modal-title">{title}</Dialog.Title>
            <Dialog.Close className="csc-modal-close" aria-label="Close">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M18 6L6 18M6 6l12 12" />
              </svg>
            </Dialog.Close>
          </div>
          <div className="csc-modal-body">
            {children}
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
