const Cart = require("../models/Cart");
const Product = require("../models/Product");

exports.getCart = async (req, res) => {
  try {
    const userId = req.user.userId; 
    let cart = await Cart.findOne({ userId }).populate("items.productId");

    if (!cart) {
      cart = await Cart.create({ userId, items: [] });
    }

    return res.status(200).json(cart);
  } catch (error) {
    console.error("Lỗi getCart:", error);
    res.status(500).json({ message: "Lỗi server" });
  }
};

exports.addToCart = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { productId, quantity, variation } = req.body;

    const product = await Product.findById(productId).populate("store");
    if (!product) return res.status(404).json({ message: "Không tìm thấy sản phẩm" });

    let cart = await Cart.findOne({ userId });
    if (!cart) cart = await Cart.create({ userId, items: [] });

    const existingItem = cart.items.find(
      (item) =>
        item.productId.toString() === productId &&
        item.variation?.color === variation?.color &&
        item.variation?.size === variation?.size
    );

    const price = product.price;
    const salePrice = product.salePrice || null;
    const unitPrice = salePrice && salePrice > 0 ? salePrice : price;

    if (existingItem) {
      existingItem.quantity += quantity;
      existingItem.subtotal = existingItem.quantity * unitPrice;
    } else {
      cart.items.push({
        productId,
        storeId: product.store,
        name: product.name,
        imageUrl: product.images[0],
        price,
        salePrice,
        quantity,
        variation,
        subtotal: unitPrice * quantity,
      });
    }

    await cart.save();
    return res.status(200).json(cart);
  } catch (error) {
    console.error("Lỗi addToCart:", error);
    res.status(500).json({ message: "Lỗi server" });
  }
};

exports.updateQuantity = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { itemId, quantity } = req.body;

    let cart = await Cart.findOne({ userId });
    if (!cart) return res.status(404).json({ message: "Không tìm thấy giỏ hàng" });

    const item = cart.items.id(itemId);
    if (!item) return res.status(404).json({ message: "Không tìm thấy sản phẩm trong giỏ" });

    item.quantity = quantity;
    const unitPrice = item.salePrice && item.salePrice > 0 ? item.salePrice : item.price;
    item.subtotal = unitPrice * quantity;

    await cart.save();
    return res.status(200).json(cart);
  } catch (error) {
    console.error("Lỗi updateQuantity:", error);
    res.status(500).json({ message: "Lỗi server" });
  }
};

exports.removeFromCart = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { itemId } = req.params;

    let cart = await Cart.findOne({ userId });
    if (!cart) return res.status(404).json({ message: "Không tìm thấy giỏ hàng" });

    cart.items = cart.items.filter((item) => item._id.toString() !== itemId);

    await cart.save();
    return res.status(200).json(cart);
  } catch (error) {
    console.error("Lỗi removeFromCart:", error);
    res.status(500).json({ message: "Lỗi server" });
  }
};
