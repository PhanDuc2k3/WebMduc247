const Wallet = require('../models/Wallet');
const Store = require('../models/Store');
const Order = require('../models/Order');
const User = require('../models/Users');

/**
 * Chuyển tiền vào ví chủ cửa hàng khi thanh toán thành công
 * @param {String} orderCode - Mã đơn hàng
 * @param {String} paymentMethod - Phương thức thanh toán (MOMO, VIETQR, WALLET)
 * @param {String} paymentId - ID giao dịch thanh toán
 * @returns {Promise<Object>} Kết quả chuyển tiền
 */
const transferToStoreWallets = async (orderCode, paymentMethod = 'ONLINE', paymentId = '') => {
  try {
    // Lấy đơn hàng với thông tin items
    const order = await Order.findOne({ orderCode }).populate('items.storeId');
    
    if (!order) {
      throw new Error(`Order ${orderCode} not found`);
    }

    // Kiểm tra xem đã chuyển tiền chưa (tránh chuyển trùng)
    if (order.paymentInfo.status !== 'paid') {
      console.log(`[walletService] Order ${orderCode} chưa được thanh toán, bỏ qua chuyển tiền`);
      return { success: false, message: 'Order chưa được thanh toán' };
    }

    // Nhóm items theo storeId và tính tổng tiền cho mỗi store
    const storeAmounts = {};
    
    order.items.forEach(item => {
      const storeId = item.storeId?._id || item.storeId;
      if (!storeId) return;

      if (!storeAmounts[storeId]) {
        storeAmounts[storeId] = {
          storeId: storeId,
          amount: 0,
          items: []
        };
      }

      // Tính tiền cho item này (subtotal của item)
      const itemAmount = item.subtotal || (item.salePrice || item.price) * item.quantity;
      storeAmounts[storeId].amount += itemAmount;
      storeAmounts[storeId].items.push({
        productId: item.productId,
        name: item.name,
        quantity: item.quantity,
        amount: itemAmount
      });
    });

    // Tính shipping fee cho mỗi store (chia đều nếu có nhiều store)
    const storeIds = Object.keys(storeAmounts);
    const shippingFeePerStore = storeIds.length > 0 ? order.shippingFee / storeIds.length : 0;
    const discountPerStore = storeIds.length > 0 ? order.discount / storeIds.length : 0;
    const shippingDiscountPerStore = storeIds.length > 0 ? order.shippingDiscount / storeIds.length : 0;

    // Chuyển tiền vào ví của từng chủ cửa hàng
    const transferResults = [];
    
    for (const storeId of storeIds) {
      const storeData = storeAmounts[storeId];
      
      // Lấy thông tin store và owner
      const store = await Store.findById(storeId).populate('owner');
      if (!store || !store.owner) {
        console.error(`[walletService] Store ${storeId} không tồn tại hoặc không có owner`);
        continue;
      }

      const ownerId = store.owner._id || store.owner;
      
      // Tính tổng tiền cho store này
      // Số tiền = subtotal của items - discount + shipping fee - shipping discount
      const storeSubtotal = storeData.amount;
      const storeShippingFee = shippingFeePerStore;
      const storeDiscount = discountPerStore;
      const storeShippingDiscount = shippingDiscountPerStore;
      
      // Tính phí sàn 10% trên subtotal của store này (tỷ lệ với tổng phí sàn)
      const storePlatformFee = storeIds.length > 0 ? (order.platformFee || 0) * (storeSubtotal / order.subtotal) : 0;
      
      // Số tiền chủ cửa hàng nhận = subtotal - discount + shipping fee - shipping discount - phí sàn
      const storeTotal = Math.max(0, storeSubtotal - storeDiscount + storeShippingFee - storeShippingDiscount - storePlatformFee);

      // Tìm hoặc tạo ví cho chủ cửa hàng
      let wallet = await Wallet.findOne({ userId: ownerId });
      if (!wallet) {
        wallet = new Wallet({ userId: ownerId, balance: 0, transactions: [] });
        await wallet.save();
      }

      // Thêm transaction vào ví
      const transaction = {
        type: 'deposit',
        amount: storeTotal,
        method: paymentMethod.toLowerCase(),
        orderCode: orderCode,
        description: `Thanh toán đơn hàng ${orderCode} từ ${store.name}`,
        status: 'completed',
        paymentId: paymentId || ''
      };

      wallet.transactions.push(transaction);
      wallet.balance += storeTotal;
      await wallet.save();

      transferResults.push({
        storeId: storeId,
        storeName: store.name,
        ownerId: ownerId,
        amount: storeTotal,
        success: true
      });

      console.log(`[walletService] ✅ Đã chuyển ${storeTotal.toLocaleString('vi-VN')} VNĐ vào ví của chủ cửa hàng ${store.name} (Owner: ${ownerId})`);
      console.log(`[walletService] 💰 Phí sàn ${storePlatformFee.toLocaleString('vi-VN')} VNĐ đã được trừ khỏi số tiền của cửa hàng ${store.name}`);
    }

    // Chuyển phí sàn vào ví admin
    let totalPlatformFee = order.platformFee || 0;
    if (totalPlatformFee > 0) {
      try {
        // Tìm admin duy nhất trong hệ thống
        const admin = await User.findOne({ role: 'admin' });
        if (!admin) {
          console.warn('[walletService] ⚠️ Không tìm thấy admin để chuyển phí sàn');
        } else {
          // Tìm hoặc tạo ví cho admin
          let adminWallet = await Wallet.findOne({ userId: admin._id });
          if (!adminWallet) {
            adminWallet = new Wallet({ userId: admin._id, balance: 0, transactions: [] });
            await adminWallet.save();
          }

          // Thêm transaction phí sàn vào ví admin
          const platformFeeTransaction = {
            type: 'deposit',
            amount: totalPlatformFee,
            method: paymentMethod.toLowerCase(),
            orderCode: orderCode,
            description: `Phí sàn từ đơn hàng ${orderCode}`,
            status: 'completed',
            paymentId: paymentId || ''
          };

          adminWallet.transactions.push(platformFeeTransaction);
          adminWallet.balance += totalPlatformFee;
          await adminWallet.save();

          console.log(`[walletService] ✅ Đã chuyển ${totalPlatformFee.toLocaleString('vi-VN')} VNĐ phí sàn vào ví admin (${admin.email})`);
        }
      } catch (adminError) {
        console.error('[walletService] ❌ Lỗi khi chuyển phí sàn vào ví admin:', adminError);
      }
    }

    return {
      success: true,
      message: `Đã chuyển tiền vào ví của ${transferResults.length} cửa hàng`,
      transfers: transferResults,
      platformFee: totalPlatformFee
    };

  } catch (error) {
    console.error('[walletService] Lỗi khi chuyển tiền vào ví chủ cửa hàng:', error);
    throw error;
  }
};

