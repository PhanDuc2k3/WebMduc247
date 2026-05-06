const orderRepository = require('../repositories/OrderRepository');
const Cart = require('../models/Cart');
const Voucher = require('../models/Voucher');
const User = require('../models/Users');
const Product = require('../models/Product');
const Store = require('../models/Store');
const ProductRepository = require('../repositories/ProductRepository');
const { sendOrderConfirmationEmail, sendOrderDeliveredEmail } = require('../utils/emailService');
const { createNotification } = require('../controllers/NotificationController');

class OrderService {
  // Tạo order code
  generateOrderCode() {
    return "ORD-" + Date.now();
  }

  // Trừ stock khi thanh toán thành công (tránh race condition)
  async deductStock(items) {
    const stockUpdates = [];
    const errors = [];

    for (const item of items) {
      let productId = null;
      if (item.productId) {
        if (typeof item.productId === 'object' && item.productId._id) {
          productId = item.productId._id.toString();
        } else if (typeof item.productId === 'string') {
          productId = item.productId;
        } else if (item.productId.toString) {
          productId = item.productId.toString();
        }
      }

      if (!productId) {
        errors.push(`Không tìm thấy productId cho sản phẩm: ${item.name}`);
        continue;
      }

      const quantity = item.quantity || 1;

      // Xử lý variation stock
      if (item.variation?.variationId && item.variation?.optionId) {
        // Lấy variationId và optionId dưới dạng string
        const variationIdStr = typeof item.variation.variationId === 'object' && item.variation.variationId._id
          ? item.variation.variationId._id.toString()
          : item.variation.variationId.toString();
        
        const optionIdStr = typeof item.variation.optionId === 'object' && item.variation.optionId._id
          ? item.variation.optionId._id.toString()
          : item.variation.optionId.toString();

        // Kiểm tra stock trước (để hiển thị lỗi rõ ràng)
        const product = await Product.findById(productId);
        if (!product) {
          errors.push(`Không tìm thấy sản phẩm: ${item.name}`);
          continue;
        }

        const variation = product.variations.find(
          v => v._id && v._id.toString() === variationIdStr
        );

        if (!variation) {
          errors.push(`Không tìm thấy variation cho sản phẩm: ${item.name}`);
          continue;
        }

        const option = variation.options.find(
          opt => opt._id && opt._id.toString() === optionIdStr
        );

        if (!option) {
          errors.push(`Không tìm thấy option cho sản phẩm: ${item.name}`);
          continue;
        }

        const currentStock = option.stock || 0;
        
        if (currentStock < quantity) {
          errors.push(`Sản phẩm "${item.name}" chỉ còn ${currentStock} sản phẩm trong kho. Bạn yêu cầu ${quantity} sản phẩm.`);
          continue;
        }

        // Giảm stock atomically bằng findOneAndUpdate với arrayFilters
        // Sử dụng arrayFilters để update nested field với điều kiện stock >= quantity
        const updateResult = await Product.findOneAndUpdate(
          {
            _id: productId,
            "variations._id": variationIdStr,
            "variations.options._id": optionIdStr
          },
          {
            $inc: {
              "variations.$[v].options.$[o].stock": -quantity
            }
          },
          {
            arrayFilters: [
              { "v._id": variationIdStr },
              { "o._id": optionIdStr, "o.stock": { $gte: quantity } }
            ],
            new: true
          }
        );

        if (!updateResult) {
          errors.push(`Sản phẩm "${item.name}" không còn đủ số lượng trong kho. Có thể đã được người khác mua.`);
          continue;
        }

        stockUpdates.push({
          productId,
          productName: item.name,
          quantity,
          variationId: variationIdStr,
          optionId: optionIdStr,
          type: 'variation'
        });

      } else {
        // Xử lý product stock thông thường (không có variation)
        // Giảm stock atomically bằng findOneAndUpdate với điều kiện
        const updateResult = await Product.findOneAndUpdate(
          {
            _id: productId,
            quantity: { $gte: quantity }
          },
          {
            $inc: { quantity: -quantity }
          },
          { new: true }
        );

        if (!updateResult) {
          // Lấy thông tin sản phẩm để hiển thị lỗi
          const product = await Product.findById(productId);
          const currentStock = product ? (product.quantity || 0) : 0;
          errors.push(`Sản phẩm "${item.name || product?.name || 'N/A'}" chỉ còn ${currentStock} sản phẩm trong kho. Bạn yêu cầu ${quantity} sản phẩm. Có thể đã được người khác mua.`);
          continue;
        }

        stockUpdates.push({
          productId,
          productName: item.name,
          quantity,
          type: 'product'
        });
      }
    }

    if (errors.length > 0) {
      // Hoàn lại stock đã giảm nếu có lỗi
      for (const update of stockUpdates) {
        if (update.type === 'variation') {
          await Product.findOneAndUpdate(
            {
              _id: update.productId,
              "variations._id": update.variationId,
              "variations.options._id": update.optionId
            },
            {
              $inc: {
                "variations.$[v].options.$[o].stock": update.quantity
              }
            },
            {
              arrayFilters: [
                { "v._id": update.variationId },
                { "o._id": update.optionId }
              ]
            }
          );
        } else {
          await Product.findByIdAndUpdate(
            update.productId,
            {
              $inc: { quantity: update.quantity }
            }
          );
        }
      }
      throw new Error(errors.join(' '));
    }

    return stockUpdates;
  }

  // Trừ stock khi thanh toán thành công (helper function để gọi từ các nơi thanh toán)
  async deductStockOnPayment(orderCode) {
    const order = await orderRepository.findByOrderCode(orderCode);
    if (!order) {
      throw new Error(`Không tìm thấy đơn hàng: ${orderCode}`);
    }

    // Kiểm tra xem đã trừ stock chưa (tránh trừ 2 lần)
    if (order.paymentInfo.status === "paid") {
      // Kiểm tra xem đã có status "paid" trong history chưa
      const hasPaidInHistory = order.statusHistory.some(h => h.status === "paid");
      if (hasPaidInHistory) {
        console.log(`[OrderService] ⚠️ Đơn hàng ${orderCode} đã được trừ stock rồi`);
        return;
      }
    }

    try {
      await this.deductStock(order.items);
      console.log(`[OrderService] ✅ Đã trừ stock cho đơn hàng ${orderCode}`);
    } catch (stockError) {
      console.error(`[OrderService] ❌ Lỗi khi trừ stock:`, stockError);
      throw new Error(stockError.message || "Không đủ số lượng sản phẩm trong kho");
    }
  }

