const storeRepository = require('../repositories/StoreRepository');

class StoreService {
  // Parse JSON an toàn
  parseJSONSafe(val) {
    if (!val) return [];
    if (typeof val === "string") {
      try { return JSON.parse(val); } catch { return []; }
    }
    return val;
  }

  // Tạo store
  async createStore(userId, storeData, files) {
    const { name, description, category, address, contactPhone, contactEmail, categories,
      existingLogo, existingBanner } = storeData;

    if (!name || !description || !category || !address) {
      throw new Error('Thiếu thông tin bắt buộc');
    }

    const parsedCategories = this.parseJSONSafe(categories);
    if (parsedCategories.length > 0 && !parsedCategories.includes(category)) {
      throw new Error("Category chính không có trong danh sách categories");
    }

    const images = [];
    if (files?.logo?.length > 0) images.push(files.logo[0].path);
    else if (existingLogo) images.push(existingLogo);
    
    if (files?.banner?.length > 0) images.push(...files.banner.map(f => f.path));
    else if (existingBanner) images.push(existingBanner);

    return await storeRepository.create({
      name,
      description,
      category,
      categories: parsedCategories,
      storeAddress: address,
      contactPhone,
      contactEmail,
      logoUrl: images[0] || '',
      bannerUrl: images[1] || '',
      owner: userId,
    });
  }

  // Cập nhật store
  async updateStore(userId, storeData, files) {
    const store = await storeRepository.findByOwner(userId);
    if (!store) {
      throw new Error('Không tìm thấy cửa hàng');
    }

    const { name, description, storeAddress, category, customCategory, categories,
      existingLogo, existingBanner } = storeData;

    if (name) store.name = name;
    if (description) store.description = description;
    if (storeAddress) store.storeAddress = storeAddress;
    if (category) store.category = category === 'Other' ? customCategory : category;

    if (categories) {
      const parsedCategories = this.parseJSONSafe(categories);
      if (parsedCategories.length > 0 && !parsedCategories.includes(store.category)) {
        throw new Error("Category chính không có trong danh sách categories");
      }
      store.categories = parsedCategories;
    }

    let images = [];
    if (files?.logo?.length > 0) {
      images.push(files.logo[0].path);
    } else if (existingLogo) {
      images.push(existingLogo);
    }

    if (files?.banner?.length > 0) {
      images.push(...files.banner.map(f => f.path));
    } else if (existingBanner) {
      images.push(existingBanner);
    }

    if (images.length > 0) {
      store.logoUrl = images[0] || store.logoUrl;
      store.bannerUrl = images[1] || store.bannerUrl;
    }

    await store.save();
    return store;
  }

  // Admin: Cập nhật cửa hàng theo ID
  async updateStoreById(storeId, storeData) {
    const store = await storeRepository.findById(storeId);
    if (!store) {
      throw new Error('Không tìm thấy cửa hàng');
    }

    const { name, description, category, isActive } = storeData;

    if (name !== undefined) store.name = name;
    if (description !== undefined) store.description = description;
    if (category !== undefined) store.category = category;
    if (isActive !== undefined) store.isActive = isActive;

    await store.save();
    return store;
  }

  // Kích hoạt store
  async activateStore(userId) {
    const store = await storeRepository.findByOwner(userId);
    if (!store) {
      throw new Error('Không tìm thấy cửa hàng');
    }
    store.isActive = true;
    await store.save();
    return store;
  }

  // Vô hiệu hóa store
  async deactivateStore(userId) {
    const store = await storeRepository.findByOwner(userId);
    if (!store) {
      throw new Error('Không tìm thấy cửa hàng');
    }
    store.isActive = false;
    await store.save();
    return store;
  }

  // Lấy store theo owner
  async getStoreByOwner(userId) {
    const store = await storeRepository.findByOwner(userId);
    if (!store) {
      throw new Error('Không tìm thấy cửa hàng');
    }
    return store;
  }

  // Lấy store theo ID
  async getStoreById(storeId) {
    const store = await storeRepository.findById(storeId, true);
    if (!store || !store.isActive) {
      throw new Error('Không tìm thấy cửa hàng');
    }

    const products = await storeRepository.getProductsByStore(store._id);
    const productIds = products.map(p => p._id);
    const reviews = await storeRepository.getReviewsByProductIds(productIds);

    const productsCount = products.length;
    const ratedProducts = products.filter(p => p.rating > 0);
    const avgRating = ratedProducts.length > 0
      ? ratedProducts.reduce((sum, p) => sum + p.rating, 0) / ratedProducts.length
      : 0;

    return {
      ...store.toObject(),
      products: productsCount,
      rating: avgRating,
      joinDate: store.createdAt,
      reviewsCount: reviews.length
    };
  }

  // Lấy tất cả active stores
  async getAllActiveStores() {
    const stores = await storeRepository.findActiveStores(true);
    
    const storesWithRating = await Promise.all(
      stores.map(async (store) => {
        const products = await storeRepository.getProductsByStore(store._id);
        const productIds = products.map(p => p._id);
        const reviews = await storeRepository.getReviewsByProductIds(productIds);
        
        let avgRating = 0;
        if (reviews.length > 0) {
          const totalRating = reviews.reduce((sum, review) => sum + review.rating, 0);
          avgRating = totalRating / reviews.length;
        }
        
        return {
          ...store.toObject(),
          rating: Math.round(avgRating * 10) / 10,
          reviewsCount: reviews.length
        };
      })
    );
    
    return storesWithRating;
  }

