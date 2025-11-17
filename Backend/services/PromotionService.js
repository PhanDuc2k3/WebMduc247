const promotionRepository = require('../repositories/PromotionRepository');
const User = require('../models/Users');
const { createBulkNotifications } = require('../controllers/NotificationController');

class PromotionService {
  // Lấy tất cả promotions
  async getAllPromotions(category, isActive) {
    const query = {};
    
    if (category && category !== "Tất cả") {
      query.category = category;
    }
    
    if (isActive !== undefined) {
      query.isActive = isActive === "true";
    }

    return await promotionRepository.findAll(query, true);
  }

  // Lấy promotion theo ID
  async getPromotionById(promotionId) {
    const promotion = await promotionRepository.findById(promotionId, true);
    if (!promotion) {
      throw new Error("Không tìm thấy tin tức khuyến mãi");
    }
    return promotion;
  }

  // Tạo promotion
  async createPromotion(userId, promotionData, file) {
    const { title, description, content, category, tags, startDate, endDate, isActive } = promotionData;

    let imageUrl = "";
    if (file && file.path) {
      imageUrl = file.path;
    }

    const promotion = await promotionRepository.create({
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

    await promotion.populate("createdBy", "fullName email");

    // Tạo notification cho tất cả users
    try {
      if (promotion.isActive) {
        const allUsers = await User.find({ role: { $in: ["buyer", "seller"] } }).select("_id");
        const userIds = allUsers.map(user => user._id);
        
        if (userIds.length > 0) {
          await createBulkNotifications(userIds, {
            type: "news",
            title: "📢 Tin tức khuyến mãi mới!",
            message: promotion.description || promotion.title,
            relatedId: promotion._id,
            link: `/new/${promotion._id}`,
            icon: "📢",
            metadata: {
              promotionId: promotion._id,
              category: promotion.category,
            },
          });
          console.log(`✅ Đã tạo ${userIds.length} notifications cho tin tức khuyến mãi mới: ${promotion.title}`);
        }
      }
    } catch (notifError) {
      console.error(`⚠️ Lỗi khi tạo notification cho tin tức khuyến mãi mới:`, notifError);
    }

    return promotion;
  }

  // Cập nhật promotion
  async updatePromotion(promotionId, promotionData, file) {
    const promotion = await promotionRepository.findById(promotionId);
    if (!promotion) {
      throw new Error("Không tìm thấy tin tức khuyến mãi");
    }

    const { title, description, content, category, tags, startDate, endDate, isActive } = promotionData;

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

    if (file && file.path) {
      promotion.imageUrl = file.path;
    }

    await promotion.save();
    await promotion.populate("createdBy", "fullName email");

    return promotion;
  }

  // Xóa promotion
  async deletePromotion(promotionId) {
    const promotion = await promotionRepository.delete(promotionId);
    if (!promotion) {
      throw new Error("Không tìm thấy tin tức khuyến mãi");
    }
    return promotion;
  }

  // Tăng views
  async increaseViews(promotionId) {
    const promotion = await promotionRepository.findById(promotionId);
    if (!promotion) {
      throw new Error("Không tìm thấy tin tức khuyến mãi");
    }

    await promotion.increaseViews();
    return { views: promotion.views };
  }
}

module.exports = new PromotionService();

