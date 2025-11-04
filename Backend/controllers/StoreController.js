require('dotenv').config();
const Store = require('../models/Store');
const Product = require('../models/Product');
const Review = require('../models/Review');
const multer = require('multer');
const { uploadToCloudinary } = require('../middlewares/cloudinary');
const mongoose = require('mongoose')
// Multer memory storage để upload trực tiếp lên Cloudinary
const storage = multer.memoryStorage();
const upload = multer({ storage });

// Hàm parse JSON an toàn
const parseJSONSafe = (val) => {
  if (!val) return [];
  if (typeof val === "string") {
    try { return JSON.parse(val); } catch { return []; }
  }
  return val;
};

// ========================
// TẠO CỬA HÀNG
// ========================
exports.createStore = async (req, res) => {
  try {
    const { name, description, category, address, contactPhone, contactEmail, categories,
      existingLogo, existingBanner } = req.body;

    if (!name || !description || !category || !address) {
      return res.status(400).json({ message: 'Thiếu thông tin bắt buộc' });
    }

    // Parse categories
    const parsedCategories = parseJSONSafe(categories);
    if (parsedCategories.length > 0 && !parsedCategories.includes(category)) {
      return res.status(400).json({ message: "Category chính không có trong danh sách categories" });
    }

    // Xử lý hình ảnh giống product
    const images = [];
    // Logo
    if (req.files?.logo?.length > 0) images.push(req.files.logo[0].path);
    else if (existingLogo) images.push(existingLogo);
    // Banner
    if (req.files?.banner?.length > 0) images.push(...req.files.banner.map(f => f.path));
    else if (existingBanner) images.push(existingBanner);

    const newStore = new Store({
      name,
      description,
      category,
      categories: parsedCategories,
      storeAddress: address,
      contactPhone,
      contactEmail,
      logoUrl: images[0] || '',
      bannerUrl: images[1] || '',
      owner: req.user._id,
    });

    await newStore.save();
    res.status(201).json({ message: 'Tạo cửa hàng thành công!', store: newStore });

  } catch (error) {
    res.status(500).json({ message: 'Lỗi khi tạo cửa hàng', error: error.message });
  }
};

// ========================
// CẬP NHẬT CỬA HÀNG
// ========================
exports.updateStore = async (req, res) => {
  try {
    const userId = req.user.userId;
    const store = await Store.findOne({ owner: userId });
    if (!store) return res.status(404).json({ message: 'Không tìm thấy cửa hàng' });

    const { name, description, storeAddress, category, customCategory, categories,
      existingLogo, existingBanner } = req.body;

    if (name) store.name = name;
    if (description) store.description = description;
    if (storeAddress) store.storeAddress = storeAddress;
    if (category) store.category = category === 'Other' ? customCategory : category;

    if (categories) {
      const parsedCategories = parseJSONSafe(categories);
      if (parsedCategories.length > 0 && !parsedCategories.includes(store.category)) {
        return res.status(400).json({ message: "Category chính không có trong danh sách categories" });
      }
      store.categories = parsedCategories;
    }

    // ========================
    // Xử lý hình ảnh giống product controller
    // ========================
    let images = [];

    // Logo mới
    if (req.files?.logo?.length > 0) {
      images.push(req.files.logo[0].path);
    } else if (existingLogo) {
      images.push(existingLogo);
    }

    // Banner mới
    if (req.files?.banner?.length > 0) {
      images.push(...req.files.banner.map(f => f.path));
    } else if (existingBanner) {
      images.push(existingBanner);
    }

    // Gán vào store
    if (images.length > 0) {
      store.logoUrl = images[0] || store.logoUrl;
      store.bannerUrl = images[1] || store.bannerUrl;
    }

    await store.save();
    res.status(200).json({ message: 'Cập nhật cửa hàng thành công', store });

  } catch (error) {
    res.status(500).json({ message: 'Lỗi khi cập nhật cửa hàng', error: error.message });
  }
};


// ========================
// KÍCH HOẠT / VÔ HIỆU HÓA
// ========================
exports.activateStore = async (req, res) => {
  try {
    const store = await Store.findOne({ owner: req.user.userId });
    if (!store) return res.status(404).json({ message: 'Không tìm thấy cửa hàng' });

    store.isActive = true;
    await store.save();
    res.status(200).json({ message: 'Kích hoạt cửa hàng thành công', store });
  } catch (error) {
    res.status(500).json({ message: 'Lỗi khi kích hoạt cửa hàng', error: error.message });
  }
};