  // Hoàn lại stock khi đơn hàng bị hủy
  async restoreStock(items) {
    for (const item of items) {
      let productId = null;
      if (item.productId) {
        if (typeof item.productId === 'object' && item.productId._id) {
          productId = item.productId._id.toString();
        } else if (typeof item.productId === 'string') {
          productId = item.productId;
        } else if (item.productId.toString) {
          productId = item.productId.toString();
        }
      }

      if (!productId) continue;

      const quantity = item.quantity || 1;

      // Hoàn lại stock cho variation
      if (item.variation?.variationId && item.variation?.optionId) {
        const variationIdStr = typeof item.variation.variationId === 'object' && item.variation.variationId._id
          ? item.variation.variationId._id.toString()
          : item.variation.variationId.toString();
        
        const optionIdStr = typeof item.variation.optionId === 'object' && item.variation.optionId._id
          ? item.variation.optionId._id.toString()
          : item.variation.optionId.toString();

        await Product.findOneAndUpdate(
          {
            _id: productId,
            "variations._id": variationIdStr,
            "variations.options._id": optionIdStr
          },
          {
            $inc: {
              "variations.$[v].options.$[o].stock": quantity
            }
          },
          {
            arrayFilters: [
              { "v._id": variationIdStr },
              { "o._id": optionIdStr }
            ]
          }
        );
      } else {
        // Hoàn lại stock cho product thông thường
        await Product.findByIdAndUpdate(
          productId,
          {
            $inc: { quantity: quantity }
          }
        );
      }
    }
  }

  // Xử lý items từ request
  async processItems(userId, items, selectedItems) {
    let filteredItems = [];

    if (items && Array.isArray(items) && items.length > 0) {
      const hasFullInfo = items[0] && items[0].name && items[0].price !== undefined;
      
      if (hasFullInfo) {
        filteredItems = items.map(item => {
          const productId = typeof item.productId === 'object' ? item.productId._id : item.productId;
          const storeId = typeof item.storeId === 'object' ? item.storeId._id : item.storeId;
          
          return {
            productId: productId,
            storeId: storeId,
            name: item.name,
            imageUrl: item.imageUrl || '',
            price: item.price,
            salePrice: item.salePrice || item.price,
            quantity: item.quantity,
            variation: item.variation || null,
            subtotal: item.subtotal || ((item.salePrice || item.price) + (item.variation?.additionalPrice || 0)) * item.quantity,
          };
        });
      } else {
        const productIds = items.map(item => {
          return typeof item.productId === 'object' ? item.productId._id : item.productId;
        });
        const products = await Product.find({ _id: { $in: productIds } }).populate('store');
        
        filteredItems = items.map(item => {
          const productId = typeof item.productId === 'object' ? item.productId._id : item.productId;
          const product = products.find(p => p._id.toString() === productId.toString());
          if (!product) {
            throw new Error(`Không tìm thấy sản phẩm với ID: ${productId}`);
          }

          let price = product.price;
          let salePrice = product.salePrice || product.price;
          let additionalPrice = 0;
          let variationData = null;

          if (item.variation && product.variations && product.variations.length > 0) {
            if (item.variation.variationId && item.variation.optionId) {
              const variation = product.variations.find(v => 
                v._id && v._id.toString() === item.variation.variationId.toString()
              );
              
              if (variation && variation.options) {
                const option = variation.options.find(o => 
                  o._id && o._id.toString() === item.variation.optionId.toString()
                );
                
                if (option) {
                  additionalPrice = option.additionalPrice || 0;
                  variationData = {
                    color: variation.color || '',
                    size: option.name || '',
                    additionalPrice: additionalPrice
                  };
                }
              }
            } else if (item.variation.color || item.variation.size) {
              variationData = {
                color: item.variation.color || '',
                size: item.variation.size || '',
                additionalPrice: item.variation.additionalPrice || 0
              };
              additionalPrice = item.variation.additionalPrice || 0;
            }
          }

          const finalPrice = salePrice + additionalPrice;
          const subtotal = finalPrice * item.quantity;

          return {
            productId: product._id,
            storeId: product.store?._id || product.store,
            name: product.name,
            imageUrl: product.images && product.images.length > 0 ? product.images[0] : '',
            price: price,
            salePrice: salePrice,
            quantity: item.quantity,
            variation: variationData,
            subtotal: subtotal,
          };
        });
      }
    } else {
      const cart = await Cart.findOne({ userId }).populate("items.productId");
      if (!cart || cart.items.length === 0) {
        throw new Error("Giỏ hàng trống");
      }

      filteredItems = cart.items;
      if (selectedItems && Array.isArray(selectedItems)) {
        filteredItems = cart.items.filter(item => selectedItems.includes(item._id.toString()));
      }
      if (filteredItems.length === 0) {
        throw new Error("Không có sản phẩm nào được chọn");
      }
    }

    return filteredItems;
  }

