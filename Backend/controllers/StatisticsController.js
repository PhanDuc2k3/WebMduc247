const Order = require("../models/Order");
const Product = require("../models/Product");
const ViewLog = require("../models/ViewLog");
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