/**
 * Hoàn tiền cho người mua khi trả lại hàng
 * @param {String} orderCode - Mã đơn hàng
 * @param {Number} amount - Số tiền cần hoàn
 * @param {String} paymentMethod - Phương thức thanh toán ban đầu
 * @returns {Promise<Object>} Kết quả hoàn tiền
 */
const refundOrder = async (orderCode, amount, paymentMethod = 'COD') => {
  try {
    const order = await Order.findOne({ orderCode }).populate('userId');
    
    if (!order) {
      throw new Error(`Order ${orderCode} not found`);
    }

    const userId = order.userId?._id || order.userId;
    if (!userId) {
      throw new Error('Không tìm thấy thông tin người mua');
    }

    // Tìm hoặc tạo ví cho người mua
    let wallet = await Wallet.findOne({ userId });
    if (!wallet) {
      wallet = new Wallet({ userId, balance: 0, transactions: [] });
      await wallet.save();
    }

    // Tính số tiền cần hoàn (trừ phí sàn nếu có)
    // Nếu thanh toán bằng COD, chỉ hoàn tiền vào ví
    // Nếu thanh toán online, hoàn về phương thức thanh toán gốc
    const refundAmount = amount;

    // Thêm transaction hoàn tiền vào ví
    const refundTransaction = {
      type: 'refund',
      amount: refundAmount,
      method: paymentMethod.toLowerCase(),
      orderCode: orderCode,
      description: `Hoàn tiền đơn hàng ${orderCode} (trả lại hàng)`,
      status: 'completed',
      paymentId: ''
    };

    wallet.transactions.push(refundTransaction);
    wallet.balance += refundAmount;
    await wallet.save();

    // Trừ tiền từ ví chủ cửa hàng (nếu đã chuyển)
    // Nhóm items theo storeId
    const storeAmounts = {};
    
    order.items.forEach(item => {
      const storeId = item.storeId?._id || item.storeId;
      if (!storeId) return;

      if (!storeAmounts[storeId]) {
        storeAmounts[storeId] = {
          storeId: storeId,
          amount: 0,
        };
      }

      const itemAmount = item.subtotal || (item.salePrice || item.price) * item.quantity;
      storeAmounts[storeId].amount += itemAmount;
    });

    // Trừ tiền từ ví chủ cửa hàng
    const storeIds = Object.keys(storeAmounts);
    const shippingFeePerStore = storeIds.length > 0 ? order.shippingFee / storeIds.length : 0;
    const discountPerStore = storeIds.length > 0 ? order.discount / storeIds.length : 0;
    const shippingDiscountPerStore = storeIds.length > 0 ? order.shippingDiscount / storeIds.length : 0;
    const platformFeePerStore = storeIds.length > 0 ? (order.platformFee || 0) * (storeAmounts[storeIds[0]].amount / order.subtotal) : 0;

    for (const storeId of storeIds) {
      const storeData = storeAmounts[storeId];
      const store = await Store.findById(storeId).populate('owner');
      if (!store || !store.owner) continue;

      const ownerId = store.owner._id || store.owner;
      const storeSubtotal = storeData.amount;
      const storeTotal = Math.max(0, storeSubtotal - discountPerStore + shippingFeePerStore - shippingDiscountPerStore - platformFeePerStore);

      // Tìm ví chủ cửa hàng
      const storeWallet = await Wallet.findOne({ userId: ownerId });
      if (storeWallet && storeWallet.balance >= storeTotal) {
        // Trừ tiền từ ví chủ cửa hàng
        const refundStoreTransaction = {
          type: 'withdraw',
          amount: storeTotal,
          method: paymentMethod.toLowerCase(),
          orderCode: orderCode,
          description: `Hoàn tiền đơn hàng ${orderCode} (trả lại hàng)`,
          status: 'completed',
          paymentId: ''
        };

        storeWallet.transactions.push(refundStoreTransaction);
        storeWallet.balance = Math.max(0, storeWallet.balance - storeTotal);
        await storeWallet.save();

        console.log(`[walletService] ✅ Đã trừ ${storeTotal.toLocaleString('vi-VN')} VNĐ từ ví chủ cửa hàng ${store.name}`);
      }
    }

    // Trừ phí sàn từ ví admin
    const totalPlatformFee = order.platformFee || 0;
    if (totalPlatformFee > 0) {
      const admin = await User.findOne({ role: 'admin' });
      if (admin) {
        const adminWallet = await Wallet.findOne({ userId: admin._id });
        if (adminWallet && adminWallet.balance >= totalPlatformFee) {
          const refundAdminTransaction = {
            type: 'withdraw',
            amount: totalPlatformFee,
            method: paymentMethod.toLowerCase(),
            orderCode: orderCode,
            description: `Hoàn phí sàn đơn hàng ${orderCode} (trả lại hàng)`,
            status: 'completed',
            paymentId: ''
          };

          adminWallet.transactions.push(refundAdminTransaction);
          adminWallet.balance = Math.max(0, adminWallet.balance - totalPlatformFee);
          await adminWallet.save();

          console.log(`[walletService] ✅ Đã trừ ${totalPlatformFee.toLocaleString('vi-VN')} VNĐ phí sàn từ ví admin`);
        }
      }
    }

    console.log(`[walletService] ✅ Đã hoàn ${refundAmount.toLocaleString('vi-VN')} VNĐ cho người mua đơn hàng ${orderCode}`);

    return {
      success: true,
      message: `Đã hoàn tiền ${refundAmount.toLocaleString('vi-VN')} VNĐ`,
      refundAmount
    };

  } catch (error) {
    console.error('[walletService] Lỗi khi hoàn tiền:', error);
    throw error;
  }
};

module.exports = {
  transferToStoreWallets,
  refundOrder
};

