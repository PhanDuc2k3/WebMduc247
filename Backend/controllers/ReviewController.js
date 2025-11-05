const Review = require("../models/Review");
const Order = require("../models/Order");
const Product = require("../models/Product");
const User = require("../models/Users");

// Tạo review
exports.createReview = async (req, res) => {
  try {
    const { orderId } = req.params;
    const { productId, rating, comment } = req.body;
    const user = req.user;

    if (!user || !user.userId) {
      return res.status(401).json({ message: "Chưa đăng nhập" });
    }

    const userDb = await User.findById(user.userId).select("fullName avatarUrl");
    if (!userDb) return res.status(404).json({ message: "User không tồn tại" });

    const order = await Order.findById(orderId);
    if (!order) return res.status(404).json({ message: "Đơn hàng không tồn tại" });

    if (!Array.isArray(order.items)) {
      return res.status(400).json({ message: "Đơn hàng chưa có sản phẩm" });
    }

    const hasItem = order.items.some(item => item.productId.toString() === productId);
    if (!hasItem) return res.status(400).json({ message: "Bạn chưa mua sản phẩm này" });

    // Kiểm tra xem user đã đánh giá sản phẩm này chưa
    const existingReview = await Review.findOne({
      userId: user.userId,
      productId: productId,
      orderId: orderId,
    });

    if (existingReview) {
      return res.status(400).json({ 
        message: "Bạn đã đánh giá sản phẩm này rồi. Bạn chỉ có thể sửa đánh giá 1 lần.",
        review: existingReview 
      });
    }

    // Lấy Cloudinary URL từ req.files (khi dùng CloudinaryStorage, path sẽ là Cloudinary URL)
    const images = req.files ? req.files.map(f => f.path || f.url || f.secure_url) : [];

    const review = new Review({
      productId,
      orderId,
      userId: user.userId,
      userInfo: {
        fullName: userDb.fullName,
        avatarUrl: userDb.avatarUrl || "https://i.pinimg.com/736x/c6/e5/65/c6e56503cfdd87da299f72dc416023d4.jpg",
      },
      rating,
      comment,
      images,
      editCount: 0,
    });

    await review.save();

    // Cập nhật avg rating cho product
    const stats = await Review.aggregate([
      { $match: { productId: review.productId } },
      { $group: { _id: "$productId", avgRating: { $avg: "$rating" } } },
    ]);

    if (stats.length > 0) {
      await Product.findByIdAndUpdate(productId, { rating: stats[0].avgRating });
    }

    res.status(201).json({ message: "Đánh giá thành công", review });
  } catch (err) {
    res.status(500).json({ message: "Lỗi khi tạo đánh giá", error: err.message });
  }
};

// Lấy tất cả review theo productId
exports.getReviewsByProduct = async (req, res) => {
  try {
    const { productId } = req.params;

    const reviews = await Review.find({ productId }).sort({ createdAt: -1 });

    res.json(reviews);
  } catch (err) {
    res.status(500).json({ message: "Lỗi khi lấy đánh giá", error: err.message });
  }
};

// Lấy review của user cho sản phẩm trong đơn hàng cụ thể
exports.getReviewByUserAndProduct = async (req, res) => {
  try {
    const { orderId, productId } = req.params;
    const user = req.user;

    if (!user || !user.userId) {
      return res.status(401).json({ message: "Chưa đăng nhập" });
    }

    const review = await Review.findOne({
      userId: user.userId,
      productId: productId,
      orderId: orderId,
    });

    if (!review) {
      return res.status(404).json({ message: "Chưa có đánh giá", review: null });
    }

    res.json({ message: "Đã tìm thấy đánh giá", review });
  } catch (err) {
    res.status(500).json({ message: "Lỗi khi lấy đánh giá", error: err.message });
  }
};

// Cập nhật review (chỉ cho phép sửa 1 lần)
exports.updateReview = async (req, res) => {
  try {
    const { reviewId } = req.params;
    const { rating, comment } = req.body;
    const user = req.user;

    if (!user || !user.userId) {
      return res.status(401).json({ message: "Chưa đăng nhập" });
    }

    const review = await Review.findById(reviewId);
    if (!review) {
      return res.status(404).json({ message: "Đánh giá không tồn tại" });
    }

    // Kiểm tra quyền sở hữu
    if (review.userId.toString() !== user.userId.toString()) {
      return res.status(403).json({ message: "Bạn không có quyền sửa đánh giá này" });
    }

    // Kiểm tra số lần đã sửa
    if (review.editCount >= 1) {
      return res.status(400).json({ message: "Bạn đã sửa đánh giá 1 lần rồi. Không thể sửa thêm." });
    }

    // Cập nhật ảnh nếu có - lấy Cloudinary URL từ req.files
    let images = review.images || [];
    if (req.files && req.files.length > 0) {
      const newImages = req.files.map(f => f.path || f.url || f.secure_url);
      images = [...images, ...newImages];
    }

    // Cập nhật review
    review.rating = rating || review.rating;
    review.comment = comment !== undefined ? comment : review.comment;
    review.images = images;
    review.editCount = review.editCount + 1;
    await review.save();

    // Cập nhật avg rating cho product
    const stats = await Review.aggregate([
      { $match: { productId: review.productId } },
      { $group: { _id: "$productId", avgRating: { $avg: "$rating" } } },
    ]);

    if (stats.length > 0) {
      await Product.findByIdAndUpdate(review.productId, { rating: stats[0].avgRating });
    }

    res.json({ message: "Cập nhật đánh giá thành công", review });
  } catch (err) {
    res.status(500).json({ message: "Lỗi khi cập nhật đánh giá", error: err.message });
  }
};
