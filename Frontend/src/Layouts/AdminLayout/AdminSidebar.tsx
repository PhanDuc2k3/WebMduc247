import React, { useState } from 'react';

interface MenuItem {
  label: string;
  icon?: string;
  key: string;
  badge?: number;
}

interface AdminSidebarProps {
  activeMenu: string;
  onMenuChange: (menu: string) => void;
}

const AdminSidebar: React.FC<AdminSidebarProps> = ({ activeMenu, onMenuChange }) => {
  const [isCollapsed, setIsCollapsed] = useState(false);

  const menuItems: MenuItem[] = [
    { label: 'Dashboard', key: 'dashboard' },
    { label: 'Người dùng', key: 'users' },
    { label: 'Duyệt đơn bán', key: 'sellerRequest', badge: 3 },
    { label: 'Banner', key: 'banner' },
    { label: 'Cửa hàng', key: 'stores' },
    { label: 'Đơn hàng', key: 'orders' },
    { label: 'Voucher', key: 'vouchers' },
    { label: 'Tin tức Khuyến mãi', key: 'promotions' },
  ];

  return (
    <div
      className={`bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 min-h-screen transition-all duration-300 ${
        isCollapsed ? 'w-20' : 'w-64'
      } flex flex-col shadow-2xl`}
    >
      {/* Logo */}
      <div className="p-6 border-b border-purple-800">
        <div className="flex items-center justify-between">
          {!isCollapsed && (
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-400 to-purple-600 rounded-lg flex items-center justify-center shadow-lg">
                <span className="text-white font-bold text-sm">A</span>
              </div>
              <div>
                <h1 className="text-xl font-bold text-white">Admin</h1>
                <p className="text-xs text-purple-300">Dashboard</p>
              </div>
            </div>
          )}
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="w-8 h-8 flex items-center justify-center bg-purple-800 hover:bg-purple-700 rounded-lg transition-all duration-300"
          >
            <span className="text-white text-sm">{isCollapsed ? '▶' : '◀'}</span>
          </button>
        </div>
      </div>

      {/* Menu Items */}
      <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
        {menuItems.map((item) => (
          <button
            key={item.key}
            onClick={() => onMenuChange(item.key)}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300 group relative ${
              activeMenu === item.key
                ? 'bg-gradient-to-r from-purple-600 to-pink-600 shadow-lg scale-105'
                : 'hover:bg-purple-800/50 hover:scale-105'
            }`}
          >
            {item.icon && (
              <span className={`text-2xl transition-transform duration-300 ${activeMenu === item.key ? 'scale-110' : 'group-hover:scale-110'}`}>
                {item.icon}
              </span>
            )}
            {!isCollapsed && (
              <>
                <span className={`font-bold transition-colors ${activeMenu === item.key ? 'text-white' : 'text-purple-200'}`}>
                  {item.label}
                </span>
                {item.badge && (
                  <span className="ml-auto bg-gradient-to-r from-red-500 to-pink-600 text-white text-xs font-bold px-2 py-1 rounded-full animate-pulse">
                    {item.badge}
                  </span>
                )}
              </>
            )}
            {/* Active indicator */}
            {activeMenu === item.key && !isCollapsed && (
              <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-white rounded-r-full"></div>
            )}
          </button>
        ))}
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-purple-800">
        {!isCollapsed && (
          <div className="bg-gradient-to-r from-purple-800 to-pink-800 rounded-xl p-4">
            <p className="text-white text-sm font-bold mb-2">Need Help?</p>
            <p className="text-purple-200 text-xs">Contact admin support</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminSidebar;

