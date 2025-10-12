const Order = require("../models/Order");
const Cart = require("../models/Cart");
const mongoose = require("mongoose");
const Voucher = require("../models/Voucher");
const User = require("../models/Users"); 
const Product = require("../models/Product");

exports.createOrder = async (req, res) => {
  try {
    const userId = req.user.userId;
    const {
      shippingAddress,
      paymentMethod,
      note,
      shippingFee = 0,
      voucherCode,
      selectedItems,
    } = req.body;

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: "Người dùng không tồn tại" });

    const cart = await Cart.findOne({ userId }).populate("items.productId");
    if (!cart || cart.items.length === 0)
      return res.status(400).json({ message: "Giỏ hàng trống" });

    // Lọc các sản phẩm được chọn
    let filteredItems = cart.items;
    if (selectedItems && Array.isArray(selectedItems)) {
      filteredItems = cart.items.filter(item => selectedItems.includes(item._id.toString()));
    }
    if (filteredItems.length === 0)
      return res.status(400).json({ message: "Không có sản phẩm nào được chọn" });

    // Voucher
    let discount = 0;
    let voucher = null;
    if (voucherCode) {
      voucher = await Voucher.findOne({ code: voucherCode.toUpperCase(), isActive: true });
      if (!voucher) return res.status(400).json({ message: "Voucher không hợp lệ" });

      const now = new Date();
      if (voucher.startDate > now || voucher.endDate < now)
        return res.status(400).json({ message: "Voucher chưa bắt đầu hoặc đã hết hạn" });

      const subtotalFiltered = filteredItems.reduce((sum, item) => sum + item.subtotal, 0);
      if (subtotalFiltered < voucher.minOrderValue)
        return res.status(400).json({ message: `Đơn hàng tối thiểu ${voucher.minOrderValue}₫` });

      discount = voucher.discountType === "fixed"
        ? voucher.discountValue
        : Math.min((subtotalFiltered * voucher.discountValue) / 100, voucher.maxDiscount || Infinity);

      voucher.usedCount = (voucher.usedCount || 0) + 1;
      voucher.usersUsed = voucher.usersUsed || [];
      voucher.usersUsed.push(userId);
      await voucher.save();
    }

    // Fallback shippingAddress
    const sa = shippingAddress || {};
    const shipping = {
      fullName: sa.fullName || user.fullName,
      phone: sa.phone || user.phone,
      address: sa.address || `${sa.street || ""}, ${sa.city || ""}`.trim(),
    };
    if (!shipping.fullName || !shipping.phone || !shipping.address) {
      return res.status(400).json({ message: "Vui lòng cung cấp đầy đủ thông tin giao hàng" });
    }

    const subtotal = filteredItems.reduce((sum, item) => sum + item.subtotal, 0);
    const total = subtotal - discount + shippingFee;
    const orderCode = "ORD-" + Date.now();

    const order = new Order({
      orderCode,
      userId,
      userInfo: {
        fullName: user.fullName,
        email: user.email,
        phone: user.phone,
        role: user.role,
        avatarUrl: user.avatarUrl,
      },
      items: filteredItems.map(item => ({
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
      shippingAddress: shipping,
      shippingInfo: {
        method: shippingFee === 50000 ? "Giao hàng nhanh" : "Giao hàng tiêu chuẩn",
        estimatedDelivery: new Date(Date.now() + (shippingFee === 50000 ? 1 : 3) * 24*60*60*1000),
      },
      paymentInfo: {
        method: (paymentMethod || "COD").toUpperCase(),
        status: "pending",
      },
      statusHistory: [{ status: "pending", note: "Đơn hàng được tạo", timestamp: new Date() }],
      subtotal,
      shippingFee,
      discount,
      total,
      voucher: voucher ? voucher._id : null,
      voucherCode: voucher ? voucher.code : "",
      note: note || "",
    });

    await order.save();

    // Xóa các item đã đặt ra khỏi cart
    cart.items = cart.items.filter(item => !filteredItems.find(fi => fi._id.toString() === item._id.toString()));
    cart.subtotal = cart.items.reduce((sum, item) => sum + item.subtotal, 0);
    cart.total = cart.subtotal;
    await cart.save();

    res.status(201).json({ message: "Tạo đơn hàng thành công", order, cart });

  } catch (error) {
    console.error("Lỗi createOrder:", error);
    res.status(500).json({ message: error.message });
  }
};
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

exports.getAllOrders = async (req, res) => {
  try {
    const orders = await Order.find().populate("userId", "fullName email");
    res.status(200).json(orders);
  } catch (error) {
    console.error("Lỗi getAllOrders:", error);
    res.status(500).json({ message: "Lỗi server" });
  }
};

exports.updateOrderStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, note } = req.body;

    // Kiểm tra trạng thái hợp lệ
    const validStatuses = ["pending", "confirmed", "packed", "shipped", "delivered", "cancelled"];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ message: "Trạng thái không hợp lệ" });
    }

    const order = await Order.findById(id);
    if (!order) return res.status(404).json({ message: "Không tìm thấy đơn hàng" });

    // Thêm lịch sử trạng thái
    order.statusHistory.push({ status, note, timestamp: new Date() });

    // ✅ Nếu trạng thái là delivered, tăng soldCount cho tất cả sản phẩm
    if (status === "delivered") {
      const bulkOps = order.items.map(item => ({
        updateOne: {
          filter: { _id: item.productId },
          update: { $inc: { soldCount: item.quantity } }
        }
      }));

      if (bulkOps.length > 0) {
        await Product.bulkWrite(bulkOps);
      }
    }

    await order.save();

    res.status(200).json({ message: "Cập nhật trạng thái thành công", order });
  } catch (error) {
    console.error("Lỗi updateOrderStatus:", error);
    res.status(500).json({ message: "Lỗi server" });
  }
};

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

exports.getOrdersBySeller = async (req, res) => {
  try {
    const sellerId = req.user.userId;
    const seller = await User.findById(sellerId).populate("store");
    if (!seller || !seller.store) {
      return res.status(400).json({ message: "Bạn chưa có cửa hàng" });
    }
    const storeId = seller.store._id;

    const orders = await Order.find({ "items.storeId": storeId })
      .sort({ createdAt: -1 })
      .populate("userId", "fullName email phone");

    res.status(200).json(orders);
  } catch (error) {
    console.error("Lỗi getOrdersBySeller:", error);
    res.status(500).json({ message: "Lỗi server" });
  }
};

exports.getOrderByCode = async (req, res) => {
  try {
    const { orderCode } = req.params;
    const order = await Order.findOne({ orderCode }).populate("userId", "fullName email phone");
    if (!order) return res.status(404).json({ message: "Không tìm thấy đơn hàng" });
    res.status(200).json(order);
  } catch (error) {
    console.error("Lỗi getOrderByCode:", error);
    res.status(500).json({ message: "Lỗi server" });
  }
};

exports.markOrderPaid = async (req, res) => {
  try {
    const orderId = req.params.id;
    const order = await Order.findById(orderId);
    if (!order) return res.status(404).json({ message: "Order not found" });

    order.paymentInfo.status = "paid";
    order.paymentInfo.paymentId = req.body.paymentId || "ONLINE_PAYMENT";
    order.statusHistory.push({ status: "paid", note: "Thanh toán online thành công", timestamp: new Date() });

    await order.save();

    return res.json({ message: "Order marked as paid", orderId: order._id, paymentInfo: order.paymentInfo });
  } catch (err) {
    console.error("Lỗi markOrderPaid:", err);
    return res.status(500).json({ message: "Server error", details: err.message });
  }
};
