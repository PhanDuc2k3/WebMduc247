// services/productSearchService.js
const Product = require("../models/Product");
const VectorStore = require("../models/VectorStore");
const { englishToVietnameseCategoryMap } = require("../constants/translationMaps");
const { normalizeText } = require("./translationService");

// ====== Helper: Tạo điều kiện tìm kiếm ======
function buildSearchConditions(queryKeywords) {
  if (!queryKeywords || queryKeywords.length === 0) return [];

  // Tạo regex cho tất cả từ khóa (cả tiếng Việt và tiếng Anh)
  const searchRegex = new RegExp(queryKeywords.join("|"), "i");

  // Chuyển đổi từ khóa tiếng Anh sang category tiếng Việt nếu có
  const vnCategories = queryKeywords
    .map((keyword) => englishToVietnameseCategoryMap[keyword.toLowerCase()])
    .filter((cat) => cat); // Loại bỏ undefined

  // Chuyển đổi từ khóa tiếng Việt sang category tiếng Việt (nếu có trong map)
  const vnCategoriesFromVn = queryKeywords
    .map((keyword) => {
      // Tìm trong vietnameseToEnglishMap để lấy category
      const normalized = normalizeText(keyword);
      // Kiểm tra xem có phải là category tiếng Việt không
      const englishKw = Object.values(englishToVietnameseCategoryMap).find(
        (cat) => normalizeText(cat) === normalized
      );
      return englishKw ? englishKw : null;
    })
    .filter((cat) => cat);

  // Tạo mảng điều kiện với độ ưu tiên: tên sản phẩm > tags/keywords > brand > category > description
  // Tìm kiếm theo CẢ tiếng Việt và tiếng Anh
  const searchConditions = [
    // Ưu tiên 1: Tên sản phẩm chứa từ khóa (cả tiếng Việt và tiếng Anh)
    ...queryKeywords.map((keyword) => ({ 
      name: new RegExp(keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), "i") 
    })),
    // Ưu tiên 2: Tags và keywords chứa từ khóa
    { tags: { $in: queryKeywords } },
    { keywords: { $in: queryKeywords } },
    // Ưu tiên 3: Brand chứa từ khóa
    ...queryKeywords.map((keyword) => ({ 
      brand: new RegExp(keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), "i") 
    })),
    // Ưu tiên 4: Category - tìm theo cả từ khóa tiếng Anh, tiếng Việt và category đã map
    ...queryKeywords.map((keyword) => ({ 
      category: new RegExp(keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), "i") 
    })),
    ...vnCategories.map((cat) => ({ 
      category: new RegExp(cat.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), "i") 
    })),
    ...vnCategoriesFromVn.map((cat) => ({ 
      category: new RegExp(cat.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), "i") 
    })),
    // Ưu tiên 5: Description chứa từ khóa (cả tiếng Việt và tiếng Anh)
    { description: searchRegex },
  ];

  return searchConditions;
}

// ====== Đếm tổng số sản phẩm thỏa điều kiện ======
async function countProducts(queryKeywords) {
  if (!queryKeywords || queryKeywords.length === 0) return 0;

  try {
    const searchConditions = buildSearchConditions(queryKeywords);

    const totalCount = await Product.countDocuments({
      isActive: true,
      $or: searchConditions,
    });

    return totalCount;
  } catch (error) {
    console.error("Error counting products:", error);
    return 0;
  }
}

// ====== Đếm sản phẩm theo brand ======
async function countProductsByBrand(queryKeywords) {
  if (!queryKeywords || queryKeywords.length === 0) return [];

  try {
    const searchConditions = buildSearchConditions(queryKeywords);

    const brandCounts = await Product.aggregate([
      {
        $match: {
          isActive: true,
          $or: searchConditions,
        },
      },
      {
        $group: {
          _id: "$brand",
          count: { $sum: 1 },
        },
      },
      {
        $sort: { count: -1 },
      },
    ]);

    return brandCounts.map((item) => ({
      brand: item._id || "Không có thương hiệu",
      count: item.count,
    }));
  } catch (error) {
    console.error("Error counting products by brand:", error);
    return [];
  }
}

