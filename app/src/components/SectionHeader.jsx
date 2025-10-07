import './SectionHeader.css';

/**
 * SectionHeader Component
 *
 * Consistent section headers with optional description
 *
 * @param {string} title - Section title
 * @param {string} description - Optional description text
 * @param {number} level - Heading level (1-3) for hierarchy
 */
export default function SectionHeader({ title, description, level = 2 }) {
  const HeadingTag = `h${level}`;

  return (
    <div className={`csc-section-header csc-section-header--level-${level}`}>
      <HeadingTag className="csc-section-header-title">{title}</HeadingTag>
      {description && (
        <p className="csc-section-header-description">{description}</p>
      )}
    </div>
  );
}
