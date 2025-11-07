import React, { useState, useEffect, useRef } from "react";
import { Bell, X, Package, Gift, Newspaper, Info } from "lucide-react";
import { useNavigate } from "react-router-dom";
import notificationApi, { Notification } from "../../api/notificationApi";

interface NotificationButtonProps {
  userId?: string;
}

const NotificationButton: React.FC<NotificationButtonProps> = ({ userId }) => {
  const [showDropdown, setShowDropdown] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  // Fetch notifications
  const fetchNotifications = async () => {
    if (!userId) return;
    try {
      setLoading(true);
      const res = await notificationApi.getNotifications({ limit: 20 });
      setNotifications(res.data.notifications || []);
    } catch (error) {
      console.error("Lỗi fetch notifications:", error);
    } finally {
      setLoading(false);
    }
  };

  // Fetch unread count
  const fetchUnreadCount = async () => {
    if (!userId) return;
    try {
      const res = await notificationApi.getUnreadCount();
      setUnreadCount(res.data.count || 0);
    } catch (error) {
      console.error("Lỗi fetch unread count:", error);
    }
  };

  // Initial fetch
  useEffect(() => {
    if (userId) {
      fetchNotifications();
      fetchUnreadCount();
    }
  }, [userId]);

  // Polling để cập nhật notifications mới (mỗi 30 giây)
  useEffect(() => {
    if (!userId) return;
    const interval = setInterval(() => {
      fetchUnreadCount();
      if (showDropdown) {
        fetchNotifications();
      }
    }, 30000); // 30 seconds

    return () => clearInterval(interval);
  }, [userId, showDropdown]);

  // Đóng dropdown khi click ra ngoài
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    };

    if (showDropdown) {
      document.addEventListener("mousedown", handleClickOutside);
      fetchNotifications(); // Refresh notifications khi mở dropdown
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [showDropdown, userId]);

  // Xử lý click notification
  const handleNotificationClick = async (notification: Notification) => {
    if (!notification.isRead) {
      try {
        await notificationApi.markAsRead(notification._id);
        setNotifications((prev) =>
          prev.map((n) => (n._id === notification._id ? { ...n, isRead: true } : n))
        );
        setUnreadCount((prev) => Math.max(0, prev - 1));
      } catch (error) {
        console.error("Lỗi mark as read:", error);
      }
    }

    // Navigate to link if exists
    if (notification.link) {
      navigate(notification.link);
      setShowDropdown(false);
    }
  };

  // Đánh dấu tất cả là đã đọc
  const handleMarkAllAsRead = async () => {
    try {
      await notificationApi.markAllAsRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      setUnreadCount(0);
    } catch (error) {
      console.error("Lỗi mark all as read:", error);
    }
  };

  // Xóa notification
  const handleDeleteNotification = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await notificationApi.deleteNotification(id);
      setNotifications((prev) => prev.filter((n) => n._id !== id));
      // Update unread count nếu notification chưa đọc
      const notification = notifications.find((n) => n._id === id);
      if (notification && !notification.isRead) {
        setUnreadCount((prev) => Math.max(0, prev - 1));
      }
    } catch (error) {
      console.error("Lỗi delete notification:", error);
    }
  };

  // Get icon theo type
  const getIcon = (type: string) => {
    switch (type) {
      case "order":
        return <Package size={16} className="text-blue-600" />;
      case "voucher":
        return <Gift size={16} className="text-purple-600" />;
      case "news":
        return <Newspaper size={16} className="text-green-600" />;
      case "system":
        return <Info size={16} className="text-gray-600" />;
      default:
        return <Bell size={16} className="text-gray-600" />;
    }
  };

  // Format time (relative time)
  const formatTime = (dateString: string) => {
    try {
      const now = new Date();
      const date = new Date(dateString);
      const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

      if (diffInSeconds < 60) {
        return "vừa xong";
      } else if (diffInSeconds < 3600) {
        const minutes = Math.floor(diffInSeconds / 60);
        return `${minutes} phút trước`;
      } else if (diffInSeconds < 86400) {
        const hours = Math.floor(diffInSeconds / 3600);
        return `${hours} giờ trước`;
      } else if (diffInSeconds < 604800) {
        const days = Math.floor(diffInSeconds / 86400);
        return `${days} ngày trước`;
      } else {
        return date.toLocaleDateString("vi-VN", {
          day: "2-digit",
          month: "2-digit",
          year: "numeric",
        });
      }
    } catch {
      return "";
    }
  };

  if (!userId) return null;

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setShowDropdown(!showDropdown)}
        className="relative flex items-center gap-1.5 hover:text-purple-600 transition-all duration-300 group"
      >
        <div className="relative">
          <Bell size={18} className="group-hover:scale-125 transition-transform" />
          {unreadCount > 0 && (
            <span className="absolute -top-1.5 -right-1.5 bg-gradient-to-r from-red-500 to-pink-600 text-white text-xs w-5 h-5 flex items-center justify-center rounded-full font-black animate-pulse">
              {unreadCount > 99 ? "99+" : unreadCount}
            </span>
          )}
        </div>
        <span className="hidden xl:inline text-sm font-bold">Thông báo</span>
      </button>

      {/* Dropdown */}
      {showDropdown && (
        <div className="absolute right-0 top-full mt-2 w-80 md:w-96 max-w-[90vw] bg-white rounded-2xl shadow-2xl border-2 border-gray-200 overflow-hidden animate-fade-in z-[9999] max-h-[600px] flex flex-col">
          {/* Header */}
          <div className="bg-gradient-to-r from-purple-600 to-pink-600 p-4 flex items-center justify-between">
            <h3 className="text-white font-bold text-lg">Thông báo</h3>
            <div className="flex items-center gap-2">
              {unreadCount > 0 && (
                <button
                  onClick={handleMarkAllAsRead}
                  className="text-white text-xs font-semibold hover:underline"
                >
                  Đánh dấu tất cả đã đọc
                </button>
              )}
              <button
                onClick={() => setShowDropdown(false)}
                className="text-white hover:text-gray-200 transition-colors"
              >
                <X size={18} />
              </button>
            </div>
          </div>

          {/* Notifications List */}
          <div className="overflow-y-auto flex-1 max-h-[500px]">
            {loading ? (
              <div className="p-8 text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-purple-600 mx-auto"></div>
                <p className="text-gray-500 mt-2 text-sm">Đang tải...</p>
              </div>
            ) : notifications.length === 0 ? (
              <div className="p-8 text-center">
                <Bell size={48} className="mx-auto text-gray-300 mb-2" />
                <p className="text-gray-500 text-sm">Không có thông báo nào</p>
              </div>
            ) : (
              notifications.map((notification) => (
                <div
                  key={notification._id}
                  onClick={() => handleNotificationClick(notification)}
                  className={`p-4 border-b border-gray-100 hover:bg-gradient-to-r hover:from-purple-50 hover:to-pink-50 transition-all duration-300 cursor-pointer relative group ${
                    !notification.isRead ? "bg-blue-50/50" : ""
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0 mt-0.5">
                      {notification.icon ? (
                        <span className="text-xl">{notification.icon}</span>
                      ) : (
                        getIcon(notification.type)
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1">
                          <p
                            className={`font-bold text-sm mb-1 ${
                              !notification.isRead ? "text-gray-900" : "text-gray-700"
                            }`}
                          >
                            {notification.title}
                          </p>
                          <p className="text-xs text-gray-600 line-clamp-2">
                            {notification.message}
                          </p>
                          <p className="text-xs text-gray-400 mt-1">
                            {formatTime(notification.createdAt)}
                          </p>
                        </div>
                        {!notification.isRead && (
                          <div className="w-2 h-2 bg-blue-600 rounded-full flex-shrink-0 mt-1"></div>
                        )}
                      </div>
                    </div>
                    <button
                      onClick={(e) => handleDeleteNotification(notification._id, e)}
                      className="opacity-0 group-hover:opacity-100 transition-opacity text-gray-400 hover:text-red-500 p-1"
                    >
                      <X size={14} />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Footer */}
          {notifications.length > 0 && (
            <div className="p-3 bg-gray-50 border-t border-gray-200">
              <button
                onClick={() => {
                  navigate("/notifications");
                  setShowDropdown(false);
                }}
                className="w-full text-center text-purple-600 font-bold hover:text-purple-800 transition-colors text-sm"
              >
                Xem tất cả thông báo
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default NotificationButton;

