import { AppShell, TabLayout } from './components/layouts';
import MyInfo from './pages/MyInfo';
import './styles/design-system.css';
import './styles/csc-theme.css';

function App() {
  // Mock data - will come from session/API later
  const organizationData = {
    name: 'Campus Stores Canada',
    logo: null // Set to null to show name instead
  };

  const tabs = [
    {
      id: 'my-info',
      label: 'My Profile',
      icon: '👤',
      content: <MyInfo />
    },
    {
      id: 'my-team',
      label: 'My Team',
      icon: '👥',
      content: <div style={{ padding: '40px', textAlign: 'center', color: '#666' }}>
        <h2>My Team</h2>
        <p>Coming soon...</p>
      </div>
    }
  ];

  const tabLayout = TabLayout({ tabs });

  return (
    <AppShell
      organizationName={organizationData.name}
      organizationLogo={organizationData.logo}
      navigation={tabLayout.navigation}
    >
      {tabLayout.content}
    </AppShell>
  );
}

export default App;
