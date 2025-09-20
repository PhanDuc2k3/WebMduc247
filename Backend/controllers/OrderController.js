const Order = require("../models/Order");
const Cart = require("../models/Cart");
const mongoose = require("mongoose");

// 🟢 Buyer: Tạo đơn hàng từ giỏ hàng
exports.createOrder = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { shippingAddress, paymentMethod, note } = req.body;

    // Lấy giỏ hàng
    const cart = await Cart.findOne({ userId }).populate("items.productId");
    if (!cart || cart.items.length === 0) {
      return res.status(400).json({ message: "Giỏ hàng trống" });
    }

    // Tạo mã đơn hàng (ORD-xxx)
    const orderCode = "ORD-" + new Date().getTime();

    const order = new Order({
      orderCode,
      userId,
      items: cart.items.map((item) => ({
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
      shippingAddress,
      shippingInfo: {
        method: "Giao hàng nhanh",
        estimatedDelivery: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000), // +3 ngày
      },
      paymentInfo: {
        method: paymentMethod || "COD",
        status: "pending",
      },
      statusHistory: [
        { status: "pending", note: "Đơn hàng được tạo", timestamp: new Date() },
      ],
      subtotal: cart.subtotal,
      shippingFee: cart.shippingFee,
      discount: cart.discount,
      total: cart.total,
      note,
    });

    await order.save();

    // Xóa giỏ hàng sau khi đặt đơn
    cart.items = [];
    cart.subtotal = 0;
    cart.discount = 0;
    cart.total = 0;
    await cart.save();

    res.status(201).json({
      message: "Tạo đơn hàng thành công",
      order,
    });
  } catch (error) {
    console.error("Lỗi createOrder:", error);
    res.status(500).json({ message: "Lỗi server" });
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
