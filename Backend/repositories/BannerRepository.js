const Banner = require('../models/Banner');

class BannerRepository {
  // Tạo banner
  async create(bannerData) {
    const banner = new Banner(bannerData);
    return await banner.save();
  }

  // Tìm banner theo ID
  async findById(bannerId) {
    return await Banner.findById(bannerId);
  }

  // Tìm tất cả banners
  async findAll() {
    return await Banner.find().sort({ order: 1 });
  }

  // Tìm banners theo type
  async findByType(type) {
    return await Banner.find({ type }).sort({ order: 1 });
  }

  // Cập nhật banner
  async update(bannerId, updateData) {
    return await Banner.findByIdAndUpdate(bannerId, updateData, { new: true });
  }

  // Xóa banner
  async delete(bannerId) {
    return await Banner.findByIdAndDelete(bannerId);
  }
}

module.exports = new BannerRepository();

