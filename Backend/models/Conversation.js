// models/Conversation.js
const mongoose = require("mongoose");

const ConversationSchema = new mongoose.Schema(
  {
    participants: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
      },
    ],
    participantDetails: [
      {
        userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
        fullName: { type: String },
        avatarUrl: { type: String },
      },
    ],
    lastMessage: {
      type: String,
      default: "",
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Conversation", ConversationSchema);
