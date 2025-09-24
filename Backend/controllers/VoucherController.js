const Voucher = require("../models/Voucher");
const Cart = require("../models/Cart");
const User = require("../models/Users");

// Lấy tất cả voucher khả dụng, kèm store + category + usagePercent
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
      usagePercent: v.usedCount && v.usageLimit
        ? Math.round((v.usedCount / v.usageLimit) * 100)
        : 0,
      used: v.usersUsed?.length > 0,
    }));

    res.status(200).json(cleanVouchers);
  } catch (error) {
    console.error("Lỗi getAvailableVouchers:", error);
    res.status(500).json({ message: "Lỗi server" });
  }
};

// Tạo voucher
exports.createVoucher = async (req, res) => {
  try {
    const voucher = await Voucher.create(req.body);
    res.status(201).json(voucher);
  } catch (error) {
    console.error("Lỗi createVoucher:", error);
    res.status(500).json({ message: "Lỗi server" });
  }
};

// Cập nhật voucher
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

// Xóa voucher
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

// Preview voucher
exports.previewVoucher = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { code } = req.body;

    // Lấy cart và populate storeId (để có name + category)
    const cart = await Cart.findOne({ userId }).populate("items.storeId", "name category");
    if (!cart) return res.status(404).json({ message: "Không tìm thấy giỏ hàng" });

    // Lấy voucher
    const voucher = await Voucher.findOne({ code: code.toUpperCase(), isActive: true })
      .populate("store", "name category");
    if (!voucher) return res.status(404).json({ message: "Voucher không tồn tại" });

    const now = new Date();
    if (voucher.startDate > now || voucher.endDate < now)
      return res.status(400).json({ message: "Voucher đã hết hạn hoặc chưa bắt đầu" });

    if (cart.subtotal < Number(voucher.minOrderValue))
      return res.status(400).json({
        message: `Đơn hàng phải tối thiểu ${Number(voucher.minOrderValue).toLocaleString("vi-VN")}₫`
      });

    // === DEBUG ===
    // console.log("=== DEBUG PREVIEW VOUCHER ===");
    // console.log("Voucher code:", voucher.code);
    // console.log("Voucher store:", voucher.store);
    // console.log("Voucher categories:", voucher.categories);

    const storesInCart = cart.items
      .map(i => (i.storeId && typeof i.storeId === "object" ? i.storeId : null))
      .filter(Boolean);

    console.log("Stores in cart:", storesInCart);

    // 1️⃣ Check store
    if (voucher.store) {
      const storeMatch = storesInCart.some(s => s._id.toString() === voucher.store._id.toString());
      console.log("Store match:", storeMatch);
      if (!storeMatch) {
        return res.status(400).json({ message: "Voucher không áp dụng cho cửa hàng trong giỏ hàng" });
      }
    }
    // 2️⃣ Check category nếu store null
    else if (voucher.categories?.length) {
      const categoryMatch = storesInCart.some(store =>
        store.category && voucher.categories.includes(store.category)
      );
      console.log("Category match:", categoryMatch);
      if (!categoryMatch) {
        return res.status(400).json({ message: "Voucher không áp dụng cho cửa hàng trong giỏ hàng" });
      }
    }
    // 3️⃣ Nếu store null và categories null → áp dụng cho tất cả

    // Check nếu user đã dùng voucher trước đó
    const userUsed = voucher.usersUsed.map(u => u.toString()).includes(userId);
    console.log("User already used voucher:", userUsed);
    if (userUsed) return res.status(400).json({ message: "Bạn chỉ được sử dụng voucher này 1 lần" });

    // Tính discount
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
        usagePercent: voucher.usedCount && voucher.usageLimit
          ? Math.round((voucher.usedCount / voucher.usageLimit) * 100)
          : 0,
        used: userUsed,
      },
    });

  } catch (error) {
    console.error("Lỗi previewVoucher:", error);
    res.status(500).json({ message: "Lỗi server" });
  }
};





// Apply voucher thật sự
exports.applyVoucher = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { code } = req.body;

    const user = await User.findById(userId);
    if (!user) return res.status(403).json({ message: "Người dùng không hợp lệ" });

    const cart = await Cart.findOne({ userId });
    if (!cart) return res.status(404).json({ message: "Không tìm thấy giỏ hàng" });

    const voucher = await Voucher.findOne({ code: code.toUpperCase(), isActive: true })
      .populate("store", "name category");
    if (!voucher) return res.status(404).json({ message: "Voucher không tồn tại" });

    const now = new Date();
    if (voucher.startDate > now || voucher.endDate < now)
      return res.status(400).json({ message: "Voucher đã hết hạn hoặc chưa bắt đầu" });

    if (voucher.usedCount >= Number(voucher.usageLimit))
      return res.status(400).json({ message: "Voucher đã được sử dụng hết" });

    if (cart.subtotal < Number(voucher.minOrderValue))
      return res.status(400).json({
        message: `Đơn hàng phải tối thiểu ${Number(voucher.minOrderValue).toLocaleString("vi-VN")}₫`
      });

    const storesInCart = cart.items
      .map(i => (typeof i.storeId === "object" ? i.storeId : null))
      .filter(Boolean);

    // 1️⃣ Check store
    if (voucher.store) {
      const storeMatch = storesInCart.some(s => s._id.toString() === voucher.store._id.toString());
      if (!storeMatch) {
        return res.status(400).json({ message: "Voucher không áp dụng cho cửa hàng trong giỏ hàng" });
      }
    }
    // 2️⃣ Check category nếu store null
    else if (voucher.categories?.length) {
      const categoryMatch = storesInCart.some(store => {
        if (!store.category) return false;
        if (Array.isArray(store.category)) {
          return store.category.some(cat => voucher.categories.includes(cat));
        } else {
          return voucher.categories.includes(store.category);
        }
      });
      if (!categoryMatch) {
        return res.status(400).json({ message: "Voucher không áp dụng cho cửa hàng trong giỏ hàng" });
      }
    }

    // Check nếu user đã dùng voucher trước đó
    const userUsed = voucher.usersUsed.map(u => u.toString()).includes(userId);
    if (userUsed) return res.status(400).json({ message: "Bạn chỉ được sử dụng voucher này 1 lần" });

    // Tính discount
    const discount = voucher.discountType === "fixed"
      ? Number(voucher.discountValue)
      : Math.min((cart.subtotal * Number(voucher.discountValue)) / 100, voucher.maxDiscount || Infinity);

    // Cập nhật cart
    cart.discount = discount;
    cart.couponCode = voucher.code;
    cart.total = cart.subtotal - discount + cart.shippingFee;
    await cart.save();

    // Cập nhật voucher
    voucher.usedCount += 1;
    voucher.usersUsed.push(userId);
    await voucher.save();

    res.status(200).json({
      message: "Áp dụng voucher thành công",
      cart
    });

  } catch (error) {
    console.error("Lỗi applyVoucher:", error);
    res.status(500).json({ message: "Lỗi server" });
  }
};