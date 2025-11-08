const { Resend } = require('resend');

// Khởi tạo Resend client
const resend = new Resend(process.env.RESEND_API_KEY);

// Kiểm tra biến môi trường
if (!process.env.RESEND_API_KEY) {
  console.warn('⚠️ RESEND_API_KEY chưa được cấu hình trong .env');
}

// Email từ (phải là domain đã verify trên Resend)
// Ví dụ: noreply@yourdomain.com, hello@yourdomain.com
const FROM_EMAIL = process.env.RESEND_FROM_EMAIL;

if (!FROM_EMAIL) {
  console.warn('⚠️ RESEND_FROM_EMAIL chưa được cấu hình trong .env');
  console.warn('⚠️ Vui lòng cấu hình RESEND_FROM_EMAIL với email từ domain đã verify trên Resend');
}

// Gửi email xác thực với retry
const sendVerificationEmail = async (email, verificationCode, fullName, retries = 2) => {
  // Kiểm tra nếu không có cấu hình email
  if (!process.env.RESEND_API_KEY) {
    console.warn('⚠️ RESEND_API_KEY chưa được cấu hình. Bỏ qua gửi email.');
    return false;
  }

  if (!FROM_EMAIL) {
    console.warn('⚠️ RESEND_FROM_EMAIL chưa được cấu hình. Bỏ qua gửi email.');
    return false;
  }

  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <style>
        body {
          font-family: Arial, sans-serif;
          line-height: 1.6;
          color: #333;
          max-width: 600px;
          margin: 0 auto;
          padding: 20px;
        }
        .container {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          padding: 30px;
          border-radius: 10px;
          color: white;
        }
        .content {
          background: white;
          padding: 30px;
          border-radius: 10px;
          margin-top: 20px;
          color: #333;
        }
        .code-box {
          background: #f4f4f4;
          border: 2px dashed #667eea;
          padding: 20px;
          text-align: center;
          margin: 20px 0;
          border-radius: 8px;
        }
        .verification-code {
          font-size: 32px;
          font-weight: bold;
          color: #667eea;
          letter-spacing: 5px;
        }
        .footer {
          text-align: center;
          margin-top: 30px;
          color: #666;
          font-size: 12px;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <h1 style="margin: 0; text-align: center;">🛒 ShopMDuc247</h1>
      </div>
      <div class="content">
        <h2>Xin chào ${fullName}!</h2>
        <p>Cảm ơn bạn đã đăng ký tài khoản tại <strong>ShopMDuc247</strong>.</p>
        <p>Để kích hoạt tài khoản, vui lòng sử dụng mã xác thực sau:</p>
        
        <div class="code-box">
          <div class="verification-code">${verificationCode}</div>
        </div>
        
        <p><strong>Lưu ý:</strong></p>
        <ul>
          <li>Mã xác thực có hiệu lực trong <strong>15 phút</strong></li>
          <li>Nếu bạn không yêu cầu mã này, vui lòng bỏ qua email này</li>
          <li>Không chia sẻ mã này với bất kỳ ai</li>
        </ul>
        
        <p>Nếu mã không hoạt động, bạn có thể yêu cầu gửi lại mã mới.</p>
        
        <div class="footer">
          <p>Trân trọng,<br>Đội ngũ ShopMDuc247</p>
          <p>Email này được gửi tự động, vui lòng không trả lời.</p>
        </div>
      </div>
    </body>
    </html>
  `;

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const { data, error } = await resend.emails.send({
        from: FROM_EMAIL,
        to: email,
        subject: 'Xác thực tài khoản ShopMDuc247',
        html: htmlContent,
      });
      console.log("API KEY:", process.env.RESEND_API_KEY);

      if (error) {
        throw new Error(error.message || 'Resend API error');
      }

      console.log(`✅ Verification email sent successfully to ${email} from ${FROM_EMAIL} (ID: ${data?.id})`);
      return true;
    } catch (error) {
      const isLastAttempt = attempt === retries;
      const errorMessage = error.message || error.toString();
      
      // Kiểm tra lỗi domain chưa verify
      if (errorMessage.includes('domain') && (errorMessage.includes('not verified') || errorMessage.includes('unverified'))) {
        console.error(`❌ Domain chưa được verify trên Resend. Vui lòng verify domain tại resend.com/domains`);
        console.error(`❌ Sau khi verify, cập nhật RESEND_FROM_EMAIL trong .env với email từ domain đã verify`);
        return false; // Không retry nếu domain chưa verify
      }
      
      console.error(`❌ Email send attempt ${attempt + 1}/${retries + 1} failed:`, errorMessage);
      
      if (isLastAttempt) {
        console.error('❌ All email send attempts failed. Email service may be unavailable.');
        return false;
      }
      
      // Đợi một chút trước khi retry
      await new Promise(resolve => setTimeout(resolve, 2000 * (attempt + 1)));
    }
  }
  
  return false;
};

// Gửi email xác nhận đơn hàng với retry
const sendOrderConfirmationEmail = async (order, user, retries = 2) => {
  // Kiểm tra nếu user đã tắt thông báo email
  if (user.emailNotifications === false) {
    console.log(`📧 Người dùng ${user.email} đã tắt thông báo email. Bỏ qua gửi email xác nhận đơn hàng.`);
    return false;
  }

  // Kiểm tra nếu không có cấu hình email
  if (!process.env.RESEND_API_KEY) {
    console.warn('⚠️ RESEND_API_KEY chưa được cấu hình. Bỏ qua gửi email.');
    return false;
  }

  if (!FROM_EMAIL) {
    console.warn('⚠️ RESEND_FROM_EMAIL chưa được cấu hình. Bỏ qua gửi email.');
    return false;
  }

  // Format số tiền
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND'
    }).format(amount);
  };

  // Format ngày
  const formatDate = (date) => {
    return new Date(date).toLocaleString('vi-VN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Tạo HTML cho danh sách sản phẩm
  const itemsHTML = order.items.map(item => {
    const variationText = item.variation 
      ? ` (${item.variation.color || ''}${item.variation.color && item.variation.size ? ', ' : ''}${item.variation.size || ''})`
      : '';
    return `
      <tr>
        <td style="padding: 12px; border-bottom: 1px solid #eee;">
          <img src="${item.imageUrl || 'https://via.placeholder.com/80'}" 
               alt="${item.name}" 
               style="width: 80px; height: 80px; object-fit: cover; border-radius: 8px;">
        </td>
        <td style="padding: 12px; border-bottom: 1px solid #eee;">
          <div style="font-weight: 600; color: #333; margin-bottom: 4px;">${item.name}${variationText}</div>
          <div style="font-size: 12px; color: #666;">Số lượng: ${item.quantity}</div>
        </td>
        <td style="padding: 12px; border-bottom: 1px solid #eee; text-align: right;">
          <div style="font-weight: 600; color: #667eea;">${formatCurrency(item.salePrice || item.price)}</div>
          ${item.salePrice && item.salePrice < item.price 
            ? `<div style="font-size: 12px; color: #999; text-decoration: line-through;">${formatCurrency(item.price)}</div>`
            : ''
          }
        </td>
        <td style="padding: 12px; border-bottom: 1px solid #eee; text-align: right; font-weight: 600; color: #333;">
          ${formatCurrency(item.subtotal)}
        </td>
      </tr>
    `;
  }).join('');

  // Tạo HTML cho voucher
  let voucherHTML = '';
  if (order.productVoucherCode || order.freeshipVoucherCode) {
    voucherHTML = `
      <div style="background: #f0f9ff; padding: 15px; border-radius: 8px; margin: 15px 0;">
        <div style="font-weight: 600; color: #0369a1; margin-bottom: 8px;">🎁 Voucher đã sử dụng:</div>
        ${order.productVoucherCode ? `<div style="color: #333;">• Giảm giá sản phẩm: <strong>${order.productVoucherCode}</strong> (-${formatCurrency(order.discount)})</div>` : ''}
        ${order.freeshipVoucherCode ? `<div style="color: #333;">• Miễn phí ship: <strong>${order.freeshipVoucherCode}</strong> (-${formatCurrency(order.shippingDiscount)})</div>` : ''}
      </div>
    `;
  }

  // Xác định trạng thái thanh toán
  const paymentStatusText = {
    'pending': 'Chờ thanh toán',
    'paid': 'Đã thanh toán',
    'failed': 'Thanh toán thất bại'
  };

  const paymentMethodText = {
    'COD': 'Thanh toán khi nhận hàng (COD)',
    'MOMO': 'Ví MoMo',
    'VIETQR': 'VietQR',
    'WALLET': 'Ví điện tử'
  };

  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <style>
        body {
          font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
          line-height: 1.6;
          color: #333;
          max-width: 700px;
          margin: 0 auto;
          padding: 20px;
          background-color: #f5f5f5;
        }
        .email-container {
          background: white;
          border-radius: 12px;
          overflow: hidden;
          box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
        }
        .header {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          padding: 30px;
          text-align: center;
          color: white;
        }
        .header h1 {
          margin: 0;
          font-size: 28px;
        }
        .content {
          padding: 30px;
        }
        .order-code {
          background: #f0f9ff;
          padding: 15px;
          border-radius: 8px;
          text-align: center;
          margin: 20px 0;
          border-left: 4px solid #667eea;
        }
        .order-code strong {
          font-size: 20px;
          color: #667eea;
        }
        .info-section {
          background: #f9fafb;
          padding: 20px;
          border-radius: 8px;
          margin: 20px 0;
        }
        .info-section h3 {
          margin-top: 0;
          color: #667eea;
          font-size: 18px;
          border-bottom: 2px solid #667eea;
          padding-bottom: 10px;
        }
        .info-row {
          display: flex;
          justify-content: space-between;
          padding: 8px 0;
          border-bottom: 1px solid #eee;
        }
        .info-row:last-child {
          border-bottom: none;
        }
        .info-label {
          font-weight: 600;
          color: #666;
        }
        .info-value {
          color: #333;
        }
        table {
          width: 100%;
          border-collapse: collapse;
          margin: 20px 0;
        }
        th {
          background: #667eea;
          color: white;
          padding: 12px;
          text-align: left;
          font-weight: 600;
        }
        th:last-child {
          text-align: right;
        }
        .total-section {
          background: #f0f9ff;
          padding: 20px;
          border-radius: 8px;
          margin: 20px 0;
        }
        .total-row {
          display: flex;
          justify-content: space-between;
          padding: 8px 0;
          font-size: 16px;
        }
        .total-row.final {
          border-top: 2px solid #667eea;
          margin-top: 10px;
          padding-top: 15px;
          font-size: 20px;
          font-weight: 700;
          color: #667eea;
        }
        .footer {
          background: #f9fafb;
          padding: 20px;
          text-align: center;
          color: #666;
          font-size: 12px;
          border-top: 1px solid #eee;
        }
        .status-badge {
          display: inline-block;
          padding: 6px 12px;
          border-radius: 20px;
          font-size: 12px;
          font-weight: 600;
          background: #fef3c7;
          color: #92400e;
        }
        .status-badge.paid {
          background: #d1fae5;
          color: #065f46;
        }
      </style>
    </head>
    <body>
      <div class="email-container">
        <div class="header">
          <h1>🛒 ShopMDuc247</h1>
          <p style="margin: 10px 0 0 0; font-size: 18px;">Cảm ơn bạn đã đặt hàng!</p>
        </div>
        
        <div class="content">
          <div class="order-code">
            <div style="font-size: 14px; color: #666; margin-bottom: 5px;">Mã đơn hàng</div>
            <strong>#${order.orderCode}</strong>
          </div>

          <p>Xin chào <strong>${user.fullName}</strong>,</p>
          <p>Chúng tôi đã nhận được đơn hàng của bạn và đang xử lý. Dưới đây là thông tin chi tiết đơn hàng:</p>

          <div class="info-section">
            <h3>📦 Thông tin đơn hàng</h3>
            <div class="info-row">
              <span class="info-label">Ngày đặt hàng:</span>
              <span class="info-value">${formatDate(order.createdAt)}</span>
            </div>
            <div class="info-row">
              <span class="info-label">Trạng thái:</span>
              <span class="info-value">
                <span class="status-badge ${order.paymentInfo.status === 'paid' ? 'paid' : ''}">
                  ${order.statusHistory[order.statusHistory.length - 1]?.status === 'pending' ? 'Chờ xác nhận' : 
                    order.statusHistory[order.statusHistory.length - 1]?.status === 'confirmed' ? 'Đã xác nhận' :
                    order.statusHistory[order.statusHistory.length - 1]?.status === 'packed' ? 'Đã đóng gói' :
                    order.statusHistory[order.statusHistory.length - 1]?.status === 'shipped' ? 'Đang giao hàng' :
                    order.statusHistory[order.statusHistory.length - 1]?.status === 'delivered' ? 'Đã giao hàng' :
                    order.statusHistory[order.statusHistory.length - 1]?.status === 'received' ? 'Đã nhận hàng' :
                    order.statusHistory[order.statusHistory.length - 1]?.status === 'cancelled' ? 'Đã hủy' : 'Chờ xác nhận'}
                </span>
              </span>
            </div>
            <div class="info-row">
              <span class="info-label">Phương thức thanh toán:</span>
              <span class="info-value">${paymentMethodText[order.paymentInfo.method] || order.paymentInfo.method}</span>
            </div>
            <div class="info-row">
              <span class="info-label">Trạng thái thanh toán:</span>
              <span class="info-value">${paymentStatusText[order.paymentInfo.status] || order.paymentInfo.status}</span>
            </div>
          </div>

          <div class="info-section">
            <h3>📍 Địa chỉ giao hàng</h3>
            <div style="color: #333; line-height: 1.8;">
              <div><strong>${order.shippingAddress.fullName}</strong></div>
              <div>📞 ${order.shippingAddress.phone}</div>
              <div>📍 ${order.shippingAddress.address}</div>
            </div>
          </div>

          <h3 style="color: #667eea; margin-top: 30px;">🛍️ Chi tiết sản phẩm</h3>
          <table>
            <thead>
              <tr>
                <th>Sản phẩm</th>
                <th>Tên sản phẩm</th>
                <th style="text-align: right;">Đơn giá</th>
                <th style="text-align: right;">Thành tiền</th>
              </tr>
            </thead>
            <tbody>
              ${itemsHTML}
            </tbody>
          </table>

          ${voucherHTML}

          <div class="total-section">
            <div class="total-row">
              <span>Tạm tính:</span>
              <span>${formatCurrency(order.subtotal)}</span>
            </div>
            ${order.discount > 0 ? `
            <div class="total-row">
              <span>Giảm giá:</span>
              <span style="color: #10b981;">-${formatCurrency(order.discount)}</span>
            </div>
            ` : ''}
            <div class="total-row">
              <span>Phí vận chuyển:</span>
              <span>${formatCurrency(order.shippingFee)}</span>
            </div>
            ${order.shippingDiscount > 0 ? `
            <div class="total-row">
              <span>Giảm phí ship:</span>
              <span style="color: #10b981;">-${formatCurrency(order.shippingDiscount)}</span>
            </div>
            ` : ''}
            <div class="total-row final">
              <span>Tổng cộng:</span>
              <span>${formatCurrency(order.total)}</span>
            </div>
          </div>

          ${order.note ? `
          <div class="info-section">
            <h3>📝 Ghi chú</h3>
            <p style="color: #333; margin: 0;">${order.note}</p>
          </div>
          ` : ''}

          <div style="background: #fef3c7; padding: 15px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #f59e0b;">
            <p style="margin: 0; color: #92400e;">
              <strong>💡 Lưu ý:</strong> Bạn có thể theo dõi trạng thái đơn hàng trong tài khoản của mình. 
              Chúng tôi sẽ thông báo cho bạn khi đơn hàng được cập nhật.
            </p>
          </div>
        </div>

        <div class="footer">
          <p style="margin: 0;"><strong>ShopMDuc247</strong></p>
          <p style="margin: 5px 0;">Cảm ơn bạn đã tin tưởng và sử dụng dịch vụ của chúng tôi!</p>
          <p style="margin: 5px 0; color: #999;">Email này được gửi tự động, vui lòng không trả lời.</p>
        </div>
      </div>
    </body>
    </html>
  `;

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const { data, error } = await resend.emails.send({
        from: FROM_EMAIL,
        to: user.email,
        subject: `Xác nhận đơn hàng #${order.orderCode} - ShopMDuc247`,
        html: htmlContent,
      });

      if (error) {
        throw new Error(error.message || 'Resend API error');
      }

      console.log(`✅ Order confirmation email sent successfully to ${user.email} from ${FROM_EMAIL} for order #${order.orderCode} (ID: ${data?.id})`);
      return true;
    } catch (error) {
      const isLastAttempt = attempt === retries;
      const errorMessage = error.message || error.toString();
      
      // Kiểm tra lỗi domain chưa verify
      if (errorMessage.includes('domain') && (errorMessage.includes('not verified') || errorMessage.includes('unverified'))) {
        console.error(`❌ Domain chưa được verify trên Resend. Vui lòng verify domain tại resend.com/domains`);
        console.error(`❌ Sau khi verify, cập nhật RESEND_FROM_EMAIL trong .env với email từ domain đã verify`);
        return false; // Không retry nếu domain chưa verify
      }
      
      console.error(`❌ Email send attempt ${attempt + 1}/${retries + 1} failed:`, errorMessage);
      
      if (isLastAttempt) {
        console.error('❌ All email send attempts failed. Email service may be unavailable.');
        return false;
      }
      
      // Đợi một chút trước khi retry
      await new Promise(resolve => setTimeout(resolve, 2000 * (attempt + 1)));
    }
  }
  
  return false;
};

