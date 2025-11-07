const Notification = require("../models/Notification");

// Lấy tất cả notifications của user
exports.getNotifications = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { limit = 50, unreadOnly = false } = req.query;

    let query = { userId };
    if (unreadOnly === "true") {
      query.isRead = false;
    }

    const notifications = await Notification.find(query)
      .sort({ createdAt: -1 })
      .limit(parseInt(limit));

    res.status(200).json({ notifications });
  } catch (error) {
    console.error("Lỗi getNotifications:", error);
    res.status(500).json({ message: "Lỗi server" });
  }
};

// Đếm số notifications chưa đọc
exports.getUnreadCount = async (req, res) => {
  try {
    const userId = req.user.userId;
    const count = await Notification.countDocuments({
      userId,
      isRead: false,
    });

    res.status(200).json({ count });
  } catch (error) {
    console.error("Lỗi getUnreadCount:", error);
    res.status(500).json({ message: "Lỗi server" });
  }
};

// Đánh dấu notification là đã đọc
exports.markAsRead = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { id } = req.params;

    const notification = await Notification.findOne({
      _id: id,
      userId,
    });

    if (!notification) {
      return res.status(404).json({ message: "Không tìm thấy thông báo" });
    }

    notification.isRead = true;
    await notification.save();

    res.status(200).json({ message: "Đã đánh dấu đã đọc", notification });
  } catch (error) {
    console.error("Lỗi markAsRead:", error);
    res.status(500).json({ message: "Lỗi server" });
  }
};

// Đánh dấu tất cả notifications là đã đọc
exports.markAllAsRead = async (req, res) => {
  try {
    const userId = req.user.userId;

    await Notification.updateMany(
      { userId, isRead: false },
      { isRead: true }
    );

    res.status(200).json({ message: "Đã đánh dấu tất cả là đã đọc" });
  } catch (error) {
    console.error("Lỗi markAllAsRead:", error);
    res.status(500).json({ message: "Lỗi server" });
  }
};

// Xóa notification
exports.deleteNotification = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { id } = req.params;

    const notification = await Notification.findOneAndDelete({
      _id: id,
      userId,
    });

    if (!notification) {
      return res.status(404).json({ message: "Không tìm thấy thông báo" });
    }

    res.status(200).json({ message: "Đã xóa thông báo" });
  } catch (error) {
    console.error("Lỗi deleteNotification:", error);
    res.status(500).json({ message: "Lỗi server" });
  }
};

// Tạo notification (helper function - có thể gọi từ các controller khác)
exports.createNotification = async (userId, notificationData) => {
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

    const notification = new Notification({
      userId,
      type,
      title,
      message,
      relatedId,
      link,
      icon: icon || getDefaultIcon(type),
      metadata,
    });

    await notification.save();
    return notification;
  } catch (error) {
    console.error("Lỗi createNotification:", error);
    return null;
  }
};

// Helper function để lấy icon mặc định theo type
function getDefaultIcon(type) {
  const iconMap = {
    order: "📦",
    voucher: "🎁",
    news: "📢",
    system: "🔔",
  };
  return iconMap[type] || "🔔";
}

// Tạo notification cho nhiều users (ví dụ: voucher mới, tin tức)
exports.createBulkNotifications = async (userIds, notificationData) => {
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
      icon: icon || getDefaultIcon(type),
      metadata,
    }));

    await Notification.insertMany(notifications);
    return notifications;
  } catch (error) {
    console.error("Lỗi createBulkNotifications:", error);
    return null;
  }
};

