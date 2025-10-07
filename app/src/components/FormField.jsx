import './FormField.css';

/**
 * FormField Component
 *
 * Displays a label and value with optional edit button
 * The core building block for all form displays
 *
 * @param {string} label - Field label
 * @param {string} value - Field value to display
 * @param {boolean} editable - Show edit button
 * @param {function} onEdit - Edit button click handler
 * @param {string} size - 'sm' | 'md' | 'lg' | 'xl' - Controls text size
 * @param {boolean} multiline - Display value as multiline text
 */
export default function FormField({
  label,
  value,
  editable = false,
  onEdit,
  size = 'md',
  multiline = false
}) {
  return (
    <div className={`csc-form-field csc-form-field--${size}`}>
      {label && <div className="csc-form-field-label">{label}</div>}
      <div className="csc-form-field-content">
        <div className={`csc-form-field-value ${multiline ? 'csc-form-field-value--multiline' : ''}`}>
          {value || <span className="csc-form-field-empty">Not set</span>}
        </div>
        {editable && (
          <button
            className="csc-form-field-edit"
            onClick={onEdit}
            aria-label={`Edit ${label}`}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="m18 2 4 4-14 14H4v-4L18 2z"/>
              <path d="m14.5 5.5 4 4"/>
            </svg>
          </button>
        )}
      </div>
    </div>
  );
}
