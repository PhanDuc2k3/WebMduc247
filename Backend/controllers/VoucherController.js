const Voucher = require("../models/Voucher");
const Cart = require("../models/Cart");
const User = require("../models/Users");

// 🟢 [Buyer] Lấy tất cả voucher khả dụng
exports.getAvailableVouchers = async (req, res) => {
  try {
    const now = new Date();
    const vouchers = await Voucher.find({
      isActive: true,
      startDate: { $lte: now },
      endDate: { $gte: now },
    });

    res.status(200).json(vouchers);
  } catch (error) {
    console.error("Lỗi getAvailableVouchers:", error);
    res.status(500).json({ message: "Lỗi server" });
  }
};

// 🟢 [Admin] Tạo voucher mới
exports.createVoucher = async (req, res) => {
  try {
    const voucher = await Voucher.create(req.body);
    res.status(201).json(voucher);
  } catch (error) {
    console.error("Lỗi createVoucher:", error);
    res.status(500).json({ message: "Lỗi server" });
  }
};

// 🟢 [Admin] Cập nhật voucher
exports.updateVoucher = async (req, res) => {
  try {
    const { id } = req.params;
    const voucher = await Voucher.findByIdAndUpdate(id, req.body, { new: true });
    if (!voucher) return res.status(404).json({ message: "Không tìm thấy voucher" });
    res.status(200).json(voucher);
  } catch (error) {
    console.error("Lỗi updateVoucher:", error);
    res.status(500).json({ message: "Lỗi server" });
  }
};

// 🟢 [Admin] Xóa voucher
exports.deleteVoucher = async (req, res) => {
  try {
    const { id } = req.params;
    const voucher = await Voucher.findByIdAndDelete(id);
    if (!voucher) return res.status(404).json({ message: "Không tìm thấy voucher" });
    res.status(200).json({ message: "Xóa voucher thành công" });
  } catch (error) {
    console.error("Lỗi deleteVoucher:", error);
    res.status(500).json({ message: "Lỗi server" });
  }
};

// 🟢 Áp dụng voucher vào giỏ hàng (mọi role đều dùng được)
exports.applyVoucher = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { voucherId } = req.body;

    // check user có tồn tại
    const user = await User.findById(userId);
    if (!user) {
      return res.status(403).json({ message: "Người dùng không hợp lệ" });
    }

    const voucher = await Voucher.findById(voucherId);
    if (!voucher || !voucher.isActive) {
      return res.status(404).json({ message: "Voucher không khả dụng" });
    }

    const now = new Date();
    if (voucher.startDate > now || voucher.endDate < now) {
      return res.status(400).json({ message: "Voucher đã hết hạn hoặc chưa bắt đầu" });
    }

    if (voucher.usedCount >= voucher.usageLimit) {
      return res.status(400).json({ message: "Voucher đã được sử dụng hết" });
    }

    let cart = await Cart.findOne({ userId });
    if (!cart) return res.status(404).json({ message: "Không tìm thấy giỏ hàng" });

    if (cart.subtotal < voucher.minOrderValue) {
      return res.status(400).json({
        message: `Đơn hàng phải tối thiểu ${voucher.minOrderValue}đ`
      });
    }

    // tính giảm giá
    let discount = 0;
    if (voucher.discountType === "fixed") {
      discount = voucher.discountValue;
    } else if (voucher.discountType === "percent") {
      discount = (cart.subtotal * voucher.discountValue) / 100;
      if (voucher.maxDiscount && discount > voucher.maxDiscount) {
        discount = voucher.maxDiscount;
      }
    }

    cart.discount = discount;
    cart.voucher = voucher._id;
    cart.total = cart.subtotal - discount + cart.shippingFee;
    await cart.save();

    res.status(200).json({
      message: "Áp dụng voucher thành công",
      cart,
    });
  } catch (error) {
    console.error("Lỗi applyVoucher:", error);
    res.status(500).json({ message: "Lỗi server" });
  }
};
