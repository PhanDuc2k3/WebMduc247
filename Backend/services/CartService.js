const cartRepository = require('../repositories/CartRepository');
const Product = require('../models/Product');
const axios = require('axios');

const SOCKET_SERVICE_URL = process.env.WS_URL || "http://localhost:5050";

class CartService {
  // Emit cart update đến socket microservice
  async emitCartUpdate(userId, cart) {
    if (!userId || !cart) return;
    try {
      const cartCount = Array.isArray(cart.items)
        ? cart.items.reduce((sum, i) => sum + (i.quantity || 0), 0)
        : 0;

      await axios.post(
        `${SOCKET_SERVICE_URL}/api/cart-socket/emitCartUpdate`,
        { userId, cart, cartCount },
        { headers: { "Content-Type": "application/json" } }
      );
    } catch (err) {
      console.error("Emit cart update error:", err.response?.status, err.message);
    }
  }

  // Lấy giỏ hàng
  async getCart(userId) {
    let cart = await cartRepository.findByUserId(userId, true);
    if (!cart) {
      cart = await cartRepository.create({ userId, items: [] });
    }
    return cart;
  }

  // Thêm sản phẩm vào giỏ
  async addToCart(userId, productId, quantity, variationId, optionId) {
    const product = await Product.findById(productId).populate("store");
    if (!product) {
      throw new Error("Không tìm thấy sản phẩm");
    }

    let cart = await cartRepository.findByUserId(userId);
    if (!cart) {
      cart = await cartRepository.create({ userId, items: [] });
    }

    let variation = {};
    if (variationId && optionId && Array.isArray(product.variations)) {
      const v = product.variations.find(v => v._id.toString() === variationId.toString());
      const opt = v?.options.find(o => o._id.toString() === optionId.toString());
      if (v && opt) {
        variation = {
          variationId: v._id.toString(),
          optionId: opt._id.toString(),
          color: v.color,
          size: opt.name,
          additionalPrice: opt.additionalPrice || 0,
        };
      }
    }

    const unitPrice = (product.salePrice ?? product.price) + (variation.additionalPrice || 0);

    const existingItem = cart.items.find(item => {
      const itemVarId = (item.variation?.variationId || item.variationId)?.toString();
      const itemOptId = (item.variation?.optionId || item.optionId)?.toString();
      return (
        item.productId.toString() === productId.toString() &&
        itemVarId === (variation.variationId || "").toString() &&
        itemOptId === (variation.optionId || "").toString()
      );
    });

    const mainImage = Array.isArray(product.images) && product.images.length > 0 ? product.images[0] : "";

    if (existingItem) {
      existingItem.quantity += quantity;
      existingItem.subtotal = existingItem.quantity * unitPrice;
    } else {
      cart.items.push({
        productId,
        storeId: product.store?._id,
        name: product.name,
        imageUrl: mainImage,
        price: product.price,
        salePrice: product.salePrice,
        quantity,
        variation,
        variationId: variation.variationId,
        optionId: variation.optionId,
        subtotal: unitPrice * quantity,
      });
    }

    cart.subtotal = cart.items.reduce((sum, i) => sum + (i.subtotal || 0), 0);
    cart.total = cart.subtotal;

    await cartRepository.save(cart);

    const populatedCart = await cartRepository.findByUserId(userId, true);
    await this.emitCartUpdate(userId, populatedCart);

    return populatedCart;
  }

  // Cập nhật số lượng
  async updateQuantity(userId, itemId, quantity) {
    const cart = await cartRepository.findByUserId(userId);
    if (!cart) {
      throw new Error("Giỏ hàng không tồn tại");
    }

    const item = cart.items.find(i => i._id.toString() === itemId);
    if (!item) {
      throw new Error("Sản phẩm không tồn tại trong giỏ hàng");
    }

    const basePrice = item.salePrice ?? item.price;
    const additionalPrice = item.variation?.additionalPrice || 0;
    item.quantity = quantity;
    item.subtotal = (basePrice + additionalPrice) * quantity;

    cart.subtotal = cart.items.reduce((sum, i) => sum + (i.subtotal || 0), 0);
    cart.total = cart.subtotal;

    await cartRepository.save(cart);

    const populatedCart = await cartRepository.findByUserId(userId, true);
    await this.emitCartUpdate(userId, populatedCart);

    return populatedCart;
  }

  // Xóa sản phẩm khỏi giỏ
  async removeFromCart(userId, itemId) {
    let cart = await cartRepository.findByUserId(userId);
    if (!cart) {
      throw new Error("Không tìm thấy giỏ hàng");
    }

    cart.items = cart.items.filter(item => item._id.toString() !== itemId);

    cart.subtotal = cart.items.reduce((sum, i) => sum + (i.subtotal || 0), 0);
    cart.total = cart.subtotal;

    await cartRepository.save(cart);

    const populatedCart = await cartRepository.findByUserId(userId, true);
    await this.emitCartUpdate(userId, populatedCart);

    return populatedCart;
  }
}

module.exports = new CartService();

