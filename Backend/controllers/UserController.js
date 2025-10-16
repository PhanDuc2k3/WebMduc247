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
    if (req.file) {
      const serverUrl = process.env.BASE_URL || `${req.protocol}://${req.get('host')}`;
      updateData.avatarUrl = `${serverUrl}/uploads/${req.file.filename}`;
    }

    const user = await User.findByIdAndUpdate(userId, updateData, {
      new: true,
      runValidators: true
    }).select('-password');

    if (!user) return res.status(404).json({ message: 'Người dùng không tồn tại' });

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
  console.log("==== [API] /api/users/seller-request ====");
  console.log("👉 Raw Body:", req.body);
  console.log("👉 Uploaded Files:", req.files);
  console.log("👉 User (decoded from token):", req.user);

  try {
    const userId = req.user?.userId;
    if (!userId) {
      console.warn("⚠️ Không có userId trong token");
      return res.status(401).json({ message: "Không xác thực được người dùng" });
    }

    // 🟢 Lấy các field từ body
    const { name, description, storeAddress, category, contactPhone, contactEmail } = req.body;

    // 🧩 Bước check dữ liệu trước khi xử lý
    const missingFields = [];
    if (!name) missingFields.push("name");
    if (!storeAddress) missingFields.push("storeAddress");
    if (!category) missingFields.push("category");
    if (!contactPhone) missingFields.push("contactPhone");

    if (missingFields.length > 0) {
      console.warn("⚠️ Thiếu các thông tin bắt buộc:", missingFields);
      return res.status(400).json({ message: `Thiếu thông tin: ${missingFields.join(", ")}` });
    }

    // 🔍 Lấy user từ DB
    const user = await User.findById(userId);
    if (!user) {
      console.warn("❌ Không tìm thấy user trong DB:", userId);
      return res.status(404).json({ message: "Không tìm thấy người dùng" });
    }

    // 🚫 Kiểm tra nếu đã có yêu cầu đang chờ
    if (user.sellerRequest?.status === "pending") {
      console.warn("⚠️ User đã có yêu cầu đang chờ duyệt:", userId);
      return res.status(400).json({ message: "Đã gửi yêu cầu, vui lòng chờ admin duyệt" });
    }

    // 📁 Xử lý file upload
    const host = `${req.protocol}://${req.get("host")}`;
    const logoUrl = req.files?.logo?.[0]
      ? `${host}/uploads/${req.files.logo[0].filename}`
      : null;
    const bannerUrl = req.files?.banner?.[0]
      ? `${host}/uploads/${req.files.banner[0].filename}`
      : null;

    console.log("✅ File URLs:", { logoUrl, bannerUrl });

    // 🧾 Lưu thông tin sellerRequest
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

    console.log("✅ Lưu sellerRequest thành công:", user.sellerRequest);

    res.status(200).json({
      message: "Đã gửi yêu cầu mở cửa hàng",
      sellerRequest: user.sellerRequest,
    });
  } catch (error) {
    console.error("❌ [Lỗi Server - requestSeller]:", error);
    res.status(500).json({
      message: "Lỗi máy chủ",
      error: error.message,
    });
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

if (action === "approve") {
  const storeData = user.sellerRequest.store;
  console.log("🧾 storeData nhận từ user:", storeData);

  let store = await Store.findOne({ owner: user._id });
  if (!store) {
    store = new Store({
      name: storeData.name,
      description: storeData.description,
      category: storeData.category,
      storeAddress: storeData.storeAddress, // ✅ key mới
      contactPhone: storeData.contactPhone,
      contactEmail: storeData.contactEmail,
      logoUrl: storeData.logoUrl,
      bannerUrl: storeData.bannerUrl,
      owner: user._id,
      isActive: true,
    });

    await store.save();
    console.log("✅ Đã tạo cửa hàng mới:", store._id);
    user.store = store._id;
  } else {
    console.log("ℹ️ User đã có store:", store._id);
  }

  user.role = "seller";
  user.sellerRequest.status = "approved";
  await user.save();

  console.log("✅ Duyệt yêu cầu thành công cho user:", user._id);
  return res.json({
    message: "Đã duyệt và tạo cửa hàng thành công",
    store,
  });
}
