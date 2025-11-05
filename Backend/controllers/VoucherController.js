const Voucher = require("../models/Voucher");
const Cart = require("../models/Cart");
const User = require("../models/Users");
const mongoose = require("mongoose");

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
    console.error("Create voucher error:", error);
    res.status(500).json({ 
      message: "Lỗi server", 
      error: error.message,
      details: error.errors 
    });
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
    const { code, subtotal: requestSubtotal } = req.body;
    const cart = await Cart.findOne({ userId }).populate("items.storeId", "name category");
    if (!cart) return res.status(404).json({ message: "Không tìm thấy giỏ hàng" });

    const voucher = await Voucher.findOne({ code: code.toUpperCase(), isActive: true }).populate("store", "name category");
    if (!voucher) return res.status(404).json({ message: "Voucher không tồn tại" });

    const now = new Date();
    if (voucher.startDate > now || voucher.endDate < now) return res.status(400).json({ message: "Voucher đã hết hạn hoặc chưa bắt đầu" });
    
    // Sử dụng subtotal từ request (của selectedItems) nếu có, nếu không thì dùng cart.subtotal
    const subtotalToUse = requestSubtotal !== undefined ? Number(requestSubtotal) : cart.subtotal;
    if (subtotalToUse < Number(voucher.minOrderValue)) return res.status(400).json({ message: `Đơn hàng phải tối thiểu ${Number(voucher.minOrderValue).toLocaleString("vi-VN")}₫` });

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

    const voucherType = voucher.voucherType || "product";
    let discount = 0;

    if (voucherType === "freeship") {
      // Voucher freeship - giảm giá phí ship
      const requestShippingFee = req.body.shippingFee || 30000; // Mặc định 30k nếu không có
      discount = voucher.discountType === "fixed"
        ? Math.min(voucher.discountValue, requestShippingFee)
        : Math.min((requestShippingFee * voucher.discountValue) / 100, voucher.maxDiscount || requestShippingFee, requestShippingFee);
    } else {
      // Voucher product - giảm giá sản phẩm
      // QUAN TRỌNG: Discount chỉ được áp dụng cho subtotal, không bao giờ vượt quá subtotal
      let calculatedDiscount = 0;
      if (voucher.discountType === "fixed") {
        calculatedDiscount = Number(voucher.discountValue);
      } else {
        calculatedDiscount = (subtotalToUse * Number(voucher.discountValue)) / 100;
        if (voucher.maxDiscount) {
          calculatedDiscount = Math.min(calculatedDiscount, voucher.maxDiscount);
        }
      }
      // Giới hạn discount không vượt quá subtotal (của selectedItems)
      discount = Math.min(calculatedDiscount, subtotalToUse);
    }

    res.status(200).json({
      message: "Voucher hợp lệ",
      discount,
      voucher: {
        id: voucher._id,
        code: voucher.code,
        title: voucher.title,
        description: voucher.description,
        voucherType: voucherType,
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

exports.getAvailableVouchersForCheckout = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { subtotal: requestSubtotal, selectedItems } = req.body;
    const cart = await Cart.findOne({ userId }).populate("items.storeId", "name category").populate("items.productId");
    if (!cart) return res.status(404).json({ message: "Không tìm thấy giỏ hàng" });

    // Lọc các sản phẩm được chọn
    let filteredItems = cart.items;
    if (selectedItems && Array.isArray(selectedItems) && selectedItems.length > 0) {
      filteredItems = cart.items.filter(item => selectedItems.includes(item._id.toString()));
    }
    
    const subtotalToUse = requestSubtotal !== undefined ? Number(requestSubtotal) : 
      filteredItems.reduce((sum, item) => sum + item.subtotal, 0);

    // Lấy danh sách store IDs trong các sản phẩm được chọn
    const storeIds = [...new Set(filteredItems.map(item => {
      const storeId = item.storeId && typeof item.storeId === "object" ? item.storeId._id : item.storeId;
      return storeId ? storeId.toString() : null;
    }).filter(Boolean))];

          const now = new Date();
      
      // Debug: Kiểm tra tất cả voucher trong database
      const allVouchers = await Voucher.find({}).populate("store", "name category");
      console.log("📋 Total vouchers in DB:", allVouchers.length);
      allVouchers.forEach(v => {
        console.log(`  - ${v.code}: global=${v.global}, store=${v.store?._id || v.store || 'null'}, isActive=${v.isActive}, startDate=${v.startDate}, endDate=${v.endDate}`);
      });
      
             // Lấy voucher: global, store=null (toàn hệ thống), hoặc của các store trong cart
       // Sử dụng ObjectId cho storeIds nếu cần
       const storeObjectIds = storeIds.map(id => new mongoose.Types.ObjectId(id));
       const vouchers = await Voucher.find({
         isActive: true,
         startDate: { $lte: now },
         endDate: { $gte: now },
         $or: [
           { global: true }, // Voucher global của admin
           { store: null }, // Voucher áp dụng cho tất cả store (store=null)
           { store: { $in: storeObjectIds } }, // Voucher của các store trong cart (sử dụng ObjectId)
           { store: { $in: storeIds } }, // Fallback: thử với string
         ]
       }).populate("store", "name category");

      console.log("🔍 Found vouchers:", vouchers.length);
      console.log("📦 Store IDs in cart:", storeIds);
      console.log("💰 Subtotal to use:", subtotalToUse);

      // Filter và tính discount cho mỗi voucher
      const user = await User.findById(userId);
          const availableVouchers = vouchers
        .map(voucher => {
          // Kiểm tra điều kiện
          if (subtotalToUse < Number(voucher.minOrderValue)) {
            console.log(`❌ Voucher ${voucher.code}: Subtotal ${subtotalToUse} < minOrderValue ${voucher.minOrderValue}`);
            return null;
          }
          
                     // Kiểm tra store match (nếu voucher có store cụ thể)
           // Bỏ qua kiểm tra nếu voucher là global hoặc store=null (áp dụng cho tất cả store)
           if (!voucher.global && voucher.store !== null && voucher.store !== undefined) {
             // Voucher có store cụ thể, cần kiểm tra store có trong cart không
             const voucherStoreId = voucher.store?._id ? voucher.store._id.toString() : (voucher.store?.toString ? voucher.store.toString() : null);
             if (voucherStoreId) {
               const storeMatch = storeIds.some(sId => sId === voucherStoreId);
               if (!storeMatch) {
                 console.log(`❌ Voucher ${voucher.code}: Store not match (voucher store: ${voucherStoreId}, cart stores: ${storeIds.join(', ')})`);
                 return null;
               }
             }
           }

          // Kiểm tra categories (nếu có)
          if (voucher.categories && voucher.categories.length > 0) {
            const storesInCart = filteredItems
              .map(i => (i.storeId && typeof i.storeId === "object" ? i.storeId : null))
              .filter(Boolean);
            const categoryMatch = storesInCart.some(store => 
              store.category && voucher.categories.includes(store.category)
            );
            if (!categoryMatch) {
              console.log(`❌ Voucher ${voucher.code}: Category not match`);
              return null;
            }
          }

          // Kiểm tra user đã dùng chưa
          const userUsed = voucher.usersUsed && voucher.usersUsed.length > 0
            ? voucher.usersUsed.map(u => u.toString()).includes(userId)
            : false;
          if (userUsed) {
            console.log(`❌ Voucher ${voucher.code}: User already used`);
            return null;
          }

          // Kiểm tra usage limit
          if (voucher.usedCount >= Number(voucher.usageLimit || 100)) {
            console.log(`❌ Voucher ${voucher.code}: Usage limit reached`);
            return null;
          }

          console.log(`✅ Voucher ${voucher.code} passed all checks`);

        // Tính discount
        const voucherType = voucher.voucherType || "product";
        let discount = 0;

        if (voucherType === "freeship") {
          // Freeship sẽ được tính ở checkout với shippingFee
          discount = 0; // Tạm thời, sẽ tính sau khi có shippingFee
        } else {
          // Product voucher
          if (voucher.discountType === "fixed") {
            discount = Math.min(Number(voucher.discountValue), subtotalToUse);
          } else {
            discount = (subtotalToUse * Number(voucher.discountValue)) / 100;
            if (voucher.maxDiscount) {
              discount = Math.min(discount, voucher.maxDiscount);
            }
            discount = Math.min(discount, subtotalToUse);
          }
        }

        return {
          id: voucher._id,
          code: voucher.code,
          title: voucher.title,
          description: voucher.description,
          condition: voucher.condition,
          voucherType: voucherType,
          discountType: voucher.discountType,
          discountValue: Number(voucher.discountValue),
          maxDiscount: voucher.maxDiscount ? Number(voucher.maxDiscount) : undefined,
          minOrderValue: Number(voucher.minOrderValue),
          storeName: voucher.store?.name || "Tất cả",
          storeCategory: voucher.store?.category || "Tất cả",
          isGlobal: voucher.global || false,
          discount: discount,
          usagePercent: voucher.usedCount && voucher.usageLimit 
            ? Math.round((voucher.usedCount / voucher.usageLimit) * 100) 
            : 0,
          used: userUsed,
        };
      })
      .filter(v => v !== null)
      .sort((a, b) => {
        // Sắp xếp: product trước, sau đó freeship
        if (a.voucherType !== b.voucherType) {
          return a.voucherType === "product" ? -1 : 1;
        }
        // Cùng loại, sắp xếp theo discount giảm dần
        return b.discount - a.discount;
      });

          // Tách thành 2 nhóm
      const productVouchers = availableVouchers.filter(v => v.voucherType === "product");
      const freeshipVouchers = availableVouchers.filter(v => v.voucherType === "freeship");

      console.log("📊 Final result - Product vouchers:", productVouchers.length, "Freeship vouchers:", freeshipVouchers.length);

      res.status(200).json({
        productVouchers,
        freeshipVouchers,
        subtotal: subtotalToUse,
      });
  } catch (error) {
    console.error("Get available vouchers for checkout error:", error);
    res.status(500).json({ message: "Lỗi server", error: error.message });
  }
};
