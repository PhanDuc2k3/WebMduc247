// routes/ChatbotRoutes.js
const express = require("express");
const router = express.Router();
const { chatWithGemini } = require("../controllers/ChatbotController");

router.post("/", chatWithGemini);

module.exports = router;
