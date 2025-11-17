const Review = require('../models/Review');

class ReviewRepository {
  // Tạo review
  async create(reviewData) {
    const review = new Review(reviewData);
    return await review.save();
  }

  // Tìm review theo ID
  async findById(reviewId) {
    return await Review.findById(reviewId);
  }

  // Tìm review theo productId
  async findByProductId(productId) {
    return await Review.find({ productId }).sort({ createdAt: -1 });
  }

  // Tìm review theo user, product và order
  async findByUserProductOrder(userId, productId, orderId) {
    return await Review.findOne({
      userId,
      productId,
      orderId,
    });
  }

  // Aggregate reviews để tính avg rating
  async aggregateRating(productId) {
    return await Review.aggregate([
      { $match: { productId } },
      { $group: { _id: "$productId", avgRating: { $avg: "$rating" } } },
    ]);
  }

  // Cập nhật review
  async update(reviewId, updateData) {
    return await Review.findByIdAndUpdate(reviewId, updateData, { new: true });
  }
}

module.exports = new ReviewRepository();

