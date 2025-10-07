import SectionHeader from '../SectionHeader';
import './Section.css';

/**
 * Section Layout Component
 *
 * Groups related content with a header
 * Controls spacing between header and content
 * Controls spacing between sections
 *
 * Containers dictate WHERE components live
 */
export default function Section({ title, description, children, level = 2 }) {
  return (
    <section className="csc-section">
      {title && (
        <SectionHeader
          title={title}
          description={description}
          level={level}
        />
      )}
      <div className="csc-section-content">
        {children}
      </div>
    </section>
  );
}
