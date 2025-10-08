import './AppShell.css';

/**
 * AppShell Component
 *
 * The outer frame for all CSC apps
 * Provides header with CSC logo, org logo, and org name
 */
export default function AppShell({ organizationName, organizationLogo, children }) {
  const CSC_LOGO = 'https://images.squarespace-cdn.com/content/v1/5ec55d5d28a93e0e18d2eeb4/1600096854522-HS7NUI12I1ML6SPJFLLY/Artboard+1.png?format=1500w';

  return (
    <div className="csc-app-shell">
      <div className="csc-app-sidebar">
        <div className="csc-app-header">
          <div className="csc-logos">
            <img
              src={CSC_LOGO}
              alt="Campus Stores Canada"
              className="csc-logo-img"
            />
            {organizationLogo && (
              <img
                src={organizationLogo}
                alt={organizationName || 'Organization'}
                className="csc-org-logo-img"
              />
            )}
          </div>
          {organizationName && !organizationLogo && (
            <div className="csc-org-name">{organizationName}</div>
          )}
        </div>
        {children}
      </div>
    </div>
  );
}
