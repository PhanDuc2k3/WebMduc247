const User = require('../models/Users');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const Store = require('../models/Store');

exports.register = async (req, res) => {
  try {
    const { email, password, fullName, phone } = req.body;
    const existingUser = await User.findOne({ email });
    if (existingUser) return res.status(400).json({ message: 'Email đã được sử dụng' });

    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = new User({ email, password: hashedPassword, fullName, phone });
    await newUser.save();
    res.status(201).json({ message: 'Đăng ký thành công' });
  } catch (error) {
    res.status(500).json({ error });
  }
};

exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ message: 'Email hoặc mật khẩu không đúng' });

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) return res.status(400).json({ message: 'Email hoặc mật khẩu không đúng' });

    const token = jwt.sign({ userId: user._id, role: user.role }, process.env.JWT_SECRET, { expiresIn: '7d' });

    res.status(200).json({
      message: 'Đăng nhập thành công',
      token,
      user: { id: user._id, email: user.email, fullName: user.fullName, phone: user.phone, role: user.role, avatarUrl: user.avatarUrl }
    });
  } catch (error) {
    res.status(500).json({ message: 'Lỗi máy chủ' });
  }
};

exports.getProfile = async (req, res) => {
  try {
    const userId = req.user.userId;
    const user = await User.findById(userId).select("-password");
    if (!user) return res.status(404).json({ message: "Người dùng không tồn tại" });

    let store = null;
    if (user.role === "seller") store = await Store.findOne({ owner: user._id });

    res.status(200).json({ message: "Lấy thông tin người dùng thành công", user, store });
  } catch (error) {
    res.status(500).json({ message: "Lỗi máy chủ" });
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

    const user = await User.findByIdAndUpdate(userId, updateData, { new: true, runValidators: true }).select('-password');
    if (!user) return res.status(404).json({ message: 'Người dùng không tồn tại' });

    res.status(200).json({ message: 'Cập nhật thông tin người dùng thành công', user });
  } catch (error) {
    res.status(500).json({ message: 'Lỗi máy chủ' });
  }
};

exports.getAllUsers = async (req, res) => {
  try {
    const users = await User.find().select('-password');
    res.status(200).json({ message: 'Lấy danh sách người dùng thành công', users });
  } catch (error) {
    res.status(500).json({ message: 'Lỗi máy chủ' });
  }
};

exports.deleteUser = async (req, res) => {
  try {
    const userId = req.params.id;
    const user = await User.findByIdAndDelete(userId);
    if (!user) return res.status(404).json({ message: 'Người dùng không tồn tại' });
    res.status(200).json({ message: 'Xóa người dùng thành công' });
  } catch (error) {
    res.status(500).json({ message: 'Lỗi máy chủ' });
  }
};

exports.updateUser = async (req, res) => {
  try {
    const userId = req.params.id;
    const { role, status } = req.body;

    const user = await User.findByIdAndUpdate(userId, { role, "sellerRequest.status": status }, { new: true, runValidators: true }).select('-password');
    if (!user) return res.status(404).json({ message: 'Người dùng không tồn tại' });

    res.status(200).json({ message: 'Cập nhật người dùng thành công', user });
  } catch (error) {
    res.status(500).json({ message: 'Lỗi máy chủ' });
  }
};

exports.requestSeller = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { name, description, address, category, contactPhone, contactEmail } = req.body;

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: "Không tìm thấy user" });
    if (user.sellerRequest && user.sellerRequest.status === "pending") return res.status(400).json({ message: "Bạn đã gửi yêu cầu, vui lòng chờ admin duyệt" });

    let logoUrl = '';
    let bannerUrl = '';
    const host = req.protocol + '://' + req.get('host');

    if (req.files) {
      if (req.files['logo'] && req.files['logo'][0]) logoUrl = host + '/uploads/' + req.files['logo'][0].filename;
      if (req.files['banner'] && req.files['banner'][0]) bannerUrl = host + '/uploads/' + req.files['banner'][0].filename;
    }

    user.sellerRequest = {
      status: "pending",
      requestedAt: new Date(),
      store: { name, description, address, category, contactPhone, contactEmail, logoUrl, bannerUrl, isActive: false },
    };

    await user.save();
    res.status(200).json({ message: "Yêu cầu mở cửa hàng đã được gửi", sellerRequest: user.sellerRequest });
  } catch (error) {
    res.status(500).json({ message: "Lỗi máy chủ", error: error.message });
  }
};

exports.getAllSellerRequests = async (req, res) => {
  try {
    const requests = await User.find({ "sellerRequest.status": "pending" }).select("fullName email phone sellerRequest");
    res.status(200).json({ message: "Danh sách yêu cầu mở cửa hàng", requests });
  } catch (error) {
    res.status(500).json({ message: "Lỗi máy chủ", error: error.message });
  }
};

exports.handleSellerRequest = async (req, res) => {
  try {
    const { userId, action } = req.body;
    const user = await User.findById(userId);
    if (!user || !user.sellerRequest) return res.status(404).json({ message: "Không tìm thấy yêu cầu" });

    if (action === "approve") {
      const storeData = user.sellerRequest.store;
      let store = await Store.findOne({ owner: user._id });
      if (!store) {
        store = new Store({
          name: storeData.name,
          description: storeData.description,
          category: storeData.category,
          storeAddress: storeData.address,
          contactPhone: storeData.contactPhone,
          contactEmail: storeData.contactEmail,
          logoUrl: storeData.logoUrl,
          bannerUrl: storeData.bannerUrl,
          owner: user._id,
          isActive: true,
        });
        await store.save();
        user.store = store._id;
      }

      user.role = "seller";
      user.sellerRequest.status = "approved";
      await user.save();
      return res.json({ message: "Đã duyệt và tạo cửa hàng thành công", store });
    }

    if (action === "reject") {
      user.sellerRequest.status = "rejected";
      await user.save();
      return res.json({ message: "Đã từ chối yêu cầu" });
    }

    return res.status(400).json({ message: "Hành động không hợp lệ" });
  } catch (error) {
    res.status(500).json({ message: "Lỗi server" });
  }
};
