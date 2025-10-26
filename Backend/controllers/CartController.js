const Cart = require("../models/Cart");
const Product = require("../models/Product");
const axios = require("axios");

const SOCKET_SERVICE_URL = "http://localhost:5050";

async function emitCartUpdate(userId, cart) {
  try {
    const cartCount = Array.isArray(cart.items)
      ? cart.items.reduce((acc, item) => acc + (item.quantity || 0), 0)
      : 0;

    await axios.post(
      `${SOCKET_SERVICE_URL}/api/cart-socket/emitCartUpdate`,
      { userId, cart, cartCount },
      { headers: { "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("Emit cart update error:", err.message);
  }
}

exports.getCart = async (req, res) => {
  try {
    const userId = req.user.userId;
    let cart = await Cart.findOne({ userId })
      .populate("items.productId")
      .populate("items.storeId", "name logoUrl");
    if (!cart) cart = await Cart.create({ userId, items: [] });
    return res.status(200).json(cart);
  } catch {
    res.status(500).json({ message: "Lỗi server" });
  }
};

exports.addToCart = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { productId, quantity = 1, variationId, optionId } = req.body;

    const product = await Product.findById(productId).populate("store");
    if (!product) return res.status(404).json({ message: "Không tìm thấy sản phẩm" });

    let cart = await Cart.findOne({ userId });
    if (!cart) cart = await Cart.create({ userId, items: [] });

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
          additionalPrice: opt.additionalPrice || 0
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
      const newItem = {
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
        subtotal: unitPrice * quantity
      };
      cart.items.push(newItem);
    }

    const subtotal = cart.items.reduce((sum, i) => sum + (i.subtotal || 0), 0);
    const discount = cart.discount || 0;
    const shippingFee = cart.shippingFee || 0;
    cart.subtotal = subtotal;
    cart.total = subtotal - discount + shippingFee;

    await cart.save();

    const populatedCart = await Cart.findById(cart._id)
      .populate("items.productId")
      .populate("items.storeId", "name logoUrl");

    await emitCartUpdate(userId, populatedCart);
    return res.status(200).json(populatedCart);
  } catch {
    res.status(500).json({ message: "Lỗi server" });
  }
};

exports.updateQuantity = async (req, res) => {
  try {
    const { itemId, quantity } = req.body;
    const userId = req.user.userId;

    const cart = await Cart.findOne({ userId });
    if (!cart) return res.status(404).json({ message: "Giỏ hàng không tồn tại" });

    const item = cart.items.find(i => i._id.toString() === itemId);
    if (!item) return res.status(404).json({ message: "Sản phẩm không tồn tại trong giỏ hàng" });

    item.quantity = quantity;
    const basePrice = item.salePrice ?? item.price;
    const additionalPrice = item.variation?.additionalPrice || 0;
    item.subtotal = (basePrice + additionalPrice) * quantity;

    const subtotal = cart.items.reduce((sum, i) => sum + (i.subtotal || 0), 0);
    const discount = cart.discount || 0;
    const shippingFee = cart.shippingFee || 0;
    cart.subtotal = subtotal;
    cart.total = subtotal - discount + shippingFee;

    await cart.save();

    const populatedCart = await Cart.findById(cart._id)
      .populate("items.productId")
      .populate("items.storeId", "name logoUrl");

    await emitCartUpdate(userId, populatedCart);
    res.json({ success: true, cart: populatedCart });
  } catch {
    res.status(500).json({ message: "Lỗi server" });
  }
};

exports.removeFromCart = async (req, res) => {
  try {
    const { itemId } = req.params;
    const userId = req.user.userId;

    let cart = await Cart.findOne({ userId });
    if (!cart) return res.status(404).json({ message: "Không tìm thấy giỏ hàng" });

    cart.items = cart.items.filter(item => item._id.toString() !== itemId);

    const subtotal = cart.items.reduce((sum, i) => sum + (i.subtotal || 0), 0);
    const discount = cart.discount || 0;
    const shippingFee = cart.shippingFee || 0;
    cart.subtotal = subtotal;
    cart.total = subtotal - discount + shippingFee;

    await cart.save();

    const populatedCart = await Cart.findById(cart._id)
      .populate("items.productId")
      .populate("items.storeId", "name logoUrl");

    await emitCartUpdate(userId, populatedCart);
    res.status(200).json(populatedCart);
  } catch {
    res.status(500).json({ message: "Lỗi server" });
  }
};
