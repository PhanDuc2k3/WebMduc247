// services/productService.js
const { createEmbedding } = require("./translationService");
const {
  countProducts,
  countProductsByBrand,
  retrieveTopKProducts,
} = require("./productSearchService");
const { isCountIntent } = require("../utils/intentDetection");
const {
  filterProductsByReply,
  findProductsFromReply,
} = require("./productMatchingService");
const productFormatService = require("./productFormatService");
const aiService = require("./aiService");
const { saveChatHistory } = require("./chatHistoryService");

class ProductService {
  /**
   * Xử lý tìm sản phẩm
   * @param {string} message - Câu hỏi của user
   * @param {string} userId - ID của user
   * @param {string} historyText - Lịch sử chat đã format
   * @returns {Promise<Object>} - { reply, products }
   */
  async handleFindProduct(message, userId, historyText) {
    // Dịch từ khóa
    const queryKeywords = await createEmbedding(message);
    console.log("Original message:", message);
    console.log("Translated keywords:", queryKeywords);

    if (!queryKeywords.length) {
      return {
        reply: "Vui lòng nhập từ khóa tìm kiếm cụ thể hơn!",
        products: [],
      };
    }

    // Kiểm tra câu hỏi về số lượng
    const isCountQuestion = isCountIntent(message);
    let totalCount = 0;
    let brandCounts = [];

    if (isCountQuestion) {
      totalCount = await countProducts(queryKeywords);
      brandCounts = await countProductsByBrand(queryKeywords);
      console.log("Total products count:", totalCount);
      console.log("Brand counts:", brandCounts);
    }

    // Tìm sản phẩm
    const productLimit =
      isCountQuestion && totalCount > 0 ? Math.min(totalCount, 10) : 5;
    const topProducts = await retrieveTopKProducts(queryKeywords, productLimit);
    console.log("Found products:", topProducts.length);

    // Xử lý trường hợp không tìm thấy sản phẩm
    if (topProducts.length === 0) {
      const reply =
        isCountQuestion && totalCount === 0
          ? "Hiện tại không có sản phẩm nào phù hợp với yêu cầu của bạn."
          : "Mình không tìm thấy sản phẩm nào phù hợp. Bạn có thể thử tìm kiếm với từ khóa khác!";

      if (userId) {
        await saveChatHistory(userId, "user", message);
        await saveChatHistory(userId, "bot", reply);
      }

      return { reply, products: [] };
    }

    // Format sản phẩm thành text
    const dataText = productFormatService.formatProductsToText(topProducts);

    // Tạo phản hồi từ AI
    let reply;
    try {
      reply = await aiService.generateProductReply(
        historyText,
        dataText,
        message,
        {
          isCountQuestion,
          totalCount,
          brandCounts,
          topProductsLength: topProducts.length,
        }
      );
    } catch (error) {
      console.error("Error calling Groq API:", error);
      // Fallback
      reply = this.createFallbackReply(topProducts);
    }

    // Lưu lịch sử
    if (userId) {
      await saveChatHistory(userId, "user", message);
      await saveChatHistory(userId, "bot", reply);
    }

    // Lọc sản phẩm theo reply
    console.log("=== FILTERING PRODUCTS BY REPLY ===");
    let filteredTopProducts = filterProductsByReply(topProducts, reply);

    // Nếu không có sản phẩm nào match, thử tìm lại
    if (filteredTopProducts.length === 0 && topProducts.length > 0) {
      console.log("No products matched reply, trying to find products from reply...");
      const productsFromReply = await findProductsFromReply(reply, productLimit);
      filteredTopProducts =
        productsFromReply.length > 0 ? productsFromReply : topProducts;
    }

    // Format sản phẩm cho response
    const productsData =
      productFormatService.formatProductsForResponse(filteredTopProducts);

    console.log("=== PRODUCTS DATA SUMMARY ===");
    console.log("Original products count:", topProducts.length);
    console.log("Filtered products count:", filteredTopProducts.length);
    console.log("Products data count:", productsData.length);

    return {
      reply: reply || "Không thể tạo phản hồi",
      products: Array.isArray(productsData) ? productsData : [],
    };
  }

  /**
   * Tạo fallback reply khi AI fail
   * @param {Array} topProducts - Danh sách sản phẩm
   * @returns {string} - Fallback reply
   */
  createFallbackReply(topProducts) {
    return `Tôi tìm thấy ${topProducts.length} sản phẩm cho bạn:\n${topProducts
      .map((p, i) => {
        const metadata = p.metadata || {};
        const price = metadata.salePrice || metadata.price || 0;
        return `${i + 1}. ${metadata.name} - ${price.toLocaleString("vi-VN")}đ`;
      })
      .join("\n")}`;
  }
}

module.exports = new ProductService();

