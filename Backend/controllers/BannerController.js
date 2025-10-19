// controllers/bannerController.js
const Banner = require("../models/Banner");
exports.createBanner = async (req, res) => {
  try {
    const { title, link, type } = req.body;
    if (!title || !type) return res.status(400).json({ message: "Title và type bắt buộc" });

    let imageUrl = "";
    if (req.file && req.file.path) {
      imageUrl = req.file.path; // Cloudinary hoặc path lưu file
    }

    const newBanner = new Banner({ title, link, type, imageUrl });
    await newBanner.save();
    res.status(201).json(newBanner);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
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
