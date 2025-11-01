import React, { useState } from 'react';

interface AdminHeaderProps {
  onSearch?: (query: string) => void;
}

const AdminHeader: React.FC<AdminHeaderProps> = ({ onSearch }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [showNotifications, setShowNotifications] = useState(false);
  const [showProfile, setShowProfile] = useState(false);

  const notifications = [
    { id: 1, message: 'New order received', time: '2 min ago', unread: true },
    { id: 2, message: '3 new seller requests', time: '10 min ago', unread: true },
    { id: 3, message: 'System update completed', time: '1 hour ago', unread: false },
  ];

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (onSearch) {
      onSearch(searchQuery);
    }
  };

  return (
    <header className="bg-white border-b border-gray-200 shadow-sm sticky top-0 z-50">
      <div className="px-6 py-4 flex items-center justify-between">
        {/* Search */}
        <form onSubmit={handleSearch} className="flex-1 max-w-md">
          <div className="relative">
            <input
              type="text"
              placeholder="Search..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-300"
            />
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">🔍</span>
          </div>
        </form>

        {/* Right side */}
        <div className="flex items-center gap-4">
          {/* Notifications */}
          <div className="relative">
            <button
              onClick={() => setShowNotifications(!showNotifications)}
              className="relative w-10 h-10 flex items-center justify-center bg-gradient-to-r from-purple-100 to-pink-100 rounded-xl hover:from-purple-200 hover:to-pink-200 transition-all duration-300 group"
            >
              <span className="text-2xl group-hover:scale-110 transition-transform duration-300">🔔</span>
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-gradient-to-r from-red-500 to-pink-600 rounded-full border-2 border-white animate-pulse"></span>
            </button>

            {/* Notifications Dropdown */}
            {showNotifications && (
              <div className="absolute right-0 top-full mt-2 w-80 bg-white rounded-2xl shadow-2xl border-2 border-gray-200 overflow-hidden animate-fade-in">
                <div className="bg-gradient-to-r from-purple-600 to-pink-600 p-4">
                  <h3 className="text-white font-bold">Notifications</h3>
                </div>
                <div className="max-h-96 overflow-y-auto">
                  {notifications.map((notif) => (
                    <div
                      key={notif.id}
                      className={`p-4 border-b border-gray-100 hover:bg-gradient-to-r hover:from-purple-50 hover:to-pink-50 transition-all duration-300 ${
                        notif.unread ? 'bg-blue-50/50' : ''
                      }`}
                    >
                      <p className="font-bold text-gray-900">{notif.message}</p>
                      <p className="text-xs text-gray-500">{notif.time}</p>
                    </div>
                  ))}
                </div>
                <div className="p-3 bg-gray-50">
                  <button className="w-full text-center text-purple-600 font-bold hover:text-purple-800 transition-colors">
                    View All
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Profile */}
          <div className="relative">
            <button
              onClick={() => setShowProfile(!showProfile)}
              className="flex items-center gap-3 bg-gradient-to-r from-purple-100 to-pink-100 hover:from-purple-200 hover:to-pink-200 rounded-xl p-2 transition-all duration-300 group"
            >
              <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center shadow-lg">
                <span className="text-white font-bold">AD</span>
              </div>
              <div className="text-left hidden sm:block">
                <p className="text-sm font-bold text-gray-900">Admin</p>
                <p className="text-xs text-gray-600">Administrator</p>
              </div>
              <span className="hidden sm:block group-hover:rotate-180 transition-transform duration-300">▼</span>
            </button>

            {/* Profile Dropdown */}
            {showProfile && (
              <div className="absolute right-0 top-full mt-2 w-56 bg-white rounded-2xl shadow-2xl border-2 border-gray-200 overflow-hidden animate-fade-in">
                <div className="p-4 border-b border-gray-100">
                  <p className="font-bold text-gray-900">Admin User</p>
                  <p className="text-xs text-gray-600">admin@example.com</p>
                </div>
                <div className="p-2">
                  <button className="w-full text-left px-4 py-2 rounded-lg hover:bg-purple-50 transition-colors text-gray-700 font-medium">
                    👤 Profile
                  </button>
                  <button className="w-full text-left px-4 py-2 rounded-lg hover:bg-purple-50 transition-colors text-gray-700 font-medium">
                    ⚙️ Settings
                  </button>
                  <button className="w-full text-left px-4 py-2 rounded-lg hover:bg-purple-50 transition-colors text-gray-700 font-medium">
                    🔓 Logout
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};

export default AdminHeader;

