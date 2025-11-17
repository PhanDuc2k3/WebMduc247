const favoriteRepository = require('../repositories/FavoriteRepository');
const Product = require('../models/Product');
const Store = require('../models/Store');

class FavoriteService {
  // Thêm favorite
  async addFavorite(userId, productId, storeId) {
    if (!productId && !storeId) {
      throw new Error("Vui lòng cung cấp productId hoặc storeId");
    }

    if (productId) {
      const product = await Product.findById(productId);
      if (!product) {
        throw new Error("Sản phẩm không tồn tại");
      }
    }

    if (storeId) {
      const store = await Store.findById(storeId);
      if (!store) {
        throw new Error("Cửa hàng không tồn tại");
      }
    }

    const query = { user: userId };
    let favoriteData;
    
    if (productId) {
      query.product = productId;
      favoriteData = { user: userId, product: productId };
    } else if (storeId) {
      query.store = storeId;
      favoriteData = { user: userId, store: storeId };
    }

    const existing = await favoriteRepository.findOne(query);
    if (existing) {
      return existing;
    }

    try {
      const favorite = await favoriteRepository.create(favoriteData);
      return favorite;
    } catch (saveError) {
      // Xử lý duplicate key error (race condition)
      if (
        saveError.code === 11000 ||
        saveError.message?.includes("E11000") ||
        saveError.name === "MongoServerError"
      ) {
        const existingDup = await favoriteRepository.findOne(query);
        if (existingDup) {
          return existingDup;
        }
      }
      throw saveError;
    }
  }

  // Xóa favorite
  async removeFavorite(userId, productId, storeId) {
    if (!productId && !storeId) {
      throw new Error('Vui lòng cung cấp productId hoặc storeId');
    }

    const query = { user: userId };
    if (productId) {
      query.product = productId;
    } else if (storeId) {
      query.store = storeId;
    }

    const favorite = await favoriteRepository.delete(query);
    return favorite;
  }

  // Kiểm tra favorite
  async checkFavorite(userId, productId, storeId) {
    if (!productId && !storeId) {
      throw new Error('Vui lòng cung cấp productId hoặc storeId');
    }

    const query = { user: userId };
    if (productId) {
      query.product = productId;
    } else if (storeId) {
      query.store = storeId;
    }

    const favorite = await favoriteRepository.findOne(query);
    return !!favorite;
  }

  // Lấy tất cả favorites của user
  async getMyFavorites(userId) {
    const favorites = await favoriteRepository.findByUserId(userId, true);

    const products = favorites
      .filter(fav => fav.product)
      .map(fav => fav.product);

    const stores = favorites
      .filter(fav => fav.store)
      .map(fav => fav.store);

    return {
      products,
      stores,
      totalProducts: products.length,
      totalStores: stores.length
    };
  }

  // Đếm số lượng favorite
  async getFavoriteCount(productId, storeId) {
    if (!productId && !storeId) {
      throw new Error('Vui lòng cung cấp productId hoặc storeId');
    }

    const query = {};
    if (productId) {
      query.product = productId;
    }
    if (storeId) {
      query.store = storeId;
    }

    return await favoriteRepository.count(query);
  }
}

module.exports = new FavoriteService();

