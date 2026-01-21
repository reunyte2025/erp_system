import { useState, useEffect } from 'react';
import Login from './pages/Login';
import Navbar from './components/navbar';
import Sidebar from './components/sidebar';
import POS from './pages/pos';
import Quotations from './pages/quotations';
import Proforma from './pages/Proforma';
import Invoices from './pages/invoices';
import Projects from './pages/projects';
import Employees from './pages/employees';
import Certificates from './pages/certificates';
import Reports from './pages/reports';
import Settings from './pages/settings';

export default function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(() => {
    return !!(localStorage.getItem('access_token') || sessionStorage.getItem('access_token'));
  });
  
  const [userData, setUserData] = useState(() => {
    const localData = localStorage.getItem('user_data');
    const sessionData = sessionStorage.getItem('user_data');
    const data = localData || sessionData;
    return data ? JSON.parse(data) : null;
  });

  const [activeMenuItem, setActiveMenuItem] = useState(() => {
    const saved = localStorage.getItem('activeMenuItem');
    return saved || 'POS';
  });

  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  useEffect(() => {
    if (isLoggedIn) {
      localStorage.setItem('activeMenuItem', activeMenuItem);
    }
  }, [activeMenuItem, isLoggedIn]);

  const handleLoginSuccess = (user) => {
    setUserData(user);
    setIsLoggedIn(true);
  };

  const handleLogout = () => {
    setUserData(null);
    setIsLoggedIn(false);
    setActiveMenuItem('POS');
    
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('user_data');
    localStorage.removeItem('activeMenuItem');
    sessionStorage.removeItem('access_token');
    sessionStorage.removeItem('refresh_token');
    sessionStorage.removeItem('user_data');
  };

  const handleNavigation = (itemId) => {
    setActiveMenuItem(itemId);
  };

  const handleToggleSidebar = () => {
    setIsMobileSidebarOpen(!isMobileSidebarOpen);
  };

  const renderPage = () => {
    switch (activeMenuItem) {
      case 'POS':
        return <POS />;
      case 'Quotations':
        return <Quotations />;
        case 'Proforma':
     return <Proforma />;
      case 'Invoices':
        return <Invoices />;
      case 'Projects':
        return <Projects />;
      case 'Employees':
        return <Employees />;
      case 'Certificates':
        return <Certificates />;
      case 'Reports':
        return <Reports />;
      case 'Settings':
        return <Settings />;
      default:
        return <POS />;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {!isLoggedIn ? (
        <Login onLoginSuccess={handleLoginSuccess} />
      ) : (
        <>
          <Navbar 
            user={userData} 
            onLogout={handleLogout} 
            pageTitle={activeMenuItem}
            onToggleSidebar={handleToggleSidebar}
          />
          <div className="flex">
            <Sidebar 
              activeItem={activeMenuItem} 
              onNavigate={handleNavigation}
              isMobileMenuOpen={isMobileSidebarOpen}
              setIsMobileMenuOpen={setIsMobileSidebarOpen}
              onCollapseChange={setIsSidebarCollapsed}
            />
            <main 
              className={`
                flex-1 p-4 sm:p-6 lg:p-8 
                transition-all duration-300 ease-in-out
                ${isSidebarCollapsed ? 'lg:ml-20' : 'lg:ml-72'}
              `}
            >
              {renderPage()}
            </main>
          </div>
        </>
      )}
    </div>
  );
}