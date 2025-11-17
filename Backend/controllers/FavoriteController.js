const favoriteService = require('../services/FavoriteService');

exports.addFavorite = async (req, res) => {
  try {
    const userId = req.user?.userId;
    if (!userId) return res.status(401).json({ message: "Chưa đăng nhập" });

    const { productId, storeId } = req.body;
    const favorite = await favoriteService.addFavorite(userId, productId, storeId);

    if (favorite._id && favorite.createdAt) {
      // Favorite mới được tạo
      return res.status(201).json({ message: "Đã thêm vào yêu thích", favorite });
    } else {
      // Favorite đã tồn tại
      return res.status(200).json({ message: "Đã có trong danh sách yêu thích", favorite });
    }
  } catch (error) {
    console.error("Add favorite error:", error);
    
    if (
      error.code === 11000 ||
      error.message?.includes("E11000") ||
      error.name === "MongoServerError"
    ) {
      const { productId, storeId } = req.body;
      const query = { user: req.user?.userId };
      if (productId) query.product = productId;
      else if (storeId) query.store = storeId;
      
      const Favorite = require('../models/Favorite');
      const existing = await Favorite.findOne(query);
      return res.status(200).json({
        message: "Đã có trong danh sách yêu thích",
        favorite: existing,
      });
    }

    const statusCode = error.message.includes("không tồn tại") ? 404 : 
                      error.message.includes("cung cấp") ? 400 : 500;
    res.status(statusCode).json({ message: error.message || "Lỗi máy chủ" });
  }
};

exports.removeFavorite = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { productId, storeId } = req.body;
    await favoriteService.removeFavorite(userId, productId, storeId);
    res.status(200).json({ message: 'Đã xóa khỏi yêu thích' });
  } catch (error) {
    console.error('Remove favorite error:', error);
    
    if (error.name === 'CastError') {
      return res.status(400).json({ message: 'ID không hợp lệ', error: error.message });
    }
    
    const statusCode = error.message.includes("cung cấp") ? 400 : 500;
    res.status(statusCode).json({ message: error.message || 'Lỗi máy chủ' });
  }
};

exports.checkFavorite = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { productId, storeId } = req.params;
    const isFavorite = await favoriteService.checkFavorite(userId, productId, storeId);
    res.status(200).json({ isFavorite });
  } catch (error) {
    console.error('Check favorite error:', error);
    const statusCode = error.message.includes("cung cấp") ? 400 : 500;
    res.status(statusCode).json({ message: error.message || 'Lỗi máy chủ' });
  }
};

exports.getMyFavorites = async (req, res) => {
  try {
    const userId = req.user.userId;
    const result = await favoriteService.getMyFavorites(userId);
    res.status(200).json({
      message: 'Lấy danh sách yêu thích thành công',
      ...result
    });
  } catch (error) {
    console.error('Get favorites error:', error);
    res.status(500).json({ message: error.message || 'Lỗi máy chủ' });
  }
};

exports.getFavoriteCount = async (req, res) => {
  try {
    const { productId, storeId } = req.params;
    const count = await favoriteService.getFavoriteCount(productId, storeId);
    res.status(200).json({ count });
  } catch (error) {
    console.error('Get favorite count error:', error);
    const statusCode = error.message.includes("cung cấp") ? 400 : 500;
    res.status(statusCode).json({ message: error.message || 'Lỗi máy chủ' });
  }
};
