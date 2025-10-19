// websocket/chatSocket.js
require("dotenv").config();
const mongoose = require("mongoose");
const Message = require("../models/Messages"); // dùng chung model backend
const express = require("express");
const { uploadToCloudinary } = require("../helpers/cloudinaryUploader");

module.exports = (io) => {
  // ✅ Kết nối MongoDB nếu chưa kết nối
  if (!mongoose.connection.readyState) {
    mongoose
      .connect(process.env.MONGO_URI, {
        useNewUrlParser: true,
        useUnifiedTopology: true,
      })
      .then(() => console.log("✅ Connected to MongoDB (Socket Service)"))
      .catch((err) => console.error("❌ MongoDB connection error:", err.message));
  }

  // --- HTTP server để backend chính call emit
  const app = express();
  app.use(express.json());

  app.post("/emit", (req, res) => {
    const { event, data, room } = req.body;
    if (!event || !data) return res.status(400).json({ message: "Thiếu dữ liệu" });

    if (room) io.to(room).emit(event, data);
    else io.emit(event, data);

    console.log(`📡 Event emitted: ${event} -> room: ${room || "all"}`);
    res.status(200).json({ ok: true });
  });

  // --- Socket.io events
// Khi có connection
io.on("connection", (socket) => {
  console.log("🔌 User connected:", socket.id);

  socket.on("joinConversation", (conversationId) => {
    if (!conversationId) return;
    socket.join(conversationId);
    console.log(`📥 Socket ${socket.id} joined room ${conversationId}`);
  });

  socket.on("sendMessage", async (data) => {
    console.log("📩 sendMessage received:", data);

    try {
      const { conversationId, sender, text, attachments = [] } = data;
      if (!conversationId || !sender) return socket.emit("error", "Thiếu dữ liệu tin nhắn");

      const uploadedFiles = [];
      for (const file of attachments) {
        if (file.url) uploadedFiles.push(file);
        else {
          try {
            const result = await uploadToCloudinary(file, "chat_attachments");
            uploadedFiles.push({ url: result.url, type: result.type || "image" });
          } catch (err) {
            console.error("❌ Lỗi upload Cloudinary:", err.message);
          }
        }
      }

      const newMessage = await Message.create({
        conversationId,
        sender,
        text,
        attachments: uploadedFiles,
      });

      console.log("✅ Tin nhắn đã tạo:", newMessage);

      io.to(conversationId).emit("receiveMessage", newMessage);
      console.log(`💬 Event "receiveMessage" emitted to room ${conversationId}`);
    } catch (err) {
      console.error("❌ Error sending message:", err.message);
      socket.emit("error", "Gửi tin nhắn thất bại");
    }
  });

  socket.on("disconnect", () => {
    console.log("❌ User disconnected:", socket.id);
  });
});


  return app; // backend chính mount route
};
