import { useState, useRef } from 'react';
import './AppShell.css';

/**
 * AppShell Component
 *
 * The outer frame for all CSC apps
 * Collapsible sidebar - shows icons only when collapsed, expands on hover/click
 */
export default function AppShell({ organizationName, organizationLogo, navigation, children }) {
  const CSC_LOGO = 'https://images.squarespace-cdn.com/content/v1/5ec55d5d28a93e0e18d2eeb4/1600096854522-HS7NUI12I1ML6SPJFLLY/Artboard+1.png?format=1500w';

  const [isExpanded, setIsExpanded] = useState(false);
  const collapseTimeoutRef = useRef(null);

  const handleMouseEnter = () => {
    // Clear any pending collapse
    if (collapseTimeoutRef.current) {
      clearTimeout(collapseTimeoutRef.current);
    }
    setIsExpanded(true);
  };

  const handleMouseLeave = () => {
    // Delay collapse by 300ms to prevent flicker
    collapseTimeoutRef.current = setTimeout(() => {
      setIsExpanded(false);
    }, 300);
  };

  const handleClick = () => {
    setIsExpanded(true);
  };

  return (
    <div className="csc-app-shell">
      <div
        className={`csc-app-sidebar ${isExpanded ? 'expanded' : 'collapsed'}`}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        onClick={handleClick}
      >
        <div className="csc-app-header">
          <div className="csc-logos">
            <img
              src={CSC_LOGO}
              alt="Campus Stores Canada"
              className="csc-logo-img"
            />
            {organizationLogo && isExpanded && (
              <img
                src={organizationLogo}
                alt={organizationName || 'Organization'}
                className="csc-org-logo-img"
              />
            )}
          </div>
          {organizationName && !organizationLogo && isExpanded && (
            <div className="csc-org-name">{organizationName}</div>
          )}
        </div>
        {navigation}
      </div>
      <div className="csc-app-main">
        {children}
      </div>
    </div>
  );
}
