const Store = require('../models/Store');

// Tạo cửa hàng
exports.createStore = async (req, res) => {
  try {
    const logo = req.files?.logo?.[0];
    const banner = req.files?.banner?.[0];

    const { name, description, category, address, contactPhone, contactEmail } = req.body;

    if (!name || !description || !category || !address) {
      return res.status(400).json({ message: 'Thiếu thông tin bắt buộc' });
    }

    const newStore = new Store({
      name,
      description,
      category,
      storeAddress: address,
      contactPhone,
      contactEmail,
      logoUrl: logo ? `/uploads/${logo.filename}` : '',
      bannerUrl: banner ? `/uploads/${banner.filename}` : '',
      owner: req.user._id,
    });

    await newStore.save();

    res.status(201).json({ message: 'Tạo cửa hàng thành công!', store: newStore });
  } catch (error) {
    res.status(500).json({ message: 'Lỗi khi tạo cửa hàng', error: error.message });
  }
};

// Lấy cửa hàng của chủ sở hữu
exports.getStoreByOwner = async (req, res) => {
  try {
    const userId = req.user.userId;
    const store = await Store.findOne({ owner: userId });
    if (!store) return res.status(404).json({ message: 'Không tìm thấy cửa hàng' });

    res.status(200).json({ message: 'Lấy thông tin cửa hàng thành công', store });
  } catch (error) {
    res.status(500).json({ message: 'Lỗi khi lấy cửa hàng', error: error.message });
  }
};

// Cập nhật cửa hàng
exports.updateStore = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { name, description, storeAddress, logoUrl, category, customCategory } = req.body;

    const store = await Store.findOne({ owner: userId });
    if (!store) return res.status(404).json({ message: 'Không tìm thấy cửa hàng' });

    if (name) store.name = name;
    if (description) store.description = description;
    if (storeAddress) store.storeAddress = storeAddress;
    if (logoUrl) store.logoUrl = logoUrl;
    if (category) store.category = category === 'Other' ? customCategory : category;

    await store.save();
    res.status(200).json({ message: 'Cập nhật cửa hàng thành công', store });
  } catch (error) {
    res.status(500).json({ message: 'Lỗi khi cập nhật cửa hàng', error: error.message });
  }
};

// Kích hoạt cửa hàng
exports.activateStore = async (req, res) => {
  try {
    const userId = req.user.userId;
    const store = await Store.findOne({ owner: userId });
    if (!store) return res.status(404).json({ message: 'Không tìm thấy cửa hàng' });

    store.isActive = true;
    await store.save();
    res.status(200).json({ message: 'Kích hoạt cửa hàng thành công', store });
  } catch (error) {
    res.status(500).json({ message: 'Lỗi khi kích hoạt cửa hàng', error: error.message });
  }
};

// Vô hiệu hóa cửa hàng
exports.deactivateStore = async (req, res) => {
  try {
    const userId = req.user.userId;
    const store = await Store.findOne({ owner: userId });
    if (!store) return res.status(404).json({ message: 'Không tìm thấy cửa hàng' });

    store.isActive = false;
    await store.save();
    res.status(200).json({ message: 'Vô hiệu hóa cửa hàng thành công', store });
  } catch (error) {
    res.status(500).json({ message: 'Lỗi khi vô hiệu hóa cửa hàng', error: error.message });
  }
};

// Lấy tất cả cửa hàng đang active
exports.getAllActiveStores = async (req, res) => {
  try {
    const stores = await Store.find({ isActive: true }).populate('owner', 'fullName email');
    res.status(200).json({ message: 'Lấy danh sách cửa hàng thành công', stores });
  } catch (error) {
    res.status(500).json({ message: 'Lỗi khi lấy danh sách cửa hàng', error: error.message });
  }
};

// Lấy cửa hàng theo ID
exports.getStoreById = async (req, res) => {
  try {
    const storeId = req.params.id;
    const store = await Store.findById(storeId).populate('owner', 'fullName email phone avatarUrl');
    if (!store || !store.isActive) return res.status(404).json({ message: 'Không tìm thấy cửa hàng' });

    res.status(200).json({ message: 'Lấy thông tin cửa hàng thành công', store });
  } catch (error) {
    res.status(500).json({ message: 'Lỗi khi lấy cửa hàng', error: error.message });
  }
};

// Lấy cửa hàng của người bán hiện tại
exports.getMyStore = async (req, res) => {
  try {
    const store = await Store.findOne({ owner: req.user.userId });
    if (!store) return res.status(404).json({ message: 'Bạn chưa có cửa hàng' });

    res.status(200).json({ store });
  } catch (error) {
    res.status(500).json({ message: 'Lỗi server', error: error.message });
  }
};
