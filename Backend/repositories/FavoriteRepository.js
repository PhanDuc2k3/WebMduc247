const Favorite = require('../models/Favorite');

class FavoriteRepository {
  // Tạo favorite
  async create(favoriteData) {
    const favorite = new Favorite(favoriteData);
    return await favorite.save();
  }

  // Tìm favorite theo query
  async findOne(query) {
    return await Favorite.findOne(query);
  }

  // Tìm tất cả favorites của user
  async findByUserId(userId, populate = false) {
    let query = Favorite.find({ user: userId });
    if (populate) {
      query = query
        .populate('product', 'name price salePrice brand category images rating reviewsCount soldCount location store createdAt')
        .populate({
          path: 'store',
          select: 'name description logoUrl bannerUrl rating category customCategory isActive createdAt owner',
          populate: {
            path: 'owner',
            select: '_id'
          }
        })
        .populate('user', 'fullName avatarUrl');
    }
    return await query.sort({ createdAt: -1 });
  }

  // Đếm favorites
  async count(query) {
    return await Favorite.countDocuments(query);
  }

  // Xóa favorite
  async delete(query) {
    return await Favorite.findOneAndDelete(query);
  }
}

module.exports = new FavoriteRepository();

