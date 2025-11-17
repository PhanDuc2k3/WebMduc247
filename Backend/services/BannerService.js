const bannerRepository = require('../repositories/BannerRepository');

class BannerService {
  // Tạo banner
  async createBanner(bannerData, file) {
    const { title, link, type, order } = bannerData;

    if (!title || !type) {
      throw new Error("Title và type bắt buộc");
    }

    if (!file || !file.path) {
      throw new Error("Ảnh banner là bắt buộc");
    }

    // Tự động set order nếu không có
    let bannerOrder = order;
    if (!bannerOrder) {
      const existingBanners = await bannerRepository.findByType(type);
      bannerOrder = existingBanners.length + 1;
    }

    return await bannerRepository.create({ 
      title, 
      link, 
      type, 
      imageUrl: file.path,
      order: bannerOrder 
    });
  }

  // Lấy tất cả banners
  async getAllBanners() {
    return await bannerRepository.findAll();
  }

  // Lấy banners theo type
  async getBannersByType(type) {
    return await bannerRepository.findByType(type);
  }

  // Cập nhật banner
  async updateBanner(bannerId, bannerData, file) {
    const banner = await bannerRepository.findById(bannerId);
    if (!banner) {
      throw new Error("Banner not found");
    }

    const { title, link } = bannerData;

    if (title !== undefined) banner.title = title;
    if (link !== undefined) banner.link = link;

    if (file && file.path) {
      banner.imageUrl = file.path;
    }

    await banner.save();
    return banner;
  }

  // Xóa banner
  async deleteBanner(bannerId) {
    const banner = await bannerRepository.delete(bannerId);
    if (!banner) {
      throw new Error("Banner not found");
    }
    return banner;
  }
}

module.exports = new BannerService();

