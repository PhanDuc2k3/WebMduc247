const Order = require("../models/Order");
const Cart = require("../models/Cart");
const mongoose = require("mongoose");
const Voucher = require("../models/Voucher");
const User = require("../models/Users"); 
const Product = require("../models/Product");
const Store = require("../models/Store");
const { sendOrderConfirmationEmail } = require("../utils/emailService");
exports.createOrder = async (req, res) => {
  try {
    const userId = req.user.userId;
    const {
      shippingAddress,
      paymentMethod,
      note,
      shippingFee = 0,
      voucherCode, // Giữ lại cho tương thích ngược
      productVoucherCode, // Voucher giảm giá sản phẩm
      freeshipVoucherCode, // Voucher miễn phí ship
      selectedItems,
      items, // Items trực tiếp từ "Mua ngay" (không cần cart)
    } = req.body;

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: "Người dùng không tồn tại" });

    let filteredItems = [];

    // Nếu có items trực tiếp (từ "Mua ngay"), tạo order từ items đó
    if (items && Array.isArray(items) && items.length > 0) {
      // Kiểm tra xem items đã có đầy đủ thông tin chưa (từ cart item)
      const hasFullInfo = items[0] && items[0].name && items[0].price !== undefined;
      
      if (hasFullInfo) {
        // Items đã có đầy đủ thông tin (từ cart), dùng trực tiếp
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
        // Items chỉ có productId, quantity, variation - cần query từ database
        const productIds = items.map(item => {
          return typeof item.productId === 'object' ? item.productId._id : item.productId;
        });
        const products = await Product.find({ _id: { $in: productIds } }).populate('store');
        
        // Tạo cart items từ products
        filteredItems = items.map(item => {
          const productId = typeof item.productId === 'object' ? item.productId._id : item.productId;
          const product = products.find(p => p._id.toString() === productId.toString());
          if (!product) {
            throw new Error(`Không tìm thấy sản phẩm với ID: ${productId}`);
          }

          // Tính giá
          let price = product.price;
          let salePrice = product.salePrice || product.price;
          let additionalPrice = 0;
          let variationData = null;

          // Xử lý variation nếu có
          if (item.variation && product.variations && product.variations.length > 0) {
            // Format 1: có variationId và optionId (từ cart item)
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
            } 
            // Format 2: có color và size trực tiếp (từ cart item đã được transform)
            else if (item.variation.color || item.variation.size) {
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
      // Logic cũ: lấy từ cart
      const cart = await Cart.findOne({ userId }).populate("items.productId");
      if (!cart || cart.items.length === 0)
        return res.status(400).json({ message: "Giỏ hàng trống" });

      // Lọc các sản phẩm được chọn
      filteredItems = cart.items;
      if (selectedItems && Array.isArray(selectedItems)) {
        filteredItems = cart.items.filter(item => selectedItems.includes(item._id.toString()));
      }
      if (filteredItems.length === 0)
        return res.status(400).json({ message: "Không có sản phẩm nào được chọn" });
    }

    // Voucher - hỗ trợ cả 2 loại voucher cùng lúc
    let discount = 0;
    let shippingDiscount = 0;
    let productVoucher = null;
    let freeshipVoucher = null;
    let oldVoucher = null; // Cho tương thích ngược

    const now = new Date();
    const subtotalFiltered = filteredItems.reduce((sum, item) => sum + item.subtotal, 0);

    // Xử lý voucher cũ (tương thích ngược)
    if (voucherCode && !productVoucherCode && !freeshipVoucherCode) {
      oldVoucher = await Voucher.findOne({ code: voucherCode.toUpperCase(), isActive: true });
      if (oldVoucher) {
        if (oldVoucher.startDate > now || oldVoucher.endDate < now)
          return res.status(400).json({ message: "Voucher chưa bắt đầu hoặc đã hết hạn" });
        if (subtotalFiltered < oldVoucher.minOrderValue)
          return res.status(400).json({ message: `Đơn hàng tối thiểu ${oldVoucher.minOrderValue}₫` });

        const voucherType = oldVoucher.voucherType || "product";
        if (voucherType === "freeship") {
          freeshipVoucher = oldVoucher;
        } else {
          productVoucher = oldVoucher;
        }
      }
    }

    // Xử lý product voucher
    if (productVoucherCode) {
      productVoucher = await Voucher.findOne({ code: productVoucherCode.toUpperCase(), isActive: true, voucherType: "product" });
      if (!productVoucher) return res.status(400).json({ message: "Voucher giảm giá sản phẩm không hợp lệ" });
      if (productVoucher.startDate > now || productVoucher.endDate < now)
        return res.status(400).json({ message: "Voucher giảm giá sản phẩm chưa bắt đầu hoặc đã hết hạn" });
      if (subtotalFiltered < productVoucher.minOrderValue)
        return res.status(400).json({ message: `Đơn hàng tối thiểu ${productVoucher.minOrderValue}₫ để sử dụng voucher này` });

      // Tính discount cho product voucher
      let calculatedDiscount = 0;
      if (productVoucher.discountType === "fixed") {
        calculatedDiscount = productVoucher.discountValue;
      } else {
        calculatedDiscount = (subtotalFiltered * productVoucher.discountValue) / 100;
        if (productVoucher.maxDiscount) {
          calculatedDiscount = Math.min(calculatedDiscount, productVoucher.maxDiscount);
        }
      }
      discount = Math.min(calculatedDiscount, subtotalFiltered);

      productVoucher.usedCount = (productVoucher.usedCount || 0) + 1;
      productVoucher.usersUsed = productVoucher.usersUsed || [];
      productVoucher.usersUsed.push(userId);
      await productVoucher.save();
    }

    // Xử lý freeship voucher
    if (freeshipVoucherCode) {
      freeshipVoucher = await Voucher.findOne({ code: freeshipVoucherCode.toUpperCase(), isActive: true, voucherType: "freeship" });
      if (!freeshipVoucher) return res.status(400).json({ message: "Voucher miễn phí ship không hợp lệ" });
      if (freeshipVoucher.startDate > now || freeshipVoucher.endDate < now)
        return res.status(400).json({ message: "Voucher miễn phí ship chưa bắt đầu hoặc đã hết hạn" });
      if (subtotalFiltered < freeshipVoucher.minOrderValue)
        return res.status(400).json({ message: `Đơn hàng tối thiểu ${freeshipVoucher.minOrderValue}₫ để sử dụng voucher này` });

      // Tính discount cho freeship voucher
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
      freeshipVoucher.usersUsed.push(userId);
      await freeshipVoucher.save();
    }

    // Fallback shippingAddress
    const sa = shippingAddress || {};
    const shipping = {
      fullName: sa.fullName || user.fullName,
      phone: sa.phone || user.phone,
      address: sa.address || `${sa.street || ""}, ${sa.city || ""}`.trim(),
    };
    if (!shipping.fullName || !shipping.phone || !shipping.address) {
      return res.status(400).json({ message: "Vui lòng cung cấp đầy đủ thông tin giao hàng" });
    }

    const subtotal = filteredItems.reduce((sum, item) => sum + item.subtotal, 0);
    
    // Đảm bảo discount không vượt quá subtotal (double check)
    const finalDiscount = Math.min(discount, subtotal);
    // Đảm bảo shippingDiscount không vượt quá shippingFee (double check)
    const finalShippingDiscount = Math.min(shippingDiscount, shippingFee);
    
    // Tính total: subtotal - discount + shippingFee - shippingDiscount
    // Với product voucher: discount chỉ trừ subtotal, shippingDiscount = 0
    // Với freeship voucher: discount = 0, shippingDiscount chỉ trừ shippingFee
    const total = Math.max(0, subtotal - finalDiscount + shippingFee - finalShippingDiscount);
    const orderCode = "ORD-" + Date.now();

    const order = new Order({
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
      discount: finalDiscount,
      shippingDiscount: finalShippingDiscount,
      total,
      // Lưu cả 2 voucher mới
      productVoucher: productVoucher ? productVoucher._id : null,
      productVoucherCode: productVoucher ? productVoucher.code : "",
      freeshipVoucher: freeshipVoucher ? freeshipVoucher._id : null,
      freeshipVoucherCode: freeshipVoucher ? freeshipVoucher.code : "",
      // Giữ lại cho tương thích ngược
      voucher: oldVoucher ? oldVoucher._id : (productVoucher ? productVoucher._id : (freeshipVoucher ? freeshipVoucher._id : null)),
      voucherCode: oldVoucher ? oldVoucher.code : (productVoucher ? productVoucher.code : (freeshipVoucher ? freeshipVoucher.code : "")),
      note: note || "",
    });

    await order.save();

    // Chỉ xóa items khỏi cart nếu order được tạo từ cart (không phải từ "Mua ngay")
    if (!items || !Array.isArray(items) || items.length === 0) {
      const cart = await Cart.findOne({ userId });
      if (cart) {
        // Xóa các item đã đặt ra khỏi cart
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

    // Gửi email xác nhận đơn hàng
    try {
      await sendOrderConfirmationEmail(order, user);
    } catch (emailError) {
      console.error('Error sending order confirmation email:', emailError);
      // Không throw error để không ảnh hưởng đến việc tạo order
      // Order đã được tạo thành công, chỉ là không gửi được email
    }

    // Lấy cart để trả về (nếu có)
    let cartData = null;
    if (!items || !Array.isArray(items) || items.length === 0) {
      cartData = await Cart.findOne({ userId });
    }

    res.status(201).json({ 
      message: "Tạo đơn hàng thành công", 
      order, 
      cart: cartData 
    });

  } catch (error) {
    console.error("Lỗi createOrder:", error);
    res.status(500).json({ message: error.message });
  }
};
exports.getMyOrders = async (req, res) => {
  try {
    const userId = req.user.userId;
    const orders = await Order.find({ userId }).sort({ createdAt: -1 });
    res.status(200).json(orders);
  } catch (error) {
    console.error("Lỗi getMyOrders:", error);
    res.status(500).json({ message: "Lỗi server" });
  }
};

exports.getAllOrders = async (req, res) => {
  try {
    const orders = await Order.find().populate("userId", "fullName email");
    res.status(200).json(orders);
  } catch (error) {
    console.error("Lỗi getAllOrders:", error);
    res.status(500).json({ message: "Lỗi server" });
  }
};

exports.updateOrderStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, note } = req.body;

    // Kiểm tra trạng thái hợp lệ
    const validStatuses = ["pending", "confirmed", "packed", "shipped", "delivered", "cancelled"];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ message: "Trạng thái không hợp lệ" });
    }

    const order = await Order.findById(id);
    if (!order) return res.status(404).json({ message: "Không tìm thấy đơn hàng" });

    // Thêm lịch sử trạng thái
    order.statusHistory.push({ status, note, timestamp: new Date() });

    // ✅ Nếu trạng thái là delivered, tăng soldCount và trừ stock
    if (status === "delivered") {
      // Tăng soldCount
      const bulkOps = order.items.map(item => ({
        updateOne: {
          filter: { _id: item.productId },
          update: { $inc: { soldCount: item.quantity } }
        }
      }));

      if (bulkOps.length > 0) {
        await Product.bulkWrite(bulkOps);
      }

      // Trừ stock cho từng sản phẩm
      for (const item of order.items) {
        const product = await Product.findById(item.productId);
        if (!product) continue;

        // Nếu có variation và option
        if (item.variation?.variationId && item.variation?.optionId) {
          const variationIndex = product.variations.findIndex(
            v => v._id?.toString() === item.variation.variationId.toString()
          );
          
          if (variationIndex !== -1) {
            const optionIndex = product.variations[variationIndex].options.findIndex(
              opt => opt._id?.toString() === item.variation.optionId.toString()
            );
            
            if (optionIndex !== -1) {
              const option = product.variations[variationIndex].options[optionIndex];
              option.stock = Math.max(0, option.stock - item.quantity);
              await product.save();
              continue;
            }
          }
        }

        // Nếu không có variation, trừ quantity tổng
        product.quantity = Math.max(0, product.quantity - item.quantity);
        await product.save();
      }
    }

    await order.save();

    res.status(200).json({ message: "Cập nhật trạng thái thành công", order });
  } catch (error) {
    console.error("Lỗi updateOrderStatus:", error);
    res.status(500).json({ message: "Lỗi server" });
  }
};