  // Xử lý voucher
  async processVouchers(userId, voucherCode, productVoucherCode, freeshipVoucherCode, subtotal, shippingFee) {
    let discount = 0;
    let shippingDiscount = 0;
    let productVoucher = null;
    let freeshipVoucher = null;
    let oldVoucher = null;

    const now = new Date();

    // Voucher cũ (tương thích ngược)
    if (voucherCode && !productVoucherCode && !freeshipVoucherCode) {
      oldVoucher = await Voucher.findOne({ code: voucherCode.toUpperCase(), isActive: true });
      if (oldVoucher) {
        if (oldVoucher.startDate > now || oldVoucher.endDate < now) {
          throw new Error("Voucher chưa bắt đầu hoặc đã hết hạn");
        }
        if (subtotal < oldVoucher.minOrderValue) {
          throw new Error(`Đơn hàng tối thiểu ${oldVoucher.minOrderValue}₫`);
        }

        const voucherType = oldVoucher.voucherType || "product";
        if (voucherType === "freeship") {
          freeshipVoucher = oldVoucher;
        } else {
          productVoucher = oldVoucher;
        }
      }
    }

    // Product voucher
    if (productVoucherCode) {
      productVoucher = await Voucher.findOne({ code: productVoucherCode.toUpperCase(), isActive: true, voucherType: "product" });
      if (!productVoucher) throw new Error("Voucher giảm giá sản phẩm không hợp lệ");
      if (productVoucher.startDate > now || productVoucher.endDate < now) {
        throw new Error("Voucher giảm giá sản phẩm chưa bắt đầu hoặc đã hết hạn");
      }
      if (subtotal < productVoucher.minOrderValue) {
        throw new Error(`Đơn hàng tối thiểu ${productVoucher.minOrderValue}₫ để sử dụng voucher này`);
      }
      
      const userUsed = productVoucher.usersUsed && productVoucher.usersUsed.length > 0
        ? productVoucher.usersUsed.map(u => u.toString()).includes(userId.toString())
        : false;
      if (userUsed) {
        throw new Error("Bạn chỉ được sử dụng voucher này 1 lần");
      }
      
      if (productVoucher.usedCount >= Number(productVoucher.usageLimit || 100)) {
        throw new Error("Voucher đã được sử dụng hết");
      }

      let calculatedDiscount = 0;
      if (productVoucher.discountType === "fixed") {
        calculatedDiscount = productVoucher.discountValue;
      } else {
        calculatedDiscount = (subtotal * productVoucher.discountValue) / 100;
        if (productVoucher.maxDiscount) {
          calculatedDiscount = Math.min(calculatedDiscount, productVoucher.maxDiscount);
        }
      }
      discount = Math.min(calculatedDiscount, subtotal);

      productVoucher.usedCount = (productVoucher.usedCount || 0) + 1;
      productVoucher.usersUsed = productVoucher.usersUsed || [];
      const userIdString = userId.toString();
      if (!productVoucher.usersUsed.map(u => u.toString()).includes(userIdString)) {
        productVoucher.usersUsed.push(userId);
      }
      await productVoucher.save();
    }

    // Freeship voucher
    if (freeshipVoucherCode) {
      freeshipVoucher = await Voucher.findOne({ code: freeshipVoucherCode.toUpperCase(), isActive: true, voucherType: "freeship" });
      if (!freeshipVoucher) throw new Error("Voucher miễn phí ship không hợp lệ");
      if (freeshipVoucher.startDate > now || freeshipVoucher.endDate < now) {
        throw new Error("Voucher miễn phí ship chưa bắt đầu hoặc đã hết hạn");
      }
      if (subtotal < freeshipVoucher.minOrderValue) {
        throw new Error(`Đơn hàng tối thiểu ${freeshipVoucher.minOrderValue}₫ để sử dụng voucher này`);
      }
      
      const userUsed = freeshipVoucher.usersUsed && freeshipVoucher.usersUsed.length > 0
        ? freeshipVoucher.usersUsed.map(u => u.toString()).includes(userId.toString())
        : false;
      if (userUsed) {
        throw new Error("Bạn chỉ được sử dụng voucher này 1 lần");
      }
      
      if (freeshipVoucher.usedCount >= Number(freeshipVoucher.usageLimit || 100)) {
        throw new Error("Voucher đã được sử dụng hết");
      }

      let calculatedShippingDiscount = 0;
      if (freeshipVoucher.discountType === "fixed") {
        calculatedShippingDiscount = freeshipVoucher.discountValue;
      } else {
        calculatedShippingDiscount = (shippingFee * freeshipVoucher.discountValue) / 100;
        if (freeshipVoucher.maxDiscount) {
          calculatedShippingDiscount = Math.min(calculatedShippingDiscount, freeshipVoucher.maxDiscount);
        }
      }
      shippingDiscount = Math.min(calculatedShippingDiscount, shippingFee);

      freeshipVoucher.usedCount = (freeshipVoucher.usedCount || 0) + 1;
      freeshipVoucher.usersUsed = freeshipVoucher.usersUsed || [];
      const userIdString = userId.toString();
      if (!freeshipVoucher.usersUsed.map(u => u.toString()).includes(userIdString)) {
        freeshipVoucher.usersUsed.push(userId);
      }
      await freeshipVoucher.save();
    }

    return {
      discount: Math.min(discount, subtotal),
      shippingDiscount: Math.min(shippingDiscount, shippingFee),
      productVoucher,
      freeshipVoucher,
      oldVoucher
    };
  }

