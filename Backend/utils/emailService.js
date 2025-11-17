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

  // SVG Icons từ Lucide
  const iconShoppingCart = '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="8" cy="21" r="1"/><circle cx="19" cy="21" r="1"/><path d="M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12"/></svg>';
  const iconMail = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="20" height="16" x="2" y="4" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/></svg>';
  const iconShield = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z"/></svg>';

  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <style>
        body {
          font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
          line-height: 1.6;
          color: #333;
          max-width: 600px;
          margin: 0 auto;
          padding: 10px;
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
          padding: 20px;
          text-align: center;
          color: white;
        }
        .header h1 {
          margin: 0;
          font-size: 24px;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
        }
        .header-icon {
          width: 24px;
          height: 24px;
          display: inline-block;
          vertical-align: middle;
        }
        .content {
          padding: 20px;
        }
        .code-box {
          background: #f0f9ff;
          border: 2px dashed #667eea;
          padding: 20px;
          text-align: center;
          margin: 20px 0;
          border-radius: 8px;
        }
        .verification-code {
          font-size: 28px;
          font-weight: bold;
          color: #667eea;
          letter-spacing: 8px;
          font-family: 'Courier New', monospace;
        }
        .info-list {
          background: #f9fafb;
          padding: 15px;
          border-radius: 8px;
          margin: 20px 0;
          border-left: 4px solid #667eea;
        }
        .info-list ul {
          margin: 0;
          padding-left: 20px;
        }
        .info-list li {
          margin: 8px 0;
          color: #333;
          font-size: 14px;
        }
        .footer {
          background: #f9fafb;
          padding: 15px;
          text-align: center;
          color: #666;
          font-size: 11px;
          border-top: 1px solid #eee;
        }
        .icon-inline {
          width: 16px;
          height: 16px;
          display: inline-block;
          vertical-align: middle;
          margin-right: 6px;
        }
        @media only screen and (max-width: 600px) {
          body {
            padding: 5px;
          }
          .header {
            padding: 15px;
          }
          .header h1 {
            font-size: 20px;
          }
          .content {
            padding: 15px;
          }
          .code-box {
            padding: 15px;
          }
          .verification-code {
            font-size: 24px;
            letter-spacing: 6px;
          }
          .info-list {
            padding: 12px;
          }
          .info-list li {
            font-size: 13px;
          }
          .footer {
            padding: 12px;
            font-size: 10px;
          }
        }
      </style>
    </head>
    <body>
      <div class="email-container">
        <div class="header">
          <h1>
            <span class="header-icon">${iconShoppingCart}</span>
            ShopMDuc247
          </h1>
        </div>
        <div class="content">
          <h2 style="margin-top: 0; color: #667eea; display: flex; align-items: center; gap: 8px;">
            <span class="icon-inline">${iconMail}</span>
            Xin chào ${fullName}!
          </h2>
          <p>Cảm ơn bạn đã đăng ký tài khoản tại <strong>ShopMDuc247</strong>.</p>
          <p>Để kích hoạt tài khoản, vui lòng sử dụng mã xác thực sau:</p>
          
          <div class="code-box">
            <div class="verification-code">${verificationCode}</div>
          </div>
          
          <div class="info-list">
            <p style="margin-top: 0; font-weight: 600; color: #667eea; display: flex; align-items: center; gap: 6px;">
              <span class="icon-inline">${iconShield}</span>
              <strong>Lưu ý:</strong>
            </p>
            <ul>
              <li>Mã xác thực có hiệu lực trong <strong>15 phút</strong></li>
              <li>Nếu bạn không yêu cầu mã này, vui lòng bỏ qua email này</li>
              <li>Không chia sẻ mã này với bất kỳ ai</li>
            </ul>
          </div>
          
          <p>Nếu mã không hoạt động, bạn có thể yêu cầu gửi lại mã mới.</p>
          
          <div class="footer">
            <p style="margin: 0;"><strong>Trân trọng,<br>Đội ngũ ShopMDuc247</strong></p>
            <p style="margin: 5px 0;">Email này được gửi tự động, vui lòng không trả lời.</p>
          </div>
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

  // SVG Icons từ Lucide (định nghĩa trước khi sử dụng)
  const iconGift = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="8" width="18" height="4" rx="1"/><path d="M12 8v13"/><path d="M19 12v7a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2v-7"/><path d="M7.5 8a2.5 2.5 0 0 1 0-5A4.8 8 0 0 1 12 8a4.8 8 0 0 1 4.5-5 2.5 2.5 0 0 1 0 5"/></svg>';

  // Tạo HTML cho danh sách sản phẩm
  const itemsHTML = order.items.map(item => {
    const variationText = item.variation 
      ? ` (${item.variation.color || ''}${item.variation.color && item.variation.size ? ', ' : ''}${item.variation.size || ''})`
      : '';
    return `
      <tr>
        <td style="padding: 10px 8px; border-bottom: 1px solid #eee;">
          <img src="${item.imageUrl || 'https://via.placeholder.com/80'}" 
               alt="${item.name}" 
               style="width: 60px; height: 60px; object-fit: cover; border-radius: 8px; display: block;">
        </td>
        <td style="padding: 10px 8px; border-bottom: 1px solid #eee;">
          <div style="font-weight: 600; color: #333; margin-bottom: 4px; font-size: 13px;">${item.name}${variationText}</div>
          <div style="font-size: 11px; color: #666;">Số lượng: ${item.quantity}</div>
        </td>
        <td style="padding: 10px 8px; border-bottom: 1px solid #eee; text-align: right;">
          <div style="font-weight: 600; color: #667eea; font-size: 13px;">${formatCurrency(item.salePrice || item.price)}</div>
          ${item.salePrice && item.salePrice < item.price 
            ? `<div style="font-size: 11px; color: #999; text-decoration: line-through;">${formatCurrency(item.price)}</div>`
            : ''
          }
        </td>
        <td style="padding: 10px 8px; border-bottom: 1px solid #eee; text-align: right; font-weight: 600; color: #333; font-size: 13px;">
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
        <div style="font-weight: 600; color: #0369a1; margin-bottom: 8px; display: flex; align-items: center; gap: 6px;">
          <span style="width: 18px; height: 18px; display: inline-block; vertical-align: middle;">${iconGift}</span>
          Voucher đã sử dụng:
        </div>
        ${order.productVoucherCode ? `<div style="color: #333; margin-left: 24px;">• Giảm giá sản phẩm: <strong>${order.productVoucherCode}</strong> (-${formatCurrency(order.discount)})</div>` : ''}
        ${order.freeshipVoucherCode ? `<div style="color: #333; margin-left: 24px;">• Miễn phí ship: <strong>${order.freeshipVoucherCode}</strong> (-${formatCurrency(order.shippingDiscount)})</div>` : ''}
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

  // SVG Icons từ Lucide
  const iconShoppingCart = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="8" cy="21" r="1"/><circle cx="19" cy="21" r="1"/><path d="M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12"/></svg>';
  const iconPackage = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg>';
  const iconMapPin = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>';
  const iconPhone = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>';
  const iconShoppingBag = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z"/><path d="M3 6h18"/><path d="M16 10a4 4 0 0 1-8 0"/></svg>';
  const iconFileText = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>';
  const iconLightbulb = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 14c.2-1 .7-1.7 1.5-2.5 1-.9 1.5-2.2 1.5-3.5A6 6 0 0 0 6 8c0 1 .2 2.2 1.5 3.5.7.7 1.3 1.5 1.5 2.5"/><path d="M9 18h6"/><path d="M10 22h4"/></svg>';

  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <style>
        body {
          font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
          line-height: 1.6;
          color: #333;
          max-width: 700px;
          margin: 0 auto;
          padding: 10px;
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
          padding: 20px;
          text-align: center;
          color: white;
        }
        .header h1 {
          margin: 0;
          font-size: 24px;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
        }
        .header-icon {
          width: 24px;
          height: 24px;
          display: inline-block;
          vertical-align: middle;
        }
        .content {
          padding: 20px;
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
          font-size: 18px;
          color: #667eea;
        }
        .info-section {
          background: #f9fafb;
          padding: 15px;
          border-radius: 8px;
          margin: 15px 0;
        }
        .info-section h3 {
          margin-top: 0;
          color: #667eea;
          font-size: 16px;
          border-bottom: 2px solid #667eea;
          padding-bottom: 8px;
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .section-icon {
          width: 18px;
          height: 18px;
          display: inline-block;
          vertical-align: middle;
        }
        .info-row {
          display: flex;
          justify-content: space-between;
          padding: 8px 0;
          border-bottom: 1px solid #eee;
          flex-wrap: wrap;
        }
        .info-row:last-child {
          border-bottom: none;
        }
        .info-label {
          font-weight: 600;
          color: #666;
          margin-right: 10px;
        }
        .info-value {
          color: #333;
          text-align: right;
          flex: 1;
        }
        table {
          width: 100%;
          border-collapse: collapse;
          margin: 20px 0;
          font-size: 14px;
        }
        th {
          background: #667eea;
          color: white;
          padding: 10px 8px;
          text-align: left;
          font-weight: 600;
          font-size: 12px;
        }
        th:last-child {
          text-align: right;
        }
        td {
          padding: 10px 8px;
          border-bottom: 1px solid #eee;
          font-size: 13px;
        }
        td img {
          width: 60px;
          height: 60px;
          object-fit: cover;
          border-radius: 8px;
        }
        .total-section {
          background: #f0f9ff;
          padding: 15px;
          border-radius: 8px;
          margin: 20px 0;
        }
        .total-row {
          display: flex;
          justify-content: space-between;
          padding: 8px 0;
          font-size: 14px;
        }
        .total-row.final {
          border-top: 2px solid #667eea;
          margin-top: 10px;
          padding-top: 15px;
          font-size: 18px;
          font-weight: 700;
          color: #667eea;
        }
        .footer {
          background: #f9fafb;
          padding: 15px;
          text-align: center;
          color: #666;
          font-size: 11px;
          border-top: 1px solid #eee;
        }
        .status-badge {
          display: inline-block;
          padding: 4px 10px;
          border-radius: 20px;
          font-size: 11px;
          font-weight: 600;
          background: #fef3c7;
          color: #92400e;
        }
        .status-badge.paid {
          background: #d1fae5;
          color: #065f46;
        }
        .icon-inline {
          width: 16px;
          height: 16px;
          display: inline-block;
          vertical-align: middle;
          margin-right: 4px;
        }
        .note-box {
          background: #fef3c7;
          padding: 12px;
          border-radius: 8px;
          margin: 15px 0;
          border-left: 4px solid #f59e0b;
        }
        .note-box p {
          margin: 0;
          color: #92400e;
          font-size: 13px;
        }
        @media only screen and (max-width: 600px) {
          body {
            padding: 5px;
          }
          .header {
            padding: 15px;
          }
          .header h1 {
            font-size: 20px;
          }
          .content {
            padding: 15px;
          }
          .order-code strong {
            font-size: 16px;
          }
          .info-section {
            padding: 12px;
          }
          .info-section h3 {
            font-size: 14px;
          }
          .info-row {
            flex-direction: column;
            gap: 4px;
          }
          .info-label {
            margin-right: 0;
            margin-bottom: 4px;
          }
          .info-value {
            text-align: left;
          }
          table {
            font-size: 12px;
          }
          th, td {
            padding: 8px 4px;
            font-size: 11px;
          }
          td img {
            width: 50px;
            height: 50px;
          }
          .total-section {
            padding: 12px;
          }
          .total-row {
            font-size: 13px;
          }
          .total-row.final {
            font-size: 16px;
          }
          .footer {
            padding: 12px;
            font-size: 10px;
          }
        }
      </style>
    </head>
    <body>
      <div class="email-container">
        <div class="header">
          <h1>
            <span class="header-icon">${iconShoppingCart}</span>
            ShopMDuc247
          </h1>
          <p style="margin: 10px 0 0 0; font-size: 16px;">Cảm ơn bạn đã đặt hàng!</p>
        </div>
        
        <div class="content">
          <div class="order-code">
            <div style="font-size: 12px; color: #666; margin-bottom: 5px;">Mã đơn hàng</div>
            <strong>#${order.orderCode}</strong>
          </div>

          <p>Xin chào <strong>${user.fullName}</strong>,</p>
          <p>Chúng tôi đã nhận được đơn hàng của bạn và đang xử lý. Dưới đây là thông tin chi tiết đơn hàng:</p>

          <div class="info-section">
            <h3>
              <span class="section-icon">${iconPackage}</span>
              Thông tin đơn hàng
            </h3>
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
            <h3>
              <span class="section-icon">${iconMapPin}</span>
              Địa chỉ giao hàng
            </h3>
            <div style="color: #333; line-height: 1.8;">
              <div><strong>${order.shippingAddress.fullName}</strong></div>
              <div>
                <span class="icon-inline">${iconPhone}</span>
                ${order.shippingAddress.phone}
              </div>
              <div>
                <span class="icon-inline">${iconMapPin}</span>
                ${order.shippingAddress.address}
              </div>
            </div>
          </div>

          <h3 style="color: #667eea; margin-top: 30px; display: flex; align-items: center; gap: 8px;">
            <span class="section-icon">${iconShoppingBag}</span>
            Chi tiết sản phẩm
          </h3>
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
            <h3>
              <span class="section-icon">${iconFileText}</span>
              Ghi chú
            </h3>
            <p style="color: #333; margin: 0;">${order.note}</p>
          </div>
          ` : ''}

          <div class="note-box">
            <p>
              <span class="icon-inline">${iconLightbulb}</span>
              <strong>Lưu ý:</strong> Bạn có thể theo dõi trạng thái đơn hàng trong tài khoản của mình. 
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

  // SVG Icons từ Lucide
  const iconCheckCircle = '<svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>';
  const iconShoppingCart = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="8" cy="21" r="1"/><circle cx="19" cy="21" r="1"/><path d="M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12"/></svg>';
  const iconPackage = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg>';
  const iconShoppingBag = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z"/><path d="M3 6h18"/><path d="M16 10a4 4 0 0 1-8 0"/></svg>';
  const iconFileText = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>';
  const iconStar = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>';
  const iconSearch = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>';
  const iconLightbulb = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 14c.2-1 .7-1.7 1.5-2.5 1-.9 1.5-2.2 1.5-3.5A6 6 0 0 0 6 8c0 1 .2 2.2 1.5 3.5.7.7 1.3 1.5 1.5 2.5"/><path d="M9 18h6"/><path d="M10 22h4"/></svg>';
  const iconPhone = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>';

  // Tạo HTML cho danh sách sản phẩm (rút gọn)
  const itemsHTML = order.items.slice(0, 3).map(item => {
    const variationText = item.variation 
      ? ` (${item.variation.color || ''}${item.variation.color && item.variation.size ? ', ' : ''}${item.variation.size || ''})`
      : '';
    return `
      <tr>
        <td style="padding: 8px 4px; border-bottom: 1px solid #eee;">
          <img src="${item.imageUrl || 'https://via.placeholder.com/60'}" 
               alt="${item.name}" 
               style="width: 50px; height: 50px; object-fit: cover; border-radius: 8px; display: block;">
        </td>
        <td style="padding: 8px 4px; border-bottom: 1px solid #eee;">
          <div style="font-weight: 600; color: #333; font-size: 12px;">${item.name}${variationText}</div>
          <div style="font-size: 11px; color: #666;">Số lượng: ${item.quantity}</div>
        </td>
        <td style="padding: 8px 4px; border-bottom: 1px solid #eee; text-align: right; font-weight: 600; color: #10b981; font-size: 12px;">
          ${formatCurrency(item.subtotal)}
        </td>
      </tr>
    `;
  }).join('');

  const moreItemsText = order.items.length > 3 
    ? `<tr><td colspan="3" style="padding: 10px; text-align: center; color: #666; font-size: 12px;">... và ${order.items.length - 3} sản phẩm khác</td></tr>`
    : '';

  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <style>
        body {
          font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
          line-height: 1.6;
          color: #333;
          max-width: 700px;
          margin: 0 auto;
          padding: 10px;
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
          padding: 20px;
          text-align: center;
          color: white;
        }
        .header h1 {
          margin: 0;
          font-size: 24px;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
        }
        .header-icon {
          width: 24px;
          height: 24px;
          display: inline-block;
          vertical-align: middle;
        }
        .success-icon {
          width: 48px;
          height: 48px;
          margin: 15px auto;
          display: block;
        }
        .content {
          padding: 20px;
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
          font-size: 18px;
          color: #059669;
        }
        .info-section {
          background: #f9fafb;
          padding: 15px;
          border-radius: 8px;
          margin: 15px 0;
        }
        .info-section h3 {
          margin-top: 0;
          color: #059669;
          font-size: 16px;
          border-bottom: 2px solid #10b981;
          padding-bottom: 8px;
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .section-icon {
          width: 18px;
          height: 18px;
          display: inline-block;
          vertical-align: middle;
        }
        .info-row {
          display: flex;
          justify-content: space-between;
          padding: 8px 0;
          border-bottom: 1px solid #eee;
          flex-wrap: wrap;
        }
        .info-row:last-child {
          border-bottom: none;
        }
        .info-label {
          font-weight: 600;
          color: #666;
          margin-right: 10px;
        }
        .info-value {
          color: #333;
          text-align: right;
          flex: 1;
        }
        table {
          width: 100%;
          border-collapse: collapse;
          margin: 20px 0;
          font-size: 13px;
        }
        th {
          background: #10b981;
          color: white;
          padding: 10px 8px;
          text-align: left;
          font-weight: 600;
          font-size: 12px;
        }
        th:last-child {
          text-align: right;
        }
        td {
          padding: 8px 4px;
          border-bottom: 1px solid #eee;
          font-size: 12px;
        }
        td img {
          width: 50px;
          height: 50px;
          object-fit: cover;
          border-radius: 8px;
        }
        .cta-button {
          display: inline-block;
          background: linear-gradient(135deg, #10b981 0%, #059669 100%);
          color: white;
          padding: 12px 24px;
          text-decoration: none;
          border-radius: 8px;
          font-weight: 600;
          font-size: 14px;
          margin: 20px 0;
          text-align: center;
          box-shadow: 0 4px 6px rgba(16, 185, 129, 0.3);
        }
        .cta-button:hover {
          background: linear-gradient(135deg, #059669 0%, #047857 100%);
        }
        .steps-section {
          background: #f0fdf4;
          padding: 15px;
          border-radius: 8px;
          margin: 20px 0;
          border-left: 4px solid #10b981;
        }
        .steps-section h3 {
          margin-top: 0;
          color: #059669;
          font-size: 16px;
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .step-item {
          display: flex;
          align-items: flex-start;
          margin: 12px 0;
        }
        .step-number {
          background: #10b981;
          color: white;
          width: 28px;
          height: 28px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 600;
          margin-right: 12px;
          flex-shrink: 0;
          font-size: 14px;
        }
        .step-content {
          flex: 1;
        }
        .step-title {
          font-weight: 600;
          color: #059669;
          margin-bottom: 4px;
          font-size: 14px;
          display: flex;
          align-items: center;
          gap: 6px;
        }
        .step-icon {
          width: 16px;
          height: 16px;
          display: inline-block;
        }
        .step-description {
          color: #666;
          font-size: 13px;
        }
        .footer {
          background: #f9fafb;
          padding: 15px;
          text-align: center;
          color: #666;
          font-size: 11px;
          border-top: 1px solid #eee;
        }
        .note-box {
          background: #fef3c7;
          padding: 12px;
          border-radius: 8px;
          margin: 15px 0;
          border-left: 4px solid #f59e0b;
        }
        .note-box p {
          margin: 0;
          color: #92400e;
          font-size: 13px;
        }
        .info-box {
          background: #dbeafe;
          padding: 12px;
          border-radius: 8px;
          margin: 15px 0;
          border-left: 4px solid #3b82f6;
        }
        .info-box p {
          margin: 0;
          color: #1e40af;
          font-size: 13px;
        }
        .icon-inline {
          width: 16px;
          height: 16px;
          display: inline-block;
          vertical-align: middle;
          margin-right: 4px;
        }
        @media only screen and (max-width: 600px) {
          body {
            padding: 5px;
          }
          .header {
            padding: 15px;
          }
          .header h1 {
            font-size: 20px;
          }
          .success-icon {
            width: 40px;
            height: 40px;
          }
          .content {
            padding: 15px;
          }
          .order-code strong {
            font-size: 16px;
          }
          .info-section {
            padding: 12px;
          }
          .info-section h3 {
            font-size: 14px;
          }
          .info-row {
            flex-direction: column;
            gap: 4px;
          }
          .info-label {
            margin-right: 0;
            margin-bottom: 4px;
          }
          .info-value {
            text-align: left;
          }
          table {
            font-size: 11px;
          }
          th, td {
            padding: 6px 3px;
            font-size: 10px;
          }
          td img {
            width: 40px;
            height: 40px;
          }
          .cta-button {
            padding: 10px 20px;
            font-size: 13px;
          }
          .steps-section {
            padding: 12px;
          }
          .step-number {
            width: 24px;
            height: 24px;
            font-size: 12px;
            margin-right: 10px;
          }
          .step-title {
            font-size: 13px;
          }
          .step-description {
            font-size: 12px;
          }
          .footer {
            padding: 12px;
            font-size: 10px;
          }
        }
      </style>
    </head>
    <body>
      <div class="email-container">
        <div class="header">
          <div class="success-icon">${iconCheckCircle}</div>
          <h1>
            <span class="header-icon">${iconShoppingCart}</span>
            ShopMDuc247
          </h1>
          <p style="margin: 10px 0 0 0; font-size: 16px;">Đơn hàng của bạn đã được giao thành công!</p>
        </div>
        
        <div class="content">
          <div class="order-code">
            <div style="font-size: 12px; color: #666; margin-bottom: 5px;">Mã đơn hàng</div>
            <strong>#${order.orderCode}</strong>
          </div>

          <p>Xin chào <strong>${user.fullName}</strong>,</p>
          <p style="font-size: 14px; line-height: 1.8;">
            Chúng tôi rất vui thông báo rằng đơn hàng <strong>#${order.orderCode}</strong> của bạn đã được giao thành công đến địa chỉ nhận hàng.
          </p>

          <div class="info-section">
            <h3>
              <span class="section-icon">${iconPackage}</span>
              Thông tin đơn hàng
            </h3>
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

          <h3 style="color: #059669; margin-top: 30px; display: flex; align-items: center; gap: 8px; font-size: 16px;">
            <span class="section-icon">${iconShoppingBag}</span>
            Sản phẩm đã nhận
          </h3>
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
              <span class="icon-inline">${iconSearch}</span>
              Xem chi tiết đơn hàng & Xác nhận nhận hàng
            </a>
          </div>

          <div class="steps-section">
            <h3>
              <span class="section-icon">${iconFileText}</span>
              Bước tiếp theo
            </h3>
            
            <div class="step-item">
              <div class="step-number">1</div>
              <div class="step-content">
                <div class="step-title">
                  <span class="step-icon">${iconCheckCircle}</span>
                  Xác nhận đã nhận hàng
                </div>
                <div class="step-description">
                  Vui lòng kiểm tra sản phẩm và xác nhận bạn đã nhận được hàng đúng như đơn hàng.
                </div>
              </div>
            </div>

            <div class="step-item">
              <div class="step-number">2</div>
              <div class="step-content">
                <div class="step-title">
                  <span class="step-icon">${iconStar}</span>
                  Đánh giá sản phẩm
                </div>
                <div class="step-description">
                  Chia sẻ trải nghiệm của bạn về sản phẩm để giúp người mua khác có thông tin tham khảo.
                </div>
              </div>
            </div>

            <div class="step-item">
              <div class="step-number">3</div>
              <div class="step-content">
                <div class="step-title">
                  <span class="step-icon">${iconShoppingCart}</span>
                  Tiếp tục mua sắm
                </div>
                <div class="step-description">
                  Khám phá thêm nhiều sản phẩm hấp dẫn khác tại ShopMDuc247.
                </div>
              </div>
            </div>
          </div>

          <div class="note-box">
            <p>
              <span class="icon-inline">${iconLightbulb}</span>
              <strong>Lưu ý quan trọng:</strong> Nếu bạn phát hiện sản phẩm có vấn đề, vui lòng liên hệ với chúng tôi ngay trong vòng 24 giờ để được hỗ trợ tốt nhất.
            </p>
          </div>

          <div class="info-box">
            <p>
              <span class="icon-inline">${iconPhone}</span>
              <strong>Hỗ trợ khách hàng:</strong> Nếu bạn có bất kỳ câu hỏi nào, đừng ngần ngại liên hệ với chúng tôi. Chúng tôi luôn sẵn sàng hỗ trợ bạn!
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
        subject: `Đơn hàng #${order.orderCode} đã được giao thành công - ShopMDuc247`,
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

  // SVG Icons từ Lucide
  const iconShoppingCart = '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="8" cy="21" r="1"/><circle cx="19" cy="21" r="1"/><path d="M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12"/></svg>';
  const iconLock = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>';
  const iconShield = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z"/></svg>';

  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <style>
        body {
          font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
          line-height: 1.6;
          color: #333;
          max-width: 600px;
          margin: 0 auto;
          padding: 10px;
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
          padding: 20px;
          text-align: center;
          color: white;
        }
        .header h1 {
          margin: 0;
          font-size: 24px;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
        }
        .header-icon {
          width: 24px;
          height: 24px;
          display: inline-block;
          vertical-align: middle;
        }
        .content {
          padding: 20px;
        }
        .code-box {
          background: #f0f9ff;
          border: 2px dashed #667eea;
          padding: 20px;
          text-align: center;
          margin: 20px 0;
          border-radius: 8px;
        }
        .reset-code {
          font-size: 28px;
          font-weight: bold;
          color: #667eea;
          letter-spacing: 8px;
          font-family: 'Courier New', monospace;
        }
        .info-list {
          background: #f9fafb;
          padding: 15px;
          border-radius: 8px;
          margin: 20px 0;
          border-left: 4px solid #667eea;
        }
        .info-list ul {
          margin: 0;
          padding-left: 20px;
        }
        .info-list li {
          margin: 8px 0;
          color: #333;
          font-size: 14px;
        }
        .footer {
          background: #f9fafb;
          padding: 15px;
          text-align: center;
          color: #666;
          font-size: 11px;
          border-top: 1px solid #eee;
        }
        .icon-inline {
          width: 16px;
          height: 16px;
          display: inline-block;
          vertical-align: middle;
          margin-right: 6px;
        }
        @media only screen and (max-width: 600px) {
          body {
            padding: 5px;
          }
          .header {
            padding: 15px;
          }
          .header h1 {
            font-size: 20px;
          }
          .content {
            padding: 15px;
          }
          .code-box {
            padding: 15px;
          }
          .reset-code {
            font-size: 24px;
            letter-spacing: 6px;
          }
          .info-list {
            padding: 12px;
          }
          .info-list li {
            font-size: 13px;
          }
          .footer {
            padding: 12px;
            font-size: 10px;
          }
        }
      </style>
    </head>
    <body>
      <div class="email-container">
        <div class="header">
          <h1>
            <span class="header-icon">${iconShoppingCart}</span>
            ShopMDuc247
          </h1>
        </div>
        <div class="content">
          <h2 style="margin-top: 0; color: #667eea; display: flex; align-items: center; gap: 8px;">
            <span class="icon-inline">${iconLock}</span>
            Xin chào ${fullName}!
          </h2>
          <p>Bạn đã yêu cầu đặt lại mật khẩu cho tài khoản tại <strong>ShopMDuc247</strong>.</p>
          <p>Vui lòng sử dụng mã xác thực sau để đặt lại mật khẩu:</p>
          
          <div class="code-box">
            <div class="reset-code">${resetCode}</div>
          </div>
          
          <div class="info-list">
            <p style="margin-top: 0; font-weight: 600; color: #667eea; display: flex; align-items: center; gap: 6px;">
              <span class="icon-inline">${iconShield}</span>
              <strong>Lưu ý:</strong>
            </p>
            <ul>
              <li>Mã xác thực có hiệu lực trong <strong>15 phút</strong></li>
              <li>Nếu bạn không yêu cầu đặt lại mật khẩu, vui lòng bỏ qua email này</li>
              <li>Không chia sẻ mã này với bất kỳ ai</li>
            </ul>
          </div>
          
          <p>Nếu mã không hoạt động, bạn có thể yêu cầu gửi lại mã mới.</p>
          
          <div class="footer">
            <p style="margin: 0;"><strong>Trân trọng,<br>Đội ngũ ShopMDuc247</strong></p>
            <p style="margin: 5px 0;">Email này được gửi tự động, vui lòng không trả lời.</p>
          </div>
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

  // SVG Icons từ Lucide
  const iconShoppingCart = '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="8" cy="21" r="1"/><circle cx="19" cy="21" r="1"/><path d="M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12"/></svg>';
  const iconWallet = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 7V4a1 1 0 0 0-1-1H5a2 2 0 0 0 0 4h15a1 1 0 0 1 1 1v4h-3a2 2 0 0 0 0 4h3a1 1 0 0 0 1-1v-2a1 1 0 0 0-1-1"/><path d="M3 5v14a2 2 0 0 0 2 2h15a1 1 0 0 0 1-1v-4"/></svg>';
  const iconCreditCard = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="20" height="14" x="2" y="5" rx="2"/><line x1="2" y1="10" x2="22" y2="10"/></svg>';
  const iconShield = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z"/></svg>';

  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <style>
        body {
          font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
          line-height: 1.6;
          color: #333;
          max-width: 600px;
          margin: 0 auto;
          padding: 10px;
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
          padding: 20px;
          text-align: center;
          color: white;
        }
        .header h1 {
          margin: 0;
          font-size: 24px;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
        }
        .header-icon {
          width: 24px;
          height: 24px;
          display: inline-block;
          vertical-align: middle;
        }
        .content {
          padding: 20px;
        }
        .code-box {
          background: #f0f9ff;
          border: 2px dashed #667eea;
          padding: 20px;
          text-align: center;
          margin: 20px 0;
          border-radius: 8px;
        }
        .withdrawal-code {
          font-size: 28px;
          font-weight: bold;
          color: #667eea;
          letter-spacing: 8px;
          font-family: 'Courier New', monospace;
        }
        .info-section {
          background: #f9fafb;
          padding: 15px;
          border-radius: 8px;
          margin: 15px 0;
          border-left: 4px solid #667eea;
        }
        .info-section h3 {
          margin-top: 0;
          color: #667eea;
          font-size: 16px;
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .info-row {
          display: flex;
          justify-content: space-between;
          padding: 8px 0;
          border-bottom: 1px solid #eee;
          flex-wrap: wrap;
        }
        .info-row:last-child {
          border-bottom: none;
        }
        .info-label {
          font-weight: 600;
          color: #666;
          margin-right: 10px;
        }
        .info-value {
          color: #333;
          text-align: right;
          flex: 1;
        }
        .info-list {
          background: #f9fafb;
          padding: 15px;
          border-radius: 8px;
          margin: 20px 0;
          border-left: 4px solid #667eea;
        }
        .info-list ul {
          margin: 0;
          padding-left: 20px;
        }
        .info-list li {
          margin: 8px 0;
          color: #333;
          font-size: 14px;
        }
        .footer {
          background: #f9fafb;
          padding: 15px;
          text-align: center;
          color: #666;
          font-size: 11px;
          border-top: 1px solid #eee;
        }
        .icon-inline {
          width: 16px;
          height: 16px;
          display: inline-block;
          vertical-align: middle;
          margin-right: 6px;
        }
        @media only screen and (max-width: 600px) {
          body {
            padding: 5px;
          }
          .header {
            padding: 15px;
          }
          .header h1 {
            font-size: 20px;
          }
          .content {
            padding: 15px;
          }
          .code-box {
            padding: 15px;
          }
          .withdrawal-code {
            font-size: 24px;
            letter-spacing: 6px;
          }
          .info-section {
            padding: 12px;
          }
          .info-section h3 {
            font-size: 14px;
          }
          .info-row {
            flex-direction: column;
            gap: 4px;
          }
          .info-label {
            margin-right: 0;
            margin-bottom: 4px;
          }
          .info-value {
            text-align: left;
          }
          .info-list {
            padding: 12px;
          }
          .info-list li {
            font-size: 13px;
          }
          .footer {
            padding: 12px;
            font-size: 10px;
          }
        }
      </style>
    </head>
    <body>
      <div class="email-container">
        <div class="header">
          <h1>
            <span class="header-icon">${iconShoppingCart}</span>
            ShopMDuc247
          </h1>
        </div>
        <div class="content">
          <h2 style="margin-top: 0; color: #667eea; display: flex; align-items: center; gap: 8px;">
            <span class="icon-inline">${iconWallet}</span>
            Xin chào ${fullName}!
          </h2>
          <p>Bạn đã yêu cầu rút tiền từ tài khoản tại <strong>ShopMDuc247</strong>.</p>
          
          <div class="info-section">
            <h3>
              <span class="icon-inline">${iconCreditCard}</span>
              Thông tin rút tiền
            </h3>
            <div class="info-row">
              <span class="info-label">Số tiền rút:</span>
              <span class="info-value" style="font-weight: 600; color: #667eea;">${formatCurrency(amount)}</span>
            </div>
            <div class="info-row">
              <span class="info-label">Ngân hàng:</span>
              <span class="info-value">${bankName}</span>
            </div>
            <div class="info-row">
              <span class="info-label">Số tài khoản:</span>
              <span class="info-value">${accountNumber}</span>
            </div>
          </div>

          <p>Vui lòng sử dụng mã xác thực sau để hoàn tất yêu cầu rút tiền:</p>
          
          <div class="code-box">
            <div class="withdrawal-code">${withdrawalCode}</div>
          </div>
          
          <div class="info-list">
            <p style="margin-top: 0; font-weight: 600; color: #667eea; display: flex; align-items: center; gap: 6px;">
              <span class="icon-inline">${iconShield}</span>
              <strong>Lưu ý:</strong>
            </p>
            <ul>
              <li>Mã xác thực có hiệu lực trong <strong>15 phút</strong></li>
              <li>Nếu bạn không yêu cầu rút tiền, vui lòng bỏ qua email này và liên hệ với chúng tôi ngay</li>
              <li>Không chia sẻ mã này với bất kỳ ai</li>
            </ul>
          </div>
          
          <p>Nhập mã này vào form rút tiền để xác nhận yêu cầu của bạn.</p>
          
          <div class="footer">
            <p style="margin: 0;"><strong>Trân trọng,<br>Đội ngũ ShopMDuc247</strong></p>
            <p style="margin: 5px 0;">Email này được gửi tự động, vui lòng không trả lời.</p>
          </div>
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