// Buyer xác nhận đã nhận hàng
exports.confirmDelivery = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.userId;

    const order = await Order.findById(id);
    if (!order) return res.status(404).json({ message: "Không tìm thấy đơn hàng" });

    // Kiểm tra quyền: chỉ buyer của order mới được xác nhận
    if (order.userId.toString() !== userId.toString()) {
      return res.status(403).json({ message: "Bạn không có quyền xác nhận đơn hàng này" });
    }

    // Kiểm tra trạng thái hiện tại phải là "shipped"
    const currentStatus = order.statusHistory[order.statusHistory.length - 1]?.status;
    if (currentStatus !== "shipped") {
      return res.status(400).json({ 
        message: `Không thể xác nhận. Trạng thái hiện tại: ${currentStatus}. Chỉ có thể xác nhận khi đơn hàng đang giao.` 
      });
    }

    // Cập nhật trạng thái thành "delivered"
    order.statusHistory.push({ 
      status: "delivered", 
      note: "Khách hàng đã xác nhận nhận hàng", 
      timestamp: new Date() 
    });

    // Tăng soldCount và trừ stock
    const bulkOps = order.items.map(item => ({
      updateOne: {
        filter: { _id: item.productId },
        update: { $inc: { soldCount: item.quantity } }
      }
    }));

    if (bulkOps.length > 0) {
      await Product.bulkWrite(bulkOps);
    }

    // Trừ stock cho từng sản phẩm
    for (const item of order.items) {
      const product = await Product.findById(item.productId);
      if (!product) continue;

      // Nếu có variation và option
      if (item.variation?.variationId && item.variation?.optionId) {
        const variationIndex = product.variations.findIndex(
          v => v._id?.toString() === item.variation.variationId.toString()
        );
        
        if (variationIndex !== -1) {
          const optionIndex = product.variations[variationIndex].options.findIndex(
            opt => opt._id?.toString() === item.variation.optionId.toString()
          );
          
          if (optionIndex !== -1) {
            const option = product.variations[variationIndex].options[optionIndex];
            option.stock = Math.max(0, option.stock - item.quantity);
            await product.save();
            continue;
          }
        }
      }

      // Nếu không có variation, trừ quantity tổng
      product.quantity = Math.max(0, product.quantity - item.quantity);
      await product.save();
    }

    await order.save();

    res.status(200).json({ message: "Xác nhận nhận hàng thành công", order });
  } catch (error) {
    console.error("Lỗi confirmDelivery:", error);
    res.status(500).json({ message: "Lỗi server" });
  }
};