exports.deactivateStore = async (req, res) => {
  try {
    const store = await Store.findOne({ owner: req.user.userId });
    if (!store) return res.status(404).json({ message: 'Không tìm thấy cửa hàng' });

    store.isActive = false;
    await store.save();
    res.status(200).json({ message: 'Vô hiệu hóa cửa hàng thành công', store });
  } catch (error) {
    res.status(500).json({ message: 'Lỗi khi vô hiệu hóa cửa hàng', error: error.message });
  }
};

// ========================
// LẤY CỬA HÀNG
// ========================
exports.getStoreByOwner = async (req, res) => {
  try {
    const store = await Store.findOne({ owner: req.user.userId });
    if (!store) return res.status(404).json({ message: 'Không tìm thấy cửa hàng' });
    res.status(200).json({ message: 'Lấy thông tin cửa hàng thành công', store });
  } catch (error) {
    res.status(500).json({ message: 'Lỗi khi lấy cửa hàng', error: error.message });
  }
};

exports.getMyStore = async (req, res) => {
  try {
    const store = await Store.findOne({ owner: req.user.userId });
    if (!store) return res.status(404).json({ message: 'Bạn chưa có cửa hàng' });
    res.status(200).json({ store });
  } catch (error) {
    res.status(500).json({ message: 'Lỗi server', error: error.message });
  }
};

