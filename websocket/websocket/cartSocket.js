// backend/websocket/cartSocketRouter.js
const express = require("express");
const router = express.Router();

// ioInstance sẽ được set từ server.js
let io = null;

// --- Setter để inject io từ server.js
router.setIo = (socketIoInstance) => {
  io = socketIoInstance;
};

// --- Endpoint nhận cart update từ microservice
router.post("/emitCartUpdate", (req, res) => {
  try {
    if (!io) return res.status(500).json({ message: "Socket.io chưa khởi tạo" });

    const { userId, cart, cartCount } = req.body;
    if (!userId || !cart) return res.status(400).json({ message: "Missing userId or cart" });

    io.to(userId).emit("cartUpdated", { cart, cartCount });

    console.log(`[Socket] Cart updated emitted for user ${userId}`);
    return res.status(200).json({ success: true });
  } catch (err) {
    console.error("[Socket] emitCartUpdate error:", err);
    return res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;
