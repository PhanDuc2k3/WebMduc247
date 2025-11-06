const nodemailer = require('nodemailer');

// Kiểm tra biến môi trường
if (!process.env.EMAIL_USER || !process.env.EMAIL_PASSWORD) {
  console.warn('⚠️ EMAIL_USER hoặc EMAIL_PASSWORD chưa được cấu hình trong .env');
}

// Tạo transporter cho email
// Sử dụng Gmail SMTP (có thể thay đổi cho email service khác)
const transporter = nodemailer.createTransport({
  service: process.env.EMAIL_SERVICE || 'gmail',
  auth: {
    user: process.env.EMAIL_USER, // Email của bạn
    pass: process.env.EMAIL_PASSWORD, // App password của Gmail
  },
  // Thêm timeout configuration
  connectionTimeout: 10000, // 10 giây timeout cho kết nối
  socketTimeout: 10000, // 10 giây timeout cho socket
  greetingTimeout: 10000, // 10 giây timeout cho greeting
  // Retry configuration
  pool: true, // Sử dụng connection pool
  maxConnections: 1,
  maxMessages: 3,
  // Tùy chọn khác
  secure: true, // Sử dụng TLS
  tls: {
    rejectUnauthorized: false // Cho phép self-signed certificates (nếu cần)
  }
});

// Kiểm tra kết nối email service (với timeout)
transporter.verify(function (error, success) {
  if (error) {
    console.error('❌ Email service connection error:', error.message);
    console.warn('⚠️ Email service không khả dụng. Email verification sẽ bị bỏ qua.');
  } else {
    console.log('✅ Email service is ready to send messages');
  }
});

// Gửi email xác thực với timeout và retry
const sendVerificationEmail = async (email, verificationCode, fullName, retries = 2) => {
  // Kiểm tra nếu không có cấu hình email
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASSWORD) {
    console.warn('⚠️ EMAIL_USER hoặc EMAIL_PASSWORD chưa được cấu hình. Bỏ qua gửi email.');
    return false;
  }

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const mailOptions = {
        from: process.env.EMAIL_USER,
        to: email,
        subject: 'Xác thực tài khoản ShopMDuc247',
        html: `
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
            .button {
              display: inline-block;
              padding: 12px 30px;
              background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
              color: white;
              text-decoration: none;
              border-radius: 5px;
              margin-top: 20px;
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
      `,
      };

      // Gửi email với timeout
      const sendPromise = transporter.sendMail(mailOptions);
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Email send timeout after 15 seconds')), 15000);
      });

      await Promise.race([sendPromise, timeoutPromise]);
      console.log(`✅ Verification email sent to ${email}`);
      return true;
    } catch (error) {
      const isLastAttempt = attempt === retries;
      const errorMessage = error.message || error.toString();
      
      if (error.code === 'ETIMEDOUT' || error.code === 'ECONNREFUSED' || errorMessage.includes('timeout')) {
        console.error(`❌ Email send attempt ${attempt + 1}/${retries + 1} failed (timeout/connection error):`, errorMessage);
        
        if (isLastAttempt) {
          console.error('❌ All email send attempts failed. Email service may be unavailable.');
          // Không throw error, chỉ log và return false
          return false;
        }
        
        // Đợi một chút trước khi retry
        await new Promise(resolve => setTimeout(resolve, 2000 * (attempt + 1)));
        continue;
      } else {
        // Lỗi khác, không retry
        console.error('❌ Error sending verification email:', errorMessage);
        return false;
      }
    }
  }
  
  return false;
};

// Gửi email xác nhận đơn hàng với timeout và retry
const sendOrderConfirmationEmail = async (order, user, retries = 2) => {
  // Kiểm tra nếu không có cấu hình email
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASSWORD) {
    console.warn('⚠️ EMAIL_USER hoặc EMAIL_PASSWORD chưa được cấu hình. Bỏ qua gửi email.');
    return false;
  }

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
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

    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: user.email,
      subject: `Xác nhận đơn hàng #${order.orderCode} - ShopMDuc247`,
      html: `
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
      `,
      };

      // Gửi email với timeout
      const sendPromise = transporter.sendMail(mailOptions);
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Email send timeout after 15 seconds')), 15000);
      });

      await Promise.race([sendPromise, timeoutPromise]);
      console.log(`✅ Order confirmation email sent to ${user.email} for order #${order.orderCode}`);
      return true;
    } catch (error) {
      const isLastAttempt = attempt === retries;
      const errorMessage = error.message || error.toString();
      
      if (error.code === 'ETIMEDOUT' || error.code === 'ECONNREFUSED' || errorMessage.includes('timeout')) {
        console.error(`❌ Email send attempt ${attempt + 1}/${retries + 1} failed (timeout/connection error):`, errorMessage);
        
        if (isLastAttempt) {
          console.error('❌ All email send attempts failed. Email service may be unavailable.');
          // Không throw error, chỉ log và return false
          return false;
        }
        
        // Đợi một chút trước khi retry
        await new Promise(resolve => setTimeout(resolve, 2000 * (attempt + 1)));
        continue;
      } else {
        // Lỗi khác, không retry
        console.error('❌ Error sending order confirmation email:', errorMessage);
        return false;
      }
    }
  }
  
  return false;
};

module.exports = {
  sendVerificationEmail,
  sendOrderConfirmationEmail,
};

