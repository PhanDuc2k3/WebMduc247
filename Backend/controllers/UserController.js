const User = require('../models/users');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// Register a new user
exports.register = async (req, res) => {
  try {
    const { email, password, fullName, phone } = req.body;

    const exportistingUser = await User.findOne({ email });
    if (exportistingUser) {
      return res.status(400).json({ message: 'Email đã được sử dụng' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = new User({
      email,
      password: hashedPassword,
      fullName,
      phone
    });

    await newUser.save();
    res.status(201).json({ message: 'Đăng ký thành công' });
  }
  catch (error) {
    res.status(500).json({ error });
  }
};

// Login
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ message: 'Email hoặc mật khẩu không đúng' });
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(400).json({ message: 'Email hoặc mật khẩu không đúng' });
    }

    const token = jwt.sign(
      { userId: user._id, role: user.role },
      process.env.JWT_SECRET,
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
        avatarUrl: user.avatarUrl 
      }
    });

  }
  catch (error) {
    res.status(500).json({ message: 'Lỗi máy chủ' });
  }
};

// Profile
exports.getProfile = async (req, res) => {
  try {
    const userId = req.user.userId;
    const user = await User.findById(userId).select('-password');
    if (!user) {
      return res.status(404).json({ message: 'Người dùng không tồn tại' });
    }
    res.status(200).json(
      { message: 'Lấy thông tin người dùng thành công', user }
    );
  }
  catch (error) {
    res.status(500).json({ message: 'Lỗi máy chủ' });
  }
};

exports.updateProfile = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { fullName, phone } = req.body;
    let updateData = { fullName, phone };

    if (req.file) {
      const serverUrl = process.env.BASE_URL || "http://localhost:5000";
      updateData.avatarUrl = `${serverUrl}/uploads/${req.file.filename}`;
    }

    const user = await User.findByIdAndUpdate(
      userId,
      updateData,
      { new: true, runValidators: true }
    ).select('-password');

    if (!user) {
      return res.status(404).json({ message: 'Người dùng không tồn tại' });
    }

    res.status(200).json({
      message: 'Cập nhật thông tin người dùng thành công',
      user
    });
  } catch (error) {
    res.status(500).json({ message: 'Lỗi máy chủ' });
  }
};

// Admin: get all users
exports.getAllUsers = async (req, res) => {
  try {
    const users = await User.find().select('-password');
    res.status(200).json({ message: 'Lấy danh sách người dùng thành công', users });
  } catch (error) {
    res.status(500).json({ message: 'Lỗi máy chủ' });
  }
};

// Admin: delete user
exports.deleteUser = async (req, res) => {
  try {
    const userId = req.params.id;
    const user = await User.findByIdAndDelete(userId);
    if (!user) {
      return res.status(404).json({ message: 'Người dùng không tồn tại' });
    }
    res.status(200).json({ message: 'Xóa người dùng thành công' });
  } catch (error) {
    res.status(500).json({ message: 'Lỗi máy chủ' });
  }
};

// Admin: update user role / status
exports.updateUser = async (req, res) => {
  try {
    const userId = req.params.id;
    const { role, status } = req.body;

    const user = await User.findByIdAndUpdate(
      userId,
      { role, "sellerRequest.status": status },
      { new: true, runValidators: true }
    ).select('-password');

    if (!user) {
      return res.status(404).json({ message: 'Người dùng không tồn tại' });
    }

    res.status(200).json({ message: 'Cập nhật người dùng thành công', user });
  } catch (error) {
    res.status(500).json({ message: 'Lỗi máy chủ' });
  }
};

// User send request to become seller
exports.requestSeller = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { 
      name, 
      description, 
      address, 
      logoUrl, 
      bannerUrl, 
      category, 
      contactPhone, 
      contactEmail 
    } = req.body;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "Không tìm thấy user" });
    }

    // Nếu đã có request đang chờ thì chặn không cho gửi lại
    if (user.sellerRequest && user.sellerRequest.status === "pending") {
      return res.status(400).json({ message: "Bạn đã gửi yêu cầu, vui lòng chờ admin duyệt" });
    }

    user.sellerRequest = {
      status: "pending",
      requestedAt: new Date(),
      store: {
        name,
        description,
        address,
        logoUrl,
        bannerUrl,
        category,
        contactPhone,
        contactEmail,
        isActive: false,
      },
    };

    await user.save();

    res.status(200).json({ message: "Yêu cầu mở cửa hàng đã được gửi", user });
  } catch (error) {
    res.status(500).json({ message: "Lỗi máy chủ", error: error.message });
  }
};



// admin get all seller requests
exports.getAllSellerRequests = async (req, res) => {
  try {
    const requests = await User.find({ "sellerRequest.status": "pending" })
      .select("fullName email phone sellerRequest");

    res.status(200).json({ message: "Danh sách yêu cầu mở cửa hàng", requests });
  } catch (error) {
    res.status(500).json({ message: "Lỗi máy chủ", error: error.message });
  }
};

// Admin approve or reject seller request
exports.handleSellerRequest = async (req, res) => {
  try {
    const { userId, action } = req.body; // action = 'approve' | 'reject'
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: "Không tìm thấy user" });

    if (action === "approve") {
      user.role = "seller";
      user.sellerRequest.status = "approved";
      user.sellerRequest.store.isActive = true;
    } else {
      user.sellerRequest.status = "rejected";
    }

    await user.save();
    res.status(200).json({ message: `Yêu cầu đã được ${action}`, user });
  } catch (error) {
    res.status(500).json({ message: "Lỗi máy chủ", error: error.message });
  }
};

