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

    // convert số để frontend dễ dùng
    const cleanVouchers = vouchers.map(v => ({
      ...v.toObject(),
      discountValue: Number(v.discountValue),
      minOrderValue: Number(v.minOrderValue),
      maxDiscount: v.maxDiscount ? Number(v.maxDiscount) : undefined
    }));

    res.status(200).json(cleanVouchers);
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

// 🟢 Xem thử voucher (chỉ preview, không ghi DB)
exports.previewVoucher = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { code } = req.body;

    const cart = await Cart.findOne({ userId });
    if (!cart) return res.status(404).json({ message: "Không tìm thấy giỏ hàng" });

    const voucher = await Voucher.findOne({ code: code.toUpperCase(), isActive: true });
    if (!voucher) return res.status(404).json({ message: "Voucher không tồn tại" });

    const now = new Date();
    if (voucher.startDate > now || voucher.endDate < now) {
      return res.status(400).json({ message: "Voucher đã hết hạn hoặc chưa bắt đầu" });
    }

    if (cart.subtotal < Number(voucher.minOrderValue)) {
      return res.status(400).json({
        message: `Đơn hàng phải tối thiểu ${Number(voucher.minOrderValue).toLocaleString("vi-VN")}₫`,
      });
    }

    // ✅ Tính thử giảm giá
    let discount = 0;
    if (voucher.discountType === "fixed") {
      discount = Number(voucher.discountValue);
    } else if (voucher.discountType === "percent") {
      discount = (cart.subtotal * Number(voucher.discountValue)) / 100;
      if (voucher.maxDiscount && discount > Number(voucher.maxDiscount)) {
        discount = Number(voucher.maxDiscount);
      }
    }

    res.status(200).json({
      message: "Voucher hợp lệ",
      discount,
      voucher: {
        id: voucher._id,
        code: voucher.code,
        title: voucher.title,
        description: voucher.description,
        minOrderValue: Number(voucher.minOrderValue),
        discountValue: Number(voucher.discountValue),
      },
    });
  } catch (error) {
    console.error("Lỗi previewVoucher:", error);
    res.status(500).json({ message: "Lỗi server" });
  }
};

// 🟢 Áp dụng voucher thật sự (checkout)
exports.applyVoucher = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { code } = req.body;

    const user = await User.findById(userId);
    if (!user) return res.status(403).json({ message: "Người dùng không hợp lệ" });

    const cart = await Cart.findOne({ userId });
    if (!cart) return res.status(404).json({ message: "Không tìm thấy giỏ hàng" });

    const voucher = await Voucher.findOne({ code: code.toUpperCase(), isActive: true });
    if (!voucher) return res.status(404).json({ message: "Voucher không tồn tại" });

    const now = new Date();
    if (voucher.startDate > now || voucher.endDate < now) {
      return res.status(400).json({ message: "Voucher đã hết hạn hoặc chưa bắt đầu" });
    }

    if (voucher.usedCount >= Number(voucher.usageLimit)) {
      return res.status(400).json({ message: "Voucher đã được sử dụng hết" });
    }

    if (cart.subtotal < Number(voucher.minOrderValue)) {
      return res.status(400).json({
        message: `Đơn hàng phải tối thiểu ${Number(voucher.minOrderValue).toLocaleString("vi-VN")}₫`,
      });
    }

    // ✅ Tính giảm giá thật sự
    let discount = 0;
    if (voucher.discountType === "fixed") {
      discount = Number(voucher.discountValue);
    } else if (voucher.discountType === "percent") {
      discount = (cart.subtotal * Number(voucher.discountValue)) / 100;
      if (voucher.maxDiscount && discount > Number(voucher.maxDiscount)) {
        discount = Number(voucher.maxDiscount);
      }
    }

    // ✅ Cập nhật cart
    cart.discount = discount;
    cart.couponCode = voucher.code;
    cart.total = cart.subtotal - discount + cart.shippingFee;
    await cart.save();

    // ✅ Tăng usedCount (chỉ khi checkout)
    voucher.usedCount += 1;
    if (!voucher.usersUsed.includes(userId)) {
      voucher.usersUsed.push(userId);
    }
    await voucher.save();

    res.status(200).json({
      message: "Áp dụng voucher thành công",
      cart,
    });
  } catch (error) {
    console.error("Lỗi applyVoucher:", error);
    res.status(500).json({ message: "Lỗi server" });
  }
};
