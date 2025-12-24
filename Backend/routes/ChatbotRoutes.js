// routes/ChatbotRoutes.js
const express = require("express");
const router = express.Router();
const { chatWithGroq } = require("../controllers/ChatbotController");
const optionalAuth = require("../middlewares/optionalAuthMiddleware");

// Cho phép cả khách và user chat; nếu có token sẽ có req.user để cá nhân hóa
router.post("/", optionalAuth, chatWithGroq);

module.exports = router;
