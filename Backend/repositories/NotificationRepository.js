const Notification = require('../models/Notification');

class NotificationRepository {
  // Tạo notification
  async create(notificationData) {
    const notification = new Notification(notificationData);
    return await notification.save();
  }

  // Tạo nhiều notifications
  async createMany(notificationsData) {
    return await Notification.insertMany(notificationsData);
  }

  // Tìm notifications theo userId
  async findByUserId(userId, options = {}) {
    const { limit = 50, unreadOnly = false } = options;
    let query = { userId };
    
    if (unreadOnly === true || unreadOnly === "true") {
      query.isRead = false;
    }

    return await Notification.find(query)
      .sort({ createdAt: -1 })
      .limit(parseInt(limit));
  }

  // Đếm unread notifications
  async countUnread(userId) {
    return await Notification.countDocuments({
      userId,
      isRead: false,
    });
  }

  // Tìm notification theo ID và userId
  async findByIdAndUserId(notificationId, userId) {
    return await Notification.findOne({
      _id: notificationId,
      userId,
    });
  }

  // Cập nhật notification
  async update(notificationId, userId, updateData) {
    return await Notification.findOneAndUpdate(
      { _id: notificationId, userId },
      updateData,
      { new: true }
    );
  }

  // Đánh dấu tất cả là đã đọc
  async markAllAsRead(userId) {
    return await Notification.updateMany(
      { userId, isRead: false },
      { isRead: true }
    );
  }

  // Xóa notification
  async delete(notificationId, userId) {
    return await Notification.findOneAndDelete({
      _id: notificationId,
      userId,
    });
  }
}

module.exports = new NotificationRepository();

