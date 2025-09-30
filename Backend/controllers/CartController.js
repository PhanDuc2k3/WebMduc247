const Cart = require("../models/Cart");
const Product = require("../models/Product");

// Lấy giỏ hàng
exports.getCart = async (req, res) => {
  try {
    const userId = req.user.userId;

    let cart = await Cart.findOne({ userId })
      .populate("items.productId")
      .populate("items.storeId", "name logoUrl");

    if (!cart) {
      cart = await Cart.create({ userId, items: [] });
    }

    return res.status(200).json(cart);
  } catch (error) {
    console.error(" Lỗi getCart:", error);
    res.status(500).json({ message: "Lỗi server" });
  }
};

// Thêm sản phẩm vào giỏ
exports.addToCart = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { productId, quantity, variation } = req.body;

    const product = await Product.findById(productId).populate("store");
    if (!product) {
      return res.status(404).json({ message: "Không tìm thấy sản phẩm" });
    }

    let cart = await Cart.findOne({ userId });
    if (!cart) cart = await Cart.create({ userId, items: [] });

    let extraPrice = 0;
    if (variation?.color && variation?.size) {
      const foundVariation = product.variations.find(v => v.color === variation.color);
      if (foundVariation) {
        const option = foundVariation.options.find(o => o.name === variation.size);
        if (option) extraPrice = option.additionalPrice || 0;
      }
    }

    const basePrice = product.price;
    const baseSalePrice = product.salePrice && product.salePrice > 0 ? product.salePrice : null;
    const unitPrice = (baseSalePrice ?? basePrice) + extraPrice;

    const existingItem = cart.items.find(
      (item) =>
        item.productId.toString() === productId &&
        item.variation?.color === (variation?.color || null) &&
        item.variation?.size === (variation?.size || null)
    );

    if (existingItem) {
      existingItem.quantity += quantity;
      existingItem.subtotal = existingItem.quantity * unitPrice;
    } else {
      cart.items.push({
        productId,
        storeId: product.store._id,
        name: product.name,
        imageUrl: product.images[0],
        price: basePrice,
        salePrice: baseSalePrice,
        quantity,
        variation: {
          color: variation?.color || null,
          size: variation?.size || null,
          additionalPrice: extraPrice,
        },
        subtotal: unitPrice * quantity,
      });
    }

    await cart.save();

    const populatedCart = await Cart.findById(cart._id)
      .populate("items.productId")
      .populate("items.storeId", "name logoUrl");

    return res.status(200).json(populatedCart);
  } catch (error) {
    console.error(" Lỗi addToCart:", error);
    res.status(500).json({ message: "Lỗi server" });
  }
};

// Cập nhật số lượng
exports.updateQuantity = async (req, res) => {
  try {
    const { itemId, quantity } = req.body;
    const cart = await Cart.findOne({ userId: req.user.userId });
    if (!cart) return res.status(404).json({ message: "Giỏ hàng không tồn tại" });

    const item = cart.items.find(i => i._id.toString() === itemId);
    if (!item) return res.status(404).json({ message: "Sản phẩm không tồn tại trong giỏ hàng" });

    item.quantity = quantity;
    item.subtotal =
      ((item.salePrice ?? item.price) + (item.variation?.additionalPrice || 0)) * quantity;

    await cart.save();

    res.json({ success: true, cart });
  } catch (error) {
    console.error(" Lỗi updateQuantity:", error);
    res.status(500).json({ message: "Lỗi server" });
  }
};

// Xóa sản phẩm
exports.removeFromCart = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { itemId } = req.params;

    let cart = await Cart.findOne({ userId });
    if (!cart) return res.status(404).json({ message: "Không tìm thấy giỏ hàng" });

    cart.items = cart.items.filter(item => item._id.toString() !== itemId);

    await cart.save();

    const populatedCart = await Cart.findById(cart._id)
      .populate("items.productId")
      .populate("items.storeId", "name logoUrl");

    return res.status(200).json(populatedCart);
  } catch (error) {
    console.error(" Lỗi removeFromCart:", error);
    res.status(500).json({ message: "Lỗi server" });
  }
};
