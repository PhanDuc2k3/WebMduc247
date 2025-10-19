const axios = require("axios");
const Conversation = require("../models/Conversation");
const Message = require("../models/Message");
const User = require("../models/Users");
const { uploadToCloudinary } = require("../helpers/cloudinaryUploader");
const SOCKET_SERVICE_URL = process.env.SOCKET_SERVICE_URL || "http://localhost:5050";

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

exports.sendMessage = async (req, res) => {
  try {
    const { conversationId, sender, text } = req.body;
    const files = req.files;

    if (!conversationId || !sender || (!text && (!files || Object.keys(files).length === 0))) {
      console.log("📌 Body nhận từ frontend:", req.body);
      console.log("📌 Files nhận từ frontend:", files);
      return res.status(400).json({ message: "Thiếu dữ liệu gửi tin nhắn" });
    }

    let attachments = [];

    if (files && Object.keys(files).length > 0) {
      for (const key in files) {
        for (const file of files[key]) {
          attachments.push({ url: file.path, type: "image" });
        }
      }
    }

    const message = await Message.create({
      conversationId,
      sender,
      text,
      attachments,
    });

    await Conversation.findByIdAndUpdate(conversationId, {
      lastMessage: text || "[Đính kèm]",
      updatedAt: new Date(),
    });

    console.log("✅ Tin nhắn đã lưu:", message);

    try {
      await axios.post(`${SOCKET_SERVICE_URL}/api/socket/emit`, {
        event: "new_message",
        data: message,
      });
    } catch (socketErr) {
      console.error("❌ Không gửi được event tới socket service:", socketErr.message);
    }

    res.status(201).json(message);
  } catch (err) {
    console.error("❌ Lỗi gửi tin nhắn:", err);
    res.status(500).json({ message: "Lỗi gửi tin nhắn", error: err.message });
  }
};

exports.getMessages = async (req, res) => {
  try {
    const { conversationId } = req.params;

    if (!conversationId)
      return res.status(400).json({ message: "Thiếu conversationId" });

    const messages = await Message.find({ conversationId }).sort({ createdAt: 1 });
    res.status(200).json(messages);
  } catch (err) {
    res.status(500).json({ message: "Lỗi lấy tin nhắn", error: err.message });
  }
};

exports.getUserConversations = async (req, res) => {
  try {
    const { userId } = req.params;

    if (!userId) return res.status(400).json({ message: "Thiếu userId" });

    const conversations = await Conversation.find({
      participants: userId,
    })
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
