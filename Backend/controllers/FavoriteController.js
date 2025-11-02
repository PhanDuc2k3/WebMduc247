const Favorite = require('../models/Favorite');
const Product = require('../models/Product');
const Store = require('../models/Store');

// ==========================
// THÊM YÊU THÍCH
// ==========================
exports.addFavorite = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { productId, storeId } = req.body;

    if (!productId && !storeId) {
      return res.status(400).json({ message: 'Vui lòng cung cấp productId hoặc storeId' });
    }

    // Kiểm tra product/store có tồn tại không
    if (productId) {
      const product = await Product.findById(productId);
      if (!product) {
        return res.status(404).json({ message: 'Sản phẩm không tồn tại' });
      }
    }

    if (storeId) {
      const store = await Store.findById(storeId);
      if (!store) {
        return res.status(404).json({ message: 'Cửa hàng không tồn tại' });
      }
    }

    // Kiểm tra đã yêu thích chưa
    const existingFavorite = await Favorite.findOne({
      user: userId,
      ...(productId ? { product: productId } : {}),
      ...(storeId ? { store: storeId } : {})
    });

    if (existingFavorite) {
      return res.status(400).json({ message: 'Đã yêu thích rồi' });
    }

    // Tạo favorite mới
    const favorite = new Favorite({
      user: userId,
      ...(productId ? { product: productId } : {}),
      ...(storeId ? { store: storeId } : {})
    });

    await favorite.save();

    res.status(201).json({ message: 'Đã thêm vào yêu thích', favorite });
  } catch (error) {
    console.error('Add favorite error:', error);
    res.status(500).json({ message: 'Lỗi máy chủ', error: error.message });
  }
};

// ==========================
// XÓA YÊU THÍCH
// ==========================
exports.removeFavorite = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { productId, storeId } = req.body;

    if (!productId && !storeId) {
      return res.status(400).json({ message: 'Vui lòng cung cấp productId hoặc storeId' });
    }

    const favorite = await Favorite.findOneAndDelete({
      user: userId,
      ...(productId ? { product: productId } : {}),
      ...(storeId ? { store: storeId } : {})
    });

    if (!favorite) {
      return res.status(404).json({ message: 'Không tìm thấy yêu thích' });
    }

    res.status(200).json({ message: 'Đã xóa khỏi yêu thích' });
  } catch (error) {
    console.error('Remove favorite error:', error);
    res.status(500).json({ message: 'Lỗi máy chủ', error: error.message });
  }
};

// ==========================
// KIỂM TRA YÊU THÍCH
// ==========================
exports.checkFavorite = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { productId, storeId } = req.params;

    if (!productId && !storeId) {
      return res.status(400).json({ message: 'Vui lòng cung cấp productId hoặc storeId' });
    }

    const favorite = await Favorite.findOne({
      user: userId,
      ...(productId ? { product: productId } : {}),
      ...(storeId ? { store: storeId } : {})
    });

    res.status(200).json({ isFavorite: !!favorite });
  } catch (error) {
    console.error('Check favorite error:', error);
    res.status(500).json({ message: 'Lỗi máy chủ', error: error.message });
  }
};

// ==========================
// LẤY TẤT CẢ YÊU THÍCH
// ==========================
exports.getMyFavorites = async (req, res) => {
  try {
    const userId = req.user.userId;

    // Lấy tất cả favorites của user với thông tin đầy đủ
    const favorites = await Favorite.find({ user: userId })
      .populate('product', 'name price salePrice brand category images rating reviewsCount soldCount')
      .populate('store', 'name description logoUrl bannerUrl rating category')
      .populate('user', 'fullName avatarUrl')
      .sort({ createdAt: -1 });

    // Phân loại products và stores
    const products = favorites
      .filter(fav => fav.product)
      .map(fav => fav.product);

    const stores = favorites
      .filter(fav => fav.store)
      .map(fav => fav.store);

    res.status(200).json({
      message: 'Lấy danh sách yêu thích thành công',
      products,
      stores,
      totalProducts: products.length,
      totalStores: stores.length
    });
  } catch (error) {
    console.error('Get favorites error:', error);
    res.status(500).json({ message: 'Lỗi máy chủ', error: error.message });
  }
};

// ==========================
// ĐẾM YÊU THÍCH CỦA PRODUCT/STORE
// ==========================
exports.getFavoriteCount = async (req, res) => {
  try {
    const { productId, storeId } = req.params;

    if (!productId && !storeId) {
      return res.status(400).json({ message: 'Vui lòng cung cấp productId hoặc storeId' });
    }

    const count = await Favorite.countDocuments({
      ...(productId ? { product: productId } : {}),
      ...(storeId ? { store: storeId } : {})
    });

    res.status(200).json({ count });
  } catch (error) {
    console.error('Get favorite count error:', error);
    res.status(500).json({ message: 'Lỗi máy chủ', error: error.message });
  }
};

