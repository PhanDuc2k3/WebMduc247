const notificationService = require('../services/NotificationService');

exports.getNotifications = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { limit = 50, unreadOnly = false } = req.query;
    const notifications = await notificationService.getNotifications(userId, { limit, unreadOnly });
    res.status(200).json({ notifications });
  } catch (error) {
    console.error("Lỗi getNotifications:", error);
    res.status(500).json({ message: "Lỗi server" });
  }
};

exports.getUnreadCount = async (req, res) => {
  try {
    const userId = req.user.userId;
    const count = await notificationService.getUnreadCount(userId);
    res.status(200).json({ count });
  } catch (error) {
    console.error("Lỗi getUnreadCount:", error);
    res.status(500).json({ message: "Lỗi server" });
  }
};

exports.markAsRead = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { id } = req.params;
    const notification = await notificationService.markAsRead(userId, id);
    res.status(200).json({ message: "Đã đánh dấu đã đọc", notification });
  } catch (error) {
    console.error("Lỗi markAsRead:", error);
    const statusCode = error.message.includes("Không tìm thấy") ? 404 : 500;
    res.status(statusCode).json({ message: error.message || "Lỗi server" });
  }
};

exports.markAllAsRead = async (req, res) => {
  try {
    const userId = req.user.userId;
    await notificationService.markAllAsRead(userId);
    res.status(200).json({ message: "Đã đánh dấu tất cả là đã đọc" });
  } catch (error) {
    console.error("Lỗi markAllAsRead:", error);
    res.status(500).json({ message: "Lỗi server" });
  }
};

exports.deleteNotification = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { id } = req.params;
    await notificationService.deleteNotification(userId, id);
    res.status(200).json({ message: "Đã xóa thông báo" });
  } catch (error) {
    console.error("Lỗi deleteNotification:", error);
    const statusCode = error.message.includes("Không tìm thấy") ? 404 : 500;
    res.status(statusCode).json({ message: error.message || "Lỗi server" });
  }
};

// Helper functions - export để các controller khác sử dụng
exports.createNotification = async (userId, notificationData) => {
  return await notificationService.createNotification(userId, notificationData);
};

exports.createBulkNotifications = async (userIds, notificationData) => {
  return await notificationService.createBulkNotifications(userIds, notificationData);
};
