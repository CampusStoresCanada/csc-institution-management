import './Page.css';

/**
 * Page Layout Component
 *
 * Root container for all pages
 * Handles responsive padding and max-width
 *
 * This is where components LIVE
 */
export default function Page({ children }) {
  return (
    <div className="csc-page">
      {children}
    </div>
  );
}
