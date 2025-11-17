const addressRepository = require('../repositories/AddressRepository');

class AddressService {
  // Tạo address
  async createAddress(userId, addressData) {
    const { fullName, phone, street, city, state, postalCode, country, isDefault } = addressData;

    if (isDefault) {
      await addressRepository.unsetDefaultForUser(userId);
    }

    return await addressRepository.create({
      user: userId,
      fullName,
      phone,
      street,
      city,
      state,
      postalCode,
      country,
      isDefault,
    });
  }

  // Lấy tất cả addresses của user
  async getAddresses(userId) {
    return await addressRepository.findByUserId(userId);
  }

  // Lấy address theo ID
  async getAddressById(userId, addressId) {
    const address = await addressRepository.findByIdAndUserId(addressId, userId);
    if (!address) {
      throw new Error("Không tìm thấy địa chỉ");
    }
    return address;
  }

  // Cập nhật address
  async updateAddress(userId, addressId, addressData) {
    const { fullName, phone, street, city, state, postalCode, country, isDefault } = addressData;

    if (isDefault) {
      await addressRepository.unsetDefaultForUser(userId, addressId);
    }

    const address = await addressRepository.update(addressId, userId, {
      fullName,
      phone,
      street,
      city,
      state,
      postalCode,
      country,
      isDefault,
    });

    if (!address) {
      throw new Error("Không tìm thấy địa chỉ");
    }

    return address;
  }

  // Xóa address
  async deleteAddress(userId, addressId) {
    const address = await addressRepository.delete(addressId, userId);
    if (!address) {
      throw new Error("Không tìm thấy địa chỉ");
    }
    return address;
  }
}

module.exports = new AddressService();

