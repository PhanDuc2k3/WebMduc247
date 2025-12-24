import React, { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { Bell, X, Package, Gift, Newspaper, Info } from "lucide-react";
import { useNavigate } from "react-router-dom";
import notificationApi from "../../api/notificationApi";
import type { Notification } from "../../api/notificationApi";

interface NotificationButtonProps {
  userId?: string;
}

// Loại bỏ emoji khỏi tiêu đề (tránh emoji từ BE)
const cleanTitle = (title: string) => {
  try {
    // Loại bỏ các ký tự emoji (Extended_Pictographic)
    return title.replace(/[\p{Extended_Pictographic}]/gu, "").trim();
  } catch {
    // Fallback nếu môi trường không hỗ trợ Unicode property escapes
    return title.replace(/[^\p{L}\p{N}\p{P}\p{Z}]/gu, "").trim();
  }
};

const NotificationButton: React.FC<NotificationButtonProps> = ({ userId }) => {
  const [showDropdown, setShowDropdown] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  // Detect mobile screen
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 640);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

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

  // Đóng dropdown khi click ra ngoài (chỉ desktop)
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      // Chỉ xử lý trên desktop (không phải mobile)
      if (!isMobile) {
        if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
          setShowDropdown(false);
        }
      }
    };

    if (showDropdown) {
      document.addEventListener("mousedown", handleClickOutside);
      fetchNotifications(); // Refresh notifications khi mở dropdown
      
      // Prevent body scroll trên mobile khi mở popup
      if (isMobile) {
        document.body.style.overflow = "hidden";
      }
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      // Restore body scroll
      document.body.style.overflow = "";
    };
  }, [showDropdown, userId, isMobile]);

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
        return <Package size={20} className="text-[#2F5FEB]" />;
      case "voucher":
        return <Gift size={20} className="text-[#2F5FEB]" />;
      case "news":
        return <Newspaper size={20} className="text-[#2F5FEB]" />;
      case "system":
        return <Info size={20} className="text-gray-600" />;
      default:
        return <Bell size={20} className="text-gray-600" />;
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

  // Render dropdown content
  const renderDropdownContent = (isPortal: boolean = false) => (
    <>
      {/* Backdrop for mobile - chỉ hiển thị trên mobile */}
      {isMobile && (
        <div 
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[99998]"
          onClick={() => setShowDropdown(false)}
          style={{ 
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            width: '100vw',
            height: '100vh',
          }}
        />
      )}

      {/* Dropdown */}
      <div 
        className={`${isMobile ? 'fixed' : 'absolute'} ${isMobile ? 'inset-0' : 'left-auto right-0 top-full mt-2'} ${isMobile ? 'w-screen h-screen' : 'w-96 md:w-[28rem] max-w-[28rem] h-auto max-h-[600px]'} bg-white ${isMobile ? 'rounded-none' : 'rounded-3xl'} shadow-2xl ${isMobile ? 'border-0' : 'border border-gray-100'} overflow-hidden ${isMobile ? 'z-[99999]' : 'z-[9999]'} flex flex-col`}
        style={isMobile ? {
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          width: '100vw',
          height: '100vh',
          maxWidth: '100vw',
          maxHeight: '100vh',
        } : {}}
        onClick={(e) => e.stopPropagation()}
      >
          {/* Header */}
          <div className="bg-[#2F5FEB] p-4 sm:p-5 flex items-center justify-between relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-r from-white/10 to-transparent"></div>
            <div className="relative z-10 flex items-center gap-3">
              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
                <Bell size={20} className="sm:w-6 sm:h-6 text-white" />
              </div>
              <div>
                <h3 className="text-white font-bold text-lg sm:text-xl">Thông báo</h3>
                {unreadCount > 0 && (
                  <p className="text-white/90 text-xs sm:text-sm">{unreadCount} chưa đọc</p>
                )}
              </div>
            </div>
            <div className="relative z-10 flex items-center gap-2">
              {unreadCount > 0 && (
                <button
                  onClick={handleMarkAllAsRead}
                  className="text-white/90 text-xs sm:text-sm font-medium hover:text-white hover:underline px-2 py-1 rounded-lg hover:bg-white/10 transition-all"
                >
                  Đánh dấu đã đọc
                </button>
              )}
              <button
                onClick={() => setShowDropdown(false)}
                className="text-white/90 hover:text-white hover:bg-white/20 transition-all p-1.5 sm:p-2 rounded-lg"
              >
                <X size={20} className="sm:w-5 sm:h-5" />
              </button>
            </div>
          </div>

          {/* Notifications List */}
          <div className="overflow-y-auto flex-1 h-0 sm:max-h-[500px] scrollbar-thin scrollbar-thumb-[#2F5FEB]/30 scrollbar-track-transparent">
            {loading ? (
              <div className="p-8 sm:p-12 text-center">
                <div className="animate-spin rounded-full h-8 w-8 sm:h-10 sm:w-10 border-4 border-[#2F5FEB]/20 border-t-[#2F5FEB] mx-auto"></div>
                <p className="text-gray-500 mt-4 text-sm sm:text-base font-medium">Đang tải thông báo...</p>
              </div>
            ) : notifications.length === 0 ? (
              <div className="p-8 sm:p-12 text-center">
                <div className="w-16 h-16 sm:w-20 sm:h-20 mx-auto mb-4 rounded-full bg-gray-100 flex items-center justify-center">
                  <Bell size={32} className="sm:w-10 sm:h-10 text-gray-400" />
                </div>
                <p className="text-gray-600 text-sm sm:text-base font-semibold mb-1">Không có thông báo</p>
                <p className="text-gray-400 text-xs sm:text-sm">Bạn sẽ nhận được thông báo ở đây</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {notifications.map((notification, index) => (
                  <div
                    key={notification._id}
                    onClick={() => handleNotificationClick(notification)}
                    className={`p-4 sm:p-5 hover:bg-[#2F5FEB]/5 transition-all duration-200 cursor-pointer relative group ${
                      !notification.isRead ? "bg-[#2F5FEB]/5" : "bg-white"
                    }`}
                    style={{ animationDelay: `${index * 50}ms` }}
                  >
                    <div className="flex items-start gap-3 sm:gap-4">
                      <div className="flex-shrink-0 mt-0.5">
                        <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-xl flex items-center justify-center ${
                          !notification.isRead 
                            ? "bg-[#2F5FEB]/10 ring-2 ring-[#2F5FEB]/40" 
                            : "bg-gray-100"
                        }`}>
                          <div className="scale-110">
                            {getIcon(notification.type)}
                          </div>
                        </div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1.5">
                              <p
                                className={`font-bold text-sm sm:text-base ${
                                  !notification.isRead ? "text-gray-900" : "text-gray-700"
                                }`}
                              >
                                {cleanTitle(notification.title)}
                              </p>
                              {!notification.isRead && (
                                <div className="w-2 h-2 bg-[#2F5FEB] rounded-full flex-shrink-0 animate-pulse"></div>
                              )}
                            </div>
                            <p className="text-sm sm:text-base text-gray-600 line-clamp-2 sm:line-clamp-3 break-words leading-relaxed mb-2">
                              {notification.message}
                            </p>
                            <p className="text-xs sm:text-sm text-gray-400 font-medium">
                              {formatTime(notification.createdAt)}
                            </p>
                          </div>
                          <button
                            onClick={(e) => handleDeleteNotification(notification._id, e)}
                            className="opacity-0 sm:group-hover:opacity-100 group-focus-within:opacity-100 transition-all text-gray-400 hover:text-red-500 hover:bg-red-50 p-2 rounded-lg flex-shrink-0"
                          >
                            <X size={14} className="sm:w-4 sm:h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Footer */}
          {notifications.length > 0 && (
            <div className="p-3 sm:p-4 bg-[#2F5FEB]/5 border-t border-gray-100">
              <button
                onClick={() => {
                  navigate("/notifications");
                  setShowDropdown(false);
                }}
                className="w-full text-center text-[#2F5FEB] font-bold hover:text-[#244ACC] transition-all duration-200 text-sm sm:text-base py-2.5 sm:py-3 rounded-lg hover:bg-[#2F5FEB]/10 active:scale-95 flex items-center justify-center gap-2"
              >
                <span>Xem tất cả thông báo</span>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>
          )}
        </div>
    </>
  );

  return (
    <>
      <div className="relative" ref={dropdownRef}>
        <button
          onClick={() => setShowDropdown(!showDropdown)}
          className="relative flex items-center gap-1 hover:text-[#2F5FEB] transition-all duration-300 group p-1 sm:p-1.5 rounded-lg hover:bg-[#2F5FEB]/5 active:scale-95"
        >
          <div className="relative">
            <div className="absolute inset-0 bg-[#2F5FEB]/20 rounded-full blur-md opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
            <Bell size={14} className="sm:w-4 sm:h-4 md:w-[18px] md:h-[18px] relative z-10 group-hover:scale-110 transition-transform duration-300" />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 sm:-top-1.5 sm:-right-1.5 bg-gradient-to-r from-red-500 to-pink-600 text-white text-[10px] sm:text-xs w-3.5 h-3.5 sm:w-4 sm:h-4 flex items-center justify-center rounded-full font-black animate-pulse">
                {unreadCount > 99 ? "99+" : unreadCount}
              </span>
            )}
          </div>
          <span className="hidden xl:inline text-xs sm:text-sm font-semibold">Thông báo</span>
        </button>

        {/* Desktop Dropdown - render inline */}
        {showDropdown && !isMobile && renderDropdownContent(false)}
      </div>

      {/* Mobile Dropdown - render via Portal to body for full screen */}
      {showDropdown && isMobile && typeof document !== 'undefined' && createPortal(
        renderDropdownContent(true),
        document.body
      )}
    </>
  );
};

export default NotificationButton;

