const mongoose = require("mongoose");
const Message = require("../models/Message");
const User = require("../models/Users");
const express = require("express");
const { uploadToCloudinary } = require("../helpers/cloudinaryUploader");

const onlineUsers = new Map(); // userId -> socketId
const onlineStores = new Map(); // storeId -> socketId

module.exports = (io) => {
  if (!mongoose.connection.readyState) {
    mongoose
      .connect(process.env.MONGO_URI, {
        useNewUrlParser: true,
        useUnifiedTopology: true,
      })
      .then(() => console.log("✅ Connected to MongoDB (Socket Service)"))
      .catch((err) => console.error("❌ MongoDB connection error:", err.message));
  }

  const app = express();
  app.use(express.json());

  app.post("/emit", (req, res) => {
    const { event, data, room } = req.body;
    if (!event || !data) return res.status(400).json({ message: "Thiếu dữ liệu" });

    if (room) io.to(room).emit(event, data);
    else io.emit(event, data);
    res.status(200).json({ ok: true });
  });

  io.on("connection", (socket) => {
    console.log(`⚡ Socket connected: ${socket.id}`);

    // ✅ User Connected
    socket.on("user_connected", async (userId) => {
      if (!userId) return;

      // Xử lý reconnect (ngắt socket cũ)
      if (onlineUsers.has(userId)) {
        const oldSocketId = onlineUsers.get(userId);
        if (oldSocketId && oldSocketId !== socket.id) {
          console.log(`♻️ Reconnect detected for user ${userId}`);
          io.sockets.sockets.get(oldSocketId)?.disconnect(true);
        }
      }

      // Ghi nhận socket mới
      onlineUsers.set(userId, socket.id);
      socket.join(userId);

      console.log(`✅ User connected: ${userId}, socketId: ${socket.id}`);
      io.emit("update_online_users", Array.from(onlineUsers.keys()));

      // Gửi lại 1 lần nữa sau 500ms để sync với client khác
      setTimeout(() => {
        io.emit("update_online_users", Array.from(onlineUsers.keys()));
      }, 500);

      // Track store online
      try {
        const user = await User.findById(userId).select("store");
        if (user && user.store) {
          const storeId = user.store.toString();
          onlineStores.set(storeId, socket.id);
          io.emit("update_online_stores", Array.from(onlineStores.keys()));
        }
      } catch (err) {
        console.error("Error tracking store online:", err.message);
      }
    });

    // ✅ User Disconnected
    socket.on("disconnect", async () => {
      let disconnectedUserId = null;
      for (const [userId, id] of onlineUsers.entries()) {
        if (id === socket.id) {
          disconnectedUserId = userId;
          break;
        }
      }
      if (!disconnectedUserId) return;

      // Delay nhỏ để tránh mất online khi reload
      setTimeout(async () => {
        const currentSocket = onlineUsers.get(disconnectedUserId);
        if (currentSocket && currentSocket !== socket.id) {
          console.log(`⚠️ Skip disconnect — ${disconnectedUserId} đã reconnect bằng socket ${currentSocket}`);
          return;
        }

        // Nếu user thực sự offline
        onlineUsers.delete(disconnectedUserId);
        console.log(`🔴 User ${disconnectedUserId} disconnected hoàn toàn`);
        io.emit("update_online_users", Array.from(onlineUsers.keys()));

        try {
          const user = await User.findById(disconnectedUserId).select("store");
          if (user && user.store) {
            onlineStores.delete(user.store.toString());
            io.emit("update_online_stores", Array.from(onlineStores.keys()));
          }
        } catch (err) {
          console.error("Error handling store offline:", err.message);
        }
      }, 1500);
    });

    // ✅ Gửi danh sách user/store online theo yêu cầu
    socket.on("get_online_users", () => {
      socket.emit("update_online_users", Array.from(onlineUsers.keys()));
    });

    socket.on("get_online_stores", () => {
      socket.emit("update_online_stores", Array.from(onlineStores.keys()));
    });

    // ✅ Join room chat
    socket.on("joinConversation", (conversationId) => {
      if (conversationId) socket.join(conversationId);
    });

    // ✅ Gửi tin nhắn
    socket.on("sendMessage", async (data) => {
      try {
        const { conversationId, sender, text, attachments = [] } = data;
        if (!conversationId || !sender)
          return socket.emit("error", "Thiếu dữ liệu tin nhắn");

        const uploadedFiles = [];
        for (const file of attachments) {
          if (file.url) uploadedFiles.push(file);
          else {
            try {
              const result = await uploadToCloudinary(file, "chat_attachments");
              uploadedFiles.push({ url: result.url, type: result.type || "image" });
            } catch {}
          }
        }

        const newMessage = await Message.create({
          conversationId,
          sender,
          text,
          attachments: uploadedFiles,
        });

        io.to(conversationId).emit("receiveMessage", newMessage);

        // Thông báo cho người nhận
        const participants = await getConversationParticipants(conversationId);
        const senderUser = await User.findById(sender).select("fullName avatarUrl");

        const recipients = participants.filter(
          (userId) => userId.toString() !== sender.toString()
        );

        for (const userId of recipients) {
          const socketId = onlineUsers.get(userId.toString());
          if (socketId) {
            io.to(socketId).emit("notify_message", {
              conversationId,
              senderId: sender,
              senderName: senderUser?.fullName || "Người dùng",
              text: text || "[Đính kèm]",
              avatarUrl: senderUser?.avatarUrl || "/default-avatar.png",
            });
          }
        }
      } catch (err) {
        console.error("Send message error:", err);
        socket.emit("error", "Gửi tin nhắn thất bại");
      }
    });
  });

  return app;
};

async function getConversationParticipants(conversationId) {
  const Conversation = require("../models/Conversation");
  const convo = await Conversation.findById(conversationId).select("participants");
  return convo?.participants || [];
}