  // Tạo order
  async createOrder(userId, orderData) {
    const {
      shippingAddress,
      paymentMethod,
      note,
      shippingFee = 0,
      voucherCode,
      productVoucherCode,
      freeshipVoucherCode,
      selectedItems,
      items,
    } = orderData;

    const user = await User.findById(userId);
    if (!user) throw new Error("Người dùng không tồn tại");

    const filteredItems = await this.processItems(userId, items, selectedItems);
    const subtotal = filteredItems.reduce((sum, item) => sum + item.subtotal, 0);

    // Tính phí sàn 10% trên subtotal
    const platformFee = Math.round(subtotal * 0.1);

    const voucherResult = await this.processVouchers(
      userId,
      voucherCode,
      productVoucherCode,
      freeshipVoucherCode,
      subtotal,
      shippingFee
    );

    const sa = shippingAddress || {};
    const shipping = {
      fullName: sa.fullName || user.fullName,
      phone: sa.phone || user.phone,
      address: sa.address || `${sa.street || ""}, ${sa.city || ""}`.trim(),
    };
    
    if (!shipping.fullName || !shipping.phone || !shipping.address) {
      throw new Error("Vui lòng cung cấp đầy đủ thông tin giao hàng");
    }

    // Tổng tiền = subtotal + phí sàn - discount + shipping fee - shipping discount
    const total = Math.max(0, subtotal + platformFee - voucherResult.discount + shippingFee - voucherResult.shippingDiscount);
    const orderCode = this.generateOrderCode();

    const order = await orderRepository.create({
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
        productId: typeof item.productId === 'object' && item.productId._id 
          ? item.productId._id 
          : item.productId,
        storeId: typeof item.storeId === 'object' && item.storeId._id
          ? item.storeId._id
          : item.storeId,
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
      platformFee,
      shippingFee,
      discount: voucherResult.discount,
      shippingDiscount: voucherResult.shippingDiscount,
      total,
      productVoucher: voucherResult.productVoucher ? voucherResult.productVoucher._id : null,
      productVoucherCode: voucherResult.productVoucher ? voucherResult.productVoucher.code : "",
      freeshipVoucher: voucherResult.freeshipVoucher ? voucherResult.freeshipVoucher._id : null,
      freeshipVoucherCode: voucherResult.freeshipVoucher ? voucherResult.freeshipVoucher.code : "",
      voucher: voucherResult.oldVoucher ? voucherResult.oldVoucher._id : (voucherResult.productVoucher ? voucherResult.productVoucher._id : (voucherResult.freeshipVoucher ? voucherResult.freeshipVoucher._id : null)),
      voucherCode: voucherResult.oldVoucher ? voucherResult.oldVoucher.code : (voucherResult.productVoucher ? voucherResult.productVoucher.code : (voucherResult.freeshipVoucher ? voucherResult.freeshipVoucher.code : "")),
      note: note || "",
    });

    // Xóa items khỏi cart
    if (!items || !Array.isArray(items) || items.length === 0) {
      const cart = await Cart.findOne({ userId });
      if (cart) {
        const selectedItemIds = selectedItems && Array.isArray(selectedItems) 
          ? selectedItems.map(id => id.toString())
          : filteredItems.map(item => item._id?.toString());
        
        cart.items = cart.items.filter(item => 
          !selectedItemIds.includes(item._id.toString())
        );
        cart.subtotal = cart.items.reduce((sum, item) => sum + item.subtotal, 0);
        cart.total = cart.subtotal;
        await cart.save();
      }
    }

    // Tạo notification
    try {
      let message = "";
      if (order.items.length === 1) {
        message = `Bạn đã mua sản phẩm "${order.items[0].name}". Tổng tiền: ${order.total.toLocaleString("vi-VN")}₫`;
      } else if (order.items.length <= 3) {
        const productNames = order.items.map(item => `"${item.name}"`).join(", ");
        message = `Bạn đã mua ${order.items.length} sản phẩm: ${productNames}. Tổng tiền: ${order.total.toLocaleString("vi-VN")}₫`;
      } else {
        const productNames = order.items.slice(0, 2).map(item => `"${item.name}"`).join(", ");
        message = `Bạn đã mua ${order.items.length} sản phẩm: ${productNames} và ${order.items.length - 2} sản phẩm khác. Tổng tiền: ${order.total.toLocaleString("vi-VN")}₫`;
      }
      
      await createNotification(userId, {
        type: "order",
        title: "🎉 Đơn hàng đã được tạo thành công!",
        message: message,
        relatedId: order._id,
        link: `/order/${order._id}`,
        icon: "🛒",
        metadata: {
          orderCode: order.orderCode,
          status: "pending",
          itemCount: order.items.length,
          total: order.total,
        },
      });
    } catch (notifError) {
      console.error(`⚠️ Lỗi khi tạo notification cho order mới:`, notifError);
    }

    // Gửi email
    try {
      const userWithPreferences = await User.findById(userId).select("email fullName emailNotifications");
      if (userWithPreferences) {
        await sendOrderConfirmationEmail(order, userWithPreferences);
      }
    } catch (emailError) {
      console.warn(`⚠️ Không thể gửi email xác nhận đơn hàng cho order ${order.orderCode}`);
    }

    let cartData = null;
    if (!items || !Array.isArray(items) || items.length === 0) {
      cartData = await Cart.findOne({ userId });
    }

    return { order, cart: cartData };
  }

  // Lấy orders của tôi
  async getMyOrders(userId) {
    return await orderRepository.findByUserId(userId);
  }

  // Lấy tất cả orders
  async getAllOrders() {
    return await orderRepository.findAll(true);
  }

  // Cập nhật status
  async updateOrderStatus(orderId, status, note) {
    const validStatuses = ["pending", "confirmed", "packed", "shipped", "delivered", "received", "cancelled", "return_requested", "returned"];
    if (!validStatuses.includes(status)) {
      throw new Error("Trạng thái không hợp lệ");
    }

    const order = await orderRepository.findById(orderId, true);
    if (!order) throw new Error("Không tìm thấy đơn hàng");

    const previousStatus = order.statusHistory.length > 0 
      ? order.statusHistory[order.statusHistory.length - 1]?.status 
      : null;

    const isFirstTimeDelivered = status === "delivered" && previousStatus !== "delivered";

    // Nếu đơn hàng bị hủy và đã thanh toán, hoàn lại stock
    if (status === "cancelled" && previousStatus !== "cancelled") {
      // Chỉ hoàn lại stock nếu đơn hàng đã được thanh toán
      if (order.paymentInfo.status === "paid") {
        try {
          await this.restoreStock(order.items);
          console.log(`[OrderService] ✅ Đã hoàn lại stock cho đơn hàng ${order.orderCode}`);
        } catch (restoreError) {
          console.error(`[OrderService] ❌ Lỗi khi hoàn lại stock:`, restoreError);
          // Không throw error, vì đơn hàng vẫn cần được hủy
        }
      }
    }

    // Nếu đơn hàng COD được xác nhận (confirmed), trừ stock
    if (status === "confirmed" && previousStatus !== "confirmed" && order.paymentInfo.method === "COD") {
      // Kiểm tra xem đã trừ stock chưa (tránh trừ 2 lần)
      const hasPaidStatus = order.statusHistory.some(h => h.status === "paid");
      if (!hasPaidStatus && order.paymentInfo.status !== "paid") {
        // Đánh dấu đã thanh toán cho COD
        order.paymentInfo.status = "paid";
        try {
          await this.deductStock(order.items);
          console.log(`[OrderService] ✅ Đã trừ stock cho đơn hàng COD ${order.orderCode}`);
        } catch (stockError) {
          console.error(`[OrderService] ❌ Lỗi khi trừ stock:`, stockError);
          throw new Error(stockError.message || "Không đủ số lượng sản phẩm trong kho");
        }
      }
    }

    // ✅ Bổ sung: Khi đơn hàng COD đã giao hàng (delivered), tự động chuyển thành đã thanh toán
    if (status === "delivered" && previousStatus !== "delivered" && order.paymentInfo.method === "COD") {
      // Kiểm tra xem đã set paid chưa (tránh set 2 lần)
      if (order.paymentInfo.status !== "paid") {
        order.paymentInfo.status = "paid";
        console.log(`[OrderService] ✅ Đã tự động chuyển đơn hàng COD ${order.orderCode} sang trạng thái đã thanh toán khi giao hàng`);
      }
    }

    order.statusHistory.push({ status, note, timestamp: new Date() });
    await order.save();

    // Tạo notification
    try {
      const statusMessages = {
        pending: "Đơn hàng của bạn đã được đặt thành công",
        confirmed: "Đơn hàng của bạn đã được xác nhận",
        packed: "Đơn hàng của bạn đã được đóng gói",
        shipped: "Đơn hàng của bạn đang được vận chuyển",
        delivered: "Đơn hàng của bạn đã được giao thành công",
        received: "Bạn đã xác nhận nhận hàng thành công",
        cancelled: "Đơn hàng của bạn đã bị hủy",
      };

      const statusIcons = {
        pending: "📦",
        confirmed: "✅",
        packed: "📦",
        shipped: "🚚",
        delivered: "🎉",
        received: "✅",
        cancelled: "❌",
      };

      const userId = order.userId?._id || order.userId;
      if (userId && statusMessages[status]) {
        await createNotification(userId, {
          type: "order",
          title: `Đơn hàng #${order.orderCode}`,
          message: statusMessages[status],
          relatedId: order._id,
          link: `/order/${order._id}`,
          icon: statusIcons[status] || "📦",
          metadata: {
            orderCode: order.orderCode,
            status,
          },
        });
      }
    } catch (notifError) {
      console.error(`⚠️ Lỗi khi tạo notification cho order:`, notifError);
    }

    // Gửi email khi delivered
    if (isFirstTimeDelivered) {
      try {
        let user = null;
        if (order.userId && typeof order.userId === 'object' && order.userId.email) {
          user = order.userId;
        } else if (order.userId) {
          user = await User.findById(order.userId).select("fullName email");
        } else if (order.userInfo) {
          user = {
            fullName: order.userInfo.fullName,
            email: order.userInfo.email
          };
        }

        if (user && user.email) {
          let userWithPreferences = user;
          if (order.userId && typeof order.userId === 'object' && order.userId._id) {
            userWithPreferences = await User.findById(order.userId._id).select("email fullName emailNotifications");
          } else if (order.userId) {
            userWithPreferences = await User.findById(order.userId).select("email fullName emailNotifications");
          }
          
          if (userWithPreferences && userWithPreferences.email) {
            await sendOrderDeliveredEmail(order, userWithPreferences);
          }
        }
      } catch (emailError) {
        console.error(`❌ Lỗi khi gửi email thông báo đơn hàng đã giao:`, emailError);
      }
    }

    return order;
  }

