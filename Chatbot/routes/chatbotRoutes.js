const express = require("express");
const { chatWithGemini } = require("../Controllers/ChatbotController");

const router = express.Router();

router.post("/chat", chatWithGemini);

module.exports = router;
