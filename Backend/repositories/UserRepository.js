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
    const newUser = new User(userData);
    return await newUser.save();
  }

  // Cập nhật user
  async update(userId, updateData) {
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
}

module.exports = new UserRepository();

