const addressService = require('../services/AddressService');

exports.createAddress = async (req, res) => {
  try {
    if (!req.user || !req.user.userId) {
      return res.status(401).json({ message: "Người dùng chưa được xác thực" });
    }

    const address = await addressService.createAddress(req.user.userId, req.body);
    res.status(201).json(address);
  } catch (error) {
    console.error("🔥 Lỗi CREATE ADDRESS:", error);
    res.status(500).json({ message: "Lỗi khi tạo địa chỉ", error: error.message });
  }
};

exports.getAddresses = async (req, res) => {
  try {
    const addresses = await addressService.getAddresses(req.user.userId);
    res.json(addresses);
  } catch (error) {
    res.status(500).json({ message: "Lỗi khi lấy địa chỉ", error });
  }
};

exports.getAddressById = async (req, res) => {
  try {
    const address = await addressService.getAddressById(req.user.userId, req.params.id);
    res.json(address);
  } catch (error) {
    const statusCode = error.message.includes("Không tìm thấy") ? 404 : 500;
    res.status(statusCode).json({ message: error.message || "Lỗi khi lấy địa chỉ" });
  }
};

exports.updateAddress = async (req, res) => {
  try {
    const address = await addressService.updateAddress(req.user.userId, req.params.id, req.body);
    res.json(address);
  } catch (error) {
    const statusCode = error.message.includes("Không tìm thấy") ? 404 : 500;
    res.status(statusCode).json({ message: error.message || "Lỗi khi cập nhật địa chỉ" });
  }
};

exports.deleteAddress = async (req, res) => {
  try {
    await addressService.deleteAddress(req.user.userId, req.params.id);
    res.json({ message: "Đã xóa địa chỉ thành công" });
  } catch (error) {
    const statusCode = error.message.includes("Không tìm thấy") ? 404 : 500;
    res.status(statusCode).json({ message: error.message || "Lỗi khi xóa địa chỉ" });
  }
};
