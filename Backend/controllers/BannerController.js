// controllers/bannerController.js
const Banner = require("../models/Banner");

exports.getAllBanners = async (req, res) => {
  try {
    const banners = await Banner.find().sort({ order: 1 });
    res.json(banners);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.getBannersByType = async (req, res) => {
  try {
    const banners = await Banner.find({ type: req.params.type }).sort({ order: 1 });
    res.json(banners);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.updateBanner = async (req, res) => {
  try {
    const banner = await Banner.findById(req.params.id);
    if (!banner) return res.status(404).json({ message: "Banner not found" });

    const { title, link } = req.body;

    if (title !== undefined) banner.title = title;
    if (link !== undefined) banner.link = link;

    // Nếu có upload file, lưu URL mới
    if (req.file && req.file.path) {
      banner.imageUrl = req.file.path; // Cloudinary trả về URL ở req.file.path
    }

    await banner.save();
    res.json(banner);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