  // Xác nhận nhận hàng
  async confirmDelivery(orderId, userId) {
    const order = await orderRepository.findById(orderId);
    if (!order) {
      throw new Error("Không tìm thấy đơn hàng");
    }

    if (!order.userId || order.userId.toString() !== userId.toString()) {
      throw new Error("Bạn không có quyền xác nhận đơn hàng này");
    }

    const currentStatus = order.statusHistory && order.statusHistory.length > 0 
      ? order.statusHistory[order.statusHistory.length - 1]?.status 
      : null;
    
    if (currentStatus !== "delivered") {
      throw new Error(`Không thể xác nhận. Trạng thái hiện tại: ${currentStatus || "unknown"}. Chỉ có thể xác nhận khi đơn hàng đã được giao (delivered).`);
    }

    order.statusHistory.push({ 
      status: "received", 
      note: "Khách hàng đã xác nhận nhận hàng", 
      timestamp: new Date() 
    });

    // Xử lý stock và soldCount
    if (order.items && order.items.length > 0) {
      const bulkOps = [];
      
      for (const item of order.items) {
        let productId = null;
        if (item.productId) {
          if (typeof item.productId === 'string') {
            productId = item.productId;
          } else if (typeof item.productId === 'object' && item.productId._id) {
            productId = item.productId._id.toString();
          } else if (item.productId.toString) {
            productId = item.productId.toString();
          }
        }

        if (!productId) continue;

        const product = await Product.findById(productId);
        if (!product) continue;

        // Chỉ tăng soldCount, không giảm stock nữa vì stock đã được giảm khi tạo đơn hàng
        bulkOps.push({
          updateOne: {
            filter: { _id: productId },
            update: { $inc: { soldCount: item.quantity || 0 } }
          }
        });
      }

      if (bulkOps.length > 0) {
        try {
          await ProductRepository.bulkWrite(bulkOps);
        } catch (bulkError) {
          console.error("⚠️ Lỗi khi bulkWrite soldCount:", bulkError);
        }
      }
    }

    await order.save();

    // Tạo notification
    try {
      await createNotification(userId, {
        type: "order",
        title: `Đơn hàng #${order.orderCode}`,
        message: "Bạn đã xác nhận nhận hàng thành công. Bây giờ bạn có thể đánh giá sản phẩm!",
        relatedId: order._id,
        link: `/order/${order._id}`,
        icon: "✅",
        metadata: {
          orderCode: order.orderCode,
          status: "received",
        },
      });
    } catch (notifError) {
      console.error(`⚠️ Lỗi khi tạo notification:`, notifError);
    }

    return order;
  }

  // Lấy order theo ID
  async getOrderById(orderId) {
    const order = await orderRepository.findById(orderId, true);
    if (!order) throw new Error("Không tìm thấy đơn hàng");
    return order;
  }

  // Lấy orders theo seller
  async getOrdersBySeller(sellerId) {
    const store = await Store.findOne({ owner: sellerId });
    if (!store) {
      throw new Error("Bạn chưa có cửa hàng");
    }
    return await orderRepository.findByStoreId(store._id, true);
  }

  // Lấy order theo code
  async getOrderByCode(orderCode) {
    const order = await orderRepository.findByCode(orderCode, true);
    if (!order) throw new Error("Không tìm thấy đơn hàng");
    return order;
  }

  // Đánh dấu đã thanh toán
  async markOrderPaid(orderId, paymentId) {
    const order = await orderRepository.findById(orderId);
    if (!order) throw new Error("Order not found");

    await orderRepository.updatePaymentInfo(orderId, {
      status: "paid",
      paymentId: paymentId || "ONLINE_PAYMENT"
    });

    // Chuyển tiền vào ví chủ cửa hàng
    const { transferToStoreWallets } = require("../utils/walletService");
    try {
      const paymentMethod = order.paymentInfo.method || "ONLINE";
      await transferToStoreWallets(order.orderCode, paymentMethod, paymentId || "ONLINE_PAYMENT");
    } catch (walletError) {
      console.error(`[OrderService] ❌ Lỗi chuyển tiền vào ví:`, walletError);
    }

    const updatedOrder = await orderRepository.findById(orderId);
    return {
      orderId: updatedOrder._id,
      paymentInfo: updatedOrder.paymentInfo
    };
  }

