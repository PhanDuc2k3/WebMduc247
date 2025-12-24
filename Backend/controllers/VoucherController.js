const voucherService = require('../services/VoucherService');

exports.getAvailableVouchers = async (req, res) => {
  try {
    let userId = req.user?.userId;
    if (!userId) {
      userId = voucherService.getUserIdFromToken(req.header('Authorization'));
    }
    
    const vouchers = await voucherService.getAvailableVouchers(userId);
    res.status(200).json(vouchers);
  } catch (error) {
    console.error("Get available vouchers error:", error);
    res.status(500).json({ message: "Lỗi server" });
  }
};

exports.createVoucher = async (req, res) => {
  try {
    const userId = req.user?.userId;
    const userRole = req.user?.role;
    
    // Log để debug
    console.log(`📝 Tạo voucher - userId: ${userId}, role: ${userRole}`);
    console.log(`📝 Request body:`, JSON.stringify(req.body, null, 2));
    
    // Nếu không có userRole, kiểm tra xem có phải seller không (dựa vào có store)
    let finalRole = userRole;
    if (!finalRole && userId) {
      const Store = require('../models/Store');
      const sellerStore = await Store.findOne({ owner: userId });
      if (sellerStore) {
        finalRole = "seller";
        console.log(`🔍 Tự động detect role: seller (có cửa hàng)`);
      } else {
        finalRole = "admin";
        console.log(`🔍 Tự động detect role: admin (không có cửa hàng)`);
      }
    } else if (!finalRole) {
      finalRole = "admin";
    }
    
    const voucher = await voucherService.createVoucher(userId, finalRole, req.body);
    res.status(201).json(voucher);
  } catch (error) {
    console.error("Create voucher error:", error);
    const statusCode = error.message.includes("Không tìm thấy") ? 404 : 
                      error.message.includes("chỉ có thể") ? 403 : 500;
    res.status(statusCode).json({ 
      message: error.message || "Lỗi server", 
      error: error.message,
      details: error.errors 
    });
  }
};

exports.updateVoucher = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user?.userId;
    const userRole = req.user?.role;
    const voucher = await voucherService.updateVoucher(id, req.body, userId, userRole);
    res.status(200).json(voucher);
  } catch (error) {
    const statusCode = error.message.includes("Không tìm thấy") ? 404 : 
                      error.message.includes("chỉ có thể") ? 403 : 500;
    res.status(statusCode).json({ message: error.message || "Lỗi server" });
  }
};

exports.deleteVoucher = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user?.userId;
    const userRole = req.user?.role;
    await voucherService.deleteVoucher(id, userId, userRole);
    res.status(200).json({ message: "Xóa voucher thành công" });
  } catch (error) {
    const statusCode = error.message.includes("Không tìm thấy") ? 404 : 
                      error.message.includes("chỉ có thể") ? 403 : 500;
    res.status(statusCode).json({ message: error.message || "Lỗi server" });
  }
};

exports.cleanupVoucherUsersUsed = async (req, res) => {
  try {
    const userRole = req.user?.role;
    if (userRole !== "admin") {
      return res.status(403).json({ message: "Chỉ admin mới được chạy cleanup" });
    }

    console.log("🧹 Bắt đầu cleanup duplicate userId trong usersUsed array...");
    const result = await voucherService.cleanupVoucherUsersUsed();
    console.log(`✅ Hoàn tất cleanup! Đã cleanup ${result.totalCleaned} voucher, xóa ${result.totalRemoved} duplicate entries`);

    res.status(200).json({
      message: "Cleanup thành công",
      ...result
    });
  } catch (error) {
    console.error("❌ Lỗi cleanup:", error);
    res.status(500).json({ message: "Lỗi server", error: error.message });
  }
};

exports.getAllVouchers = async (req, res) => {
  try {
    const vouchers = await voucherService.getAllVouchers();
    res.status(200).json(vouchers);
  } catch (error) {
    console.error("Get all vouchers error:", error);
    res.status(500).json({ message: "Lỗi server", error: error.message });
  }
};

exports.toggleVoucherStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const voucher = await voucherService.toggleVoucherStatus(id);
    res.status(200).json({
      message: voucher.isActive ? "Đã mở khóa voucher thành công" : "Đã khóa voucher thành công",
      voucher: voucher,
    });
  } catch (error) {
    console.error("Toggle voucher status error:", error);
    const statusCode = error.message.includes("Không tìm thấy") ? 404 : 500;
    res.status(statusCode).json({ message: error.message || "Lỗi server" });
  }
};

exports.previewVoucher = async (req, res) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({ message: "Cần đăng nhập để sử dụng voucher" });
    }
    const { code, subtotal, shippingFee } = req.body;
    const result = await voucherService.previewVoucher(userId, code, subtotal, shippingFee);
    res.status(200).json({
      message: "Voucher hợp lệ",
      ...result
    });
  } catch (error) {
    const statusCode = error.message.includes("Cần đăng nhập") ? 401 : 
                      error.message.includes("Không tìm thấy") ? 404 : 400;
    res.status(statusCode).json({ message: error.message || "Lỗi server" });
  }
};

exports.applyVoucher = async (req, res) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({ message: "Cần đăng nhập để sử dụng voucher" });
    }
    const { code, orderSubtotal } = req.body;
    const result = await voucherService.applyVoucher(userId, code, orderSubtotal);
    res.status(200).json({
      message: "Voucher hợp lệ",
      ...result
    });
  } catch (error) {
    const statusCode = error.message.includes("Cần đăng nhập") ? 401 : 
                      error.message.includes("Không tìm thấy") ? 404 : 400;
    res.status(statusCode).json({ message: error.message || "Lỗi server" });
  }
};

exports.getAvailableVouchersForCheckout = async (req, res) => {
  try {
    const userId = req.user?.userId;
    const { subtotal, selectedItems } = req.body;
    const result = await voucherService.getAvailableVouchersForCheckout(userId, subtotal, selectedItems);
    res.status(200).json(result);
  } catch (error) {
    console.error("Get available vouchers for checkout error:", error);
    res.status(500).json({ message: "Lỗi server", error: error.message });
  }
};

exports.getVouchersBySellerStore = async (req, res) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({ message: "Cần đăng nhập để xem voucher" });
    }
    const vouchers = await voucherService.getVouchersBySellerStore(userId);
    res.status(200).json(vouchers);
  } catch (error) {
    console.error("Get vouchers by seller store error:", error);
    res.status(500).json({ message: error.message || "Lỗi server" });
  }
};