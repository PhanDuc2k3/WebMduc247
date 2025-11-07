const express = require("express");
const router = express.Router();
const {
  getNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
  deleteNotification,
} = require("../controllers/NotificationController");
const auth = require("../middlewares/authMiddleware");

// Lấy tất cả notifications của user
router.get("/", auth, getNotifications);

// Lấy số lượng notifications chưa đọc
router.get("/unread-count", auth, getUnreadCount);

// Đánh dấu notification là đã đọc
router.put("/:id/read", auth, markAsRead);

// Đánh dấu tất cả notifications là đã đọc
router.put("/read-all", auth, markAllAsRead);

// Xóa notification
router.delete("/:id", auth, deleteNotification);

module.exports = router;