exports.getStoreById = async (req, res) => {
  try {
    const store = await Store.findById(req.params.id).populate('owner', 'fullName email phone');
    if (!store || !store.isActive) return res.status(404).json({ message: 'Không tìm thấy cửa hàng' });

    const products = await Product.find({ store: store._id });
    const productIds = products.map(p => p._id);
    const reviews = await Review.find({ productId: { $in: productIds } });

    const productsCount = products.length;
    const ratedProducts = products.filter(p => p.rating > 0);
    const avgRating = ratedProducts.length > 0
      ? ratedProducts.reduce((sum, p) => sum + p.rating, 0) / ratedProducts.length
      : 0;

    res.status(200).json({
      message: 'Lấy thông tin cửa hàng thành công',
      store: {
        ...store.toObject(),
        products: productsCount,
        rating: avgRating,
        joinDate: store.createdAt,
        reviewsCount: reviews.length
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Lỗi khi lấy cửa hàng', error: error.message });
  }
};

exports.getAllActiveStores = async (req, res) => {
  try {
    const stores = await Store.find({ isActive: true }).populate('owner', 'fullName email');
    res.status(200).json({ message: 'Lấy danh sách cửa hàng thành công', stores });
  } catch (error) {
    res.status(500).json({ message: 'Lỗi khi lấy danh sách cửa hàng', error: error.message });
  }
};
exports.addCategory = async (req, res) => {
  try {
    const store = await Store.findById(req.params.id);
    if (!store) return res.status(404).json({ message: 'Không tìm thấy cửa hàng' });

    const { name } = req.body;
    if (!name || !name.trim()) return res.status(400).json({ message: 'Tên danh mục là bắt buộc' });

    // Mongoose tự sinh ObjectId cho subdocument nếu không truyền _id
    const newCategory = {
      name: name.trim(),
      products: []
    };

    store.categories.push(newCategory);
    await store.save();

    // Lấy category vừa thêm (Mongoose đã tự gán _id)
    const addedCategory = store.categories[store.categories.length - 1];

    res.status(201).json({ message: 'Thêm danh mục thành công', category: addedCategory });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Lỗi server', error: err.message });
  }
};

// ========================
// SỬA DANH MỤC
// ========================
exports.editCategory = async (req, res) => {
  try {
    const store = await Store.findById(req.params.id);
    if (!store) return res.status(404).json({ message: 'Không tìm thấy cửa hàng' });

    const { categoryId } = req.params;
    const { name } = req.body;
    if (!name || !name.trim()) return res.status(400).json({ message: 'Tên danh mục là bắt buộc' });

    // Sử dụng Mongoose subdocument id()
    const category = store.categories.id(categoryId);
    if (!category) return res.status(404).json({ message: 'Danh mục không tồn tại' });

    category.name = name.trim();
    await store.save();

    res.status(200).json({ message: 'Cập nhật danh mục thành công', category });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Lỗi server', error: err.message });
  }
};

// ========================
// XÓA DANH MỤC
// ========================
// ========================
// XÓA DANH MỤC
// ========================
exports.deleteCategory = async (req, res) => {
  try {
    const storeId = req.params.id;      // storeId từ URL
    const categoryId = req.params.catId; // categoryId từ URL
    console.log("Params received:", req.params);
    console.log("Request to delete categoryId:", categoryId);

    if (!mongoose.Types.ObjectId.isValid(storeId) || !mongoose.Types.ObjectId.isValid(categoryId)) {
      return res.status(400).json({ message: "Invalid storeId or categoryId" });
    }

    const store = await Store.findById(storeId);
    if (!store) {
      return res.status(404).json({ message: "Store not found" });
    }

    // Tìm category trong store
    const categoryIndex = store.categories.findIndex(c => c._id.toString() === categoryId);
    if (categoryIndex === -1) {
      console.error("❌ Category not found in store");
      console.log("Current categories in store:", store.categories);
      return res.status(404).json({ message: "Category not found in store" });
    }

    // Xóa category
    store.categories.splice(categoryIndex, 1);
    await store.save();

    console.log("✅ Category deleted:", categoryId);
    res.status(200).json({ message: "Category deleted successfully", store });
  } catch (err) {
    console.error("Delete category error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// ========================
// THÊM SẢN PHẨM VÀO DANH MỤC
// ========================
exports.addProductsToCategory = async (req, res) => {
  try {
    const store = await Store.findById(req.params.id);
    if (!store) return res.status(404).json({ message: "Không tìm thấy cửa hàng" });

    const { categoryId } = req.params;
    const { productIds } = req.body; // mảng _id của product
    if (!Array.isArray(productIds) || productIds.length === 0)
      return res.status(400).json({ message: "productIds là bắt buộc" });

    const category = store.categories.id(categoryId);
    if (!category) return res.status(404).json({ message: "Danh mục không tồn tại" });

    // Thêm productId vào category nếu chưa có
    productIds.forEach(pid => {
      if (!category.products.includes(pid)) {
        category.products.push(pid);
      }
    });

    await store.save();
    res.status(200).json({ message: "Thêm sản phẩm vào danh mục thành công", category });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

// ========================
// XÓA SẢN PHẨM KHỎI DANH MỤC
// ========================
exports.removeProductFromCategory = async (req, res) => {
  try {
    const store = await Store.findById(req.params.id);
    if (!store) return res.status(404).json({ message: "Không tìm thấy cửa hàng" });

    const { categoryId, productId } = req.params;
    const category = store.categories.id(categoryId);
    if (!category) return res.status(404).json({ message: "Danh mục không tồn tại" });

    category.products = category.products.filter(p => p.toString() !== productId);

    await store.save();
    res.status(200).json({ message: "Xóa sản phẩm khỏi danh mục thành công", category });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
};
// ========================
// LẤY DANH SÁCH CATEGORY CỦA CỬA HÀNG
// ========================
exports.getCategories = async (req, res) => {
  try {
    const storeId = req.params.id;
    if (!mongoose.Types.ObjectId.isValid(storeId)) {
      return res.status(400).json({ message: "StoreId không hợp lệ" });
    }

    const store = await Store.findById(storeId);
    if (!store) return res.status(404).json({ message: "Không tìm thấy cửa hàng" });

    // Trả về categories, kèm products trong từng category nếu có
    res.status(200).json({ categories: store.categories || [] });
  } catch (err) {
    console.error("Get categories error:", err);
    res.status(500).json({ message: "Lỗi server", error: err.message });
  }
};
// ========================
// LẤY SẢN PHẨM THEO CATEGORY
// ========================
exports.getProductsByCategory = async (req, res) => {
  try {
    const { id: storeId, categoryId } = req.params;

    // Kiểm tra store
    const store = await Store.findById(storeId);
    if (!store) return res.status(404).json({ message: "Không tìm thấy cửa hàng" });

    // Tìm category
    const category = store.categories.id(categoryId);
    if (!category) return res.status(404).json({ message: "Danh mục không tồn tại" });

    // Lấy danh sách products theo id, populate store để lấy tên
    const products = await Product.find({ _id: { $in: category.products } })
      .populate("store", "name")      // populate store, chỉ lấy trường name
      .sort({ rating: -1 });          // sắp xếp theo rating giảm dần, có thể đổi thành price: 1/ -1

    res.status(200).json({ products });
  } catch (err) {
    console.error("Get products by category error:", err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
};
