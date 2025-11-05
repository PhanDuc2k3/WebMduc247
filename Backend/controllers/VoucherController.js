const Voucher = require("../models/Voucher");
const Cart = require("../models/Cart");
const User = require("../models/Users");
const Store = require("../models/Store");
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
    const userId = req.user.userId;
    const userRole = req.user.role;
    const { stores, global, store } = req.body;

    // Lấy thông tin user
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "Không tìm thấy người dùng" });
    }

    let voucherData = { ...req.body, createdBy: userId };

    // Phân quyền: Admin có thể tạo voucher global hoặc theo category
    // Seller chỉ có thể tạo voucher cho cửa hàng của mình
    if (userRole === "admin") {
      // Admin: có thể chọn global hoặc theo category
      const { categories } = req.body;
      
      if (global) {
        // Voucher global - áp dụng cho tất cả cửa hàng
        voucherData.global = true;
        voucherData.store = null;
        voucherData.stores = [];
        voucherData.categories = []; // Không có category = global
      } else if (categories && Array.isArray(categories) && categories.length > 0) {
        // Voucher cho các loại cửa hàng (theo category)
        voucherData.global = false;
        voucherData.store = null;
        voucherData.stores = []; // Không dùng stores cụ thể
        voucherData.categories = categories; // Lưu danh sách categories
      } else {
        // Mặc định global nếu không chọn gì
        voucherData.global = true;
        voucherData.store = null;
        voucherData.stores = [];
        voucherData.categories = [];
      }
      
      // Không cho admin tạo voucher cho store cụ thể (để seller làm)
      if (stores || store) {
        return res.status(403).json({ 
          message: "Admin chỉ có thể tạo voucher global hoặc theo category. Voucher cho cửa hàng cụ thể chỉ dành cho chủ cửa hàng." 
        });
      }
    } else if (userRole === "seller") {
      // Seller: chỉ có thể tạo voucher cho cửa hàng của mình
      const sellerStore = await Store.findOne({ owner: userId });
      if (!sellerStore) {
        return res.status(404).json({ message: "Bạn chưa có cửa hàng" });
      }
      
      voucherData.global = false;
      voucherData.store = sellerStore._id; // Tương thích với code cũ
      voucherData.stores = [sellerStore._id];
      voucherData.categories = []; // Seller không dùng categories
      
      // Không cho seller chọn global, stores hoặc categories
      if (global || stores || (req.body.categories && Array.isArray(req.body.categories) && req.body.categories.length > 0)) {
        return res.status(403).json({ 
          message: "Bạn chỉ có thể tạo voucher cho cửa hàng của mình" 
        });
      }
    } else {
      return res.status(403).json({ message: "Bạn không có quyền tạo voucher" });
    }

    const voucher = await Voucher.create(voucherData);
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
      
             // Lấy voucher: global, categories, hoặc của các store trong cart (seller tạo)
       // Lấy danh sách categories của các store trong cart
       const storesInCart = filteredItems
         .map(i => (i.storeId && typeof i.storeId === "object" ? i.storeId : null))
         .filter(Boolean);
       const cartCategories = [...new Set(storesInCart.map(s => s.category).filter(Boolean))];
       
       const storeObjectIds = storeIds.map(id => new mongoose.Types.ObjectId(id));
       const vouchers = await Voucher.find({
         isActive: true,
         startDate: { $lte: now },
         endDate: { $gte: now },
         $or: [
           { global: true }, // Voucher global của admin - áp dụng cho tất cả
           // Voucher theo category - nếu có category trong cart khớp với voucher categories
           { 
             categories: { $exists: true, $ne: [], $in: cartCategories },
             global: false
           },
           // Voucher của seller - cho store cụ thể trong cart
           { store: { $in: storeObjectIds } }, // Voucher của các store trong cart (seller tạo)
           { store: { $in: storeIds } }, // Fallback: thử với string
         ]
       }).populate("store", "name category").populate("stores", "name category");

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
          
                     // Kiểm tra voucher match
           // Bỏ qua nếu voucher global (áp dụng cho tất cả)
           if (!voucher.global) {
             // Kiểm tra categories (voucher admin tạo theo category)
             if (voucher.categories && Array.isArray(voucher.categories) && voucher.categories.length > 0) {
               // Voucher theo category - kiểm tra category của store trong cart
               const categoryMatch = cartCategories.some(cat => voucher.categories.includes(cat));
               if (!categoryMatch) {
                 console.log(`❌ Voucher ${voucher.code}: Category not match (voucher categories: ${voucher.categories.join(', ')}, cart categories: ${cartCategories.join(', ')})`);
                 return null;
               }
             }
             // Kiểm tra store cụ thể (voucher seller tạo)
             else if (voucher.store !== null && voucher.store !== undefined) {
               const voucherStoreId = voucher.store?._id ? voucher.store._id.toString() : (voucher.store?.toString ? voucher.store.toString() : null);
               if (voucherStoreId) {
                 const storeMatch = storeIds.some(sId => sId === voucherStoreId);
                 if (!storeMatch) {
                   console.log(`❌ Voucher ${voucher.code}: Store not match (voucher store: ${voucherStoreId}, cart stores: ${storeIds.join(', ')})`);
                   return null;
                 }
               }
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

        // Lấy tên cửa hàng - ưu tiên categories, sau đó store đơn
        let storeName = "Tất cả";
        let storeCategory = "Tất cả";
        
        if (voucher.global) {
          storeName = "Tất cả cửa hàng";
          storeCategory = "Global";
        } else if (voucher.categories && Array.isArray(voucher.categories) && voucher.categories.length > 0) {
          // Voucher theo category (admin tạo)
          const categoryLabels = {
            'electronics': 'Điện tử',
            'fashion': 'Thời trang',
            'home': 'Nội thất',
            'books': 'Sách',
            'other': 'Khác'
          };
          const categoryNames = voucher.categories.map(c => categoryLabels[c] || c);
          storeName = categoryNames.length === 1 
            ? `Loại: ${categoryNames[0]}` 
            : `Loại: ${categoryNames.join(', ')}`;
          storeCategory = voucher.categories.join(', ');
        } else if (voucher.store) {
          // Voucher của seller - cho store cụ thể
          storeName = voucher.store?.name || "Cửa hàng";
          storeCategory = voucher.store?.category || "Tất cả";
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
          storeName: storeName,
          storeCategory: storeCategory,
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
