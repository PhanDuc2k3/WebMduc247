const orderService = require('../services/OrderService');

exports.createOrder = async (req, res) => {
  try {
    const userId = req.user.userId;
    const result = await orderService.createOrder(userId, req.body);
    res.status(201).json({ 
      message: "Tạo đơn hàng thành công", 
      order: result.order, 
      cart: result.cart 
    });
  } catch (error) {
    console.error("Lỗi createOrder:", error);
    const statusCode = error.message.includes("Không tìm thấy") ? 404 : 
                      error.message.includes("Giỏ hàng") ? 400 :
                      error.message.includes("Voucher") ? 400 : 500;
    res.status(statusCode).json({ message: error.message });
  }
};

exports.getMyOrders = async (req, res) => {
  try {
    const userId = req.user.userId;
    const orders = await orderService.getMyOrders(userId);
    res.status(200).json(orders);
  } catch (error) {
    console.error("Lỗi getMyOrders:", error);
    res.status(500).json({ message: "Lỗi server" });
  }
};

exports.getAllOrders = async (req, res) => {
  try {
    const orders = await orderService.getAllOrders();
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
    const order = await orderService.updateOrderStatus(id, status, note);
    res.status(200).json({ message: "Cập nhật trạng thái thành công", order });
  } catch (error) {
    console.error("Lỗi updateOrderStatus:", error);
    const statusCode = error.message.includes("Không tìm thấy") ? 404 : 
                      error.message.includes("không hợp lệ") ? 400 : 500;
    res.status(statusCode).json({ message: error.message || "Lỗi server" });
  }
};

exports.confirmDelivery = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.userId;
    const order = await orderService.confirmDelivery(id, userId);
    res.status(200).json({ message: "Xác nhận nhận hàng thành công", order });
  } catch (error) {
    console.error("❌ Lỗi confirmDelivery:", error);
    const statusCode = error.message.includes("Không tìm thấy") ? 404 : 
                      error.message.includes("quyền") ? 403 :
                      error.message.includes("Không thể xác nhận") ? 400 : 500;
    res.status(statusCode).json({ 
      message: error.message || "Lỗi server",
      error: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
};

exports.getOrderById = async (req, res) => {
  try {
    const { id } = req.params;
    const order = await orderService.getOrderById(id);
    res.status(200).json(order);
  } catch (error) {
    console.error("Lỗi getOrderById:", error);
    const statusCode = error.message.includes("Không tìm thấy") ? 404 : 500;
    res.status(statusCode).json({ message: error.message || "Lỗi server" });
  }
};

exports.getOrdersBySeller = async (req, res) => {
  try {
    const sellerId = req.user.userId;
    const orders = await orderService.getOrdersBySeller(sellerId);
    res.status(200).json(orders);
  } catch (error) {
    console.error("Lỗi getOrdersBySeller:", error);
    const statusCode = error.message.includes("chưa có cửa hàng") ? 400 : 500;
    res.status(statusCode).json({ message: error.message || "Lỗi server" });
  }
};

exports.getOrderByCode = async (req, res) => {
  try {
    const { orderCode } = req.params;
    const order = await orderService.getOrderByCode(orderCode);
    res.status(200).json(order);
  } catch (error) {
    console.error("Lỗi getOrderByCode:", error);
    const statusCode = error.message.includes("Không tìm thấy") ? 404 : 500;
    res.status(statusCode).json({ message: error.message || "Lỗi server" });
  }
};

exports.markOrderPaid = async (req, res) => {
  try {
    const orderId = req.params.id;
    const result = await orderService.markOrderPaid(orderId, req.body.paymentId);
    return res.json({ message: "Order marked as paid", ...result });
  } catch (err) {
    console.error("Lỗi markOrderPaid:", err);
    const statusCode = err.message.includes("not found") ? 404 : 500;
    return res.status(statusCode).json({ message: err.message || "Server error", details: err.message });
  }
};

exports.requestReturn = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.userId;
    const { reason } = req.body;
    const order = await orderService.requestReturn(id, userId, reason);
    res.status(200).json({ message: "Yêu cầu trả lại hàng đã được gửi", order });
  } catch (error) {
    console.error("Lỗi requestReturn:", error);
    const statusCode = error.message.includes("Không tìm thấy") ? 404 : 
                      error.message.includes("quyền") ? 403 :
                      error.message.includes("quá 3 ngày") ? 400 :
                      error.message.includes("đã có yêu cầu") ? 400 : 500;
    res.status(statusCode).json({ message: error.message || "Lỗi server" });
  }
};

exports.confirmReturnReceived = async (req, res) => {
  try {
    const { id } = req.params;
    const sellerId = req.user.userId;
    const order = await orderService.confirmReturnReceived(id, sellerId);
    res.status(200).json({ 
      message: "Đã xác nhận thu hồi sản phẩm. Tiền đã được hoàn lại cho người mua.", 
      order 
    });
  } catch (error) {
    console.error("Lỗi confirmReturnReceived:", error);
    const statusCode = error.message.includes("Không tìm thấy") ? 404 : 
                      error.message.includes("quyền") ? 403 :
                      error.message.includes("chưa có cửa hàng") ? 400 : 500;
    res.status(statusCode).json({ message: error.message || "Lỗi server" });
  }
};

exports.processReturn = async (req, res) => {
  try {
    const { id } = req.params;
    const processorId = req.user.userId;
    const { action, note } = req.body; // action: "approved" hoặc "rejected"
    const order = await orderService.processReturn(id, processorId, action, note);
    res.status(200).json({ 
      message: action === "approved" ? "Đã phê duyệt trả lại hàng" : "Đã từ chối yêu cầu trả lại hàng", 
      order 
    });
  } catch (error) {
    console.error("Lỗi processReturn:", error);
    const statusCode = error.message.includes("Không tìm thấy") ? 404 : 
                      error.message.includes("không hợp lệ") ? 400 : 500;
    res.status(statusCode).json({ message: error.message || "Lỗi server" });
  }
};

exports.rejectReturn = async (req, res) => {
  try {
    const { id } = req.params;
    const sellerId = req.user.userId;
    const { reason } = req.body;
    const order = await orderService.rejectReturn(id, sellerId, reason);
    res.status(200).json({ 
      message: "Đã từ chối yêu cầu trả lại hàng", 
      order 
    });
  } catch (error) {
    console.error("Lỗi rejectReturn:", error);
    const statusCode = error.message.includes("Không tìm thấy") ? 404 : 
                      error.message.includes("quyền") ? 403 :
                      error.message.includes("chưa có cửa hàng") ? 400 : 500;
    res.status(statusCode).json({ message: error.message || "Lỗi server" });
  }
};

exports.cancelOrder = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.userId;
    const { reason } = req.body;
    const order = await orderService.cancelOrder(id, userId, reason);
    res.status(200).json({ message: "Đơn hàng đã được hủy thành công", order });
  } catch (error) {
    console.error("Lỗi cancelOrder:", error);
    const statusCode = error.message.includes("Không tìm thấy") ? 404 : 
                      error.message.includes("quyền") ? 403 :
                      error.message.includes("Không thể hủy") ? 400 : 500;
    res.status(statusCode).json({ message: error.message || "Lỗi server" });
  }
};