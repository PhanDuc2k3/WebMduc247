const Voucher = require("../models/Voucher");
const Cart = require("../models/Cart");
const User = require("../models/Users");

exports.getAvailableVouchers = async (req, res) => {
  try {
    const now = new Date();
    const vouchers = await Voucher.find({
      isActive: true,
      startDate: { $lte: now },
      endDate: { $gte: now },
    }).populate("store", "name category");

    const cleanVouchers = vouchers.map(v => ({
      ...v.toObject(),
      discountValue: Number(v.discountValue),
      minOrderValue: Number(v.minOrderValue),
      maxDiscount: v.maxDiscount ? Number(v.maxDiscount) : undefined,
      storeName: v.store?.name || "Tất cả",
      storeCategory: v.store?.category || "Tất cả",
      usagePercent: v.usedCount && v.usageLimit ? Math.round((v.usedCount / v.usageLimit) * 100) : 0,
      used: v.usersUsed?.length > 0,
    }));

    res.status(200).json(cleanVouchers);
  } catch (error) {
    res.status(500).json({ message: "Lỗi server" });
  }
};

exports.createVoucher = async (req, res) => {
  try {
    const voucher = await Voucher.create(req.body);
    res.status(201).json(voucher);
  } catch (error) {
    res.status(500).json({ message: "Lỗi server" });
  }
};

exports.updateVoucher = async (req, res) => {
  try {
    const { id } = req.params;
    const voucher = await Voucher.findByIdAndUpdate(id, req.body, { new: true });
    if (!voucher) return res.status(404).json({ message: "Không tìm thấy voucher" });
    res.status(200).json(voucher);
  } catch (error) {
    res.status(500).json({ message: "Lỗi server" });
  }
};

exports.deleteVoucher = async (req, res) => {
  try {
    const { id } = req.params;
    const voucher = await Voucher.findByIdAndDelete(id);
    if (!voucher) return res.status(404).json({ message: "Không tìm thấy voucher" });
    res.status(200).json({ message: "Xóa voucher thành công" });
  } catch (error) {
    res.status(500).json({ message: "Lỗi server" });
  }
};

exports.previewVoucher = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { code } = req.body;
    const cart = await Cart.findOne({ userId }).populate("items.storeId", "name category");
    if (!cart) return res.status(404).json({ message: "Không tìm thấy giỏ hàng" });

    const voucher = await Voucher.findOne({ code: code.toUpperCase(), isActive: true }).populate("store", "name category");
    if (!voucher) return res.status(404).json({ message: "Voucher không tồn tại" });

    const now = new Date();
    if (voucher.startDate > now || voucher.endDate < now) return res.status(400).json({ message: "Voucher đã hết hạn hoặc chưa bắt đầu" });
    if (cart.subtotal < Number(voucher.minOrderValue)) return res.status(400).json({ message: `Đơn hàng phải tối thiểu ${Number(voucher.minOrderValue).toLocaleString("vi-VN")}₫` });

    const storesInCart = cart.items.map(i => (i.storeId && typeof i.storeId === "object" ? i.storeId : null)).filter(Boolean);

    if (voucher.store) {
      const storeMatch = storesInCart.some(s => s._id.toString() === voucher.store._id.toString());
      if (!storeMatch) return res.status(400).json({ message: "Voucher không áp dụng cho cửa hàng trong giỏ hàng" });
    } else if (voucher.categories?.length) {
      const categoryMatch = storesInCart.some(store => store.category && voucher.categories.includes(store.category));
      if (!categoryMatch) return res.status(400).json({ message: "Voucher không áp dụng cho cửa hàng trong giỏ hàng" });
    }

    const userUsed = voucher.usersUsed.map(u => u.toString()).includes(userId);
    if (userUsed) return res.status(400).json({ message: "Bạn chỉ được sử dụng voucher này 1 lần" });

    const discount = voucher.discountType === "fixed"
      ? Number(voucher.discountValue)
      : Math.min((cart.subtotal * Number(voucher.discountValue)) / 100, voucher.maxDiscount || Infinity);

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
        storeName: voucher.store?.name || "Tất cả",
        storeCategory: voucher.store?.category || "Tất cả",
        usagePercent: voucher.usedCount && voucher.usageLimit ? Math.round((voucher.usedCount / voucher.usageLimit) * 100) : 0,
        used: userUsed,
      },
    });
  } catch (error) {
    res.status(500).json({ message: "Lỗi server" });
  }
};

exports.applyVoucher = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { code, orderSubtotal } = req.body;
    const user = await User.findById(userId);
    if (!user) return res.status(403).json({ message: "Người dùng không hợp lệ" });

    const voucher = await Voucher.findOne({ code: code.toUpperCase(), isActive: true }).populate("store", "name category");
    if (!voucher) return res.status(404).json({ message: "Voucher không tồn tại" });

    const now = new Date();
    if (voucher.startDate > now || voucher.endDate < now) return res.status(400).json({ message: "Voucher đã hết hạn hoặc chưa bắt đầu" });
    if (voucher.usedCount >= Number(voucher.usageLimit)) return res.status(400).json({ message: "Voucher đã được sử dụng hết" });
    if ((Number(orderSubtotal) || 0) < Number(voucher.minOrderValue)) return res.status(400).json({ message: `Đơn hàng phải tối thiểu ${Number(voucher.minOrderValue).toLocaleString("vi-VN")}₫` });

    const userUsed = voucher.usersUsed.map(u => u.toString()).includes(userId);
    if (userUsed) return res.status(400).json({ message: "Bạn chỉ được sử dụng voucher này 1 lần" });

    const subtotal = Number(orderSubtotal) || 0;
    const discount = voucher.discountType === "fixed" ? Number(voucher.discountValue) || 0 : Math.min(subtotal * Number(voucher.discountValue) / 100, Number(voucher.maxDiscount) || Infinity);

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
        storeName: voucher.store?.name || "Tất cả",
        storeCategory: voucher.store?.category || "Tất cả",
        usagePercent: voucher.usedCount && voucher.usageLimit ? Math.round((voucher.usedCount / voucher.usageLimit) * 100) : 0,
        used: userUsed,
      },
    });
  } catch (error) {
    res.status(500).json({ message: "Lỗi server" });
  }
};
