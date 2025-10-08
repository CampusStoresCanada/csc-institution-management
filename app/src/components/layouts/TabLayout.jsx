import { useState } from 'react';
import './TabLayout.css';

/**
 * TabLayout Component
 *
 * Tab navigation with content switching
 * Desktop: Vertical sidebar tabs
 * Mobile: Horizontal top tabs
 */
export default function TabLayout({ tabs }) {
  const [activeTab, setActiveTab] = useState(tabs[0]?.id || null);

  const activeTabContent = tabs.find(tab => tab.id === activeTab);

  return (
    <>
      {/* Desktop Sidebar Navigation */}
      <nav className="csc-tab-nav">
        {tabs.map(tab => (
          <button
            key={tab.id}
            className={`csc-tab-item ${activeTab === tab.id ? 'active' : ''}`}
            onClick={() => setActiveTab(tab.id)}
          >
            <div className="csc-tab-icon">{tab.icon}</div>
            <div className="csc-tab-label">{tab.label}</div>
          </button>
        ))}
      </nav>

      {/* Mobile Top Navigation */}
      <nav className="csc-tab-nav-mobile">
        {tabs.map(tab => (
          <button
            key={tab.id}
            className={`csc-tab-item-mobile ${activeTab === tab.id ? 'active' : ''}`}
            onClick={() => setActiveTab(tab.id)}
          >
            <span className="csc-tab-icon-mobile">{tab.icon}</span>
            <span className="csc-tab-label-mobile">{tab.label}</span>
          </button>
        ))}
      </nav>

      {/* Tab Content */}
      <main className="csc-tab-content">
        {activeTabContent?.content}
      </main>
    </>
  );
}
