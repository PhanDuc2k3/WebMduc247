const voucherRepository = require('../repositories/VoucherRepository');
const Cart = require('../models/Cart');
const User = require('../models/Users');
const Store = require('../models/Store');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const { createBulkNotifications } = require('../controllers/NotificationController');

class VoucherService {
  // Lấy userId từ token
  getUserIdFromToken(authHeader) {
    if (!authHeader) return null;
    const token = authHeader.replace('Bearer ', '');
    if (!token) return null;
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      return decoded.userId;
    } catch (err) {
      return null;
    }
  }

  // Kiểm tra user đã dùng voucher chưa
  checkUserUsed(voucher, userId) {
    if (!userId || !voucher.usersUsed || voucher.usersUsed.length === 0) {
      return false;
    }
    const userIdString = userId.toString();
    const usersUsedStrings = voucher.usersUsed.map(u => {
      return u && u.toString ? u.toString() : String(u);
    });
    return usersUsedStrings.includes(userIdString);
  }

  // Làm sạch voucher data
  cleanVoucherData(voucher, userId = null) {
    const userUsed = userId ? this.checkUserUsed(voucher, userId) : false;
    return {
      ...voucher.toObject(),
      discountValue: Number(voucher.discountValue),
      minOrderValue: Number(voucher.minOrderValue),
      maxDiscount: voucher.maxDiscount ? Number(voucher.maxDiscount) : undefined,
      storeName: voucher.store?.name || "Tất cả",
      storeCategory: voucher.store?.category || "Tất cả",
      usagePercent: voucher.usedCount && voucher.usageLimit 
        ? Math.round((voucher.usedCount / voucher.usageLimit) * 100) 
        : 0,
      used: userUsed,
    };
  }

  // Lấy available vouchers
  async getAvailableVouchers(userId = null) {
    const now = new Date();
    const vouchers = await voucherRepository.findAvailable(now, true);
    return vouchers.map(v => this.cleanVoucherData(v, userId));
  }

  // Tạo voucher
  async createVoucher(userId, userRole, voucherData) {
    if (userId) {
      const user = await User.findById(userId);
      if (!user) {
        throw new Error("Không tìm thấy người dùng");
      }
    }

    let data = { ...voucherData };
    if (userId) {
      data.createdBy = userId;
    }

    // Phân quyền
    if (userRole === "admin") {
      const { categories, global, stores, store } = voucherData;
      
      if (global) {
        data.global = true;
        data.store = null;
        data.stores = [];
        data.categories = [];
      } else if (categories && Array.isArray(categories) && categories.length > 0) {
        data.global = false;
        data.store = null;
        data.stores = [];
        data.categories = categories;
      } else {
        data.global = true;
        data.store = null;
        data.stores = [];
        data.categories = [];
      }
      
      if (stores || store) {
        throw new Error("Admin chỉ có thể tạo voucher global hoặc theo category. Voucher cho cửa hàng cụ thể chỉ dành cho chủ cửa hàng.");
      }
    } else if (userRole === "seller") {
      if (!userId) {
        throw new Error("Cần đăng nhập để tạo voucher");
      }
      const sellerStore = await Store.findOne({ owner: userId });
      if (!sellerStore) {
        throw new Error("Bạn chưa có cửa hàng");
      }
      
      data.global = false;
      data.store = sellerStore._id;
      data.stores = [sellerStore._id];
      data.categories = [];
      
      if (voucherData.global || voucherData.stores || 
          (voucherData.categories && Array.isArray(voucherData.categories) && voucherData.categories.length > 0)) {
        throw new Error("Bạn chỉ có thể tạo voucher cho cửa hàng của mình");
      }
    }

    const voucher = await voucherRepository.create(data);
    
    // Tạo notification cho voucher global
    try {
      if (voucher.global && voucher.isActive) {
        const allUsers = await User.find({ role: { $in: ["buyer", "seller"] } }).select("_id");
        const userIds = allUsers.map(user => user._id);
        
        if (userIds.length > 0) {
          const discountText = voucher.discountType === "fixed"
            ? `${voucher.discountValue.toLocaleString("vi-VN")}₫`
            : `${voucher.discountValue}%`;
          
          await createBulkNotifications(userIds, {
            type: "voucher",
            title: "🎁 Voucher mới có sẵn!",
            message: `${voucher.title} - Giảm ${discountText} cho đơn hàng từ ${voucher.minOrderValue.toLocaleString("vi-VN")}₫. Mã: ${voucher.code}`,
            relatedId: voucher._id,
            link: "/voucher",
            icon: "🎁",
            metadata: {
              voucherCode: voucher.code,
              discountValue: voucher.discountValue,
              discountType: voucher.discountType,
            },
          });
        }
      }
    } catch (notifError) {
      console.error(`⚠️ Lỗi khi tạo notification cho voucher mới:`, notifError);
    }
    
    return voucher;
  }

  // Cập nhật voucher
  async updateVoucher(voucherId, updateData) {
    const voucher = await voucherRepository.update(voucherId, updateData);
    if (!voucher) {
      throw new Error("Không tìm thấy voucher");
    }
    return voucher;
  }

  // Xóa voucher
  async deleteVoucher(voucherId) {
    const voucher = await voucherRepository.delete(voucherId);
    if (!voucher) {
      throw new Error("Không tìm thấy voucher");
    }
    return voucher;
  }

  // Cleanup duplicate userId trong usersUsed
  async cleanupVoucherUsersUsed() {
    const vouchers = await voucherRepository.findWithUsersUsed();
    let totalCleaned = 0;
    let totalRemoved = 0;
    const cleanedVouchers = [];

    for (const voucher of vouchers) {
      const originalLength = voucher.usersUsed ? voucher.usersUsed.length : 0;
      
      if (!voucher.usersUsed || voucher.usersUsed.length === 0) {
        continue;
      }

      const uniqueUserIds = [];
      const seen = new Set();

      for (const userId of voucher.usersUsed) {
        const userIdString = userId.toString();
        if (!seen.has(userIdString)) {
          seen.add(userIdString);
          if (mongoose.Types.ObjectId.isValid(userIdString)) {
            uniqueUserIds.push(new mongoose.Types.ObjectId(userIdString));
          } else {
            uniqueUserIds.push(userIdString);
          }
        }
      }

      const newLength = uniqueUserIds.length;
      const removed = originalLength - newLength;

      if (removed > 0) {
        voucher.usersUsed = uniqueUserIds;
        if (voucher.usedCount > newLength) {
          voucher.usedCount = newLength;
        }
        await voucher.save();
        
        cleanedVouchers.push({
          code: voucher.code,
          originalLength,
          newLength,
          removed,
          usedCount: voucher.usedCount
        });
        
        totalCleaned++;
        totalRemoved += removed;
      }
    }

    return {
      totalCleaned,
      totalRemoved,
      cleanedVouchers
    };
  }

  // Lấy tất cả vouchers
  async getAllVouchers() {
    const vouchers = await voucherRepository.findAll(true);
    return vouchers.map(v => this.cleanVoucherData(v));
  }

  // Toggle voucher status
  async toggleVoucherStatus(voucherId) {
    const voucher = await voucherRepository.findById(voucherId);
    if (!voucher) {
      throw new Error("Không tìm thấy voucher");
    }

    voucher.isActive = !voucher.isActive;
    await voucher.save();

    return voucher;
  }

  // Preview voucher
  async previewVoucher(userId, code, subtotal, shippingFee) {
    if (!userId) {
      throw new Error("Cần đăng nhập để sử dụng voucher");
    }

    const cart = await Cart.findOne({ userId }).populate("items.storeId", "name category");
    if (!cart) {
      throw new Error("Không tìm thấy giỏ hàng");
    }

    const voucher = await voucherRepository.findByCode(code, true);
    if (!voucher) {
      throw new Error("Voucher không tồn tại");
    }

    const now = new Date();
    if (voucher.startDate > now || voucher.endDate < now) {
      throw new Error("Voucher đã hết hạn hoặc chưa bắt đầu");
    }
    
    const subtotalToUse = subtotal !== undefined ? Number(subtotal) : cart.subtotal;
    if (subtotalToUse < Number(voucher.minOrderValue)) {
      throw new Error(`Đơn hàng phải tối thiểu ${Number(voucher.minOrderValue).toLocaleString("vi-VN")}₫`);
    }

    const storesInCart = cart.items.map(i => (i.storeId && typeof i.storeId === "object" ? i.storeId : null)).filter(Boolean);

    if (voucher.store) {
      const storeMatch = storesInCart.some(s => s._id.toString() === voucher.store._id.toString());
      if (!storeMatch) {
        throw new Error("Voucher không áp dụng cho cửa hàng trong giỏ hàng");
      }
    } else if (voucher.categories?.length) {
      const categoryMatch = storesInCart.some(store => store.category && voucher.categories.includes(store.category));
      if (!categoryMatch) {
        throw new Error("Voucher không áp dụng cho cửa hàng trong giỏ hàng");
      }
    }

    const userUsed = this.checkUserUsed(voucher, userId);
    if (userUsed) {
      throw new Error("Bạn chỉ được sử dụng voucher này 1 lần");
    }

    const voucherType = voucher.voucherType || "product";
    let discount = 0;

    if (voucherType === "freeship") {
      const requestShippingFee = shippingFee || 30000;
      discount = voucher.discountType === "fixed"
        ? Math.min(voucher.discountValue, requestShippingFee)
        : Math.min((requestShippingFee * voucher.discountValue) / 100, voucher.maxDiscount || requestShippingFee, requestShippingFee);
    } else {
      let calculatedDiscount = 0;
      if (voucher.discountType === "fixed") {
        calculatedDiscount = Number(voucher.discountValue);
      } else {
        calculatedDiscount = (subtotalToUse * Number(voucher.discountValue)) / 100;
        if (voucher.maxDiscount) {
          calculatedDiscount = Math.min(calculatedDiscount, voucher.maxDiscount);
        }
      }
      discount = Math.min(calculatedDiscount, subtotalToUse);
    }

    return {
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
    };
  }

  // Apply voucher
  async applyVoucher(userId, code, orderSubtotal) {
    if (!userId) {
      throw new Error("Cần đăng nhập để sử dụng voucher");
    }

    const user = await User.findById(userId);
    if (!user) {
      throw new Error("Người dùng không hợp lệ");
    }

    const voucher = await voucherRepository.findByCode(code, true);
    if (!voucher) {
      throw new Error("Voucher không tồn tại");
    }

    const now = new Date();
    if (voucher.startDate > now || voucher.endDate < now) {
      throw new Error("Voucher đã hết hạn hoặc chưa bắt đầu");
    }
    if (voucher.usedCount >= Number(voucher.usageLimit)) {
      throw new Error("Voucher đã được sử dụng hết");
    }
    if ((Number(orderSubtotal) || 0) < Number(voucher.minOrderValue)) {
      throw new Error(`Đơn hàng phải tối thiểu ${Number(voucher.minOrderValue).toLocaleString("vi-VN")}₫`);
    }

    const userUsed = this.checkUserUsed(voucher, userId);
    if (userUsed) {
      throw new Error("Bạn chỉ được sử dụng voucher này 1 lần");
    }

    const subtotal = Number(orderSubtotal) || 0;
    const discount = voucher.discountType === "fixed" 
      ? Number(voucher.discountValue) || 0 
      : Math.min(subtotal * Number(voucher.discountValue) / 100, Number(voucher.maxDiscount) || Infinity);

    return {
      discount,
      voucher: this.cleanVoucherData(voucher, userId),
    };
  }

  // Lấy available vouchers cho checkout
  async getAvailableVouchersForCheckout(userId, subtotal, selectedItems) {
    let cart = null;
    let filteredItems = [];
    let storeIds = [];
    let cartCategories = [];
    
    if (userId) {
      cart = await Cart.findOne({ userId }).populate("items.storeId", "name category").populate("items.productId");
      if (cart) {
        filteredItems = cart.items;
        if (selectedItems && Array.isArray(selectedItems) && selectedItems.length > 0) {
          filteredItems = cart.items.filter(item => selectedItems.includes(item._id.toString()));
        }
        
        storeIds = [...new Set(filteredItems.map(item => {
          const storeId = item.storeId && typeof item.storeId === "object" ? item.storeId._id : item.storeId;
          return storeId ? storeId.toString() : null;
        }).filter(Boolean))];

        const storesInCart = filteredItems
          .map(i => (i.storeId && typeof i.storeId === "object" ? i.storeId : null))
          .filter(Boolean);
        cartCategories = [...new Set(storesInCart.map(s => s.category).filter(Boolean))];
      }
    }
    
    const subtotalToUse = subtotal !== undefined ? Number(subtotal) : 
      (cart && filteredItems.length > 0 ? filteredItems.reduce((sum, item) => sum + item.subtotal, 0) : 0);

    const now = new Date();
    
    let voucherQuery = {
      isActive: true,
      startDate: { $lte: now },
      endDate: { $gte: now },
    };
    
    if (storeIds.length > 0 || cartCategories.length > 0) {
      const storeObjectIds = storeIds.map(id => new mongoose.Types.ObjectId(id));
      voucherQuery.$or = [
        { global: true },
        { 
          categories: { $exists: true, $ne: [], $in: cartCategories },
          global: false
        },
        { store: { $in: storeObjectIds } },
        { store: { $in: storeIds } },
      ];
    } else {
      voucherQuery.global = true;
    }
    
    const vouchers = await voucherRepository.findByQuery(voucherQuery, true);

    const availableVouchers = vouchers
      .map(voucher => {
        if (subtotalToUse < Number(voucher.minOrderValue)) {
          return null;
        }
        
        if (!voucher.global) {
          if (storeIds.length > 0 || cartCategories.length > 0) {
            if (voucher.categories && Array.isArray(voucher.categories) && voucher.categories.length > 0) {
              const categoryMatch = cartCategories.some(cat => voucher.categories.includes(cat));
              if (!categoryMatch) {
                return null;
              }
            } else if (voucher.store !== null && voucher.store !== undefined) {
              const voucherStoreId = voucher.store?._id ? voucher.store._id.toString() : (voucher.store?.toString ? voucher.store.toString() : null);
              if (voucherStoreId) {
                const storeMatch = storeIds.some(sId => sId === voucherStoreId);
                if (!storeMatch) {
                  return null;
                }
              }
            }
          } else {
            return null;
          }
        }

        if (userId) {
          const userUsed = this.checkUserUsed(voucher, userId);
          if (userUsed) {
            return null;
          }
        }

        if (voucher.usedCount >= Number(voucher.usageLimit || 100)) {
          return null;
        }

        const voucherType = voucher.voucherType || "product";
        let discount = 0;

        if (voucherType === "freeship") {
          discount = 0; // Sẽ tính sau khi có shippingFee
        } else {
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

        let storeName = "Tất cả";
        let storeCategory = "Tất cả";
        
        if (voucher.global) {
          storeName = "Tất cả cửa hàng";
          storeCategory = "Global";
        } else if (voucher.categories && Array.isArray(voucher.categories) && voucher.categories.length > 0) {
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
          used: userId ? this.checkUserUsed(voucher, userId) : false,
        };
      })
      .filter(v => v !== null)
      .sort((a, b) => {
        if (a.voucherType !== b.voucherType) {
          return a.voucherType === "product" ? -1 : 1;
        }
        return b.discount - a.discount;
      });

    const productVouchers = availableVouchers.filter(v => v.voucherType === "product");
    const freeshipVouchers = availableVouchers.filter(v => v.voucherType === "freeship");

    return {
      productVouchers,
      freeshipVouchers,
      subtotal: subtotalToUse,
    };
  }
}

module.exports = new VoucherService();