exports.getOrderById = async (req, res) => {
  try {
    const { id } = req.params;
    const order = await Order.findById(id).populate("userId", "fullName email phone");
    if (!order) return res.status(404).json({ message: "Không tìm thấy đơn hàng" });

    res.status(200).json(order);
  } catch (error) {
    console.error("Lỗi getOrderById:", error);
    res.status(500).json({ message: "Lỗi server" });
  }
};

exports.getOrdersBySeller = async (req, res) => {
  try {
    const sellerId = req.user.userId;

    // 1️⃣ Tìm store dựa trên owner
    const store = await Store.findOne({ owner: sellerId });
    if (!store) {
      return res.status(400).json({ message: "Bạn chưa có cửa hàng" });
    }
    const storeId = store._id;

    // 2️⃣ Lấy orders có ít nhất 1 item thuộc store
    const orders = await Order.find({ "items.storeId": storeId })
      .sort({ createdAt: -1 })
      .populate("userId", "fullName email phone");

    res.status(200).json(orders);
  } catch (error) {
    console.error("Lỗi getOrdersBySeller:", error);
    res.status(500).json({ message: "Lỗi server" });
  }
};




exports.getOrderByCode = async (req, res) => {
  try {
    const { orderCode } = req.params;
    const order = await Order.findOne({ orderCode }).populate("userId", "fullName email phone");
    if (!order) return res.status(404).json({ message: "Không tìm thấy đơn hàng" });
    res.status(200).json(order);
  } catch (error) {
    console.error("Lỗi getOrderByCode:", error);
    res.status(500).json({ message: "Lỗi server" });
  }
};

