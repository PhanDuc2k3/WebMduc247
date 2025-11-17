const messageService = require('../services/MessageService');

exports.getOrCreateConversation = async (req, res) => {
  try {
    const { senderId, receiverId } = req.body;
    const conversation = await messageService.getOrCreateConversation(senderId, receiverId);
    res.status(200).json(conversation);
  } catch (err) {
    const statusCode = err.message.includes("Thiếu") ? 400 : 
                      err.message.includes("Không tìm thấy") ? 404 : 500;
    res.status(statusCode).json({ message: err.message || "Lỗi tạo/lấy conversation", error: err.message });
  }
};

exports.sendMessage = async (req, res) => {
  try {
    const { conversationId, sender, text } = req.body;
    const message = await messageService.sendMessage(conversationId, sender, text, req.files);
    res.status(201).json(message);
  } catch (err) {
    const statusCode = err.message.includes("Thiếu") ? 400 : 500;
    res.status(statusCode).json({ message: err.message || "Lỗi gửi tin nhắn", error: err.message });
  }
};

exports.getMessages = async (req, res) => {
  try {
    const { conversationId } = req.params;
    const messages = await messageService.getMessages(conversationId);
    res.status(200).json(messages);
  } catch (err) {
    const statusCode = err.message.includes("Thiếu") ? 400 : 500;
    res.status(statusCode).json({ message: err.message || "Lỗi lấy tin nhắn", error: err.message });
  }
};

exports.getUserConversations = async (req, res) => {
  try {
    const { userId } = req.params;
    const conversations = await messageService.getUserConversations(userId);
    res.status(200).json(conversations);
  } catch (err) {
    const statusCode = err.message.includes("Thiếu") ? 400 : 500;
    res.status(statusCode).json({ message: err.message || "Lỗi lấy danh sách hội thoại", error: err.message });
  }
};

exports.markMessagesAsRead = async (req, res) => {
  try {
    const { conversationId } = req.params;
    const { userId } = req.body;
    await messageService.markMessagesAsRead(conversationId, userId);
    res.status(200).json({ message: "Đã đánh dấu đã đọc" });
  } catch (err) {
    const statusCode = err.message.includes("Thiếu") ? 400 : 500;
    res.status(statusCode).json({ message: err.message || "Lỗi đánh dấu đã đọc", error: err.message });
  }
};
