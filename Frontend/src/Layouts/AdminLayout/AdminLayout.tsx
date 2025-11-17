import React, { useState, useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import AdminSidebar from './AdminSidebar';

const AdminLayout: React.FC = () => {
  const [activeMenu, setActiveMenu] = useState('dashboard');
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [sidebarWidth, setSidebarWidth] = useState(256);

  // Listen for sidebar width changes
  useEffect(() => {
    const handleResize = () => {
      const sidebar = document.querySelector('.admin-sidebar') as HTMLElement;
      if (sidebar) {
        const width = sidebar.offsetWidth;
        setSidebarWidth(width);
      }
    };

    const observer = new MutationObserver(handleResize);
    const sidebar = document.querySelector('.admin-sidebar');
    if (sidebar) {
      observer.observe(sidebar, { attributes: true, attributeFilter: ['style'] });
    }

    window.addEventListener('resize', handleResize);
    handleResize();

    return () => {
      observer.disconnect();
      window.removeEventListener('resize', handleResize);
    };
  }, [isSidebarCollapsed]);

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">
      {/* Sidebar */}
      <AdminSidebar 
        activeMenu={activeMenu} 
        onMenuChange={setActiveMenu}
        onCollapseChange={setIsSidebarCollapsed}
      />

      {/* Main Content */}
      <div 
        className="admin-main-content flex-1 flex flex-col overflow-hidden transition-all duration-300" 
        style={{ 
          marginLeft: `${sidebarWidth}px`, 
          width: `calc(100% - ${sidebarWidth}px)`,
          minWidth: `calc(100vw - ${sidebarWidth}px)`
        }}
      >
        {/* Content */}
        <main className="flex-1 overflow-x-auto overflow-y-auto bg-gradient-to-br from-gray-50 via-blue-50/30 to-purple-50/30 w-full" style={{ minWidth: '100%' }}>
          <Outlet context={{ activeMenu }} />
        </main>
      </div>
    </div>
  );
};

export default AdminLayout;