  // Cập nhật phương thức thanh toán (chỉ đổi phương thức, không đánh dấu đã thanh toán)
  async updatePaymentMethod(orderId, userId, paymentMethod) {
    const order = await orderRepository.findById(orderId);
    if (!order) throw new Error("Không tìm thấy đơn hàng");

    // Kiểm tra quyền sở hữu
    const orderUserId = order.userId?._id || order.userId;
    if (orderUserId.toString() !== userId.toString()) {
      throw new Error("Bạn không có quyền cập nhật đơn hàng này");
    }

    // Kiểm tra trạng thái thanh toán - chỉ cho phép đổi nếu chưa thanh toán
    if (order.paymentInfo.status === "paid") {
      throw new Error("Không thể đổi phương thức thanh toán khi đơn hàng đã được thanh toán");
    }

    // Cập nhật payment method
    await orderRepository.updatePaymentMethod(orderId, paymentMethod);

    const updatedOrder = await orderRepository.findById(orderId);
    return {
      orderId: updatedOrder._id,
      paymentInfo: updatedOrder.paymentInfo
    };
  }

  // Yêu cầu trả lại hàng
  async requestReturn(orderId, userId, reason) {
    const order = await orderRepository.findById(orderId, true);
    if (!order) throw new Error("Không tìm thấy đơn hàng");

    // Kiểm tra quyền sở hữu
    const orderUserId = order.userId?._id || order.userId;
    if (orderUserId.toString() !== userId.toString()) {
      throw new Error("Bạn không có quyền yêu cầu trả lại đơn hàng này");
    }

    // Kiểm tra trạng thái đơn hàng
    const currentStatus = order.statusHistory && order.statusHistory.length > 0 
      ? order.statusHistory[order.statusHistory.length - 1]?.status 
      : null;

    if (currentStatus !== "received") {
      throw new Error("Chỉ có thể yêu cầu trả lại hàng khi đơn hàng đã được nhận (received)");
    }

    // Kiểm tra xem đã có yêu cầu trả lại chưa
    if (order.returnRequest && order.returnRequest.status) {
      throw new Error("Đơn hàng này đã có yêu cầu trả lại");
    }

    // Tìm ngày nhận hàng (received status)
    const receivedStatus = order.statusHistory.find(s => s.status === "received");
    if (!receivedStatus) {
      throw new Error("Không tìm thấy thông tin ngày nhận hàng");
    }

    const receivedDate = new Date(receivedStatus.timestamp);
    const now = new Date();
    const daysDiff = Math.floor((now - receivedDate) / (1000 * 60 * 60 * 24));

    // Kiểm tra trong vòng 3 ngày
    if (daysDiff > 3) {
      throw new Error(`Đã quá 3 ngày kể từ ngày nhận hàng. Bạn chỉ có thể trả lại hàng trong vòng 3 ngày sau khi nhận hàng.`);
    }

    // Tạo yêu cầu trả lại
    order.returnRequest = {
      requestedAt: new Date(),
      reason: reason || "Không hài lòng với sản phẩm",
      status: "pending",
    };

    order.statusHistory.push({
      status: "return_requested",
      note: `Yêu cầu trả lại hàng: ${reason || "Không hài lòng với sản phẩm"}`,
      timestamp: new Date(),
    });

    await order.save();

    // Tạo notification
    try {
      await createNotification(userId, {
        type: "order",
        title: `Đơn hàng #${order.orderCode}`,
        message: "Yêu cầu trả lại hàng của bạn đã được gửi. Vui lòng chờ xử lý.",
        relatedId: order._id,
        link: `/order/${order._id}`,
        icon: "↩️",
        metadata: {
          orderCode: order.orderCode,
          status: "return_requested",
        },
      });
    } catch (notifError) {
      console.error(`⚠️ Lỗi khi tạo notification:`, notifError);
    }

    return order;
  }

  // Xác nhận đã thu hồi sản phẩm (seller)
  async confirmReturnReceived(orderId, sellerId) {
    const order = await orderRepository.findById(orderId, true);
    if (!order) throw new Error("Không tìm thấy đơn hàng");

    // Kiểm tra yêu cầu trả lại
    if (!order.returnRequest || order.returnRequest.status !== "pending") {
      throw new Error("Không có yêu cầu trả lại hàng đang chờ xử lý");
    }

    // Kiểm tra quyền seller (phải là chủ cửa hàng của đơn hàng này)
    const store = await Store.findOne({ owner: sellerId });
    if (!store) {
      throw new Error("Bạn chưa có cửa hàng");
    }

    // Kiểm tra đơn hàng có thuộc cửa hàng của seller không
    const orderStoreIds = order.items.map(item => {
      const storeId = item.storeId?._id || item.storeId;
      return storeId ? storeId.toString() : null;
    }).filter(Boolean);

    if (!orderStoreIds.includes(store._id.toString())) {
      throw new Error("Bạn không có quyền xác nhận đơn hàng này");
    }

    // Xác nhận đã thu hồi sản phẩm
    order.returnRequest.status = "approved";
    order.returnRequest.processedAt = new Date();
    order.returnRequest.processedBy = sellerId;
    order.returnRequest.note = "Người bán đã xác nhận thu hồi sản phẩm";

    order.statusHistory.push({
      status: "returned",
      note: "Người bán đã xác nhận thu hồi sản phẩm. Tiền sẽ được hoàn lại cho người mua.",
      timestamp: new Date(),
    });

    // Hoàn tiền cho người mua
    const { refundOrder } = require("../utils/walletService");
    try {
      await refundOrder(order.orderCode, order.total, order.paymentInfo.method);
      console.log(`[OrderService] ✅ Đã hoàn tiền cho đơn hàng ${order.orderCode}`);
    } catch (refundError) {
      console.error(`[OrderService] ❌ Lỗi khi hoàn tiền:`, refundError);
      throw new Error("Lỗi khi hoàn tiền. Vui lòng thử lại sau.");
    }

    // Cập nhật stock (hoàn lại số lượng)
    if (order.items && order.items.length > 0) {
      for (const item of order.items) {
        const itemStoreId = item.storeId?._id || item.storeId;
        // Chỉ cập nhật stock cho sản phẩm của cửa hàng này
        if (!itemStoreId || itemStoreId.toString() !== store._id.toString()) {
          continue;
        }

        let productId = null;
        if (item.productId) {
          if (typeof item.productId === 'string') {
            productId = item.productId;
          } else if (typeof item.productId === 'object' && item.productId._id) {
            productId = item.productId._id.toString();
          } else if (item.productId.toString) {
            productId = item.productId.toString();
          }
        }

        if (!productId) continue;

        const product = await Product.findById(productId);
        if (!product) continue;

        // Hoàn lại stock
        if (item.variation?.variationId && item.variation?.optionId) {
          const variationIndex = product.variations.findIndex(
            v => v._id && v._id.toString() === item.variation.variationId.toString()
          );
          
          if (variationIndex !== -1) {
            const optionIndex = product.variations[variationIndex].options.findIndex(
              opt => opt._id && opt._id.toString() === item.variation.optionId.toString()
            );
            
            if (optionIndex !== -1) {
              const option = product.variations[variationIndex].options[optionIndex];
              option.stock = (option.stock || 0) + (item.quantity || 0);
              await product.save();
            }
          }
        } else {
          product.quantity = (product.quantity || 0) + (item.quantity || 0);
          await product.save();
        }

        // Giảm soldCount
        product.soldCount = Math.max(0, (product.soldCount || 0) - (item.quantity || 0));
        await product.save();
      }
    }

    // Tạo notification cho buyer
    const userId = order.userId?._id || order.userId;
    if (userId) {
      try {
        await createNotification(userId, {
          type: "order",
          title: `Đơn hàng #${order.orderCode}`,
          message: "Người bán đã xác nhận thu hồi sản phẩm. Tiền đã được hoàn vào ví của bạn.",
          relatedId: order._id,
          link: `/order/${order._id}`,
          icon: "✅",
          metadata: {
            orderCode: order.orderCode,
            status: "returned",
          },
        });
      } catch (notifError) {
        console.error(`⚠️ Lỗi khi tạo notification:`, notifError);
      }
    }

    await order.save();
    return order;
  }

