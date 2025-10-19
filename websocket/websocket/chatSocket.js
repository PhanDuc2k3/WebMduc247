// websocket/chatSocket.js
require("dotenv").config();
const mongoose = require("mongoose");
const { uploadToCloudinary } = require("../helpers/cloudinaryUploader");

// ✅ Kết nối MongoDB nếu microservice socket chạy tách riêng
if (!mongoose.connection.readyState) {
  mongoose
    .connect(process.env.MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    })
    .then(() => console.log("✅ Connected to MongoDB (Socket Service)"))
    .catch((err) => console.error("❌ MongoDB connection error:", err.message));
}

module.exports = (io) => {
  io.on("connection", (socket) => {
    console.log("🔌 User connected:", socket.id);

    // 🟢 Tham gia phòng theo conversationId
    socket.on("joinConversation", (conversationId) => {
      if (!conversationId) return;
      socket.join(conversationId);
      console.log(`📥 User joined conversation ${conversationId}`);
    });

    // 🟡 Nhận tin nhắn từ client và xử lý
    socket.on("sendMessage", async (data) => {
      try {
        const { conversationId, sender, text, attachments = [] } = data;

        if (!conversationId || !sender) {
          return socket.emit("error", "Thiếu dữ liệu tin nhắn");
        }

        // 🖼️ Upload ảnh nếu có
        let uploadedFiles = [];
        if (attachments.length > 0) {
          for (const file of attachments) {
            try {
              const result = await uploadToCloudinary(file, "chat_attachments");
              uploadedFiles.push({
                url: result.url,
                type: result.type || "image",
              });
            } catch (err) {
              console.error("❌ Lỗi upload Cloudinary:", err.message);
            }
          }
        }

        // 💾 Lưu vào MongoDB
        const newMessage = await Message.create({
          conversationId,
          sender,
          text,
          attachments: uploadedFiles,
        });

        // 📡 Gửi tin nhắn tới tất cả user trong phòng
        io.to(conversationId).emit("receiveMessage", newMessage);

        console.log(`💬 [${conversationId}] ${sender}: ${text || "(media)"}`);
      } catch (err) {
        console.error("❌ Error sending message:", err.message);
        socket.emit("error", "Gửi tin nhắn thất bại");
      }
    });

    // 🔴 Khi user ngắt kết nối
    socket.on("disconnect", () => {
      console.log("❌ User disconnected:", socket.id);
    });
  });
};
