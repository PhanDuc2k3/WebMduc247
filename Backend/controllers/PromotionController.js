const Promotion = require("../models/Promotion");

// Lấy tất cả tin tức khuyến mãi (public)
exports.getAllPromotions = async (req, res) => {
  try {
    const { category, isActive } = req.query;
    const query = {};
    
    if (category && category !== "Tất cả") {
      query.category = category;
    }
    
    if (isActive !== undefined) {
      query.isActive = isActive === "true";
    }

    const promotions = await Promotion.find(query)
      .populate("createdBy", "fullName email")
      .sort({ createdAt: -1 });

    res.status(200).json(promotions);
  } catch (error) {
    console.error("Get all promotions error:", error);
    res.status(500).json({ message: "Lỗi server", error: error.message });
  }
};

// Lấy chi tiết tin tức khuyến mãi
exports.getPromotionById = async (req, res) => {
  try {
    const { id } = req.params;
    const promotion = await Promotion.findById(id)
      .populate("createdBy", "fullName email");

    if (!promotion) {
      return res.status(404).json({ message: "Không tìm thấy tin tức khuyến mãi" });
    }

    // Không tăng view ở đây, để frontend gọi riêng endpoint increaseViews khi cần

    res.status(200).json(promotion);
  } catch (error) {
    console.error("Get promotion by id error:", error);
    res.status(500).json({ message: "Lỗi server", error: error.message });
  }
};

// Tạo tin tức khuyến mãi mới (admin)
exports.createPromotion = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { title, description, content, category, tags, startDate, endDate, isActive } = req.body;

    // Lấy imageUrl từ file upload
    let imageUrl = "";
    if (req.file && req.file.path) {
      imageUrl = req.file.path;
    }

    const promotion = new Promotion({
      title,
      description,
      content: content || description,
      category: category || "Khác",
      tags: tags ? (Array.isArray(tags) ? tags : tags.split(",").map(t => t.trim())) : [],
      imageUrl,
      startDate: startDate ? new Date(startDate) : new Date(),
      endDate: endDate ? new Date(endDate) : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      isActive: isActive !== undefined ? isActive : true,
      createdBy: userId,
    });

    await promotion.save();
    await promotion.populate("createdBy", "fullName email");

    res.status(201).json({ message: "Tạo tin tức khuyến mãi thành công", promotion });
  } catch (error) {
    console.error("Create promotion error:", error);
    res.status(500).json({ message: "Lỗi server", error: error.message });
  }
};

// Cập nhật tin tức khuyến mãi (admin)
exports.updatePromotion = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, description, content, category, tags, startDate, endDate, isActive } = req.body;

    const promotion = await Promotion.findById(id);
    if (!promotion) {
      return res.status(404).json({ message: "Không tìm thấy tin tức khuyến mãi" });
    }

    // Cập nhật các trường
    if (title) promotion.title = title;
    if (description) promotion.description = description;
    if (content !== undefined) promotion.content = content;
    if (category) promotion.category = category;
    if (tags) {
      promotion.tags = Array.isArray(tags) ? tags : tags.split(",").map(t => t.trim());
    }
    if (startDate) promotion.startDate = new Date(startDate);
    if (endDate) promotion.endDate = new Date(endDate);
    if (isActive !== undefined) promotion.isActive = isActive;

    // Cập nhật ảnh nếu có
    if (req.file && req.file.path) {
      promotion.imageUrl = req.file.path;
    }

    await promotion.save();
    await promotion.populate("createdBy", "fullName email");

    res.status(200).json({ message: "Cập nhật tin tức khuyến mãi thành công", promotion });
  } catch (error) {
    console.error("Update promotion error:", error);
    res.status(500).json({ message: "Lỗi server", error: error.message });
  }
};

// Xóa tin tức khuyến mãi (admin)
exports.deletePromotion = async (req, res) => {
  try {
    const { id } = req.params;
    const promotion = await Promotion.findByIdAndDelete(id);

    if (!promotion) {
      return res.status(404).json({ message: "Không tìm thấy tin tức khuyến mãi" });
    }

    res.status(200).json({ message: "Xóa tin tức khuyến mãi thành công" });
  } catch (error) {
    console.error("Delete promotion error:", error);
    res.status(500).json({ message: "Lỗi server", error: error.message });
  }
};

// Tăng lượt xem
exports.increaseViews = async (req, res) => {
  try {
    const { id } = req.params;
    const promotion = await Promotion.findById(id);

    if (!promotion) {
      return res.status(404).json({ message: "Không tìm thấy tin tức khuyến mãi" });
    }

    await promotion.increaseViews();
    res.status(200).json({ views: promotion.views });
  } catch (error) {
    console.error("Increase views error:", error);
    res.status(500).json({ message: "Lỗi server", error: error.message });
  }
};
