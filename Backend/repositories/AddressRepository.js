const Address = require('../models/Address');

class AddressRepository {
  // Tạo address
  async create(addressData) {
    const address = new Address(addressData);
    return await address.save();
  }

  // Tìm addresses theo userId
  async findByUserId(userId) {
    return await Address.find({ user: userId });
  }

  // Tìm address theo ID và userId
  async findByIdAndUserId(addressId, userId) {
    return await Address.findOne({ _id: addressId, user: userId });
  }

  // Cập nhật address
  async update(addressId, userId, updateData) {
    return await Address.findOneAndUpdate(
      { _id: addressId, user: userId },
      updateData,
      { new: true }
    );
  }

  // Xóa address
  async delete(addressId, userId) {
    return await Address.findOneAndDelete({ _id: addressId, user: userId });
  }

  // Cập nhật tất cả addresses của user (set isDefault = false)
  async unsetDefaultForUser(userId, excludeId = null) {
    const query = { user: userId, isDefault: true };
    if (excludeId) {
      query._id = { $ne: excludeId };
    }
    return await Address.updateMany(query, { $set: { isDefault: false } });
  }
}

module.exports = new AddressRepository();

