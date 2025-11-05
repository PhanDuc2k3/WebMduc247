const mongoose = require("mongoose");

const promotionSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      required: true,
    },
    content: {
      type: String,
      default: "",
    },
    category: {
      type: String,
      enum: ["Sale lớn", "Flash Sale", "Freeship", "Hoàn tiền", "Đặc biệt", "Tân thủ", "Khác"],
      default: "Khác",
    },
    tags: [{
      type: String,
      trim: true,
    }],
    imageUrl: {
      type: String,
      default: "",
    },
    startDate: {
      type: Date,
      required: true,
    },
    endDate: {
      type: Date,
      required: true,
    },
    views: {
      type: Number,
      default: 0,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  { timestamps: true }
);

// Tăng views khi query
promotionSchema.methods.increaseViews = async function() {
  this.views += 1;
  await this.save();
};

module.exports = mongoose.model("Promotion", promotionSchema);