  // Hủy đơn hàng (buyer)
  async cancelOrder(orderId, userId, reason) {
    const order = await orderRepository.findById(orderId, true);
    if (!order) throw new Error("Không tìm thấy đơn hàng");

    // Kiểm tra quyền sở hữu
    const orderUserId = order.userId?._id || order.userId;
    if (orderUserId.toString() !== userId.toString()) {
      throw new Error("Bạn không có quyền hủy đơn hàng này");
    }

    // Kiểm tra trạng thái đơn hàng
    const currentStatus = order.statusHistory && order.statusHistory.length > 0 
      ? order.statusHistory[order.statusHistory.length - 1]?.status 
      : null;

    // Kiểm tra xem đã bị hủy chưa
    const hasCancelledStatus = order.statusHistory.some(h => h.status === "cancelled");
    if (hasCancelledStatus || currentStatus === "cancelled") {
      throw new Error("Đơn hàng này đã bị hủy");
    }

    // Chỉ cho phép hủy khi ở trạng thái: pending, confirmed, packed
    const allowedStatuses = ["pending", "confirmed", "packed"];
    if (!allowedStatuses.includes(currentStatus)) {
      throw new Error(`Không thể hủy đơn hàng. Trạng thái hiện tại: ${currentStatus || "unknown"}. Chỉ có thể hủy khi đơn hàng ở trạng thái: Đặt hàng, Xác nhận, hoặc Đóng gói.`);
    }

    // Cập nhật trạng thái thành cancelled
    order.statusHistory.push({
      status: "cancelled",
      note: reason || "Khách hàng yêu cầu hủy đơn hàng",
      timestamp: new Date(),
    });

    // ✅ Sửa: Chỉ hoàn tiền nếu đã thanh toán (paid)
    // Nếu chưa thanh toán (pending) → vẫn cho hủy nhưng số tiền hoàn về là 0
    if (order.paymentInfo.status === "paid") {
      // Hoàn lại stock
      try {
        await this.restoreStock(order.items);
        console.log(`[OrderService] ✅ Đã hoàn lại stock cho đơn hàng ${order.orderCode}`);
      } catch (restoreError) {
        console.error(`[OrderService] ❌ Lỗi khi hoàn lại stock:`, restoreError);
        // Không throw error, vì đơn hàng vẫn cần được hủy
      }

      // Hoàn tiền cho người mua
      const { refundOrder } = require("../utils/walletService");
      try {
        await refundOrder(order.orderCode, order.total, order.paymentInfo.method);
        console.log(`[OrderService] ✅ Đã hoàn tiền cho đơn hàng ${order.orderCode}`);
      } catch (refundError) {
        console.error(`[OrderService] ❌ Lỗi khi hoàn tiền:`, refundError);
        // Không throw error, vì đơn hàng vẫn cần được hủy
      }
    } else {
      // ✅ Chưa thanh toán (pending) → không hoàn tiền (số tiền hoàn về là 0)
      // Chỉ hoàn lại stock nếu đã trừ (có thể đã trừ khi confirmed cho COD)
      const hasConfirmedStatus = order.statusHistory.some(h => h.status === "confirmed");
      if (hasConfirmedStatus && order.paymentInfo.method === "COD") {
        try {
          await this.restoreStock(order.items);
          console.log(`[OrderService] ✅ Đã hoàn lại stock cho đơn hàng COD ${order.orderCode}`);
        } catch (restoreError) {
          console.error(`[OrderService] ❌ Lỗi khi hoàn lại stock:`, restoreError);
        }
      }
      console.log(`[OrderService] ℹ️ Đơn hàng ${order.orderCode} chưa thanh toán, không hoàn tiền (số tiền hoàn về: 0)`);
    }

    await order.save();

    // Tạo notification
    try {
      await createNotification(userId, {
        type: "order",
        title: `Đơn hàng #${order.orderCode}`,
        message: "Đơn hàng của bạn đã được hủy thành công. " + (order.paymentInfo.status === "paid" ? "Tiền đã được hoàn vào ví của bạn." : ""),
        relatedId: order._id,
        link: `/order/${order._id}`,
        icon: "❌",
        metadata: {
          orderCode: order.orderCode,
          status: "cancelled",
        },
      });
    } catch (notifError) {
      console.error(`⚠️ Lỗi khi tạo notification:`, notifError);
    }

    return order;
  }

