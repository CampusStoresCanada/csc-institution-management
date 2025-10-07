import './Dropdown.css';

/**
 * Dropdown Component
 *
 * Select dropdown with label and options
 *
 * @param {string} label - Dropdown label
 * @param {string} value - Selected value
 * @param {function} onChange - Change handler
 * @param {Array} options - Array of {value, label} objects
 * @param {string} placeholder - Placeholder text
 * @param {boolean} required - Required field
 * @param {boolean} disabled - Disabled state
 */
export default function Dropdown({
  label,
  value,
  onChange,
  options = [],
  placeholder = 'Select an option',
  required = false,
  disabled = false
}) {
  const dropdownId = `dropdown-${label?.toLowerCase().replace(/\s/g, '-')}`;

  return (
    <div className="csc-dropdown-wrapper">
      {label && (
        <label htmlFor={dropdownId} className="csc-dropdown-label">
          {label}
          {required && <span className="csc-dropdown-required">*</span>}
        </label>
      )}
      <select
        id={dropdownId}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required={required}
        disabled={disabled}
        className="csc-dropdown"
      >
        {placeholder && (
          <option value="" disabled>
            {placeholder}
          </option>
        )}
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
}
