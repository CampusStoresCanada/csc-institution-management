import './Button.css';

/**
 * Button Component
 *
 * Reusable button with consistent styling and behavior
 *
 * @param {string} variant - 'primary' | 'secondary' | 'ghost' | 'danger'
 * @param {string} size - 'sm' | 'md' | 'lg'
 * @param {boolean} fullWidth - Stretch button to full width
 * @param {boolean} disabled - Disabled state
 * @param {function} onClick - Click handler
 * @param {ReactNode} children - Button content
 */
export default function Button({
  variant = 'primary',
  size = 'md',
  fullWidth = false,
  disabled = false,
  onClick,
  type = 'button',
  children
}) {
  const className = [
    'csc-button',
    `csc-button--${variant}`,
    `csc-button--${size}`,
    fullWidth && 'csc-button--full',
    disabled && 'csc-button--disabled'
  ].filter(Boolean).join(' ');

  return (
    <button
      className={className}
      onClick={onClick}
      disabled={disabled}
      type={type}
    >
      {children}
    </button>
  );
}
