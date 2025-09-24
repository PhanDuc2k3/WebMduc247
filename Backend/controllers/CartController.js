const Cart = require("../models/Cart");
const Product = require("../models/Product");

// 🟢 Lấy giỏ hàng
exports.getCart = async (req, res) => {
  try {
    const userId = req.user.userId;
    let cart = await Cart.findOne({ userId })
      .populate("items.productId")
      .populate("items.storeId", "name logoUrl")
      .populate("voucher", "code title discountType discountValue");

    if (!cart) {
      cart = await Cart.create({ userId, items: [] });
    }

    return res.status(200).json(cart);
  } catch (error) {
    console.error("Lỗi getCart:", error);
    res.status(500).json({ message: "Lỗi server" });
  }
};

// 🟢 Thêm sản phẩm vào giỏ
exports.addToCart = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { productId, quantity, variation } = req.body;

    const product = await Product.findById(productId).populate("store");
    if (!product) return res.status(404).json({ message: "Không tìm thấy sản phẩm" });

    let cart = await Cart.findOne({ userId });
    if (!cart) cart = await Cart.create({ userId, items: [] });

    // ✅ Tính thêm giá theo variation
    let extraPrice = 0;
    if (variation?.color && variation?.size) {
      const foundVariation = product.variations.find((v) => v.color === variation.color);
      if (foundVariation) {
        const option = foundVariation.options.find((o) => o.name === variation.size);
        if (option) {
          extraPrice = option.additionalPrice || 0;
        }
      }
    }

    const basePrice = product.price;
    const baseSalePrice = product.salePrice && product.salePrice > 0 ? product.salePrice : null;

    const price = basePrice + extraPrice;
    const salePrice = baseSalePrice ? baseSalePrice + extraPrice : null;
    const unitPrice = salePrice ?? price;

    // ✅ Kiểm tra item đã tồn tại chưa (product + variation)
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
        price,
        salePrice,
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
      .populate("items.storeId", "name logoUrl")
      .populate("voucher", "code title discountType discountValue");

    return res.status(200).json(populatedCart);
  } catch (error) {
    console.error("Lỗi addToCart:", error);
    res.status(500).json({ message: "Lỗi server" });
  }
};

// 🟢 Cập nhật số lượng
exports.updateQuantity = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { itemId, quantity } = req.body;

    let cart = await Cart.findOne({ userId });
    if (!cart) return res.status(404).json({ message: "Không tìm thấy giỏ hàng" });

    const item = cart.items.id(itemId);
    if (!item) return res.status(404).json({ message: "Không tìm thấy sản phẩm trong giỏ" });

    item.quantity = quantity;
    const unitPrice = item.salePrice ?? item.price;
    item.subtotal = unitPrice * quantity;

    await cart.save();
    const populatedCart = await Cart.findById(cart._id)
      .populate("items.productId")
      .populate("items.storeId", "name logoUrl")
      .populate("voucher", "code title discountType discountValue");

    return res.status(200).json(populatedCart);
  } catch (error) {
    console.error("Lỗi updateQuantity:", error);
    res.status(500).json({ message: "Lỗi server" });
  }
};

// 🟢 Xóa sản phẩm khỏi giỏ
exports.removeFromCart = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { itemId } = req.params;

    let cart = await Cart.findOne({ userId });
    if (!cart) return res.status(404).json({ message: "Không tìm thấy giỏ hàng" });

    cart.items = cart.items.filter((item) => item._id.toString() !== itemId);

    await cart.save();
    const populatedCart = await Cart.findById(cart._id)
      .populate("items.productId")
      .populate("items.storeId", "name logoUrl")
      .populate("voucher", "code title discountType discountValue");

    return res.status(200).json(populatedCart);
  } catch (error) {
    console.error("Lỗi removeFromCart:", error);
    res.status(500).json({ message: "Lỗi server" });
  }
};
