const promotionService = require('../services/PromotionService');

exports.getAllPromotions = async (req, res) => {
  try {
    const { category, isActive } = req.query;
    const promotions = await promotionService.getAllPromotions(category, isActive);
    res.status(200).json(promotions);
  } catch (error) {
    console.error("Get all promotions error:", error);
    res.status(500).json({ message: "Lỗi server", error: error.message });
  }
};

exports.getPromotionById = async (req, res) => {
  try {
    const { id } = req.params;
    const promotion = await promotionService.getPromotionById(id);
    res.status(200).json(promotion);
  } catch (error) {
    console.error("Get promotion by id error:", error);
    const statusCode = error.message.includes("Không tìm thấy") ? 404 : 500;
    res.status(statusCode).json({ message: error.message || "Lỗi server" });
  }
};

exports.createPromotion = async (req, res) => {
  try {
    const userId = req.user.userId;
    const promotion = await promotionService.createPromotion(userId, req.body, req.file);
    res.status(201).json({ message: "Tạo tin tức khuyến mãi thành công", promotion });
  } catch (error) {
    console.error("Create promotion error:", error);
    res.status(500).json({ message: "Lỗi server", error: error.message });
  }
};

exports.updatePromotion = async (req, res) => {
  try {
    const { id } = req.params;
    const promotion = await promotionService.updatePromotion(id, req.body, req.file);
    res.status(200).json({ message: "Cập nhật tin tức khuyến mãi thành công", promotion });
  } catch (error) {
    console.error("Update promotion error:", error);
    const statusCode = error.message.includes("Không tìm thấy") ? 404 : 500;
    res.status(statusCode).json({ message: error.message || "Lỗi server" });
  }
};

exports.deletePromotion = async (req, res) => {
  try {
    const { id } = req.params;
    await promotionService.deletePromotion(id);
    res.status(200).json({ message: "Xóa tin tức khuyến mãi thành công" });
  } catch (error) {
    console.error("Delete promotion error:", error);
    const statusCode = error.message.includes("Không tìm thấy") ? 404 : 500;
    res.status(statusCode).json({ message: error.message || "Lỗi server" });
  }
};

exports.increaseViews = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await promotionService.increaseViews(id);
    res.status(200).json(result);
  } catch (error) {
    console.error("Increase views error:", error);
    const statusCode = error.message.includes("Không tìm thấy") ? 404 : 500;
    res.status(statusCode).json({ message: error.message || "Lỗi server" });
  }
};
