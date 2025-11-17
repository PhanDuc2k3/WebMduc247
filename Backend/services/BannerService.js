const bannerRepository = require('../repositories/BannerRepository');

class BannerService {
  // Tạo banner
  async createBanner(bannerData, file) {
    const { title, link, type } = bannerData;

    if (!title || !type) {
      throw new Error("Title và type bắt buộc");
    }

    let imageUrl = "";
    if (file && file.path) {
      imageUrl = file.path;
    }

    return await bannerRepository.create({ title, link, type, imageUrl });
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