  // Xử lý trả lại hàng (admin/seller) - Giữ lại cho tương thích ngược
  async processReturn(orderId, processorId, action, note) {
    const order = await orderRepository.findById(orderId, true);
    if (!order) throw new Error("Không tìm thấy đơn hàng");

    // Kiểm tra yêu cầu trả lại
    if (!order.returnRequest || order.returnRequest.status !== "pending") {
      throw new Error("Không có yêu cầu trả lại hàng đang chờ xử lý");
    }

    if (action === "approved") {
      // Phê duyệt trả lại hàng
      order.returnRequest.status = "approved";
      order.returnRequest.processedAt = new Date();
      order.returnRequest.processedBy = processorId;
      order.returnRequest.note = note || "";

      order.statusHistory.push({
        status: "returned",
        note: `Đơn hàng đã được phê duyệt trả lại. ${note || ""}`,
        timestamp: new Date(),
      });

      // Hoàn tiền cho người mua
      const { refundOrder } = require("../utils/walletService");
      try {
        await refundOrder(order.orderCode, order.total, order.paymentInfo.method);
        console.log(`[OrderService] ✅ Đã hoàn tiền cho đơn hàng ${order.orderCode}`);
      } catch (refundError) {
        console.error(`[OrderService] ❌ Lỗi khi hoàn tiền:`, refundError);
        throw new Error("Lỗi khi hoàn tiền. Vui lòng thử lại sau.");
      }

      // Cập nhật stock (hoàn lại số lượng)
      if (order.items && order.items.length > 0) {
        for (const item of order.items) {
          let productId = null;
          if (item.productId) {
            if (typeof item.productId === 'string') {
              productId = item.productId;
            } else if (typeof item.productId === 'object' && item.productId._id) {
              productId = item.productId._id.toString();
            } else if (item.productId.toString) {
              productId = item.productId.toString();
            }
          }

          if (!productId) continue;

          const product = await Product.findById(productId);
          if (!product) continue;

          // Hoàn lại stock
          if (item.variation?.variationId && item.variation?.optionId) {
            const variationIndex = product.variations.findIndex(
              v => v._id && v._id.toString() === item.variation.variationId.toString()
            );
            
            if (variationIndex !== -1) {
              const optionIndex = product.variations[variationIndex].options.findIndex(
                opt => opt._id && opt._id.toString() === item.variation.optionId.toString()
              );
              
              if (optionIndex !== -1) {
                const option = product.variations[variationIndex].options[optionIndex];
                option.stock = (option.stock || 0) + (item.quantity || 0);
                await product.save();
              }
            }
          } else {
            product.quantity = (product.quantity || 0) + (item.quantity || 0);
            await product.save();
          }

          // Giảm soldCount
          product.soldCount = Math.max(0, (product.soldCount || 0) - (item.quantity || 0));
          await product.save();
        }
      }

      // Tạo notification cho buyer
      const userId = order.userId?._id || order.userId;
      if (userId) {
        try {
          await createNotification(userId, {
            type: "order",
            title: `Đơn hàng #${order.orderCode}`,
            message: "Yêu cầu trả lại hàng của bạn đã được phê duyệt. Tiền sẽ được hoàn lại trong vòng 5-7 ngày làm việc.",
            relatedId: order._id,
            link: `/order/${order._id}`,
            icon: "✅",
            metadata: {
              orderCode: order.orderCode,
              status: "returned",
            },
          });
        } catch (notifError) {
          console.error(`⚠️ Lỗi khi tạo notification:`, notifError);
        }
      }

    } else if (action === "rejected") {
      // Từ chối trả lại hàng
      order.returnRequest.status = "rejected";
      order.returnRequest.processedAt = new Date();
      order.returnRequest.processedBy = processorId;
      order.returnRequest.note = note || "";

      order.statusHistory.push({
        status: "received",
        note: `Yêu cầu trả lại hàng đã bị từ chối. ${note || ""}`,
        timestamp: new Date(),
      });

      // Tạo notification cho buyer
      const userId = order.userId?._id || order.userId;
      if (userId) {
        try {
          await createNotification(userId, {
            type: "order",
            title: `Đơn hàng #${order.orderCode}`,
            message: `Yêu cầu trả lại hàng của bạn đã bị từ chối. ${note || ""}`,
            relatedId: order._id,
            link: `/order/${order._id}`,
            icon: "❌",
            metadata: {
              orderCode: order.orderCode,
              status: "received",
            },
          });
        } catch (notifError) {
          console.error(`⚠️ Lỗi khi tạo notification:`, notifError);
        }
      }
    } else {
      throw new Error("Hành động không hợp lệ. Chỉ có thể 'approved' hoặc 'rejected'");
    }

    await order.save();
    return order;
  }

  // Seller từ chối yêu cầu trả lại hàng
  async rejectReturn(orderId, sellerId, reason) {
    const order = await orderRepository.findById(orderId, true);
    if (!order) throw new Error("Không tìm thấy đơn hàng");

    // Kiểm tra yêu cầu trả lại
    if (!order.returnRequest || order.returnRequest.status !== "pending") {
      throw new Error("Không có yêu cầu trả lại hàng đang chờ xử lý");
    }

    // Kiểm tra quyền seller (phải là chủ cửa hàng của đơn hàng này)
    const store = await Store.findOne({ owner: sellerId });
    if (!store) {
      throw new Error("Bạn chưa có cửa hàng");
    }

    // Kiểm tra đơn hàng có thuộc cửa hàng của seller không
    const orderStoreIds = order.items.map(item => {
      const storeId = item.storeId?._id || item.storeId;
      return storeId ? storeId.toString() : null;
    }).filter(Boolean);

    if (!orderStoreIds.includes(store._id.toString())) {
      throw new Error("Bạn không có quyền từ chối đơn hàng này");
    }

    // Từ chối yêu cầu trả lại
    order.returnRequest.status = "rejected";
    order.returnRequest.processedAt = new Date();
    order.returnRequest.processedBy = sellerId;
    order.returnRequest.note = reason || "Người bán đã từ chối yêu cầu trả lại hàng";

    order.statusHistory.push({
      status: "received",
      note: `Yêu cầu trả lại hàng đã bị từ chối. ${reason || ""}`,
      timestamp: new Date(),
    });

    // Tạo notification cho buyer
    const userId = order.userId?._id || order.userId;
    if (userId) {
      const { createNotification } = require("./NotificationService");
      try {
        await createNotification(userId, {
          type: "order",
          title: `Đơn hàng #${order.orderCode}`,
          message: `Yêu cầu trả lại hàng của bạn đã bị từ chối. ${reason || "Vui lòng liên hệ người bán để biết thêm chi tiết."}`,
          relatedId: order._id,
          link: `/order/${order._id}`,
          icon: "❌",
          metadata: {
            orderCode: order.orderCode,
            status: "return_rejected",
          },
        });
      } catch (notifError) {
        console.error(`⚠️ Lỗi khi tạo notification:`, notifError);
      }
    }

    await order.save();
    return order;
  }
}

module.exports = new OrderService();

