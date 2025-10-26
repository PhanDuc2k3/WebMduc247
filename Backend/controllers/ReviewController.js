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

    const images = req.files ? req.files.map(f => `/uploads/${f.filename}`) : [];

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
