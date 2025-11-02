const express = require("express");
const router = express.Router();
const { upload, logUpload } = require('../middlewares/upload');
const {
  getOrCreateConversation,
  sendMessage,
  getMessages,
  getUserConversations,
  markMessagesAsRead,
} = require("../controllers/Messages");

// 🟩 Lấy danh sách hội thoại của user
router.get("/conversations/:userId", getUserConversations);

// 🟩 Tạo hoặc lấy conversation giữa 2 user
router.post("/conversation", getOrCreateConversation);

// 🟩 Gửi tin nhắn (hỗ trợ text + ảnh)

router.post(
  '/send',
  upload.fields([{ name: 'attachments', maxCount: 5 }]), // key phải trùng
  logUpload,
  sendMessage
);

// 🟩 Lấy tất cả tin nhắn trong 1 conversation
router.get("/:conversationId", getMessages);

// 🟩 Đánh dấu tin nhắn đã đọc
router.post("/mark-read/:conversationId", markMessagesAsRead);

module.exports = router;
