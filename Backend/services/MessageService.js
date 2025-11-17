const messageRepository = require('../repositories/MessageRepository');
const User = require('../models/Users');
const axios = require('axios');
const { uploadToCloudinary } = require('../helpers/cloudinaryUploader');

const SOCKET_SERVICE_URL = process.env.WS_URL || "http://localhost:5050";

class MessageService {
  // Lấy hoặc tạo conversation
  async getOrCreateConversation(senderId, receiverId) {
    if (!senderId || !receiverId) {
      throw new Error("Thiếu senderId hoặc receiverId");
    }

    const sender = await User.findById(senderId);
    const receiver = await User.findById(receiverId);
    if (!sender || !receiver) {
      throw new Error("Không tìm thấy người dùng");
    }

    let conversation = await messageRepository.findConversation({
      participants: { $all: [senderId, receiverId] },
    });

    if (!conversation) {
      conversation = await messageRepository.createConversation({
        participants: [senderId, receiverId],
      });
    }

    return conversation;
  }

  // Gửi message
  async sendMessage(conversationId, sender, text, files) {
    if (!conversationId || !sender || (!text && (!files || Object.keys(files).length === 0))) {
      throw new Error("Thiếu dữ liệu gửi tin nhắn");
    }

    let filesArray = [];
    if (files) {
      if (Array.isArray(files)) {
        filesArray = files;
      } else {
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

    const message = await messageRepository.create({
      conversationId,
      sender,
      text,
      attachments,
    });

    await messageRepository.updateConversation(conversationId, {
      lastMessage: text || "[Đính kèm]",
      updatedAt: new Date(),
    });

    // Emit socket notification
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

    return message;
  }

  // Lấy messages
  async getMessages(conversationId) {
    if (!conversationId) {
      throw new Error("Thiếu conversationId");
    }
    return await messageRepository.findByConversationId(conversationId);
  }

  // Lấy conversations của user
  async getUserConversations(userId) {
    if (!userId) {
      throw new Error("Thiếu userId");
    }

    const conversations = await messageRepository.findConversationsByUserId(userId, true);

    const formattedConversations = await Promise.all(
      conversations.map(async (conv) => {
        const otherUser = conv.participants.find((p) => p._id.toString() !== userId);
        
        const unreadCount = await messageRepository.countUnreadMessages(conv._id, userId);
        const lastMessageDoc = await messageRepository.getLastMessage(conv._id);

        return {
          conversationId: conv._id,
          lastMessage: lastMessageDoc?.text || lastMessageDoc?.content || conv.lastMessage || "",
          lastMessageTime: lastMessageDoc?.createdAt || conv.updatedAt,
          participants: conv.participants,
          name: otherUser?.fullName || "Người dùng",
          avatarUrl: otherUser?.avatarUrl || "/default-avatar.png",
          online: otherUser?.online || false,
          unreadCount,
        };
      })
    );

    return formattedConversations;
  }

  // Đánh dấu messages đã đọc
  async markMessagesAsRead(conversationId, userId) {
    if (!conversationId || !userId) {
      throw new Error("Thiếu conversationId hoặc userId");
    }

    await messageRepository.markMessagesAsRead(conversationId, userId);
  }
}

module.exports = new MessageService();