// Gửi email thông báo đơn hàng đã được giao
const sendOrderDeliveredEmail = async (order, user, retries = 2) => {
  // Kiểm tra nếu user đã tắt thông báo email
  if (user.emailNotifications === false) {
    console.log(`📧 Người dùng ${user.email} đã tắt thông báo email. Bỏ qua gửi email thông báo đơn hàng đã giao.`);
    return false;
  }

  // Kiểm tra nếu không có cấu hình email
  if (!process.env.RESEND_API_KEY) {
    console.warn('⚠️ RESEND_API_KEY chưa được cấu hình. Bỏ qua gửi email.');
    return false;
  }

  if (!FROM_EMAIL) {
    console.warn('⚠️ RESEND_FROM_EMAIL chưa được cấu hình. Bỏ qua gửi email.');
    return false;
  }

  // Format số tiền
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND'
    }).format(amount);
  };

  // Format ngày
  const formatDate = (date) => {
    return new Date(date).toLocaleString('vi-VN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Lấy frontend URL từ env hoặc default
  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
  const orderDetailUrl = `${frontendUrl}/order/${order._id}`;

  // Tạo HTML cho danh sách sản phẩm (rút gọn)
  const itemsHTML = order.items.slice(0, 3).map(item => {
    const variationText = item.variation 
      ? ` (${item.variation.color || ''}${item.variation.color && item.variation.size ? ', ' : ''}${item.variation.size || ''})`
      : '';
    return `
      <tr>
        <td style="padding: 8px; border-bottom: 1px solid #eee;">
          <img src="${item.imageUrl || 'https://via.placeholder.com/60'}" 
               alt="${item.name}" 
               style="width: 60px; height: 60px; object-fit: cover; border-radius: 8px;">
        </td>
        <td style="padding: 8px; border-bottom: 1px solid #eee;">
          <div style="font-weight: 600; color: #333; font-size: 14px;">${item.name}${variationText}</div>
          <div style="font-size: 12px; color: #666;">Số lượng: ${item.quantity}</div>
        </td>
        <td style="padding: 8px; border-bottom: 1px solid #eee; text-align: right; font-weight: 600; color: #667eea;">
          ${formatCurrency(item.subtotal)}
        </td>
      </tr>
    `;
  }).join('');

  const moreItemsText = order.items.length > 3 
    ? `<tr><td colspan="3" style="padding: 12px; text-align: center; color: #666; font-size: 14px;">... và ${order.items.length - 3} sản phẩm khác</td></tr>`
    : '';

  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <style>
        body {
          font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
          line-height: 1.6;
          color: #333;
          max-width: 700px;
          margin: 0 auto;
          padding: 20px;
          background-color: #f5f5f5;
        }
        .email-container {
          background: white;
          border-radius: 12px;
          overflow: hidden;
          box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
        }
        .header {
          background: linear-gradient(135deg, #10b981 0%, #059669 100%);
          padding: 30px;
          text-align: center;
          color: white;
        }
        .header h1 {
          margin: 0;
          font-size: 28px;
        }
        .success-icon {
          font-size: 64px;
          margin: 20px 0;
        }
        .content {
          padding: 30px;
        }
        .order-code {
          background: #f0fdf4;
          padding: 15px;
          border-radius: 8px;
          text-align: center;
          margin: 20px 0;
          border-left: 4px solid #10b981;
        }
        .order-code strong {
          font-size: 20px;
          color: #059669;
        }
        .info-section {
          background: #f9fafb;
          padding: 20px;
          border-radius: 8px;
          margin: 20px 0;
        }
        .info-section h3 {
          margin-top: 0;
          color: #059669;
          font-size: 18px;
          border-bottom: 2px solid #10b981;
          padding-bottom: 10px;
        }
        .info-row {
          display: flex;
          justify-content: space-between;
          padding: 8px 0;
          border-bottom: 1px solid #eee;
        }
        .info-row:last-child {
          border-bottom: none;
        }
        .info-label {
          font-weight: 600;
          color: #666;
        }
        .info-value {
          color: #333;
        }
        table {
          width: 100%;
          border-collapse: collapse;
          margin: 20px 0;
        }
        th {
          background: #10b981;
          color: white;
          padding: 12px;
          text-align: left;
          font-weight: 600;
          font-size: 14px;
        }
        th:last-child {
          text-align: right;
        }
        .cta-button {
          display: inline-block;
          background: linear-gradient(135deg, #10b981 0%, #059669 100%);
          color: white;
          padding: 15px 30px;
          text-decoration: none;
          border-radius: 8px;
          font-weight: 600;
          font-size: 16px;
          margin: 20px 0;
          text-align: center;
          box-shadow: 0 4px 6px rgba(16, 185, 129, 0.3);
        }
        .cta-button:hover {
          background: linear-gradient(135deg, #059669 0%, #047857 100%);
        }
        .steps-section {
          background: #f0fdf4;
          padding: 20px;
          border-radius: 8px;
          margin: 20px 0;
          border-left: 4px solid #10b981;
        }
        .step-item {
          display: flex;
          align-items: flex-start;
          margin: 15px 0;
        }
        .step-number {
          background: #10b981;
          color: white;
          width: 30px;
          height: 30px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 600;
          margin-right: 15px;
          flex-shrink: 0;
        }
        .step-content {
          flex: 1;
        }
        .step-title {
          font-weight: 600;
          color: #059669;
          margin-bottom: 5px;
        }
        .step-description {
          color: #666;
          font-size: 14px;
        }
        .footer {
          background: #f9fafb;
          padding: 20px;
          text-align: center;
          color: #666;
          font-size: 12px;
          border-top: 1px solid #eee;
        }
      </style>
    </head>
    <body>
      <div class="email-container">
        <div class="header">
          <div class="success-icon">✅</div>
          <h1>🛒 ShopMDuc247</h1>
          <p style="margin: 10px 0 0 0; font-size: 18px;">Đơn hàng của bạn đã được giao thành công!</p>
        </div>
        
        <div class="content">
          <div class="order-code">
            <div style="font-size: 14px; color: #666; margin-bottom: 5px;">Mã đơn hàng</div>
            <strong>#${order.orderCode}</strong>
          </div>

          <p>Xin chào <strong>${user.fullName}</strong>,</p>
          <p style="font-size: 16px; line-height: 1.8;">
            Chúng tôi rất vui thông báo rằng đơn hàng <strong>#${order.orderCode}</strong> của bạn đã được giao thành công đến địa chỉ nhận hàng.
          </p>

          <div class="info-section">
            <h3>📦 Thông tin đơn hàng</h3>
            <div class="info-row">
              <span class="info-label">Ngày giao hàng:</span>
              <span class="info-value">${formatDate(new Date())}</span>
            </div>
            <div class="info-row">
              <span class="info-label">Tổng giá trị:</span>
              <span class="info-value" style="font-weight: 600; color: #059669;">${formatCurrency(order.total)}</span>
            </div>
            <div class="info-row">
              <span class="info-label">Địa chỉ nhận hàng:</span>
              <span class="info-value">${order.shippingAddress.address}</span>
            </div>
          </div>

          <h3 style="color: #059669; margin-top: 30px;">🛍️ Sản phẩm đã nhận</h3>
          <table>
            <thead>
              <tr>
                <th>Sản phẩm</th>
                <th>Tên sản phẩm</th>
                <th style="text-align: right;">Thành tiền</th>
              </tr>
            </thead>
            <tbody>
              ${itemsHTML}
              ${moreItemsText}
            </tbody>
          </table>

          <div style="text-align: center; margin: 30px 0;">
            <a href="${orderDetailUrl}" class="cta-button">
              🔍 Xem chi tiết đơn hàng & Xác nhận nhận hàng
            </a>
          </div>

          <div class="steps-section">
            <h3 style="margin-top: 0; color: #059669;">📝 Bước tiếp theo</h3>
            
            <div class="step-item">
              <div class="step-number">1</div>
              <div class="step-content">
                <div class="step-title">✅ Xác nhận đã nhận hàng</div>
                <div class="step-description">
                  Vui lòng kiểm tra sản phẩm và xác nhận bạn đã nhận được hàng đúng như đơn hàng.
                </div>
              </div>
            </div>

            <div class="step-item">
              <div class="step-number">2</div>
              <div class="step-content">
                <div class="step-title">⭐ Đánh giá sản phẩm</div>
                <div class="step-description">
                  Chia sẻ trải nghiệm của bạn về sản phẩm để giúp người mua khác có thông tin tham khảo.
                </div>
              </div>
            </div>

            <div class="step-item">
              <div class="step-number">3</div>
              <div class="step-content">
                <div class="step-title">🛒 Tiếp tục mua sắm</div>
                <div class="step-description">
                  Khám phá thêm nhiều sản phẩm hấp dẫn khác tại ShopMDuc247.
                </div>
              </div>
            </div>
          </div>

          <div style="background: #fef3c7; padding: 15px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #f59e0b;">
            <p style="margin: 0; color: #92400e;">
              <strong>💡 Lưu ý quan trọng:</strong> Nếu bạn phát hiện sản phẩm có vấn đề, vui lòng liên hệ với chúng tôi ngay trong vòng 24 giờ để được hỗ trợ tốt nhất.
            </p>
          </div>

          <div style="background: #dbeafe; padding: 15px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #3b82f6;">
            <p style="margin: 0; color: #1e40af;">
              <strong>📞 Hỗ trợ khách hàng:</strong> Nếu bạn có bất kỳ câu hỏi nào, đừng ngần ngại liên hệ với chúng tôi. Chúng tôi luôn sẵn sàng hỗ trợ bạn!
            </p>
          </div>
        </div>

        <div class="footer">
          <p style="margin: 0;"><strong>ShopMDuc247</strong></p>
          <p style="margin: 5px 0;">Cảm ơn bạn đã tin tưởng và sử dụng dịch vụ của chúng tôi!</p>
          <p style="margin: 5px 0; color: #999;">Email này được gửi tự động, vui lòng không trả lời.</p>
        </div>
      </div>
    </body>
    </html>
  `;

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const { data, error } = await resend.emails.send({
        from: FROM_EMAIL,
        to: user.email,
        subject: `🎉 Đơn hàng #${order.orderCode} đã được giao thành công - ShopMDuc247`,
        html: htmlContent,
      });

      if (error) {
        throw new Error(error.message || 'Resend API error');
      }

      console.log(`✅ Order delivered email sent successfully to ${user.email} from ${FROM_EMAIL} for order #${order.orderCode} (ID: ${data?.id})`);
      return true;
    } catch (error) {
      const isLastAttempt = attempt === retries;
      const errorMessage = error.message || error.toString();
      
      // Kiểm tra lỗi domain chưa verify
      if (errorMessage.includes('domain') && (errorMessage.includes('not verified') || errorMessage.includes('unverified'))) {
        console.error(`❌ Domain chưa được verify trên Resend. Vui lòng verify domain tại resend.com/domains`);
        console.error(`❌ Sau khi verify, cập nhật RESEND_FROM_EMAIL trong .env với email từ domain đã verify`);
        return false; // Không retry nếu domain chưa verify
      }
      
      console.error(`❌ Email send attempt ${attempt + 1}/${retries + 1} failed:`, errorMessage);
      
      if (isLastAttempt) {
        console.error('❌ All email send attempts failed. Email service may be unavailable.');
        return false;
      }
      
      // Đợi một chút trước khi retry
      await new Promise(resolve => setTimeout(resolve, 2000 * (attempt + 1)));
    }
  }
  
  return false;
};

