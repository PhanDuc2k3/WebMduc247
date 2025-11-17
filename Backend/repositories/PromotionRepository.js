const Promotion = require('../models/Promotion');

class PromotionRepository {
  // Tạo promotion
  async create(promotionData) {
    const promotion = new Promotion(promotionData);
    return await promotion.save();
  }

  // Tìm promotion theo ID
  async findById(promotionId, populate = false) {
    let query = Promotion.findById(promotionId);
    if (populate) {
      query = query.populate("createdBy", "fullName email");
    }
    return await query;
  }

  // Tìm tất cả promotions
  async findAll(query = {}, populate = false) {
    let dbQuery = Promotion.find(query);
    if (populate) {
      dbQuery = dbQuery.populate("createdBy", "fullName email");
    }
    return await dbQuery.sort({ createdAt: -1 });
  }

  // Cập nhật promotion
  async update(promotionId, updateData) {
    return await Promotion.findByIdAndUpdate(promotionId, updateData, { new: true });
  }

  // Xóa promotion
  async delete(promotionId) {
    return await Promotion.findByIdAndDelete(promotionId);
  }
}

module.exports = new PromotionRepository();

