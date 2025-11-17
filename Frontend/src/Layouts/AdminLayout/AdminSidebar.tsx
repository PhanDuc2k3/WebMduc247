import React, { useState, useEffect } from 'react';
import { 
  LayoutDashboard, 
  Users, 
  Store, 
  ShoppingBag, 
  Ticket, 
  Megaphone, 
  Image as ImageIcon,
  CheckCircle2,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import userApi from '../../api/userApi';

interface MenuItem {
  label: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  key: string;
  badge?: number;
}

interface AdminSidebarProps {
  activeMenu: string;
  onMenuChange: (menu: string) => void;
  onCollapseChange?: (isCollapsed: boolean) => void;
}

const AdminSidebar: React.FC<AdminSidebarProps> = ({ activeMenu, onMenuChange, onCollapseChange }) => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);
  const [isExpanded, setIsExpanded] = useState(false);
  const sidebarRef = React.useRef<HTMLDivElement>(null);

  const handleToggleCollapse = () => {
    const newCollapsed = !isCollapsed;
    setIsCollapsed(newCollapsed);
    setIsExpanded(false);
    if (onCollapseChange) {
      onCollapseChange(newCollapsed);
    }
  };

  const handleMouseEnter = () => {
    if (!isCollapsed) {
      setIsExpanded(true);
    }
  };

  const handleMouseLeave = () => {
    if (!isCollapsed) {
      setIsExpanded(false);
    }
  };

  useEffect(() => {
    const sidebar = sidebarRef.current;
    if (!sidebar || isCollapsed) return;

    const handleScroll = () => {
      if (sidebar.scrollLeft > 0) {
        setIsExpanded(true);
      } else if (sidebar.scrollLeft === 0) {
        setIsExpanded(false);
      }
    };

    sidebar.addEventListener('scroll', handleScroll);
    return () => sidebar.removeEventListener('scroll', handleScroll);
  }, [isCollapsed]);

  useEffect(() => {
    const fetchPendingCount = async () => {
      try {
        const res = await userApi.getAllSellerRequests();
        const requests = res.data?.requests || [];
        const pending = requests.filter((r: any) => r.sellerRequest?.status === 'pending');
        setPendingCount(pending.length);
      } catch (error) {
        console.error('Error fetching pending requests:', error);
      }
    };
    fetchPendingCount();
    // Refresh every 30 seconds
    const interval = setInterval(fetchPendingCount, 30000);
    return () => clearInterval(interval);
  }, []);

  const menuItems: MenuItem[] = [
    { label: 'Dashboard', key: 'dashboard', icon: LayoutDashboard },
    { label: 'Người dùng', key: 'users', icon: Users },
    { label: 'Duyệt đơn bán', key: 'sellerRequest', icon: CheckCircle2, badge: pendingCount },
    { label: 'Banner', key: 'banner', icon: ImageIcon },
    { label: 'Cửa hàng', key: 'stores', icon: Store },
    { label: 'Đơn hàng', key: 'orders', icon: ShoppingBag },
    { label: 'Voucher', key: 'vouchers', icon: Ticket },
    { label: 'Tin tức Khuyến mãi', key: 'promotions', icon: Megaphone },
  ];

  const currentWidth = isCollapsed ? 80 : (isExpanded ? window.innerWidth : 256);

  return (
    <div
      ref={sidebarRef}
      className={`admin-sidebar bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 min-h-screen transition-all duration-300 ${
        isCollapsed ? 'w-20' : 'w-64'
      } flex flex-col shadow-2xl fixed left-0 top-0 h-full z-50 overflow-x-auto`}
      style={{ 
        width: `${currentWidth}px`,
        minWidth: isCollapsed ? '80px' : (isExpanded ? '100vw' : '256px'),
        maxWidth: '100vw'
      }}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onWheel={(e) => {
        if (!isCollapsed && e.deltaX !== 0) {
          // Khi scroll ngang bằng wheel, mở rộng sidebar
          if (e.deltaX > 0) {
            setIsExpanded(true);
          } else if (e.deltaX < 0 && sidebarRef.current?.scrollLeft === 0) {
            setIsExpanded(false);
          }
        }
      }}
      onTouchStart={(e) => {
        if (!isCollapsed) {
          setIsExpanded(true);
        }
      }}
      onTouchEnd={(e) => {
        if (!isCollapsed && sidebarRef.current?.scrollLeft === 0) {
          setIsExpanded(false);
        }
      }}
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
            onClick={handleToggleCollapse}
            className="w-8 h-8 flex items-center justify-center bg-purple-800 hover:bg-purple-700 rounded-lg transition-all duration-300"
          >
            {isCollapsed ? (
              <ChevronRight className="text-white w-4 h-4" />
            ) : (
              <ChevronLeft className="text-white w-4 h-4" />
            )}
          </button>
        </div>
      </div>

      {/* Menu Items */}
      <nav className="flex-1 p-4 space-y-2 overflow-y-auto overflow-x-hidden" style={{ minWidth: isExpanded ? '100vw' : '100%' }}>
        {menuItems.map((item) => {
          const Icon = item.icon;
          return (
            <button
              key={item.key}
              onClick={() => onMenuChange(item.key)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300 group relative ${
                activeMenu === item.key
                  ? 'bg-gradient-to-r from-purple-600 to-pink-600 shadow-lg scale-105'
                  : 'hover:bg-purple-800/50 hover:scale-105'
              }`}
            >
              <Icon 
                size={20} 
                className={`transition-transform duration-300 ${
                  activeMenu === item.key ? 'text-white scale-110' : 'text-purple-300 group-hover:text-white group-hover:scale-110'
                }`} 
              />
              {!isCollapsed && (
                <>
                  <span className={`font-bold transition-colors flex-1 text-left ${activeMenu === item.key ? 'text-white' : 'text-purple-200'}`}>
                    {item.label}
                  </span>
                  {item.badge !== undefined && item.badge > 0 && (
                    <span className="bg-gradient-to-r from-red-500 to-pink-600 text-white text-xs font-bold px-2 py-1 rounded-full animate-pulse min-w-[24px] text-center">
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
          );
        })}
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

