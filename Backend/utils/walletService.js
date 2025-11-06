const Wallet = require('../models/Wallet');
const Store = require('../models/Store');
const Order = require('../models/Order');

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
      const storeTotal = Math.max(0, storeSubtotal - storeDiscount + storeShippingFee - storeShippingDiscount);

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
    }

    return {
      success: true,
      message: `Đã chuyển tiền vào ví của ${transferResults.length} cửa hàng`,
      transfers: transferResults
    };

  } catch (error) {
    console.error('[walletService] Lỗi khi chuyển tiền vào ví chủ cửa hàng:', error);
    throw error;
  }
};

module.exports = {
  transferToStoreWallets
};

