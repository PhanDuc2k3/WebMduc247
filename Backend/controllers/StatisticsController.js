const Order = require("../models/Order");
const Product = require("../models/Product");
const ViewLog = require("../models/ViewLog");
const Review = require("../models/Review");
const mongoose = require("mongoose");

exports.getRevenueStats = async (req, res) => {
  try {
    const { storeId, range } = req.query;
    const days = parseInt(range) || 7;

    const startDate = new Date();
    startDate.setUTCHours(0, 0, 0, 0);
    startDate.setUTCDate(startDate.getUTCDate() - (days - 1));

    const rawRevenue = await Order.aggregate([
      { $match: { createdAt: { $gte: startDate } } },
      { $unwind: "$items" },
      { $match: { "items.storeId": new mongoose.Types.ObjectId(storeId) } },
      {
        $group: {
          _id: {
            $dateToString: {
              format: "%Y-%m-%d",
              date: "$createdAt",
              timezone: "+07:00"
            }
          },
          total: { $sum: { $multiply: ["$items.price", "$items.quantity"] } }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    const revenueMap = new Map();
    rawRevenue.forEach(r => revenueMap.set(r._id, r.total));

    const result = [];
    for (let i = 0; i < days; i++) {
      const d = new Date();
      d.setDate(d.getDate() - (days - 1 - i));
      const key = d.toISOString().slice(0, 10);
      result.push({
        date: key,
        total: revenueMap.get(key) || 0
      });
    }

    res.json(result);
  } catch (err) {
    console.error("Revenue error:", err);
    res.status(500).json({ message: "Lỗi khi thống kê doanh thu" });
  }
};

exports.getViewsStats = async (req, res) => {
  try {
    const { storeId, range } = req.query;
    const days = parseInt(range) || 7;

    const startDate = new Date();
    startDate.setUTCHours(0, 0, 0, 0);
    startDate.setUTCDate(startDate.getUTCDate() - (days - 1));

    const productIds = await Product.find({ store: storeId }).distinct("_id");

    const rawViews = await ViewLog.aggregate([
      {
        $match: {
          product: { $in: productIds },
          createdAt: { $gte: startDate }
        }
      },
      {
        $group: {
          _id: {
            $dateToString: {
              format: "%Y-%m-%d",
              date: "$createdAt",
              timezone: "+07:00"
            }
          },
          views: { $sum: "$count" }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    const viewsMap = new Map();
    rawViews.forEach(v => viewsMap.set(v._id, v.views));

    const result = [];
    for (let i = 0; i < days; i++) {
      const d = new Date();
      d.setDate(d.getDate() - (days - 1 - i));
      const key = d.toISOString().slice(0, 10);
      result.push({
        date: key,
        views: viewsMap.get(key) || 0
      });
    }

    res.json(result);
  } catch (error) {
    console.error("Views error:", error);
    res.status(500).json({ message: "Lỗi khi thống kê lượt truy cập" });
  }
};

exports.getTopProducts = async (req, res) => {
  try {
    const { storeId, limit } = req.query;
    const topLimit = parseInt(limit) || 5;

    const products = await Order.aggregate([
      { $unwind: "$items" },
      { $match: { "items.storeId": new mongoose.Types.ObjectId(storeId) } },
      {
        $group: {
          _id: "$items.productId",
          totalSold: { $sum: "$items.quantity" }
        }
      },
      { $sort: { totalSold: -1 } },
      { $limit: topLimit },
      {
        $lookup: {
          from: "products",
          localField: "_id",
          foreignField: "_id",
          as: "product"
        }
      },
      { $unwind: "$product" },
      {
        $project: {
          _id: 1,
          totalSold: 1,
          "product.name": 1,
          "product.mainImage": 1
        }
      }
    ]);

    res.json(products);
  } catch (err) {
    console.error("Top products error:", err);
    res.status(500).json({ message: "Lỗi khi lấy top sản phẩm" });
  }
};

// Lấy phân phối đánh giá của store
exports.getRatingDistribution = async (req, res) => {
  try {
    const { storeId } = req.query;

    if (!storeId) {
      return res.status(400).json({ message: "storeId là bắt buộc" });
    }

    // Lấy tất cả product IDs của store
    const productIds = await Product.find({ store: storeId }).distinct("_id");

    if (productIds.length === 0) {
      return res.json({
        totalReviews: 0,
        averageRating: 0,
        distribution: [
          { stars: 5, count: 0, percent: 0 },
          { stars: 4, count: 0, percent: 0 },
          { stars: 3, count: 0, percent: 0 },
          { stars: 2, count: 0, percent: 0 },
          { stars: 1, count: 0, percent: 0 },
        ],
      });
    }

    // Lấy tất cả reviews của các products trong store
    const reviews = await Review.find({ 
      productId: { $in: productIds } 
    }).select("rating");

    // Tính toán phân phối điểm đánh giá
    const ratingCounts = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    let totalRating = 0;

    reviews.forEach((review) => {
      const rating = Number(review.rating) || 0;
      if (rating >= 1 && rating <= 5) {
        ratingCounts[rating]++;
        totalRating += rating;
      }
    });

    const totalReviews = reviews.length;
    const averageRating = totalReviews > 0 
      ? Number((totalRating / totalReviews).toFixed(1))
      : 0;

    // Tính phần trăm cho mỗi mức điểm
    const distribution = [5, 4, 3, 2, 1].map((stars) => {
      const count = ratingCounts[stars];
      const percent = totalReviews > 0 
        ? Number(((count / totalReviews) * 100).toFixed(1))
        : 0;
      return { stars, count, percent };
    });

    res.json({
      totalReviews,
      averageRating,
      distribution,
    });
  } catch (err) {
    console.error("Rating distribution error:", err);
    res.status(500).json({ message: "Lỗi khi lấy phân phối đánh giá" });
  }
};
