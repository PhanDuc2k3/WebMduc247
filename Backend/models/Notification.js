const mongoose = require("mongoose");

const NotificationSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true, // Index để query nhanh hơn
    },
    type: {
      type: String,
      enum: ["order", "voucher", "news", "system"],
      required: true,
    },
    title: {
      type: String,
      required: true,
    },
    message: {
      type: String,
      required: true,
    },
    relatedId: {
      type: mongoose.Schema.Types.ObjectId,
      // Có thể là Order, Voucher, News, etc.
    },
    link: {
      type: String,
      // Link để navigate khi click vào notification
    },
    isRead: {
      type: Boolean,
      default: false,
      index: true,
    },
    icon: {
      type: String,
      default: "🔔", // Icon mặc định
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      // Lưu thêm thông tin như orderCode, voucherCode, etc.
    },
  },
  { timestamps: true }
);

// Index để query notifications của user nhanh hơn
NotificationSchema.index({ userId: 1, isRead: 1, createdAt: -1 });

module.exports = mongoose.model("Notification", NotificationSchema);

