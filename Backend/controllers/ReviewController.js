const reviewService = require('../services/ReviewService');

exports.createReview = async (req, res) => {
  try {
    const { orderId } = req.params;
    const { productId, rating, comment } = req.body;
    const user = req.user;

    if (!user || !user.userId) {
      return res.status(401).json({ message: "Chưa đăng nhập" });
    }

    const review = await reviewService.createReview(
      user.userId,
      orderId,
      productId,
      rating,
      comment,
      req.files
    );

    res.status(201).json({ message: "Đánh giá thành công", review });
  } catch (err) {
    const statusCode = err.message.includes("không tồn tại") ? 404 : 
                      err.message.includes("chưa mua") ? 400 :
                      err.message.includes("đã đánh giá") ? 400 : 500;
    res.status(statusCode).json({ message: err.message || "Lỗi khi tạo đánh giá" });
  }
};

exports.getReviewsByProduct = async (req, res) => {
  try {
    const { productId } = req.params;
    const reviews = await reviewService.getReviewsByProduct(productId);
    res.json(reviews);
  } catch (err) {
    res.status(500).json({ message: "Lỗi khi lấy đánh giá", error: err.message });
  }
};

exports.getReviewByUserAndProduct = async (req, res) => {
  try {
    const { orderId, productId } = req.params;
    const user = req.user;

    if (!user || !user.userId) {
      return res.status(401).json({ message: "Chưa đăng nhập" });
    }

    const review = await reviewService.getReviewByUserAndProduct(user.userId, orderId, productId);

    if (!review) {
      return res.status(404).json({ message: "Chưa có đánh giá", review: null });
    }

    res.json({ message: "Đã tìm thấy đánh giá", review });
  } catch (err) {
    res.status(500).json({ message: "Lỗi khi lấy đánh giá", error: err.message });
  }
};

exports.updateReview = async (req, res) => {
  try {
    const { reviewId } = req.params;
    const { rating, comment } = req.body;
    const user = req.user;

    if (!user || !user.userId) {
      return res.status(401).json({ message: "Chưa đăng nhập" });
    }

    const review = await reviewService.updateReview(
      user.userId,
      reviewId,
      rating,
      comment,
      req.files
    );

    res.json({ message: "Cập nhật đánh giá thành công", review });
  } catch (err) {
    const statusCode = err.message.includes("không tồn tại") ? 404 : 
                      err.message.includes("quyền") ? 403 :
                      err.message.includes("đã sửa") ? 400 : 500;
    res.status(statusCode).json({ message: err.message || "Lỗi khi cập nhật đánh giá" });
  }
};
