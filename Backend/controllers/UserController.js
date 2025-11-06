const User = require('../models/Users');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const Store = require('../models/Store');
const { sendVerificationEmail } = require('../utils/emailService');

// ==========================
// ĐĂNG KÝ
// ==========================
exports.register = async (req, res) => {
  try {
    const { email, password, fullName, phone } = req.body;
    if (!email || !password || !fullName)
      return res.status(400).json({ message: 'Vui lòng nhập đầy đủ thông tin' });

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      // Nếu user đã tồn tại nhưng chưa verify, xóa và tạo lại
      if (!existingUser.isVerified) {
        await User.findByIdAndDelete(existingUser._id);
      } else {
        return res.status(400).json({ message: 'Email đã được sử dụng' });
      }
    }

    // Tạo mã xác thực 6 chữ số
    const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
    const verificationCodeExpires = new Date(Date.now() + 15 * 60 * 1000); // 15 phút

    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = new User({ 
      email, 
      password: hashedPassword, 
      fullName, 
      phone,
      isVerified: false,
      verificationCode,
      verificationCodeExpires
    });
    await newUser.save();

    // Gửi email xác thực (không block nếu email service không khả dụng)
    const emailSent = await sendVerificationEmail(email, verificationCode, fullName);
    if (emailSent) {
      res.status(201).json({ 
        message: 'Đăng ký thành công! Vui lòng kiểm tra email để xác thực tài khoản.',
        email: email // Trả về email để frontend có thể hiển thị
      });
    } else {
      // Email không gửi được nhưng vẫn cho phép đăng ký
      // User có thể yêu cầu gửi lại mã xác thực
      console.warn(`⚠️ Không thể gửi email xác thực cho ${email}, nhưng vẫn cho phép đăng ký`);
      res.status(201).json({ 
        message: 'Đăng ký thành công! Tuy nhiên, email xác thực không thể gửi được. Vui lòng sử dụng tính năng "Gửi lại mã xác thực".',
        email: email,
        emailNotSent: true
      });
    }
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({ message: 'Lỗi máy chủ', error: error.message });
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

    const user = await User.findOne({ email });
    if (!user)
      return res.status(400).json({ message: 'Email hoặc mật khẩu không đúng' });

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid)
      return res.status(400).json({ message: 'Email hoặc mật khẩu không đúng' });

    // Kiểm tra email đã được xác thực chưa
    // Chỉ yêu cầu xác thực nếu:
    // 1. isVerified = false VÀ
    // 2. Có verificationCode (tức là tài khoản mới đã đăng ký nhưng chưa verify)
    // Các tài khoản cũ (không có verificationCode) được coi là đã xác thực
    if (user.isVerified === false && user.verificationCode) {
      return res.status(403).json({ 
        message: 'Tài khoản chưa được xác thực. Vui lòng kiểm tra email và xác thực tài khoản.',
        email: user.email,
        needsVerification: true
      });
    }

    // Nếu là tài khoản cũ (isVerified = false nhưng không có verificationCode), tự động verify
    if (user.isVerified === false && !user.verificationCode) {
      user.isVerified = true;
      await user.save();
      console.log(`✅ Tự động xác thực tài khoản cũ: ${user.email}`);
    }

    const token = jwt.sign(
      { userId: user._id, role: user.role },
      process.env.JWT_SECRET || 'secret123',
      { expiresIn: '7d' }
    );

    // 🔹 Cập nhật trạng thái online khi login
    await User.findByIdAndUpdate(user._id, { online: true, lastSeen: new Date() });

    res.status(200).json({
      message: 'Đăng nhập thành công',
      token,
      user: {
        id: user._id,
        email: user.email,
        fullName: user.fullName,
        phone: user.phone,
        role: user.role,
        avatarUrl: user.avatarUrl || '',
        online: true,        // trả luôn trạng thái cho client
        lastSeen: new Date()
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Lỗi máy chủ', error: error.message });
  }
};

// ==========================
// ĐĂNG XUẤT
// ==========================
exports.logout = async (req, res) => {
  try {
    const userId = req.user.userId;
    await User.findByIdAndUpdate(userId, { online: false, lastSeen: new Date() });
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
    const user = await User.findById(userId).select('-password');
    if (!user) return res.status(404).json({ message: 'Người dùng không tồn tại' });

    let store = null;
    if (user.role === 'seller') {
      store = await Store.findOne({ owner: user._id });
    }

    res.status(200).json({ message: 'Lấy thông tin người dùng thành công', user, store });
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({ message: 'Lỗi máy chủ', error: error.message });
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
      updateData.avatarUrl = req.file.path; // req.file.path là URL Cloudinary
    }

    const user = await User.findByIdAndUpdate(userId, updateData, {
      new: true,
      runValidators: true,
    }).select('-password');

    if (!user)
      return res.status(404).json({ message: 'Người dùng không tồn tại' });

    res.status(200).json({ message: 'Cập nhật thông tin thành công', user });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ message: 'Lỗi máy chủ', error: error.message });
  }
};


