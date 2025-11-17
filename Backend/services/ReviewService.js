const reviewRepository = require('../repositories/ReviewRepository');
const Order = require('../models/Order');
const Product = require('../models/Product');
const User = require('../models/Users');

class ReviewService {
  // Tạo review
  async createReview(userId, orderId, productId, rating, comment, files) {
    const user = await User.findById(userId).select("fullName avatarUrl");
    if (!user) {
      throw new Error("User không tồn tại");
    }

    const order = await Order.findById(orderId);
    if (!order) {
      throw new Error("Đơn hàng không tồn tại");
    }

    if (!Array.isArray(order.items)) {
      throw new Error("Đơn hàng chưa có sản phẩm");
    }

    const hasItem = order.items.some(item => item.productId.toString() === productId);
    if (!hasItem) {
      throw new Error("Bạn chưa mua sản phẩm này");
    }

    const existingReview = await reviewRepository.findByUserProductOrder(userId, productId, orderId);
    if (existingReview) {
      throw new Error("Bạn đã đánh giá sản phẩm này rồi. Bạn chỉ có thể sửa đánh giá 1 lần.");
    }

    const images = files ? files.map(f => f.path || f.url || f.secure_url) : [];

    const review = await reviewRepository.create({
      productId,
      orderId,
      userId,
      userInfo: {
        fullName: user.fullName,
        avatarUrl: user.avatarUrl || "https://i.pinimg.com/736x/c6/e5/65/c6e56503cfdd87da299f72dc416023d4.jpg",
      },
      rating,
      comment,
      images,
      editCount: 0,
    });

    // Cập nhật avg rating cho product
    await this.updateProductRating(productId);

    return review;
  }

  // Cập nhật product rating
  async updateProductRating(productId) {
    const stats = await reviewRepository.aggregateRating(productId);
    if (stats.length > 0) {
      await Product.findByIdAndUpdate(productId, { rating: stats[0].avgRating });
    }
  }

  // Lấy reviews theo product
  async getReviewsByProduct(productId) {
    return await reviewRepository.findByProductId(productId);
  }

  // Lấy review của user cho product trong order
  async getReviewByUserAndProduct(userId, orderId, productId) {
    return await reviewRepository.findByUserProductOrder(userId, productId, orderId);
  }

  // Cập nhật review
  async updateReview(userId, reviewId, rating, comment, files) {
    const review = await reviewRepository.findById(reviewId);
    if (!review) {
      throw new Error("Đánh giá không tồn tại");
    }

    if (review.userId.toString() !== userId.toString()) {
      throw new Error("Bạn không có quyền sửa đánh giá này");
    }

    if (review.editCount >= 1) {
      throw new Error("Bạn đã sửa đánh giá 1 lần rồi. Không thể sửa thêm.");
    }

    let images = review.images || [];
    if (files && files.length > 0) {
      const newImages = files.map(f => f.path || f.url || f.secure_url);
      images = [...images, ...newImages];
    }

    review.rating = rating || review.rating;
    review.comment = comment !== undefined ? comment : review.comment;
    review.images = images;
    review.editCount = review.editCount + 1;
    await review.save();

    // Cập nhật avg rating
    await this.updateProductRating(review.productId);

    return review;
  }
}

module.exports = new ReviewService();

