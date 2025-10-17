const User = require('../models/Users');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const Store = require('../models/Store');

// ==========================
// ĐĂNG KÝ
// ==========================
exports.register = async (req, res) => {
  try {
    const { email, password, fullName, phone } = req.body;
    if (!email || !password || !fullName)
      return res.status(400).json({ message: 'Vui lòng nhập đầy đủ thông tin' });

    const existingUser = await User.findOne({ email });
    if (existingUser)
      return res.status(400).json({ message: 'Email đã được sử dụng' });

    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = new User({ email, password: hashedPassword, fullName, phone });
    await newUser.save();

    res.status(201).json({ message: 'Đăng ký thành công' });
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

    const token = jwt.sign(
      { userId: user._id, role: user.role },
      process.env.JWT_SECRET || 'secret123',
      { expiresIn: '7d' }
    );

    res.status(200).json({
      message: 'Đăng nhập thành công',
      token,
      user: {
        id: user._id,
        email: user.email,
        fullName: user.fullName,
        phone: user.phone,
        role: user.role,
        avatarUrl: user.avatarUrl || ''
      }
    });
  } catch (error) {
    console.error('Login error:', error);
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