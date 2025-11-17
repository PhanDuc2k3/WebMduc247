const userService = require('../services/UserService');

// ==========================
// ĐĂNG KÝ
// ==========================
exports.register = async (req, res) => {
  try {
    const { email, password, fullName, phone } = req.body;
    if (!email || !password || !fullName)
      return res.status(400).json({ message: 'Vui lòng nhập đầy đủ thông tin' });

    const result = await userService.register(email, password, fullName, phone);
    
    if (result.emailSent) {
      res.status(201).json({ 
        message: 'Đăng ký thành công! Vui lòng kiểm tra email để xác thực tài khoản.',
        email: result.email
      });
    } else {
      console.warn(`⚠️ Không thể gửi email xác thực cho ${result.email}, nhưng vẫn cho phép đăng ký`);
      res.status(201).json({ 
        message: 'Đăng ký thành công! Tuy nhiên, email xác thực không thể gửi được. Vui lòng sử dụng tính năng "Gửi lại mã xác thực".',
        email: result.email,
        emailNotSent: true
      });
    }
  } catch (error) {
    console.error('Register error:', error);
    const statusCode = error.message.includes('đã được sử dụng') ? 400 : 500;
    res.status(statusCode).json({ message: error.message || 'Lỗi máy chủ' });
  }
};

// ==========================
// ĐĂNG NHẬP
// ==========================
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password)
      return res.status(400).json({ message: 'Vui lòng nhập email và mật khẩu' });

    const result = await userService.login(email, password);
    
    res.status(200).json({
      message: 'Đăng nhập thành công',
      token: result.token,
      user: result.user
    });
  } catch (error) {
    console.error('Login error:', error);
    const statusCode = error.message.includes('chưa được xác thực') ? 403 : 400;
    if (statusCode === 403) {
      res.status(403).json({ 
        message: error.message,
        needsVerification: true
      });
    } else {
      res.status(statusCode).json({ message: error.message || 'Lỗi máy chủ' });
    }
  }
};

// ==========================
// ĐĂNG XUẤT
// ==========================
exports.logout = async (req, res) => {
  try {
    const userId = req.user.userId;
    await userService.logout(userId);
    res.status(200).json({ message: 'Đăng xuất thành công' });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({ message: 'Lỗi máy chủ', error: error.message });
  }
};

// ==========================
// LẤY THÔNG TIN NGƯỜI DÙNG
// ==========================
exports.getProfile = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { user, store } = await userService.getProfile(userId);
    res.status(200).json({ message: 'Lấy thông tin người dùng thành công', user, store });
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(404).json({ message: error.message || 'Lỗi máy chủ' });
  }
};

// ==========================
// CẬP NHẬT THÔNG TIN NGƯỜI DÙNG
// ==========================
exports.updateProfile = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { fullName, phone } = req.body;

    let updateData = { fullName, phone };

    // Nếu có file upload avatar từ Cloudinary
    if (req.file) {
      updateData.avatarUrl = req.file.path;
    }

    const user = await userService.updateProfile(userId, updateData);
    res.status(200).json({ message: 'Cập nhật thông tin thành công', user });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(404).json({ message: error.message || 'Lỗi máy chủ' });
  }
};

// ==========================
// QUẢN LÝ NGƯỜI DÙNG (ADMIN)
// ==========================
exports.getAllUsers = async (req, res) => {
  try {
    const users = await userService.getAllUsers();
    res.status(200).json({ message: 'Lấy danh sách người dùng thành công', users });
  } catch (error) {
    console.error('Get all users error:', error);
    res.status(500).json({ message: 'Lỗi máy chủ', error: error.message });
  }
};

exports.deleteUser = async (req, res) => {
  try {
    const userId = req.params.id;
    await userService.deleteUser(userId);
    res.status(200).json({ message: 'Xóa người dùng thành công' });
  } catch (error) {
    console.error('Delete user error:', error);
    res.status(404).json({ message: error.message || 'Lỗi máy chủ' });
  }
};

exports.updateUser = async (req, res) => {
  try {
    const userId = req.params.id;
    const { role, status } = req.body;
    const user = await userService.updateUser(userId, role, status);
    res.status(200).json({ message: 'Cập nhật người dùng thành công', user });
  } catch (error) {
    console.error('Update user error:', error);
    res.status(404).json({ message: error.message || 'Lỗi máy chủ' });
  }
};

