const statisticsRepository = require('../repositories/StatisticsRepository');

class StatisticsService {
  // Lấy revenue stats
  async getRevenueStats(storeId, range = 7) {
    const days = parseInt(range) || 7;
    const startDate = new Date();
    startDate.setUTCHours(0, 0, 0, 0);
    startDate.setUTCDate(startDate.getUTCDate() - (days - 1));

    const rawRevenue = await statisticsRepository.aggregateRevenue(storeId, startDate);

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

    return result;
  }

  // Lấy views stats
  async getViewsStats(storeId, range = 7) {
    const days = parseInt(range) || 7;
    const startDate = new Date();
    startDate.setUTCHours(0, 0, 0, 0);
    startDate.setUTCDate(startDate.getUTCDate() - (days - 1));

    const productIds = await statisticsRepository.getProductIdsByStore(storeId);
    const rawViews = await statisticsRepository.aggregateViews(productIds, startDate);

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

    return result;
  }

  // Lấy top products
  async getTopProducts(storeId, limit = 5) {
    const topLimit = parseInt(limit) || 5;
    return await statisticsRepository.aggregateTopProducts(storeId, topLimit);
  }

  // Lấy rating distribution
  async getRatingDistribution(storeId) {
    if (!storeId) {
      throw new Error("storeId là bắt buộc");
    }

    const productIds = await statisticsRepository.getProductIdsByStore(storeId);

    if (productIds.length === 0) {
      return {
        totalReviews: 0,
        averageRating: 0,
        distribution: [
          { stars: 5, count: 0, percent: 0 },
          { stars: 4, count: 0, percent: 0 },
          { stars: 3, count: 0, percent: 0 },
          { stars: 2, count: 0, percent: 0 },
          { stars: 1, count: 0, percent: 0 },
        ],
      };
    }

    const reviews = await statisticsRepository.getReviewsByProductIds(productIds);

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

    const distribution = [5, 4, 3, 2, 1].map((stars) => {
      const count = ratingCounts[stars];
      const percent = totalReviews > 0 
        ? Number(((count / totalReviews) * 100).toFixed(1))
        : 0;
      return { stars, count, percent };
    });

    return {
      totalReviews,
      averageRating,
      distribution,
    };
  }
}

module.exports = new StatisticsService();

