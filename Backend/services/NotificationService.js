const notificationRepository = require('../repositories/NotificationRepository');

class NotificationService {
  // Helper function để lấy icon mặc định
  getDefaultIcon(type) {
    const iconMap = {
      order: "📦",
      voucher: "🎁",
      news: "📢",
      system: "🔔",
    };
    return iconMap[type] || "🔔";
  }

  // Lấy notifications của user
  async getNotifications(userId, options = {}) {
    return await notificationRepository.findByUserId(userId, options);
  }

  // Đếm unread notifications
  async getUnreadCount(userId) {
    return await notificationRepository.countUnread(userId);
  }

  // Đánh dấu đã đọc
  async markAsRead(userId, notificationId) {
    const notification = await notificationRepository.findByIdAndUserId(notificationId, userId);
    if (!notification) {
      throw new Error("Không tìm thấy thông báo");
    }

    notification.isRead = true;
    await notification.save();
    return notification;
  }

  // Đánh dấu tất cả đã đọc
  async markAllAsRead(userId) {
    return await notificationRepository.markAllAsRead(userId);
  }

  // Xóa notification
  async deleteNotification(userId, notificationId) {
    const notification = await notificationRepository.delete(notificationId, userId);
    if (!notification) {
      throw new Error("Không tìm thấy thông báo");
    }
    return notification;
  }

  // Tạo notification (helper function)
  async createNotification(userId, notificationData) {
    try {
      const {
        type,
        title,
        message,
        relatedId,
        link,
        icon,
        metadata,
      } = notificationData;

      return await notificationRepository.create({
        userId,
        type,
        title,
        message,
        relatedId,
        link,
        icon: icon || this.getDefaultIcon(type),
        metadata,
      });
    } catch (error) {
      console.error("Lỗi createNotification:", error);
      return null;
    }
  }

  // Tạo bulk notifications
  async createBulkNotifications(userIds, notificationData) {
    try {
      const {
        type,
        title,
        message,
        relatedId,
        link,
        icon,
        metadata,
      } = notificationData;

      const notifications = userIds.map((userId) => ({
        userId,
        type,
        title,
        message,
        relatedId,
        link,
        icon: icon || this.getDefaultIcon(type),
        metadata,
      }));

      return await notificationRepository.createMany(notifications);
    } catch (error) {
      console.error("Lỗi createBulkNotifications:", error);
      return null;
    }
  }
}

module.exports = new NotificationService();

