const Message = require('../models/Message');
const Conversation = require('../models/Conversation');

class MessageRepository {
  // Tạo message
  async create(messageData) {
    const message = new Message(messageData);
    return await message.save();
  }

  // Tìm messages theo conversationId
  async findByConversationId(conversationId) {
    return await Message.find({ conversationId }).sort({ createdAt: 1 });
  }

  // Tìm conversation
  async findConversation(query) {
    return await Conversation.findOne(query);
  }

  // Tạo conversation
  async createConversation(conversationData) {
    return await Conversation.create(conversationData);
  }

  // Cập nhật conversation
  async updateConversation(conversationId, updateData) {
    return await Conversation.findByIdAndUpdate(conversationId, updateData, { new: true });
  }

  // Tìm conversations theo userId
  async findConversationsByUserId(userId, populate = false) {
    let query = Conversation.find({ participants: userId }).sort({ updatedAt: -1 });
    if (populate) {
      query = query.populate("participants", "fullName avatarUrl _id");
    }
    return await query.lean();
  }

  // Đếm unread messages
  async countUnreadMessages(conversationId, userId) {
    return await Message.countDocuments({
      conversationId,
      sender: { $ne: userId },
      readBy: { $ne: userId },
    });
  }

  // Lấy last message
  async getLastMessage(conversationId) {
    return await Message.findOne({ conversationId })
      .sort({ createdAt: -1 })
      .lean();
  }

  // Đánh dấu messages đã đọc
  async markMessagesAsRead(conversationId, userId) {
    return await Message.updateMany(
      {
        conversationId,
        sender: { $ne: userId },
        readBy: { $ne: userId },
      },
      {
        $addToSet: { readBy: userId },
      }
    );
  }
}

module.exports = new MessageRepository();

