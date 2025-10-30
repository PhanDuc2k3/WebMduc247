// models/ViewLog.js
const mongoose = require('mongoose');

const viewLogSchema = new mongoose.Schema({
  product: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: true
  },
  date: {
    type: String, 
    required: true
  },
  count: {
    type: Number,
    default: 1
  }
}, { timestamps: true });

module.exports = mongoose.model('ViewLog', viewLogSchema);
