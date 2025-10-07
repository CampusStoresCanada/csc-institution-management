import './Input.css';

/**
 * Input Component
 *
 * Text input with label and validation states
 *
 * @param {string} label - Input label
 * @param {string} value - Input value
 * @param {function} onChange - Change handler
 * @param {string} type - Input type (text, email, tel, url, etc)
 * @param {string} placeholder - Placeholder text
 * @param {boolean} required - Required field
 * @param {boolean} disabled - Disabled state
 * @param {string} error - Error message
 * @param {string} helperText - Helper text below input
 */
export default function Input({
  label,
  value,
  onChange,
  type = 'text',
  placeholder,
  required = false,
  disabled = false,
  error,
  helperText,
  ...props
}) {
  const inputId = `input-${label?.toLowerCase().replace(/\s/g, '-')}`;

  return (
    <div className="csc-input-wrapper">
      {label && (
        <label htmlFor={inputId} className="csc-input-label">
          {label}
          {required && <span className="csc-input-required">*</span>}
        </label>
      )}
      <input
        id={inputId}
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        required={required}
        disabled={disabled}
        className={`csc-input ${error ? 'csc-input--error' : ''}`}
        {...props}
      />
      {error && <span className="csc-input-error-text">{error}</span>}
      {helperText && !error && <span className="csc-input-helper-text">{helperText}</span>}
    </div>
  );
}