  // Admin: Lấy tất cả stores (bao gồm cả inactive)
  async getAllStores() {
    console.log('📊 [StoreService] getAllStores called');
    const stores = await storeRepository.findAllStores(true);
    console.log(`📊 [StoreService] Tổng số stores từ repository: ${stores.length}`);
    stores.forEach((store, idx) => {
      console.log(`📊 [StoreService] Store ${idx + 1}: _id=${store._id || store._id?.toString()}, name=${store.name}, isActive=${store.isActive}`);
    });
    
    // Đảm bảo trả về tất cả stores, kể cả khi owner không tồn tại
    const result = stores.map((store, idx) => {
      // Store đã được populate và convert sang object trong repository
      // Chỉ cần đảm bảo format đúng
      const storeObj = store.toObject ? store.toObject() : store;
      console.log(`📊 [StoreService] Mapping store ${idx + 1}: _id=${storeObj._id}, name=${storeObj.name}, isActive=${storeObj.isActive}`);
      return storeObj;
    });
    
    console.log(`📊 [StoreService] Số stores sau khi map: ${result.length}`);
    result.forEach((store, idx) => {
      console.log(`📊 [StoreService] Final store ${idx + 1}: _id=${store._id}, name=${store.name}, isActive=${store.isActive}`);
    });
    
    return result;
  }

  // Thêm category
  async addCategory(storeId, name) {
    const store = await storeRepository.findById(storeId);
    if (!store) {
      throw new Error('Không tìm thấy cửa hàng');
    }

    if (!name || !name.trim()) {
      throw new Error('Tên danh mục là bắt buộc');
    }

    const newCategory = {
      name: name.trim(),
      products: []
    };

    store.categories.push(newCategory);
    await store.save();

    return store.categories[store.categories.length - 1];
  }

  // Sửa category
  async editCategory(storeId, categoryId, name) {
    const store = await storeRepository.findById(storeId);
    if (!store) {
      throw new Error('Không tìm thấy cửa hàng');
    }

    if (!name || !name.trim()) {
      throw new Error('Tên danh mục là bắt buộc');
    }

    const category = store.categories.id(categoryId);
    if (!category) {
      throw new Error('Danh mục không tồn tại');
    }

    category.name = name.trim();
    await store.save();

    return category;
  }

  // Xóa category
  async deleteCategory(storeId, categoryId) {
    const store = await storeRepository.findById(storeId);
    if (!store) {
      throw new Error('Không tìm thấy cửa hàng');
    }

    const categoryIndex = store.categories.findIndex(c => c._id.toString() === categoryId);
    if (categoryIndex === -1) {
      throw new Error('Danh mục không tồn tại');
    }

    store.categories.splice(categoryIndex, 1);
    await store.save();

    return store;
  }

  // Thêm products vào category
  async addProductsToCategory(storeId, categoryId, productIds) {
    const store = await storeRepository.findById(storeId);
    if (!store) {
      throw new Error("Không tìm thấy cửa hàng");
    }

    if (!Array.isArray(productIds) || productIds.length === 0) {
      throw new Error("productIds là bắt buộc");
    }

    const category = store.categories.id(categoryId);
    if (!category) {
      throw new Error("Danh mục không tồn tại");
    }

    productIds.forEach(pid => {
      if (!category.products.includes(pid)) {
        category.products.push(pid);
      }
    });

    await store.save();
    return category;
  }

  // Xóa product khỏi category
  async removeProductFromCategory(storeId, categoryId, productId) {
    const store = await storeRepository.findById(storeId);
    if (!store) {
      throw new Error("Không tìm thấy cửa hàng");
    }

    const category = store.categories.id(categoryId);
    if (!category) {
      throw new Error("Danh mục không tồn tại");
    }

    category.products = category.products.filter(p => p.toString() !== productId);
    await store.save();

    return category;
  }

  // Lấy categories
  async getCategories(storeId) {
    const store = await storeRepository.findById(storeId);
    if (!store) {
      throw new Error("Không tìm thấy cửa hàng");
    }
    return store.categories || [];
  }

  // Lấy products theo category
  async getProductsByCategory(storeId, categoryId) {
    const store = await storeRepository.findById(storeId);
    if (!store) {
      throw new Error("Không tìm thấy cửa hàng");
    }

    const category = store.categories.id(categoryId);
    if (!category) {
      throw new Error("Danh mục không tồn tại");
    }

    const Product = require('../models/Product');
    const products = await Product.find({ _id: { $in: category.products } })
      .populate("store", "name")
      .sort({ rating: -1 });

    return products;
  }

  // Tìm kiếm stores
  async searchStores(keyword, limit = 10) {
    if (!keyword || !keyword.trim()) {
      return [];
    }

    const stores = await storeRepository.searchStores(keyword.trim(), limit);
    
    // Tính rating cho mỗi store
    const storesWithRating = await Promise.all(
      stores.map(async (store) => {
        const products = await storeRepository.getProductsByStore(store._id);
        const productIds = products.map(p => p._id);
        const reviews = await storeRepository.getReviewsByProductIds(productIds);
        
        let avgRating = 0;
        if (reviews.length > 0) {
          const totalRating = reviews.reduce((sum, review) => sum + review.rating, 0);
          avgRating = totalRating / reviews.length;
        }
        
        return {
          ...store,
          rating: Math.round(avgRating * 10) / 10,
          productsCount: products.length
        };
      })
    );
    
    return storesWithRating;
  }
}

module.exports = new StoreService();

