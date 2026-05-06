/**
 * Scheduled Jobs cho Order Management
 * - Tự động hủy đơn hàng pending quá 48h nếu seller không xác nhận
 * - Tự động chuyển delivered nếu quá thời gian ước tính (nếu có tracking)
 */

const Order = require('../models/Order');
const { createNotification } = require('../controllers/NotificationController');
const { refundOrder } = require('./walletService');

/**
 * Tự động hủy đơn hàng pending quá 48h
 * Chạy mỗi 6 giờ một lần
 */
async function autoCancelPendingOrders() {
  try {
    const now = new Date();
    const hoursAgo = new Date(now.getTime() - 48 * 60 * 60 * 1000); // 48 giờ trước

    // Tìm các đơn hàng pending quá 48h
    const pendingOrders = await Order.find({
      'statusHistory.status': 'pending',
      createdAt: { $lte: hoursAgo },
      'statusHistory': {
        $not: {
          $elemMatch: { status: { $in: ['confirmed', 'cancelled', 'shipped', 'delivered'] } }
        }
      }
    }).populate('userId', 'fullName email');

    console.log(`[OrderScheduler] 🔍 Tìm thấy ${pendingOrders.length} đơn hàng pending quá 48h`);

    for (const order of pendingOrders) {
      try {
        // Kiểm tra lại trạng thái hiện tại
        const currentStatus = order.statusHistory && order.statusHistory.length > 0
          ? order.statusHistory[order.statusHistory.length - 1]?.status
          : null;

        // Chỉ hủy nếu vẫn còn pending
        if (currentStatus === 'pending') {
          // Thêm status cancelled vào history
          order.statusHistory.push({
            status: 'cancelled',
            note: 'Đơn hàng tự động hủy do seller không xác nhận trong vòng 48 giờ',
            timestamp: new Date(),
          });

          // Nếu đã thanh toán, hoàn lại tiền
          if (order.paymentInfo.status === 'paid') {
            try {
              // Hoàn lại stock (nếu đã trừ)
              const orderService = require('../services/OrderService');
              await orderService.restoreStock(order.items);

              // Hoàn lại tiền
              await refundOrder(order.orderCode, order.total, order.paymentInfo.method);
              console.log(`[OrderScheduler] ✅ Đã hoàn tiền cho đơn hàng tự động hủy: ${order.orderCode}`);
            } catch (refundError) {
              console.error(`[OrderScheduler] ❌ Lỗi khi hoàn tiền cho ${order.orderCode}:`, refundError);
            }
          }

          await order.save();

          // Tạo notification cho buyer
          const userId = order.userId?._id || order.userId;
          if (userId) {
            try {
              await createNotification(userId, {
                type: 'order',
                title: `Đơn hàng #${order.orderCode}`,
                message: 'Đơn hàng của bạn đã được tự động hủy do seller không xác nhận trong vòng 48 giờ. ' +
                  (order.paymentInfo.status === 'paid' ? 'Tiền đã được hoàn vào ví của bạn.' : ''),
                relatedId: order._id,
                link: `/order/${order._id}`,
                icon: '⏰',
                metadata: {
                  orderCode: order.orderCode,
                  status: 'cancelled',
                },
              });
            } catch (notifError) {
              console.error(`[OrderScheduler] ⚠️ Lỗi khi tạo notification:`, notifError);
            }
          }

          console.log(`[OrderScheduler] ✅ Đã tự động hủy đơn hàng: ${order.orderCode}`);
        }
      } catch (orderError) {
        console.error(`[OrderScheduler] ❌ Lỗi khi xử lý đơn hàng ${order.orderCode}:`, orderError);
      }
    }

    return { processed: pendingOrders.length };
  } catch (error) {
    console.error('[OrderScheduler] ❌ Lỗi trong autoCancelPendingOrders:', error);
    throw error;
  }
}

/**
 * Tự động chuyển shipped -> delivered nếu quá thời gian ước tính
 * Chạy mỗi 12 giờ một lần
 */
