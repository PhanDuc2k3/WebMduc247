import React, { useState, useEffect } from "react";
import { Bell, X, Package, Gift, Newspaper, Info, Check, Trash2, Filter } from "lucide-react";
import { useNavigate } from "react-router-dom";
import notificationApi from "../../api/notificationApi";
import type { Notification } from "../../api/notificationApi";
import { toast } from "react-toastify";

const Notifications: React.FC = () => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState<"all" | "unread">("all");
  const navigate = useNavigate();

  // Fetch notifications
  const fetchNotifications = async () => {
    try {
      setLoading(true);
      const res = await notificationApi.getNotifications({ 
        limit: 100,
        unreadOnly: filter === "unread"
      });
      setNotifications(res.data.notifications || []);
    } catch (error) {
      console.error("Lỗi fetch notifications:", error);
      toast.error("Không thể tải thông báo");
    } finally {
      setLoading(false);
    }
  };

  // Fetch unread count
  const fetchUnreadCount = async () => {
    try {
      const res = await notificationApi.getUnreadCount();
      setUnreadCount(res.data.count || 0);
    } catch (error) {
      console.error("Lỗi fetch unread count:", error);
    }
  };

  useEffect(() => {
    fetchNotifications();
    fetchUnreadCount();
  }, [filter]);

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
    }
  };

  // Đánh dấu tất cả là đã đọc
  const handleMarkAllAsRead = async () => {
    try {
      await notificationApi.markAllAsRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      setUnreadCount(0);
      toast.success("Đã đánh dấu tất cả thông báo là đã đọc");
    } catch (error) {
      console.error("Lỗi mark all as read:", error);
      toast.error("Không thể đánh dấu tất cả đã đọc");
    }
  };

  // Xóa notification
  const handleDeleteNotification = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await notificationApi.deleteNotification(id);
      const notification = notifications.find((n) => n._id === id);
      setNotifications((prev) => prev.filter((n) => n._id !== id));
      // Update unread count nếu notification chưa đọc
      if (notification && !notification.isRead) {
        setUnreadCount((prev) => Math.max(0, prev - 1));
      }
      toast.success("Đã xóa thông báo");
    } catch (error) {
      console.error("Lỗi delete notification:", error);
      toast.error("Không thể xóa thông báo");
    }
  };

  // Get icon theo type
  const getIcon = (type: string) => {
    switch (type) {
      case "order":
        return <Package size={20} className="text-blue-600" />;
      case "voucher":
        return <Gift size={20} className="text-purple-600" />;
      case "news":
        return <Newspaper size={20} className="text-green-600" />;
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

  return (
    <div className="w-full p-3 sm:p-4 md:p-6 lg:p-8">
      {/* Header */}
      <div className="mb-4 sm:mb-6 animate-fade-in-down">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl md:text-3xl font-bold mb-1 sm:mb-2 text-gray-900 gradient-text flex items-center gap-2 sm:gap-3">
              <Bell size={24} className="text-purple-600" />
              Thông báo
            </h1>
            <p className="text-gray-600 text-sm sm:text-base">
              {unreadCount > 0 ? `${unreadCount} thông báo chưa đọc` : "Tất cả thông báo đã đọc"}
            </p>
          </div>
          <div className="flex items-center gap-2 sm:gap-3">
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllAsRead}
                className="px-3 py-2 sm:px-4 sm:py-2.5 bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-lg sm:rounded-xl hover:from-blue-600 hover:to-purple-600 text-xs sm:text-sm font-bold transition-all duration-300 shadow-lg hover:shadow-xl transform hover:scale-105 flex items-center gap-1.5 sm:gap-2"
              >
                <Check size={14} className="sm:w-4 sm:h-4" />
                <span className="hidden sm:inline">Đánh dấu tất cả đã đọc</span>
                <span className="sm:hidden">Đã đọc tất cả</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Filter */}
      <div className="mb-4 sm:mb-6 animate-fade-in-up delay-100">
        <div className="flex items-center gap-2 sm:gap-3 bg-white rounded-xl sm:rounded-2xl shadow-lg border-2 border-gray-200 p-2 sm:p-3">
          <Filter size={16} className="sm:w-5 sm:h-5 text-gray-600" />
          <button
            onClick={() => setFilter("all")}
            className={`px-3 py-1.5 sm:px-4 sm:py-2 rounded-lg sm:rounded-xl text-xs sm:text-sm font-bold transition-all duration-300 ${
              filter === "all"
                ? "bg-gradient-to-r from-blue-500 to-purple-500 text-white shadow-lg"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            Tất cả
          </button>
          <button
            onClick={() => setFilter("unread")}
            className={`px-3 py-1.5 sm:px-4 sm:py-2 rounded-lg sm:rounded-xl text-xs sm:text-sm font-bold transition-all duration-300 relative ${
              filter === "unread"
                ? "bg-gradient-to-r from-blue-500 to-purple-500 text-white shadow-lg"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            Chưa đọc
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs w-4 h-4 sm:w-5 sm:h-5 flex items-center justify-center rounded-full font-black">
                {unreadCount > 99 ? "99+" : unreadCount}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Notifications List */}
      <div className="animate-fade-in-up delay-200">
        {loading ? (
          <div className="bg-white rounded-xl sm:rounded-2xl shadow-lg border-2 border-gray-200 p-8 sm:p-12 text-center">
            <div className="animate-spin rounded-full h-8 w-8 sm:h-12 sm:w-12 border-t-2 border-b-2 border-purple-600 mx-auto"></div>
            <p className="text-gray-500 mt-4 text-sm sm:text-base">Đang tải thông báo...</p>
          </div>
        ) : notifications.length === 0 ? (
          <div className="bg-white rounded-xl sm:rounded-2xl shadow-lg border-2 border-gray-200 p-8 sm:p-12 text-center">
            <Bell size={64} className="sm:w-20 sm:h-20 mx-auto text-gray-300 mb-4" />
            <p className="text-gray-500 text-base sm:text-lg font-semibold mb-2">
              {filter === "unread" ? "Không có thông báo chưa đọc" : "Không có thông báo nào"}
            </p>
            <p className="text-gray-400 text-sm sm:text-base">
              {filter === "unread" ? "Tất cả thông báo đã được đọc" : "Bạn sẽ nhận được thông báo ở đây"}
            </p>
          </div>
        ) : (
          <div className="space-y-2 sm:space-y-3">
            {notifications.map((notification) => (
              <div
                key={notification._id}
                onClick={() => handleNotificationClick(notification)}
                className={`bg-white rounded-xl sm:rounded-2xl shadow-lg border-2 border-gray-200 p-4 sm:p-6 hover:shadow-xl transition-all duration-300 cursor-pointer relative group ${
                  !notification.isRead ? "bg-blue-50/50 border-blue-300" : ""
                }`}
              >
                <div className="flex items-start gap-3 sm:gap-4">
                  <div className="flex-shrink-0 mt-0.5">
                    {notification.icon ? (
                      <span className="text-2xl sm:text-3xl">{notification.icon}</span>
                    ) : (
                      getIcon(notification.type)
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2 sm:gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-2">
                          <p
                            className={`font-bold text-sm sm:text-base md:text-lg ${
                              !notification.isRead ? "text-gray-900" : "text-gray-700"
                            }`}
                          >
                            {notification.title}
                          </p>
                          {!notification.isRead && (
                            <div className="w-2 h-2 sm:w-2.5 sm:h-2.5 bg-blue-600 rounded-full flex-shrink-0"></div>
                          )}
                        </div>
                        <p className="text-xs sm:text-sm md:text-base text-gray-600 mb-2 sm:mb-3 break-words">
                          {notification.message}
                        </p>
                        <p className="text-xs sm:text-sm text-gray-400">
                          {formatTime(notification.createdAt)}
                        </p>
                      </div>
                      <button
                        onClick={(e) => handleDeleteNotification(notification._id, e)}
                        className="opacity-0 sm:group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity text-gray-400 hover:text-red-500 p-1 sm:p-2 flex-shrink-0"
                      >
                        <Trash2 size={16} className="sm:w-5 sm:h-5" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Notifications;

