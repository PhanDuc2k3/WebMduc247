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

    const total = Math.max(0, subtotal - voucherResult.discount + shippingFee - voucherResult.shippingDiscount);
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
    const validStatuses = ["pending", "confirmed", "packed", "shipped", "delivered", "received", "cancelled"];
    if (!validStatuses.includes(status)) {
      throw new Error("Trạng thái không hợp lệ");
    }

    const order = await orderRepository.findById(orderId, true);
    if (!order) throw new Error("Không tìm thấy đơn hàng");

    const previousStatus = order.statusHistory.length > 0 
      ? order.statusHistory[order.statusHistory.length - 1]?.status 
      : null;

    const isFirstTimeDelivered = status === "delivered" && previousStatus !== "delivered";

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

        bulkOps.push({
          updateOne: {
            filter: { _id: productId },
            update: { $inc: { soldCount: item.quantity || 0 } }
          }
        });

        // Xử lý variation stock
        let stockUpdated = false;
        
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
              option.stock = Math.max(0, (option.stock || 0) - (item.quantity || 0));
              await product.save();
              stockUpdated = true;
            }
          }
        } else if (item.variation?.color || item.variation?.size) {
          const variationIndex = product.variations.findIndex(
            v => v.color && v.color.toLowerCase() === (item.variation.color || '').toLowerCase()
          );
          
          if (variationIndex !== -1) {
            const optionIndex = product.variations[variationIndex].options.findIndex(
              opt => opt.name && opt.name.toLowerCase() === (item.variation.size || '').toLowerCase()
            );
            
            if (optionIndex !== -1) {
              const option = product.variations[variationIndex].options[optionIndex];
              option.stock = Math.max(0, (option.stock || 0) - (item.quantity || 0));
              await product.save();
              stockUpdated = true;
            }
          }
        }

        if (!stockUpdated) {
          product.quantity = Math.max(0, (product.quantity || 0) - (item.quantity || 0));
          await product.save();
        }
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
}

module.exports = new OrderService();

