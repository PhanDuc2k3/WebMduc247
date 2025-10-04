const Conversation = require("../models/Conversation");
const Message = require("../models/Message");
const User = require("../models/Users");

/**
 * 🟢 Tạo hoặc lấy conversation giữa 2 user
 * POST /api/messages/conversation
 */
exports.getOrCreateConversation = async (req, res) => {
  try {
    console.log("🔥 [BE] API POST /conversation được gọi");
    console.log("📩 [BE] Body nhận được:", req.body);

    const { senderId, receiverId } = req.body;

    if (!senderId || !receiverId) {
      console.warn("⚠️ [BE] Thiếu senderId hoặc receiverId");
      return res.status(400).json({ message: "Thiếu senderId hoặc receiverId" });
    }

    // Kiểm tra người dùng tồn tại
    const sender = await User.findById(senderId);
    const receiver = await User.findById(receiverId);

    console.log("🔎 [BE] senderId:", senderId, "->", sender ? "✅ Tìm thấy" : "❌ Không tìm thấy");
    console.log("🔎 [BE] receiverId:", receiverId, "->", receiver ? "✅ Tìm thấy" : "❌ Không tìm thấy");

    if (!sender || !receiver) {
      console.warn("⚠️ [BE] Không tìm thấy user");
      return res.status(404).json({ message: "Không tìm thấy người dùng" });
    }

    // Tìm conversation cũ
    let conversation = await Conversation.findOne({
      participants: { $all: [senderId, receiverId] },
    });

    if (!conversation) {
      console.log("📦 [BE] Không có conversation -> tạo mới");
      conversation = await Conversation.create({
        participants: [senderId, receiverId],
      });
      console.log("✅ [BE] Tạo conversation mới:", conversation._id);
    } else {
      console.log("📦 [BE] Conversation đã tồn tại:", conversation._id);
    }

    res.status(200).json(conversation);
  } catch (err) {
    console.error("❌ [BE] Lỗi getOrCreateConversation:", err);
    res.status(500).json({ message: "Lỗi tạo/lấy conversation", error: err.message });
  }
};


/**
 * 🟢 Gửi tin nhắn
 * POST /api/messages/send
 */
// Nếu bạn vẫn dùng API gửi message
exports.sendMessage = async (req, res) => {
  try {
    const { conversationId, sender, text, attachments } = req.body;
    if (!conversationId || !sender || (!text && !attachments)) {
      return res.status(400).json({ message: "Thiếu dữ liệu gửi tin nhắn" });
    }

    const message = await Message.create({ conversationId, sender, text, attachments });
    await Conversation.findByIdAndUpdate(conversationId, {
      lastMessage: text || "[Đính kèm]",
      updatedAt: new Date(),
    });

    res.status(201).json(message);
  } catch (err) {
    res.status(500).json({ message: "Lỗi gửi tin nhắn", error: err.message });
  }
};

/**
 * 🟢 Lấy tất cả tin nhắn trong 1 conversation
 * GET /api/messages/:conversationId
 */
exports.getMessages = async (req, res) => {
  try {
    const { conversationId } = req.params;
    console.log("📥 [getMessages] conversationId:", conversationId);

    if (!conversationId) {
      console.warn("⚠️ Thiếu conversationId");
      return res.status(400).json({ message: "Thiếu conversationId" });
    }

    const messages = await Message.find({ conversationId }).sort({ createdAt: 1 });
    console.log(`✅ Đã lấy ${messages.length} message`);

    res.status(200).json(messages);
  } catch (err) {
    console.error("❌ Lỗi getMessages:", err);
    res.status(500).json({ message: "Lỗi lấy tin nhắn", error: err.message });
  }
};

/**
 * 🟢 Lấy danh sách hội thoại của user
 * GET /api/messages/conversations/:userId
 */
exports.getUserConversations = async (req, res) => {
  try {
    const { userId } = req.params;
    console.log("📥 [getUserConversations] userId:", userId);

    if (!userId) {
      console.warn("⚠️ Thiếu userId");
      return res.status(400).json({ message: "Thiếu userId" });
    }

    const conversations = await Conversation.find({
      participants: userId,
    })
      .sort({ updatedAt: -1 })
      .populate("participants", "fullName avatarUrl _id")
      .lean();

    console.log(`✅ Đã tìm thấy ${conversations.length} conversation`);

    const formattedConversations = conversations.map((conv) => {
      const otherUser = conv.participants.find((p) => p._id.toString() !== userId);
      return {
        conversationId: conv._id,
        lastMessage: conv.lastMessage,
        name: otherUser?.fullName || "Người dùng",
        avatarUrl: otherUser?.avatarUrl || "",
      };
    });

    console.log("📤 Kết quả trả về:", formattedConversations);

    res.status(200).json(formattedConversations);
  } catch (err) {
    console.error("❌ Lỗi getUserConversations:", err);
    res.status(500).json({ message: "Lỗi lấy danh sách hội thoại", error: err.message });
  }
};
