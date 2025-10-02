const Store = require('../models/Store');
const User = require('../models/Users');

exports.createStore = async (req, res) => {
    try {
        const { name, description, storeAddress, logoUrl, category, customCategory } = req.body;
        const userId = req.user.userId;

        const existingStore = await Store.findOne({ owner: userId });
        if (existingStore) {
            return res.status(400).json({ message: 'Người dùng đã có cửa hàng' });
        }

        const newStore = new Store({
            name,
            description,
            storeAddress,
            logoUrl,
            category: category === 'Other' ? customCategory : category,
            owner: userId,
            isActive: false
        });

        await newStore.save();
        res.status(201).json({ message: 'Cửa hàng đã được tạo', store: newStore });
    }
    catch (error) {
        res.status(500).json({ message: 'Lỗi khi tạo cửa hàng', error: error.message });
    }
};

exports.getStoreByOwner = async (req, res) => {
    try {
        const userId = req.user.userId;
        const store = await Store.findOne({ owner: userId });
        if (!store) return res.status(404).json({ message: 'Không tìm thấy cửa hàng' });
        res.status(200).json({ message: 'Lấy thông tin cửa hàng thành công', store });
    }
    catch (error) {
        res.status(500).json({ message: 'Lỗi khi lấy cửa hàng', error: error.message });
    }
};

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
    }
    catch (error) {
        res.status(500).json({ message: 'Lỗi khi cập nhật cửa hàng', error: error.message });
    }
};

exports.activateStore = async (req, res) => {
    try {
        const userId = req.user.userId;
        const store = await Store.findOne({ owner: userId });
        if (!store) return res.status(404).json({ message: 'Không tìm thấy cửa hàng' });
        store.isActive = true;
        await store.save();
        res.status(200).json({ message: 'Kích hoạt cửa hàng thành công', store });
    }
    catch (error) {
        res.status(500).json({ message: 'Lỗi khi kích hoạt cửa hàng', error: error.message });
    }
};

exports.deactivateStore = async (req, res) => {
    try {
        const userId = req.user.userId;
        const store = await Store.findOne({ owner: userId });
        if (!store) return res.status(404).json({ message: 'Không tìm thấy cửa hàng' });
        store.isActive = false;
        await store.save();
        res.status(200).json({ message: 'Vô hiệu hóa cửa hàng thành công', store });
    }
    catch (error) {
        res.status(500).json({ message: 'Lỗi khi vô hiệu hóa cửa hàng', error: error.message });
    }
};

exports.getAllActiveStores = async (req, res) => {
    try {
        const stores = await Store.find({ isActive: true }).populate('owner', 'fullName email');
        res.status(200).json({ message: 'Lấy danh sách cửa hàng thành công', stores });
    }
    catch (error) {
        res.status(500).json({ message: 'Lỗi khi lấy danh sách cửa hàng', error: error.message });
    }
};

exports.getStoreById = async (req, res) => {
    try {
        const storeId = req.params.id;
        // Populate đủ các trường cần thiết cho frontend
        const store = await Store.findById(storeId).populate('owner', 'fullName email phone avatarUrl');
        if (!store || !store.isActive)
            return res.status(404).json({ message: 'Không tìm thấy cửa hàng' });

        res.status(200).json({ message: 'Lấy thông tin cửa hàng thành công', store });
    } catch (error) {
        res.status(500).json({ message: 'Lỗi khi lấy cửa hàng', error: error.message });
    }
};
// Lấy cửa hàng của người bán hiện tại
exports.getMyStore = async (req, res) => {
  try {
    console.log('👉 userId từ token:', req.user); // log thông tin user

    const store = await Store.findOne({ owner: req.user.userId });

    if (!store) {
      console.log('❌ Không tìm thấy cửa hàng cho user', req.user.userId);
      return res.status(404).json({ message: 'Bạn chưa có cửa hàng' });
    }

    console.log('✅ Tìm thấy cửa hàng:', store._id);
    res.status(200).json({ store });
  } catch (error) {
    console.error('🔥 Lỗi getMyStore:', error);
    res.status(500).json({ message: 'Lỗi server', error: error.message });
  }
};
