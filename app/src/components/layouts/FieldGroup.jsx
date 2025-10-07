import './FieldGroup.css';

/**
 * FieldGroup Layout Component
 *
 * Vertical stack of form fields with consistent spacing
 * This is the ONLY place that controls spacing between fields
 *
 * Components have NO margin - containers control ALL spacing
 */
export default function FieldGroup({ children }) {
  return (
    <div className="csc-field-group">
      {children}
    </div>
  );
}
