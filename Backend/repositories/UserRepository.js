const User = require('../models/Users');
const Store = require('../models/Store');

class UserRepository {
  // Tìm user theo email
  async findByEmail(email) {
    return await User.findOne({ email });
  }

  // Tìm user theo ID
  async findById(userId) {
    return await User.findById(userId).select('-password');
  }

  // Tìm user theo ID (có password)
  async findByIdWithPassword(userId) {
    return await User.findById(userId);
  }

  // Tạo user mới
  async create(userData) {
    // Kiểm tra nếu đang tạo user với role admin
    if (userData.role === 'admin') {
      const existingAdmin = await User.findOne({ role: 'admin' });
      if (existingAdmin) {
        throw new Error('Hệ thống chỉ cho phép 1 tài khoản admin duy nhất. Đã có admin trong hệ thống.');
      }
    }
    
    const newUser = new User(userData);
    return await newUser.save();
  }

  // Cập nhật user
  async update(userId, updateData) {
    // Kiểm tra nếu đang cập nhật role thành admin
    if (updateData.role === 'admin') {
      const existingAdmin = await User.findOne({ role: 'admin' });
      if (existingAdmin && existingAdmin._id.toString() !== userId.toString()) {
        throw new Error('Hệ thống chỉ cho phép 1 tài khoản admin duy nhất. Đã có admin trong hệ thống.');
      }
    }
    
    return await User.findByIdAndUpdate(userId, updateData, {
      new: true,
      runValidators: true,
    }).select('-password');
  }

  // Xóa user
  async delete(userId) {
    return await User.findByIdAndDelete(userId);
  }

  // Lấy tất cả users
  async findAll() {
    return await User.find().select('-password');
  }

  // Cập nhật trạng thái online
  async updateOnlineStatus(userId, online, lastSeen) {
    return await User.findByIdAndUpdate(userId, { online, lastSeen });
  }

  // Tìm store theo owner
  async findStoreByOwner(ownerId) {
    return await Store.findOne({ owner: ownerId });
  }

  // Tìm users với sellerRequest pending
  async findSellerRequests() {
    return await User.find({ 'sellerRequest.status': 'pending' }).select('fullName email phone sellerRequest');
  }

  // Tìm user và cập nhật sellerRequest
  async updateSellerRequest(userId, sellerRequestData) {
    const user = await User.findById(userId);
    if (!user) return null;
    
    user.sellerRequest = sellerRequestData;
    return await user.save();
  }

  // Tìm admin duy nhất
  async findAdmin() {
    return await User.findOne({ role: 'admin' });
  }
}

module.exports = new UserRepository();

