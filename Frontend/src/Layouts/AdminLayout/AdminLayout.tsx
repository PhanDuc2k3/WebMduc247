import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import AdminSidebar from './AdminSidebar';
import AdminHeader from './AdminHeader';

const AdminLayout: React.FC = () => {
  const [activeMenu, setActiveMenu] = useState('dashboard');

  const handleSearch = (query: string) => {
    console.log('Search:', query);
    // Implement search functionality
  };

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">
      {/* Sidebar */}
      <AdminSidebar activeMenu={activeMenu} onMenuChange={setActiveMenu} />

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <AdminHeader onSearch={handleSearch} />

        {/* Content */}
        <main className="flex-1 overflow-x-hidden overflow-y-auto bg-gradient-to-br from-gray-50 via-blue-50/30 to-purple-50/30">
          <Outlet context={{ activeMenu }} />
        </main>
      </div>
    </div>
  );
};

export default AdminLayout;