// ==========================
// QUẢN LÝ NGƯỜI DÙNG (ADMIN)
// ==========================
exports.getAllUsers = async (req, res) => {
  try {
    const users = await User.find().select('-password');
    res.status(200).json({ message: 'Lấy danh sách người dùng thành công', users });
  } catch (error) {
    console.error('Get all users error:', error);
    res.status(500).json({ message: 'Lỗi máy chủ', error: error.message });
  }
};

exports.deleteUser = async (req, res) => {
  try {
    const userId = req.params.id;
    const user = await User.findByIdAndDelete(userId);
    if (!user) return res.status(404).json({ message: 'Người dùng không tồn tại' });
    res.status(200).json({ message: 'Xóa người dùng thành công' });
  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({ message: 'Lỗi máy chủ', error: error.message });
  }
};

exports.updateUser = async (req, res) => {
  try {
    const userId = req.params.id;
    const { role, status } = req.body;
    const user = await User.findByIdAndUpdate(
      userId,
      { role, 'sellerRequest.status': status },
      { new: true, runValidators: true }
    ).select('-password');

    if (!user) return res.status(404).json({ message: 'Người dùng không tồn tại' });
    res.status(200).json({ message: 'Cập nhật người dùng thành công', user });
  } catch (error) {
    console.error('Update user error:', error);
    res.status(500).json({ message: 'Lỗi máy chủ', error: error.message });
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

    // Check các field bắt buộc
    const missingFields = [];
    if (!name) missingFields.push("name");
    if (!storeAddress) missingFields.push("storeAddress");
    if (!category) missingFields.push("category");
    if (!contactPhone) missingFields.push("contactPhone");

    if (missingFields.length > 0)
      return res.status(400).json({ message: `Thiếu thông tin: ${missingFields.join(", ")}` });

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: "Không tìm thấy người dùng" });

    if (user.sellerRequest?.status === "pending")
      return res.status(400).json({ message: "Đã gửi yêu cầu, vui lòng chờ admin duyệt" });

    // Lấy URL từ Cloudinary
    const logoUrl = req.files?.logo?.[0]?.path || null;
    const bannerUrl = req.files?.banner?.[0]?.path || null;

    user.sellerRequest = {
      status: "pending",
      requestedAt: new Date(),
      store: {
        name,
        description,
        category,
        storeAddress,
        contactPhone,
        contactEmail,
        logoUrl,
        bannerUrl,
        isActive: false,
      },
    };

    await user.save();

    res.status(200).json({
      message: "Đã gửi yêu cầu mở cửa hàng",
      sellerRequest: user.sellerRequest,
    });
  } catch (error) {
    console.error("requestSeller error:", error);
    res.status(500).json({ message: "Lỗi máy chủ", error: error.message });
  }
};



