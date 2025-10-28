require("dotenv").config();
const mongoose = require("mongoose");
const Message = require("../models/Message");
const User = require("../models/Users");
const express = require("express");
const { uploadToCloudinary } = require("../helpers/cloudinaryUploader");

const onlineUsers = new Map();

module.exports = (io) => {
  if (!mongoose.connection.readyState) {
    mongoose
      .connect(process.env.MONGO_URI, {
        useNewUrlParser: true,
        useUnifiedTopology: true,
      })
      .then(() => console.log("Connected to MongoDB (Socket Service)"))
      .catch((err) => console.error("MongoDB connection error:", err.message));
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
    socket.on("user_connected", (userId) => {
      if (!userId) return;
      onlineUsers.set(userId, socket.id);
      socket.join(userId);
      io.emit("update_online_users", Array.from(onlineUsers.keys()));
    });

    socket.on("user_disconnected", (userId) => {
      if (!userId) return;
      onlineUsers.delete(userId);
      io.emit("update_online_users", Array.from(onlineUsers.keys()));
    });

    socket.on("get_online_users", () => {
      socket.emit("update_online_users", Array.from(onlineUsers.keys()));
    });

    socket.on("joinConversation", (conversationId) => {
      if (!conversationId) return;
      socket.join(conversationId);
    });

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
      } catch {
        socket.emit("error", "Gửi tin nhắn thất bại");
      }
    });

    socket.on("disconnect", () => {
      setTimeout(() => {
        for (const [userId, id] of onlineUsers.entries()) {
          if (id === socket.id) {
            onlineUsers.delete(userId);
            io.emit("update_online_users", Array.from(onlineUsers.keys()));
            break;
          }
        }
      }, 1000);
    });
  });

  return app;
};

async function getConversationParticipants(conversationId) {
  const Conversation = require("../models/Conversation");
  const convo = await Conversation.findById(conversationId).select("participants");
  return convo?.participants || [];
}