// ====== Retrieve top-K Products ======
async function retrieveTopKProducts(queryKeywords, k = 5) {
  if (!queryKeywords || queryKeywords.length === 0) return [];

  try {
    const searchConditions = buildSearchConditions(queryKeywords);

    const products = await Product.find({
      isActive: true,
      $or: searchConditions,
    })
      .limit(k * 2) // Lấy nhiều hơn để có thể rank
      .populate("store", "name logoUrl");

    if (products.length === 0) return [];

    // Nếu có vector store, ưu tiên products có embedding
    const productIds = products.map((p) => p._id);
    const vectors = await VectorStore.find({
      type: "product",
      docId: { $in: productIds },
    });

    // Map products với score - CHỈ lấy sản phẩm thực sự liên quan
    let scoredProducts = products.map((product) => {
      const vectorDoc = vectors.find(
        (v) => v.docId.toString() === product._id.toString()
      );
      const normalizedName = normalizeText(product.name || "");
      const normalizedBrand = normalizeText(product.brand || "");
      const normalizedCategory = normalizeText(product.category || "");

      // Kiểm tra match từ khóa (cả tiếng Việt và tiếng Anh) trong tên, brand, category
      let score = 0;
      
      // Đếm số từ khóa match trong name, brand, category (cả tiếng Việt và tiếng Anh)
      const nameMatches = queryKeywords.filter(keyword => {
        const normalizedKeyword = normalizeText(keyword);
        return normalizedName.includes(normalizedKeyword) || 
               normalizedName.split(/\s+/).some(word => 
                 normalizeText(word) === normalizedKeyword ||
                 normalizeText(word).includes(normalizedKeyword) ||
                 normalizedKeyword.includes(normalizeText(word))
               );
      });
      const brandMatches = queryKeywords.filter(keyword => {
        const normalizedKeyword = normalizeText(keyword);
        return normalizedBrand.includes(normalizedKeyword) || 
               normalizedBrand.split(/\s+/).some(word => 
                 normalizeText(word) === normalizedKeyword ||
                 normalizeText(word).includes(normalizedKeyword) ||
                 normalizedKeyword.includes(normalizeText(word))
               );
      });
      const categoryMatches = queryKeywords.filter(keyword => {
        const normalizedKeyword = normalizeText(keyword);
        return normalizedCategory.includes(normalizedKeyword) || 
               normalizedCategory.split(/\s+/).some(word => 
                 normalizeText(word) === normalizedKeyword ||
                 normalizeText(word).includes(normalizedKeyword) ||
                 normalizedKeyword.includes(normalizeText(word))
               );
      });
      
      // Kiểm tra tags/keywords match chính xác
      const hasTagMatch =
        product.tags?.some((tag) =>
          queryKeywords.some(kw => {
            const normalizedTag = normalizeText(tag);
            return normalizedTag === kw || normalizedTag.includes(kw);
          })
        ) ||
        product.keywords?.some((kw) =>
          queryKeywords.some(k => {
            const normalizedKw = normalizeText(kw);
            return normalizedKw === k || normalizedKw.includes(k);
          })
        );

      // Tính score với độ ưu tiên: name > brand/category > tags/keywords
      // KHÔNG dùng description matching để tránh sản phẩm không liên quan
      // Hỗ trợ cả tiếng Việt và tiếng Anh
      if (nameMatches.length > 0) {
        // Tên sản phẩm match - score cao nhất
        // Ưu tiên match từ khóa đầu tiên (từ khóa quan trọng nhất)
        const firstKeyword = normalizeText(queryKeywords[0]);
        const firstKeywordMatch = normalizedName.includes(firstKeyword) ||
                                  normalizedName.split(/\s+/).some(word => 
                                    normalizeText(word) === firstKeyword ||
                                    normalizeText(word).includes(firstKeyword) ||
                                    firstKeyword.includes(normalizeText(word))
                                  );
        score = firstKeywordMatch ? 0.95 : 0.85;
        // Tăng điểm nếu match nhiều từ khóa
        if (nameMatches.length > 1) {
          score += 0.05;
        }
      } else if (brandMatches.length > 0 || categoryMatches.length > 0) {
        // Brand hoặc category match - phải match ít nhất 1 từ khóa chính
        const firstKeyword = normalizeText(queryKeywords[0]);
        const firstKeywordMatch = 
          normalizedBrand.includes(firstKeyword) || 
          normalizedCategory.includes(firstKeyword) ||
          normalizedBrand.split(/\s+/).some(word => normalizeText(word) === firstKeyword) ||
          normalizedCategory.split(/\s+/).some(word => normalizeText(word) === firstKeyword);
        
        if (firstKeywordMatch) {
          score = 0.8;
        } else if (brandMatches.length > 0 || categoryMatches.length > 0) {
          score = 0.75;
        }
      } else if (hasTagMatch) {
        // Tags/keywords match - phải match ít nhất 1 từ khóa chính
        score = 0.7;
      }
      // Nếu không match gì cả -> score = 0 (sẽ bị loại bỏ)

      // Tăng điểm nếu có trong vector store (chỉ tăng nếu đã có điểm cơ bản)
      if (vectorDoc && score > 0) {
        score = Math.min(score + 0.05, 1.0);
      }

      return {
        metadata: product,
        vector: vectorDoc?.vector || [],
        score: Math.min(score, 1.0), // Đảm bảo score không vượt quá 1
      };
    });

    // Sort theo score và lọc những sản phẩm có score >= 0.7 (chỉ lấy sản phẩm thực sự liên quan)
    scoredProducts.sort((a, b) => {
      // Ưu tiên match từ khóa đầu tiên (cả tiếng Việt và tiếng Anh)
      const firstKeyword = normalizeText(queryKeywords[0]);
      const aName = normalizeText(a.metadata.name || "");
      const bName = normalizeText(b.metadata.name || "");
      const aHasFirstKeyword = aName.includes(firstKeyword) ||
                               aName.split(/\s+/).some(word => 
                                 normalizeText(word) === firstKeyword ||
                                 normalizeText(word).includes(firstKeyword) ||
                                 firstKeyword.includes(normalizeText(word))
                               );
      const bHasFirstKeyword = bName.includes(firstKeyword) ||
                               bName.split(/\s+/).some(word => 
                                 normalizeText(word) === firstKeyword ||
                                 normalizeText(word).includes(firstKeyword) ||
                                 firstKeyword.includes(normalizeText(word))
                               );
      if (aHasFirstKeyword && !bHasFirstKeyword) return -1;
      if (!aHasFirstKeyword && bHasFirstKeyword) return 1;
      return b.score - a.score;
    });
    
    // Lọc sản phẩm có score >= 0.7 để chỉ lấy sản phẩm thực sự liên quan
    // Loại bỏ hoàn toàn sản phẩm chỉ match description
    const relevantProducts = scoredProducts.filter(p => p.score >= 0.7);

    return relevantProducts.slice(0, k);
  } catch (error) {
    console.error("Error retrieving products:", error);
    return [];
  }
}

module.exports = {
  buildSearchConditions,
  countProducts,
  countProductsByBrand,
  retrieveTopKProducts,
};

