// routes/ChatbotRoutes.js
const express = require("express");
const router = express.Router();
const { chatWithGroq } = require("../controllers/ChatbotController");

router.post("/", chatWithGroq);

module.exports = router;