// Gửi email reset password
const sendResetPasswordEmail = async (email, resetCode, fullName, retries = 2) => {
  // Kiểm tra nếu không có cấu hình email
  if (!process.env.RESEND_API_KEY) {
    console.warn('⚠️ RESEND_API_KEY chưa được cấu hình. Bỏ qua gửi email.');
    return false;
  }

  if (!FROM_EMAIL) {
    console.warn('⚠️ RESEND_FROM_EMAIL chưa được cấu hình. Bỏ qua gửi email.');
    return false;
  }

  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <style>
        body {
          font-family: Arial, sans-serif;
          line-height: 1.6;
          color: #333;
          max-width: 600px;
          margin: 0 auto;
          padding: 20px;
        }
        .container {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          padding: 30px;
          border-radius: 10px;
          color: white;
        }
        .content {
          background: white;
          padding: 30px;
          border-radius: 10px;
          margin-top: 20px;
          color: #333;
        }
        .code-box {
          background: #f4f4f4;
          border: 2px dashed #667eea;
          padding: 20px;
          text-align: center;
          margin: 20px 0;
          border-radius: 8px;
        }
        .reset-code {
          font-size: 32px;
          font-weight: bold;
          color: #667eea;
          letter-spacing: 5px;
        }
        .footer {
          text-align: center;
          margin-top: 30px;
          color: #666;
          font-size: 12px;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <h1 style="margin: 0; text-align: center;">🛒 ShopMDuc247</h1>
      </div>
      <div class="content">
        <h2>Xin chào ${fullName}!</h2>
        <p>Bạn đã yêu cầu đặt lại mật khẩu cho tài khoản tại <strong>ShopMDuc247</strong>.</p>
        <p>Vui lòng sử dụng mã xác thực sau để đặt lại mật khẩu:</p>
        
        <div class="code-box">
          <div class="reset-code">${resetCode}</div>
        </div>
        
        <p><strong>Lưu ý:</strong></p>
        <ul>
          <li>Mã xác thực có hiệu lực trong <strong>15 phút</strong></li>
          <li>Nếu bạn không yêu cầu đặt lại mật khẩu, vui lòng bỏ qua email này</li>
          <li>Không chia sẻ mã này với bất kỳ ai</li>
        </ul>
        
        <p>Nếu mã không hoạt động, bạn có thể yêu cầu gửi lại mã mới.</p>
        
        <div class="footer">
          <p>Trân trọng,<br>Đội ngũ ShopMDuc247</p>
          <p>Email này được gửi tự động, vui lòng không trả lời.</p>
        </div>
      </div>
    </body>
    </html>
  `;

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const { data, error } = await resend.emails.send({
        from: FROM_EMAIL,
        to: email,
        subject: 'Đặt lại mật khẩu ShopMDuc247',
        html: htmlContent,
      });

      if (error) {
        throw new Error(error.message || 'Resend API error');
      }

      console.log(`✅ Reset password email sent successfully to ${email} from ${FROM_EMAIL} (ID: ${data?.id})`);
      return true;
    } catch (error) {
      const isLastAttempt = attempt === retries;
      const errorMessage = error.message || error.toString();
      
      // Kiểm tra lỗi domain chưa verify
      if (errorMessage.includes('domain') && (errorMessage.includes('not verified') || errorMessage.includes('unverified'))) {
        console.error(`❌ Domain chưa được verify trên Resend. Vui lòng verify domain tại resend.com/domains`);
        console.error(`❌ Sau khi verify, cập nhật RESEND_FROM_EMAIL trong .env với email từ domain đã verify`);
        return false; // Không retry nếu domain chưa verify
      }
      
      console.error(`❌ Email send attempt ${attempt + 1}/${retries + 1} failed:`, errorMessage);
      
      if (isLastAttempt) {
        console.error('❌ All email send attempts failed. Email service may be unavailable.');
        return false;
      }
      
      // Đợi một chút trước khi retry
      await new Promise(resolve => setTimeout(resolve, 2000 * (attempt + 1)));
    }
  }
  
  return false;
};

// Gửi email mã xác thực rút tiền
const sendWithdrawalEmail = async (email, withdrawalCode, fullName, amount, bankName, accountNumber, retries = 2) => {
  // Kiểm tra nếu không có cấu hình email
  if (!process.env.RESEND_API_KEY) {
    console.warn('⚠️ RESEND_API_KEY chưa được cấu hình. Bỏ qua gửi email.');
    return false;
  }

  if (!FROM_EMAIL) {
    console.warn('⚠️ RESEND_FROM_EMAIL chưa được cấu hình. Bỏ qua gửi email.');
    return false;
  }

  // Format số tiền
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND'
    }).format(amount);
  };

  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <style>
        body {
          font-family: Arial, sans-serif;
          line-height: 1.6;
          color: #333;
          max-width: 600px;
          margin: 0 auto;
          padding: 20px;
        }
        .container {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          padding: 30px;
          border-radius: 10px;
          color: white;
        }
        .content {
          background: white;
          padding: 30px;
          border-radius: 10px;
          margin-top: 20px;
          color: #333;
        }
        .code-box {
          background: #f4f4f4;
          border: 2px dashed #667eea;
          padding: 20px;
          text-align: center;
          margin: 20px 0;
          border-radius: 8px;
        }
        .withdrawal-code {
          font-size: 32px;
          font-weight: bold;
          color: #667eea;
          letter-spacing: 5px;
        }
        .info-section {
          background: #f9fafb;
          padding: 15px;
          border-radius: 8px;
          margin: 15px 0;
          border-left: 4px solid #667eea;
        }
        .footer {
          text-align: center;
          margin-top: 30px;
          color: #666;
          font-size: 12px;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <h1 style="margin: 0; text-align: center;">🛒 ShopMDuc247</h1>
      </div>
      <div class="content">
        <h2>Xin chào ${fullName}!</h2>
        <p>Bạn đã yêu cầu rút tiền từ tài khoản tại <strong>ShopMDuc247</strong>.</p>
        
        <div class="info-section">
          <p style="margin: 5px 0;"><strong>Số tiền rút:</strong> ${formatCurrency(amount)}</p>
          <p style="margin: 5px 0;"><strong>Ngân hàng:</strong> ${bankName}</p>
          <p style="margin: 5px 0;"><strong>Số tài khoản:</strong> ${accountNumber}</p>
        </div>

        <p>Vui lòng sử dụng mã xác thực sau để hoàn tất yêu cầu rút tiền:</p>
        
        <div class="code-box">
          <div class="withdrawal-code">${withdrawalCode}</div>
        </div>
        
        <p><strong>Lưu ý:</strong></p>
        <ul>
          <li>Mã xác thực có hiệu lực trong <strong>15 phút</strong></li>
          <li>Nếu bạn không yêu cầu rút tiền, vui lòng bỏ qua email này và liên hệ với chúng tôi ngay</li>
          <li>Không chia sẻ mã này với bất kỳ ai</li>
        </ul>
        
        <p>Nhập mã này vào form rút tiền để xác nhận yêu cầu của bạn.</p>
        
        <div class="footer">
          <p>Trân trọng,<br>Đội ngũ ShopMDuc247</p>
          <p>Email này được gửi tự động, vui lòng không trả lời.</p>
        </div>
      </div>
    </body>
    </html>
  `;

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const { data, error } = await resend.emails.send({
        from: FROM_EMAIL,
        to: email,
        subject: 'Mã xác thực rút tiền - ShopMDuc247',
        html: htmlContent,
      });

      if (error) {
        throw new Error(error.message || 'Resend API error');
      }

      console.log(`✅ Withdrawal email sent successfully to ${email} from ${FROM_EMAIL} (ID: ${data?.id})`);
      return true;
    } catch (error) {
      const isLastAttempt = attempt === retries;
      const errorMessage = error.message || error.toString();
      
      // Kiểm tra lỗi domain chưa verify
      if (errorMessage.includes('domain') && (errorMessage.includes('not verified') || errorMessage.includes('unverified'))) {
        console.error(`❌ Domain chưa được verify trên Resend. Vui lòng verify domain tại resend.com/domains`);
        console.error(`❌ Sau khi verify, cập nhật RESEND_FROM_EMAIL trong .env với email từ domain đã verify`);
        return false; // Không retry nếu domain chưa verify
      }
      
      console.error(`❌ Email send attempt ${attempt + 1}/${retries + 1} failed:`, errorMessage);
      
      if (isLastAttempt) {
        console.error('❌ All email send attempts failed. Email service may be unavailable.');
        return false;
      }
      
      // Đợi một chút trước khi retry
      await new Promise(resolve => setTimeout(resolve, 2000 * (attempt + 1)));
    }
  }
  
  return false;
};

module.exports = {
  sendVerificationEmail,
  sendOrderConfirmationEmail,
  sendOrderDeliveredEmail,
  sendResetPasswordEmail,
  sendWithdrawalEmail,
};
