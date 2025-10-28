// models/VectorStore.js
const mongoose = require("mongoose");

const vectorSchema = new mongoose.Schema({
  docId: { type: mongoose.Schema.Types.ObjectId, required: true },
  type: { type: String, enum: ["product", "faq"], required: true },
  vector: { type: [Number], required: true }, // embedding vector
  metadata: { type: Object } // lưu thông tin name, category, tags...
}, { timestamps: true });

module.exports = mongoose.model("VectorStore", vectorSchema);
