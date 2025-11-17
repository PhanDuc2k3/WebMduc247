const bannerService = require('../services/BannerService');

exports.createBanner = async (req, res) => {
  try {
    const banner = await bannerService.createBanner(req.body, req.file);
    res.status(201).json(banner);
  } catch (err) {
    const statusCode = err.message.includes("bắt buộc") ? 400 : 500;
    res.status(statusCode).json({ message: err.message });
  }
};

exports.getAllBanners = async (req, res) => {
  try {
    const banners = await bannerService.getAllBanners();
    res.json(banners);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.getBannersByType = async (req, res) => {
  try {
    const banners = await bannerService.getBannersByType(req.params.type);
    res.json(banners);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.updateBanner = async (req, res) => {
  try {
    const banner = await bannerService.updateBanner(req.params.id, req.body, req.file);
    res.json(banner);
  } catch (err) {
    const statusCode = err.message.includes("not found") ? 404 : 500;
    res.status(statusCode).json({ message: err.message });
  }
};

exports.deleteBanner = async (req, res) => {
  try {
    await bannerService.deleteBanner(req.params.id);
    res.json({ message: "Banner đã được xóa thành công" });
  } catch (err) {
    const statusCode = err.message.includes("not found") ? 404 : 500;
    res.status(statusCode).json({ message: err.message });
  }
};