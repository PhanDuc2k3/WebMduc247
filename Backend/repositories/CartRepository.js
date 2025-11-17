const Cart = require('../models/Cart');

class CartRepository {
  // Tìm cart theo userId
  async findByUserId(userId, populate = false) {
    let query = Cart.findOne({ userId });
    if (populate) {
      query = query
        .populate("items.productId")
        .populate("items.storeId", "name logoUrl");
    }
    return await query;
  }

  // Tạo cart mới
  async create(cartData) {
    const cart = new Cart(cartData);
    return await cart.save();
  }

  // Cập nhật cart
  async update(cartId, updateData) {
    return await Cart.findByIdAndUpdate(cartId, updateData, { new: true });
  }

  // Lưu cart (nếu đã có)
  async save(cart) {
    return await cart.save();
  }
}

module.exports = new CartRepository();

