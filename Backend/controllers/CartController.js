const cartService = require('../services/CartService');

// Lấy giỏ hàng
exports.getCart = async (req, res) => {
  try {
    const userId = req.user.userId;
    const cart = await cartService.getCart(userId);
    return res.status(200).json(cart);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Lỗi server" });
  }
};

// Thêm sản phẩm vào giỏ
exports.addToCart = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { productId, quantity = 1, variationId, optionId } = req.body;
    const cart = await cartService.addToCart(userId, productId, quantity, variationId, optionId);
    return res.status(200).json(cart);
  } catch (err) {
    console.error(err);
    const statusCode = err.message.includes("Không tìm thấy") ? 404 : 500;
    res.status(statusCode).json({ message: err.message || "Lỗi server" });
  }
};

// Cập nhật số lượng sản phẩm
exports.updateQuantity = async (req, res) => {
  try {
    const { itemId, quantity } = req.body;
    const userId = req.user.userId;
    const cart = await cartService.updateQuantity(userId, itemId, quantity);
    res.json({ success: true, cart });
  } catch (err) {
    console.error(err);
    const statusCode = err.message.includes("Không tìm thấy") ? 404 : 500;
    res.status(statusCode).json({ message: err.message || "Lỗi server" });
  }
};

// Xóa sản phẩm khỏi giỏ
exports.removeFromCart = async (req, res) => {
  try {
    const { itemId } = req.params;
    const userId = req.user.userId;
    const cart = await cartService.removeFromCart(userId, itemId);
    res.status(200).json(cart);
  } catch (err) {
    console.error(err);
    const statusCode = err.message.includes("Không tìm thấy") ? 404 : 500;
    res.status(statusCode).json({ message: err.message || "Lỗi server" });
  }
};