// ==========================
// YÊU CẦU MỞ CỬA HÀNG
// ==========================
exports.requestSeller = async (req, res) => {
  try {
    const userId = req.user?.userId;
    if (!userId) return res.status(401).json({ message: "Không xác thực được người dùng" });

    const { name, description, storeAddress, category, contactPhone, contactEmail } = req.body;

    const missingFields = [];
    if (!name) missingFields.push("name");
    if (!storeAddress) missingFields.push("storeAddress");
    if (!category) missingFields.push("category");
    if (!contactPhone) missingFields.push("contactPhone");

    if (missingFields.length > 0)
      return res.status(400).json({ message: `Thiếu thông tin: ${missingFields.join(", ")}` });

    const logoUrl = req.files?.logo?.[0]?.path || null;
    const bannerUrl = req.files?.banner?.[0]?.path || null;

    const sellerRequest = await userService.requestSeller(
      userId,
      { name, description, category, storeAddress, contactPhone, contactEmail },
      logoUrl,
      bannerUrl
    );

    res.status(200).json({
      message: "Đã gửi yêu cầu mở cửa hàng",
      sellerRequest,
    });
  } catch (error) {
    console.error("requestSeller error:", error);
    const statusCode = error.message.includes('Đã gửi yêu cầu') ? 400 : 500;
    res.status(statusCode).json({ message: error.message || "Lỗi máy chủ" });
  }
};

exports.getAllSellerRequests = async (req, res) => {
  try {
    const requests = await userService.getAllSellerRequests();
    res.status(200).json({ message: 'Danh sách yêu cầu mở cửa hàng', requests });
  } catch (error) {
    console.error('Get seller requests error:', error);
    res.status(500).json({ message: 'Lỗi máy chủ', error: error.message });
  }
};

exports.handleSellerRequest = async (req, res) => {
  try {
    const { userId, action } = req.body;

    if (!userId || !['approve', 'reject'].includes(action)) {
      return res.status(400).json({ message: 'Thiếu userId hoặc action không hợp lệ' });
    }

    const result = await userService.handleSellerRequest(userId, action);

    if (action === 'approve') {
      res.status(200).json({ 
        message: 'Đã duyệt yêu cầu, tạo cửa hàng và chuyển role sang seller', 
        store: result.store 
      });
    } else {
      res.status(200).json({ message: 'Đã từ chối yêu cầu mở cửa hàng' });
    }
  } catch (error) {
    console.error('Handle seller request error:', error);
    const statusCode = error.message.includes('Không tìm thấy') ? 404 : 
                      error.message.includes('đã được xử lý') ? 400 : 500;
    res.status(statusCode).json({ message: error.message || 'Lỗi máy chủ' });
  }
};

// ==========================
// XÁC THỰC EMAIL
// ==========================
exports.verifyEmail = async (req, res) => {
  try {
    const { email, verificationCode } = req.body;

    if (!email || !verificationCode) {
      return res.status(400).json({ message: 'Vui lòng nhập email và mã xác thực' });
    }

    await userService.verifyEmail(email, verificationCode);
    res.status(200).json({ message: 'Xác thực email thành công! Bạn có thể đăng nhập ngay bây giờ.' });
  } catch (error) {
    console.error('Verify email error:', error);
    const statusCode = error.message.includes('Không tìm thấy') ? 404 : 400;
    res.status(statusCode).json({ message: error.message || 'Lỗi máy chủ' });
  }
};

// ==========================
// GỬI LẠI MÃ XÁC THỰC
// ==========================
exports.resendVerificationCode = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ message: 'Vui lòng nhập email' });
    }

    const result = await userService.resendVerificationCode(email);
    
    if (result.emailSent) {
      res.status(200).json({ 
        message: 'Đã gửi lại mã xác thực. Vui lòng kiểm tra email.',
        email: result.email
      });
    } else {
      console.warn(`⚠️ Không thể gửi lại email xác thực cho ${result.email}`);
      res.status(200).json({ 
        message: 'Mã xác thực đã được tạo mới. Tuy nhiên, email không thể gửi được. Vui lòng thử lại sau.',
        email: result.email,
        emailNotSent: true
      });
    }
  } catch (error) {
    console.error('Resend verification code error:', error);
    const statusCode = error.message.includes('Không tìm thấy') ? 404 : 400;
    res.status(statusCode).json({ message: error.message || 'Lỗi máy chủ' });
  }
};