exports.getAllSellerRequests = async (req, res) => {
  try {
    const requests = await User.find({ 'sellerRequest.status': 'pending' }).select('fullName email phone sellerRequest');
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

    // Lấy user
    const user = await User.findById(userId);
    if (!user || !user.sellerRequest) {
      return res.status(404).json({ message: 'Không tìm thấy yêu cầu của user này' });
    }

    if (user.sellerRequest.status !== 'pending') {
      return res.status(400).json({ message: 'Yêu cầu đã được xử lý trước đó' });
    }

if (action === 'approve') {
  // Cập nhật status
  user.sellerRequest.status = 'approved';
  user.sellerRequest.processedAt = new Date();

  // Đổi role
  user.role = 'seller';

  // Tạo store mới
  const { name, description, category, storeAddress, contactPhone, contactEmail, logoUrl, bannerUrl } = user.sellerRequest.store;

  const newStore = new Store({
    owner: user._id,
    name,
    description,
    category,
    storeAddress,
    contactPhone,
    contactEmail,
    logoUrl,
    bannerUrl,
    isActive: true,
  });

  await newStore.save();
  await user.save();

  return res.status(200).json({ message: 'Đã duyệt yêu cầu, tạo cửa hàng và chuyển role sang seller', store: newStore });
}


    if (action === 'reject') {
      user.sellerRequest.status = 'rejected';
      user.sellerRequest.processedAt = new Date();

      await user.save();

      return res.status(200).json({ message: 'Đã từ chối yêu cầu mở cửa hàng' });
    }

  } catch (error) {
    console.error('Handle seller request error:', error);
    res.status(500).json({ message: 'Lỗi máy chủ', error: error.message });
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

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: 'Không tìm thấy tài khoản với email này' });
    }

    if (user.isVerified) {
      return res.status(400).json({ message: 'Tài khoản đã được xác thực' });
    }

    // Kiểm tra mã xác thực
    if (user.verificationCode !== verificationCode) {
      return res.status(400).json({ message: 'Mã xác thực không đúng' });
    }

    // Kiểm tra mã còn hiệu lực không
    if (new Date() > user.verificationCodeExpires) {
      return res.status(400).json({ message: 'Mã xác thực đã hết hạn. Vui lòng yêu cầu mã mới' });
    }

    // Xác thực thành công
    user.isVerified = true;
    user.verificationCode = null;
    user.verificationCodeExpires = null;
    await user.save();

    res.status(200).json({ message: 'Xác thực email thành công! Bạn có thể đăng nhập ngay bây giờ.' });
  } catch (error) {
    console.error('Verify email error:', error);
    res.status(500).json({ message: 'Lỗi máy chủ', error: error.message });
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

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: 'Không tìm thấy tài khoản với email này' });
    }

    if (user.isVerified) {
      return res.status(400).json({ message: 'Tài khoản đã được xác thực' });
    }

    // Tạo mã xác thực mới
    const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
    const verificationCodeExpires = new Date(Date.now() + 15 * 60 * 1000); // 15 phút

    user.verificationCode = verificationCode;
    user.verificationCodeExpires = verificationCodeExpires;
    await user.save();

    // Gửi email xác thực (không block nếu email service không khả dụng)
    const emailSent = await sendVerificationEmail(email, verificationCode, user.fullName);
    if (emailSent) {
      res.status(200).json({ 
        message: 'Đã gửi lại mã xác thực. Vui lòng kiểm tra email.',
        email: email
      });
    } else {
      // Email không gửi được nhưng vẫn trả về success với thông báo
      console.warn(`⚠️ Không thể gửi lại email xác thực cho ${email}`);
      res.status(200).json({ 
        message: 'Mã xác thực đã được tạo mới. Tuy nhiên, email không thể gửi được. Vui lòng thử lại sau.',
        email: email,
        emailNotSent: true
      });
    }
  } catch (error) {
    console.error('Resend verification code error:', error);
    res.status(500).json({ message: 'Lỗi máy chủ', error: error.message });
  }
};

