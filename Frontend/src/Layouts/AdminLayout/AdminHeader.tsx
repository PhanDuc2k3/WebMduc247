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
    <header className="bg-slate-700 border-b border-slate-600 shadow-sm sticky top-0 z-50">
      <div className="px-6 py-4 flex items-center justify-between">
        {/* Search */}
        <form onSubmit={handleSearch} className="flex-1 max-w-md">
          <div className="relative">
            <input
              type="text"
              placeholder="Search..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border-2 border-slate-500 bg-slate-600 text-white placeholder-slate-300 rounded-xl focus:ring-2 focus:ring-slate-400 focus:border-slate-400 transition-all duration-300"
            />
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300">🔍</span>
          </div>
        </form>

        {/* Right side */}
        <div className="flex items-center gap-4">
          {/* Notifications */}
          <div className="relative">
            <button
              onClick={() => setShowNotifications(!showNotifications)}
              className="relative w-10 h-10 flex items-center justify-center bg-slate-600 hover:bg-slate-500 rounded-xl transition-all duration-300 group"
            >
              <span className="text-2xl group-hover:scale-110 transition-transform duration-300">🔔</span>
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full border-2 border-slate-700 animate-pulse"></span>
            </button>

            {/* Notifications Dropdown */}
            {showNotifications && (
              <div className="absolute right-0 top-full mt-2 w-80 bg-slate-700 rounded-2xl shadow-2xl border-2 border-slate-600 overflow-hidden animate-fade-in">
                <div className="bg-slate-600 p-4">
                  <h3 className="text-white font-bold">Notifications</h3>
                </div>
                <div className="max-h-96 overflow-y-auto">
                  {notifications.map((notif) => (
                    <div
                      key={notif.id}
                      className={`p-4 border-b border-slate-600 hover:bg-slate-600 transition-all duration-300 ${
                        notif.unread ? 'bg-slate-600/50' : ''
                      }`}
                    >
                      <p className="font-bold text-white">{notif.message}</p>
                      <p className="text-xs text-slate-300">{notif.time}</p>
                    </div>
                  ))}
                </div>
                <div className="p-3 bg-slate-600">
                  <button className="w-full text-center text-white font-bold hover:text-slate-200 transition-colors">
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
              className="flex items-center gap-3 bg-slate-600 hover:bg-slate-500 rounded-xl p-2 transition-all duration-300 group"
            >
              <div className="w-10 h-10 bg-slate-500 rounded-full flex items-center justify-center shadow-lg">
                <span className="text-white font-bold">AD</span>
              </div>
              <div className="text-left hidden sm:block">
                <p className="text-sm font-bold text-white">Admin</p>
                <p className="text-xs text-slate-300">Administrator</p>
              </div>
              <span className="hidden sm:block group-hover:rotate-180 transition-transform duration-300 text-white">▼</span>
            </button>

            {/* Profile Dropdown */}
            {showProfile && (
              <div className="absolute right-0 top-full mt-2 w-56 bg-slate-700 rounded-2xl shadow-2xl border-2 border-slate-600 overflow-hidden animate-fade-in">
                <div className="p-4 border-b border-slate-600">
                  <p className="font-bold text-white">Admin User</p>
                  <p className="text-xs text-slate-300">admin@example.com</p>
                </div>
                <div className="p-2">
                  <button className="w-full text-left px-4 py-2 rounded-lg hover:bg-slate-600 transition-colors text-white font-medium">
                    Profile
                  </button>
                  <button className="w-full text-left px-4 py-2 rounded-lg hover:bg-slate-600 transition-colors text-white font-medium">
                    Settings
                  </button>
                  <button className="w-full text-left px-4 py-2 rounded-lg hover:bg-slate-600 transition-colors text-white font-medium">
                    Logout
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