exports.markOrderPaid = async (req, res) => {
  try {
    const orderId = req.params.id;
    const order = await Order.findById(orderId);
    if (!order) return res.status(404).json({ message: "Order not found" });

    order.paymentInfo.status = "paid";
    order.paymentInfo.paymentId = req.body.paymentId || "ONLINE_PAYMENT";
    order.statusHistory.push({ status: "paid", note: "Thanh toán online thành công", timestamp: new Date() });

    await order.save();

    // Chuyển tiền vào ví chủ cửa hàng
    const { transferToStoreWallets } = require("../utils/walletService");
    try {
      const paymentMethod = order.paymentInfo.method || "ONLINE";
      await transferToStoreWallets(order.orderCode, paymentMethod, req.body.paymentId || "ONLINE_PAYMENT");
      console.log(`[OrderController] ✅ Đã chuyển tiền vào ví chủ cửa hàng cho order ${order.orderCode}`);
    } catch (walletError) {
      console.error(`[OrderController] ❌ Lỗi chuyển tiền vào ví:`, walletError);
      // Không throw error để không ảnh hưởng đến response
    }

    return res.json({ message: "Order marked as paid", orderId: order._id, paymentInfo: order.paymentInfo });
  } catch (err) {
    console.error("Lỗi markOrderPaid:", err);
    return res.status(500).json({ message: "Server error", details: err.message });
  }
};
