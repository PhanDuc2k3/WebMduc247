const axios = require("axios");
const Message = require("../models/Message");
const Conversation = require("../models/Conversation");
const User = require("../models/Users");
const { uploadToCloudinary } = require("../helpers/cloudinaryUploader");

const SOCKET_SERVICE_URL = process.env.WS_URL || "http://localhost:5050";

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
      return res.status(400).json({ message: "Thiếu dữ liệu gửi tin nhắn" });
    }

    let filesArray = [];
    if (files) {
      if (Array.isArray(files)) filesArray = files;
      else {
        for (const key in files) {
          filesArray.push(...files[key]);
        }
      }
    }

    let attachments = [];
    for (const file of filesArray) {
      if (file.path) {
        attachments.push({ url: file.path, type: "image" });
      } else {
        try {
          const result = await uploadToCloudinary(file, "chat_attachments");
          attachments.push({ url: result.url, type: result.type || "image" });
        } catch {}
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

    try {
      const senderUser = await User.findById(sender).select("fullName avatarUrl");
      await axios.post(`${SOCKET_SERVICE_URL}/api/socket/emit`, {
        event: "notify_message",
        data: {
          conversationId,
          senderId: sender,
          senderName: senderUser?.fullName || "Người dùng",
          text: text || "[Đính kèm]",
          avatarUrl: senderUser?.avatarUrl || "/default-avatar.png",
        },
        room: conversationId,
      });
    } catch {}

    res.status(201).json(message);
  } catch (err) {
    res.status(500).json({ message: "Lỗi gửi tin nhắn", error: err.message });
  }
};

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

exports.getUserConversations = async (req, res) => {
  try {
    const { userId } = req.params;
    if (!userId) return res.status(400).json({ message: "Thiếu userId" });

    const conversations = await Conversation.find({ participants: userId })
      .sort({ updatedAt: -1 })
      .populate("participants", "fullName avatarUrl _id")
      .lean();

    // Calculate unread count for each conversation
    const formattedConversations = await Promise.all(
      conversations.map(async (conv) => {
        const otherUser = conv.participants.find((p) => p._id.toString() !== userId);
        
        // Count unread messages (messages not read by current user)
        const unreadCount = await Message.countDocuments({
          conversationId: conv._id,
          sender: { $ne: userId }, // Messages from other user
          readBy: { $ne: userId }, // Not read by current user
        });

        return {
          conversationId: conv._id,
          lastMessage: conv.lastMessage || "",
          participants: conv.participants,
          name: otherUser?.fullName || "Người dùng",
          avatarUrl: otherUser?.avatarUrl || "/default-avatar.png",
          online: otherUser?.online || false,
          unreadCount,
        };
      })
    );

    res.status(200).json(formattedConversations);
  } catch (err) {
    res.status(500).json({ message: "Lỗi lấy danh sách hội thoại", error: err.message });
  }
};

exports.markMessagesAsRead = async (req, res) => {
  try {
    const { conversationId } = req.params;
    const { userId } = req.body;

    if (!conversationId || !userId) {
      return res.status(400).json({ message: "Thiếu conversationId hoặc userId" });
    }

    // Mark all unread messages in this conversation as read for this user
    await Message.updateMany(
      {
        conversationId,
        sender: { $ne: userId }, // Messages from other user
        readBy: { $ne: userId }, // Not already read by this user
      },
      {
        $addToSet: { readBy: userId },
      }
    );

    res.status(200).json({ message: "Đã đánh dấu đã đọc" });
  } catch (err) {
    res.status(500).json({ message: "Lỗi đánh dấu đã đọc", error: err.message });
  }
};