// ==========================
// QUÊN MẬT KHẨU - GỬI MÃ
// ==========================
exports.forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ message: 'Vui lòng nhập email' });
    }

    const result = await userService.forgotPassword(email);
    
    if (result.emailSent) {
      res.status(200).json({ 
        message: 'Mã đặt lại mật khẩu đã được gửi. Vui lòng kiểm tra email.',
        email: result.email
      });
    } else {
      console.warn(`⚠️ Không thể gửi email reset password cho ${result.email}`);
      res.status(200).json({ 
        message: 'Mã đặt lại mật khẩu đã được tạo. Tuy nhiên, email không thể gửi được. Vui lòng thử lại sau.',
        email: result.email,
        emailNotSent: true
      });
    }
  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({ message: 'Lỗi máy chủ', error: error.message });
  }
};

// ==========================
// XÁC THỰC MÃ RESET
// ==========================
exports.verifyResetCode = async (req, res) => {
  try {
    const { email, resetCode } = req.body;

    if (!email || !resetCode) {
      return res.status(400).json({ message: 'Vui lòng nhập email và mã xác thực' });
    }

    const result = await userService.verifyResetCode(email, resetCode);
    res.status(200).json({ 
      message: 'Mã xác thực hợp lệ. Bạn có thể đặt lại mật khẩu.',
      email: result.email
    });
  } catch (error) {
    console.error('Verify reset code error:', error);
    const statusCode = error.message.includes('Không tìm thấy') ? 404 : 400;
    res.status(statusCode).json({ message: error.message || 'Lỗi máy chủ' });
  }
};

// ==========================
// ĐẶT LẠI MẬT KHẨU
// ==========================
exports.resetPassword = async (req, res) => {
  try {
    const { email, resetCode, newPassword } = req.body;

    if (!email || !resetCode || !newPassword) {
      return res.status(400).json({ message: 'Vui lòng nhập đầy đủ thông tin' });
    }

    await userService.resetPassword(email, resetCode, newPassword);
    res.status(200).json({ 
      message: 'Đặt lại mật khẩu thành công! Bạn có thể đăng nhập ngay bây giờ.'
    });
  } catch (error) {
    console.error('Reset password error:', error);
    const statusCode = error.message.includes('Không tìm thấy') ? 404 : 400;
    res.status(statusCode).json({ message: error.message || 'Lỗi máy chủ' });
  }
};

// ==========================
// ĐỔI MẬT KHẨU
// ==========================
exports.changePassword = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { oldPassword, newPassword } = req.body;

    if (!oldPassword || !newPassword) {
      return res.status(400).json({ message: 'Vui lòng nhập đầy đủ thông tin' });
    }

    await userService.changePassword(userId, oldPassword, newPassword);
    res.status(200).json({ message: 'Đổi mật khẩu thành công!' });
  } catch (error) {
    console.error('Change password error:', error);
    const statusCode = error.message.includes('Không tìm thấy') ? 404 : 400;
    res.status(statusCode).json({ message: error.message || 'Lỗi máy chủ' });
  }
};

// ==========================
// CẬP NHẬT EMAIL NOTIFICATIONS
// ==========================
exports.updateEmailNotifications = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { emailNotifications } = req.body;

    if (typeof emailNotifications !== 'boolean') {
      return res.status(400).json({ message: 'emailNotifications phải là boolean' });
    }

    const result = await userService.updateEmailNotifications(userId, emailNotifications);
    res.status(200).json({ 
      message: emailNotifications ? 'Đã bật thông báo email' : 'Đã tắt thông báo email',
      emailNotifications: result
    });
  } catch (error) {
    console.error('Update email notifications error:', error);
    res.status(404).json({ message: error.message || 'Lỗi máy chủ' });
  }
};
