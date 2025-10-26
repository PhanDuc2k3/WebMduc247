// controllers/MessageController.js
const axios = require("axios");
const Message = require("../models/Message");
const Conversation = require("../models/Conversation");
const User = require("../models/Users");
const { uploadToCloudinary } = require("../helpers/cloudinaryUploader");

const SOCKET_SERVICE_URL = process.env.WS_URL || "http://localhost:5050";

// Tạo hoặc lấy conversation
exports.getOrCreateConversation = async (req, res) => {
  try {
    const { senderId, receiverId } = req.body;
    if (!senderId || !receiverId)
      return res.status(400).json({ message: "Thiếu senderId hoặc receiverId" });

    const sender = await User.findById(senderId);
    const receiver = await User.findById(receiverId);
    if (!sender || !receiver)
      return res.status(404).json({ message: "Không tìm thấy người dùng" });

    let conversation = await Conversation.findOne({
      participants: { $all: [senderId, receiverId] },
    });

    if (!conversation) {
      conversation = await Conversation.create({
        participants: [senderId, receiverId],
      });
    }

    res.status(200).json(conversation);
  } catch (err) {
    res.status(500).json({ message: "Lỗi tạo/lấy conversation", error: err.message });
  }
};

// Gửi tin nhắn
exports.sendMessage = async (req, res) => {
  try {
    const { conversationId, sender, text } = req.body;
    const files = req.files;

    if (!conversationId || !sender || (!text && (!files || Object.keys(files).length === 0))) {
      return res.status(400).json({ message: "Thiếu dữ liệu gửi tin nhắn" });
    }

    // Chuyển req.files về mảng
    let filesArray = [];
    if (files) {
      if (Array.isArray(files)) filesArray = files;
      else {
        for (const key in files) {
          filesArray.push(...files[key]);
        }
      }
    }

    // Upload và tạo attachments
    let attachments = [];
    for (const file of filesArray) {
      if (file.path) {
        attachments.push({ url: file.path, type: "image" });
      } else {
        try {
          const result = await uploadToCloudinary(file, "chat_attachments");
          attachments.push({ url: result.url, type: result.type || "image" });
        } catch (err) {
          // Bỏ qua lỗi upload
        }
      }
    }

    // Tạo message
    const message = await Message.create({
      conversationId,
      sender,
      text,
      attachments,
    });

    // Cập nhật lastMessage cho conversation
    await Conversation.findByIdAndUpdate(conversationId, {
      lastMessage: text || "[Đính kèm]",
      updatedAt: new Date(),
    });

    // Gửi event tới Socket service
    try {
      await axios.post(`${SOCKET_SERVICE_URL}/api/socket/emit`, {
        event: "new_message",
        data: message,
        room: conversationId,
      });
    } catch {}

    res.status(201).json(message);
  } catch (err) {
    res.status(500).json({ message: "Lỗi gửi tin nhắn", error: err.message });
  }
};

// Lấy tin nhắn của conversation
exports.getMessages = async (req, res) => {
  try {
    const { conversationId } = req.params;
    if (!conversationId) return res.status(400).json({ message: "Thiếu conversationId" });

    const messages = await Message.find({ conversationId }).sort({ createdAt: 1 });
    res.status(200).json(messages);
  } catch (err) {
    res.status(500).json({ message: "Lỗi lấy tin nhắn", error: err.message });
  }
};

// Lấy danh sách conversation của user
exports.getUserConversations = async (req, res) => {
  try {
    const { userId } = req.params;
    if (!userId) return res.status(400).json({ message: "Thiếu userId" });

    const conversations = await Conversation.find({ participants: userId })
      .sort({ updatedAt: -1 })
      .populate("participants", "fullName avatarUrl _id")
      .lean();

    const formattedConversations = conversations.map((conv) => {
      const otherUser = conv.participants.find((p) => p._id.toString() !== userId);
      return {
        conversationId: conv._id,
        lastMessage: conv.lastMessage,
        name: otherUser?.fullName || "Người dùng",
        avatarUrl: otherUser?.avatarUrl || "",
      };
    });

    res.status(200).json(formattedConversations);
  } catch (err) {
    res.status(500).json({ message: "Lỗi lấy danh sách hội thoại", error: err.message });
  }
};
