// websocket/cartSocket.js
const express = require("express");

module.exports = (io) => {
  io.on("connection", (socket) => {
    console.log("🛒 User connected to Cart Socket:", socket.id);

    // --- Join room theo userId
    socket.on("joinUserCart", (userId) => {
      if (!userId) return;
      socket.join(userId);
      console.log(`📥 Socket ${socket.id} joined cart room ${userId}`);
    });

    // --- Disconnect
    socket.on("disconnect", (reason) => {
      console.log(`❌ User disconnected from Cart Socket: ${socket.id}, reason: ${reason}`);
    });

    // --- Connect / Error log
    socket.on("connect_error", (err) => {
      console.error(`❌ Socket connect_error:`, err);
    });
  });

  // --- HTTP route để backend gọi emit từ controller
  const app = express();
  app.use(express.json());

  app.post("/emitCartUpdate", (req, res) => {
    const { userId, cart } = req.body;
    if (!userId || !cart) return res.status(400).json({ message: "Thiếu dữ liệu" });

    // --- Tính cartCount từ cart.items
    const cartCount = Array.isArray(cart.items)
      ? cart.items.reduce((acc, item) => acc + (item.quantity || 0), 0)
      : 0;

    // --- Emit đúng payload FE cần
    io.to(userId).emit("cartUpdated", { items: cart, cartCount });

    console.log(`📡 Cart updated emitted to user ${userId}`, { items: cart, cartCount });

    res.status(200).json({ ok: true });
  });

  return app; // mount route vào backend chính
};
