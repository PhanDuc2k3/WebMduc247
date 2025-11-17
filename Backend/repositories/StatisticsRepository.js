const Order = require('../models/Order');
const Product = require('../models/Product');
const ViewLog = require('../models/ViewLog');
const Review = require('../models/Review');
const mongoose = require('mongoose');

class StatisticsRepository {
  // Aggregate revenue
  async aggregateRevenue(storeId, startDate) {
    return await Order.aggregate([
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
  }

  // Aggregate views
  async aggregateViews(productIds, startDate) {
    return await ViewLog.aggregate([
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
  }

  // Aggregate top products
  async aggregateTopProducts(storeId, limit) {
    return await Order.aggregate([
      { $unwind: "$items" },
      { $match: { "items.storeId": new mongoose.Types.ObjectId(storeId) } },
      {
        $group: {
          _id: "$items.productId",
          totalSold: { $sum: "$items.quantity" }
        }
      },
      { $sort: { totalSold: -1 } },
      { $limit: limit },
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
  }

  // Lấy product IDs theo store
  async getProductIdsByStore(storeId) {
    return await Product.find({ store: storeId }).distinct("_id");
  }

  // Lấy reviews theo productIds
  async getReviewsByProductIds(productIds) {
    return await Review.find({ 
      productId: { $in: productIds } 
    }).select("rating");
  }
}

module.exports = new StatisticsRepository();

