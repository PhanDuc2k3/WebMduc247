const Address = require('../models/Address');

// Tạo địa chỉ mới
exports.createAddress = async (req, res) => {
  try {
    const { fullName, phone, street, city, state, postalCode, country, isDefault } = req.body;

    if (!req.user || !req.user.userId) {
      return res.status(401).json({ message: "Người dùng chưa được xác thực" });
    }

    const newAddress = new Address({
      user: req.user.userId,
      fullName,
      phone,
      street,
      city,
      state,
      postalCode,
      country,
      isDefault,
    });

    if (isDefault) {
      await Address.updateMany(
        { user: req.user.userId, isDefault: true },
        { $set: { isDefault: false } }
      );
    }

    const saved = await newAddress.save();
    res.status(201).json(saved);
  } catch (error) {
    console.error("🔥 Lỗi CREATE ADDRESS:", error);
    res.status(500).json({ message: "Lỗi khi tạo địa chỉ", error: error.message });
  }
};

// Lấy tất cả địa chỉ của user
exports.getAddresses = async (req, res) => {
  try {
    const addresses = await Address.find({ user: req.user.userId });
    res.json(addresses);
  } catch (error) {
    res.status(500).json({ message: "Lỗi khi lấy địa chỉ", error });
  }
};

// Lấy 1 địa chỉ theo id
exports.getAddressById = async (req, res) => {
  try {
    const address = await Address.findOne({ _id: req.params.id, user: req.user.userId });
    if (!address) return res.status(404).json({ message: "Không tìm thấy địa chỉ" });
    res.json(address);
  } catch (error) {
    res.status(500).json({ message: "Lỗi khi lấy địa chỉ", error });
  }
};

// Cập nhật địa chỉ
exports.updateAddress = async (req, res) => {
  try {
    const { fullName, phone, street, city, state, postalCode, country, isDefault } = req.body;

    const address = await Address.findOneAndUpdate(
      { _id: req.params.id, user: req.user.userId },
      { fullName, phone, street, city, state, postalCode, country, isDefault },
      { new: true }
    );

    if (!address) return res.status(404).json({ message: "Không tìm thấy địa chỉ" });

    if (isDefault) {
      await Address.updateMany(
        { user: req.user.userId, _id: { $ne: address._id } },
        { $set: { isDefault: false } }
      );
    }

    res.json(address);
  } catch (error) {
    res.status(500).json({ message: "Lỗi khi cập nhật địa chỉ", error });
  }
};

// Xóa địa chỉ
exports.deleteAddress = async (req, res) => {
  try {
    const address = await Address.findOneAndDelete({ _id: req.params.id, user: req.user.userId });
    if (!address) return res.status(404).json({ message: "Không tìm thấy địa chỉ" });

    res.json({ message: "Đã xóa địa chỉ thành công" });
  } catch (error) {
    res.status(500).json({ message: "Lỗi khi xóa địa chỉ", error });
  }
};
