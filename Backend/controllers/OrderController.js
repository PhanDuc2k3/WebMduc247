const Order = require("../models/Order");
const Cart = require("../models/Cart");
const mongoose = require("mongoose");
const Voucher = require("../models/Voucher");
const User = require("../models/Users"); 
// 🟢 Buyer: Tạo đơn hàng từ giỏ hàng
// 🟢 Buyer: Tạo đơn hàng từ giỏ hàng
exports.createOrder = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { shippingAddress, paymentMethod, note, shippingFee = 0, voucherCode } = req.body;

    // Lấy user hiện tại
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: "Người dùng không tồn tại" });

    // Lấy cart
    const cart = await Cart.findOne({ userId }).populate("items.productId");
    if (!cart || cart.items.length === 0)
      return res.status(400).json({ message: "Giỏ hàng trống" });

    // Xử lý voucher
    let discount = 0;
    let voucher = null;

    if (voucherCode) {
      voucher = await Voucher.findOne({ code: voucherCode.toUpperCase(), isActive: true });
      if (!voucher) return res.status(400).json({ message: "Voucher không hợp lệ" });

      const now = new Date();
      if (voucher.startDate > now || voucher.endDate < now)
        return res.status(400).json({ message: "Voucher chưa bắt đầu hoặc đã hết hạn" });

      if (cart.subtotal < voucher.minOrderValue)
        return res.status(400).json({ message: `Đơn hàng tối thiểu ${voucher.minOrderValue}₫` });

      discount = voucher.discountType === "fixed"
        ? voucher.discountValue
        : Math.min((cart.subtotal * voucher.discountValue) / 100, voucher.maxDiscount || Infinity);

      // Update voucher usage
      voucher.usedCount += 1;
      voucher.usersUsed.push(userId);
      await voucher.save();
    }

    const total = cart.subtotal - discount + shippingFee;
    const orderCode = "ORD-" + Date.now();

    const order = new Order({
      orderCode,
      userId,

      // Thêm userInfo
      userInfo: {
        fullName: user.fullName,
        email: user.email,
        phone: user.phone,
        role: user.role,
        avatarUrl: user.avatarUrl
      },

      items: cart.items.map(item => ({
        productId: item.productId._id,
        storeId: item.storeId,
        name: item.name,
        imageUrl: item.imageUrl,
        price: item.price,
        salePrice: item.salePrice,
        quantity: item.quantity,
        variation: item.variation,
        subtotal: item.subtotal,
      })),

      shippingAddress: {
        fullName: shippingAddress.fullName,
        phone: shippingAddress.phone,
        address: shippingAddress.address,
      },

      shippingInfo: {
        method: shippingFee === 50000 ? "Giao hàng nhanh" : "Giao hàng tiêu chuẩn",
        estimatedDelivery: new Date(Date.now() + (shippingFee === 50000 ? 1 : 3) * 24*60*60*1000),
      },

      paymentInfo: {
        method: (paymentMethod || "COD").toUpperCase(),
        status: "pending",
      },

      statusHistory: [{ status: "pending", note: "Đơn hàng được tạo", timestamp: new Date() }],
      subtotal: cart.subtotal,
      shippingFee,
      discount,
      total,
      voucher: voucher ? voucher._id : null,
      voucherCode: voucher ? voucher.code : "",
      note: note || "",
    });

    await order.save();

    // Clear cart
    cart.items = [];
    cart.subtotal = cart.total = 0;
    await cart.save();

    res.status(201).json({ message: "Tạo đơn hàng thành công", order });
  } catch (error) {
    console.error("🔥 Lỗi createOrder:", error);
    res.status(500).json({ message: error.message });
  }
};


// 🟢 Buyer: Lấy danh sách đơn hàng của user
exports.getMyOrders = async (req, res) => {
  try {
    const userId = req.user.userId;
    const orders = await Order.find({ userId }).sort({ createdAt: -1 });
    res.status(200).json(orders);
  } catch (error) {
    console.error("Lỗi getMyOrders:", error);
    res.status(500).json({ message: "Lỗi server" });
  }
};

// 🟢 Admin: Lấy tất cả đơn hàng
exports.getAllOrders = async (req, res) => {
  try {
    const orders = await Order.find().populate("userId", "fullName email");
    res.status(200).json(orders);
  } catch (error) {
    console.error("Lỗi getAllOrders:", error);
    res.status(500).json({ message: "Lỗi server" });
  }
};

// 🟢 Admin/Seller: Cập nhật trạng thái đơn hàng
exports.updateOrderStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, note } = req.body;

    if (
      !["pending", "confirmed", "packed", "shipped", "delivered", "cancelled"].includes(
        status
      )
    ) {
      return res.status(400).json({ message: "Trạng thái không hợp lệ" });
    }

    const order = await Order.findById(id);
    if (!order) return res.status(404).json({ message: "Không tìm thấy đơn hàng" });

    order.statusHistory.push({
      status,
      note,
      timestamp: new Date(),
    });

    await order.save();

    res.status(200).json({
      message: "Cập nhật trạng thái thành công",
      order,
    });
  } catch (error) {
    console.error("Lỗi updateOrderStatus:", error);
    res.status(500).json({ message: "Lỗi server" });
  }
};

// 🟢 Buyer/Admin: Xem chi tiết đơn hàng
exports.getOrderById = async (req, res) => {
  try {
    const { id } = req.params;
    const order = await Order.findById(id).populate("userId", "fullName email phone");
    if (!order) return res.status(404).json({ message: "Không tìm thấy đơn hàng" });

    res.status(200).json(order);
  } catch (error) {
    console.error("Lỗi getOrderById:", error);
    res.status(500).json({ message: "Lỗi server" });
  }
};

// 🟢 Seller: Lấy đơn hàng của cửa hàng mình
exports.getOrdersBySeller = async (req, res) => {
  try {
    const sellerId = req.user.userId;

    // Lấy storeId của seller
    const seller = await User.findById(sellerId).populate("store");
    if (!seller || !seller.store) {
      return res.status(400).json({ message: "Bạn chưa có cửa hàng" });
    }
    const storeId = seller.store._id;

    // Tìm các order có chứa sản phẩm thuộc store này
    const orders = await Order.find({ "items.storeId": storeId })
      .sort({ createdAt: -1 })
      .populate("userId", "fullName email phone");

    res.status(200).json(orders);
  } catch (error) {
    console.error("Lỗi getOrdersBySeller:", error);
    res.status(500).json({ message: "Lỗi server" });
  }
};