async function autoDeliverShippedOrders() {
  try {
    const now = new Date();

    // Tìm các đơn hàng đã shipped và có estimatedDelivery
    const shippedOrders = await Order.find({
      'statusHistory.status': 'shipped',
      'shippingInfo.estimatedDelivery': { $lte: now },
      'statusHistory': {
        $not: {
          $elemMatch: { status: { $in: ['delivered', 'received', 'cancelled'] } }
        }
      }
    }).populate('userId', 'fullName email');

    console.log(`[OrderScheduler] 🔍 Tìm thấy ${shippedOrders.length} đơn hàng đã quá thời gian giao hàng ước tính`);

    for (const order of shippedOrders) {
      try {
        // Kiểm tra lại trạng thái hiện tại
        const currentStatus = order.statusHistory && order.statusHistory.length > 0
          ? order.statusHistory[order.statusHistory.length - 1]?.status
          : null;

        // Chỉ chuyển nếu vẫn còn shipped
        if (currentStatus === 'shipped') {
          order.statusHistory.push({
            status: 'delivered',
            note: 'Đơn hàng tự động chuyển sang trạng thái đã giao do quá thời gian ước tính',
            timestamp: new Date(),
          });

          await order.save();

          // Tạo notification cho buyer
          const userId = order.userId?._id || order.userId;
          if (userId) {
            try {
              await createNotification(userId, {
                type: 'order',
                title: `Đơn hàng #${order.orderCode}`,
                message: 'Đơn hàng của bạn đã được giao thành công. Vui lòng xác nhận nhận hàng.',
                relatedId: order._id,
                link: `/order/${order._id}`,
                icon: '📦',
                metadata: {
                  orderCode: order.orderCode,
                  status: 'delivered',
                },
              });
            } catch (notifError) {
              console.error(`[OrderScheduler] ⚠️ Lỗi khi tạo notification:`, notifError);
            }
          }

          console.log(`[OrderScheduler] ✅ Đã tự động chuyển delivered cho đơn hàng: ${order.orderCode}`);
        }
      } catch (orderError) {
        console.error(`[OrderScheduler] ❌ Lỗi khi xử lý đơn hàng ${order.orderCode}:`, orderError);
      }
    }

    return { processed: shippedOrders.length };
  } catch (error) {
    console.error('[OrderScheduler] ❌ Lỗi trong autoDeliverShippedOrders:', error);
    throw error;
  }
}

/**
 * Khởi động scheduler
 * Chạy autoCancelPendingOrders mỗi 6 giờ
 * Chạy autoDeliverShippedOrders mỗi 12 giờ
 */
function startOrderScheduler() {
  // Auto cancel pending orders - mỗi 6 giờ
  setInterval(async () => {
    console.log('[OrderScheduler] 🕐 Bắt đầu kiểm tra đơn hàng pending quá 48h...');
    try {
      const result = await autoCancelPendingOrders();
      console.log(`[OrderScheduler] ✅ Hoàn thành: ${result.processed} đơn hàng đã được xử lý`);
    } catch (error) {
      console.error('[OrderScheduler] ❌ Lỗi:', error);
    }
  }, 6 * 60 * 60 * 1000); // 6 giờ

  // Auto deliver shipped orders - mỗi 12 giờ
  setInterval(async () => {
    console.log('[OrderScheduler] 🕐 Bắt đầu kiểm tra đơn hàng shipped quá thời gian ước tính...');
    try {
      const result = await autoDeliverShippedOrders();
      console.log(`[OrderScheduler] ✅ Hoàn thành: ${result.processed} đơn hàng đã được xử lý`);
    } catch (error) {
      console.error('[OrderScheduler] ❌ Lỗi:', error);
    }
  }, 12 * 60 * 60 * 1000); // 12 giờ

  // Chạy ngay lần đầu khi khởi động
  console.log('[OrderScheduler] 🚀 Khởi động scheduler...');
  autoCancelPendingOrders().catch(err => console.error('[OrderScheduler] ❌ Lỗi khởi động:', err));
  autoDeliverShippedOrders().catch(err => console.error('[OrderScheduler] ❌ Lỗi khởi động:', err));

  console.log('[OrderScheduler] ✅ Scheduler đã được khởi động');
}

module.exports = {
  autoCancelPendingOrders,
  autoDeliverShippedOrders,
  startOrderScheduler,
};

