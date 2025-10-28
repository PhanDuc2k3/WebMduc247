const mongoose = require("mongoose");

const bannerSchema = new mongoose.Schema({
  title: { type: String, required: true },
  imageUrl: { type: String, required: true },
  link: { type: String },
  type: { 
    type: String, 
    enum: ["main", "sub"], 
    required: true 
  }, // phân biệt banner chính và phụ
  order: { type: Number, required: true, min: 1, max: 3 }, // vị trí hiển thị
}, { timestamps: true });

module.exports = mongoose.model("Banner", bannerSchema);
