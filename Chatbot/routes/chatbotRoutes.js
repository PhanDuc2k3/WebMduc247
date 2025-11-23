const express = require("express");
const { chatWithGroq } = require("../Controllers/ChatbotController");

const router = express.Router();

router.post("/chat", chatWithGroq);

module.exports = router;
