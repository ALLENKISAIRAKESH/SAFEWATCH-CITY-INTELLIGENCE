import React, { useState } from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import Sidebar from './Sidebar';
import TopBar from './TopBar';

const AppShell: React.FC = () => {
  const { isAuthenticated } = useAuth();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  const sidebarWidth = sidebarCollapsed ? 'ml-16' : 'ml-60';

  return (
    <div className="min-h-screen bg-[#070c14] text-white">
      <Sidebar collapsed={sidebarCollapsed} onToggle={() => setSidebarCollapsed((c) => !c)} />

      {/* Main content area — offset by sidebar width */}
      <div className={`flex flex-col min-h-screen transition-all duration-300 ${sidebarWidth}`}>
        <TopBar />

        <main className="flex-1 overflow-auto p-5">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default AppShell;
