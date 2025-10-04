const Message = require("../models/Message");

module.exports = (io) => {
  io.on("connection", (socket) => {
    console.log("🔌 User connected:", socket.id);

    socket.on("joinConversation", (conversationId) => {
      socket.join(conversationId);
      console.log(`📥 User joined conversation ${conversationId}`);
    });

    // Chỉ broadcast message
    socket.on("sendMessage", (msg) => {
      // Phát về tất cả user trong room, kể cả chính client
      io.to(msg.conversationId).emit("receiveMessage", msg);
    });

    socket.on("disconnect", () => {
      console.log("❌ User disconnected:", socket.id);
    });
  });
};
