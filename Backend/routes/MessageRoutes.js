const express = require("express");
const router = express.Router();
const {
  getOrCreateConversation,
  sendMessage,
  getMessages,
  getUserConversations,
} = require("../controllers/Messages");


// const { protect } = require("../middlewares/authMiddleware");

// Lấy danh sách conversation của 1 user
router.get("/conversations/:userId", /* protect, */ getUserConversations);

// Tạo hoặc lấy conversation giữa 2 user
router.post("/conversation", /* protect, */ getOrCreateConversation);

// Gửi tin nhắn
router.post("/send", /* protect, */ sendMessage);

// Lấy tất cả tin nhắn trong 1 conversation
router.get("/:conversationId", /* protect, */ getMessages);

module.exports = router;
