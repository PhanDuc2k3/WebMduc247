// services/productFormatService.js

class ProductFormatService {
  /**
   * Format danh sách sản phẩm thành text để đưa vào prompt
   * @param {Array} products - Danh sách sản phẩm (có metadata)
   * @returns {string} - Text đã format
   */
  formatProductsToText(products) {
    if (!products || products.length === 0) {
      return "Không có sản phẩm nào phù hợp.";
    }

    return products
      .map((p) => {
        const metadata = p.metadata || {};
        const price = metadata.salePrice || metadata.price || 0;
        const discount = metadata.salePrice
          ? Math.round((1 - metadata.salePrice / metadata.price) * 100)
          : 0;
        const storeName = metadata.store?.name || "N/A";

        return `• ${metadata.name}
  - Thương hiệu: ${metadata.brand || "N/A"}
  - Danh mục: ${metadata.category || "N/A"}${metadata.subCategory ? ` (${metadata.subCategory})` : ""}
  - Giá: ${price.toLocaleString("vi-VN")}đ${discount > 0 ? ` (Giảm ${discount}%)` : ""}
  - Đánh giá: ⭐ ${metadata.rating?.toFixed(1) || 0} (${metadata.reviewsCount || 0} đánh giá)
  - Đã bán: ${metadata.soldCount || 0}
  - Cửa hàng: ${storeName}
  - Tồn kho: ${metadata.quantity || 0}${metadata.description ? `\n  - Mô tả: ${metadata.description.substring(0, 100)}${metadata.description.length > 100 ? "..." : ""}` : ""}`;
      })
      .join("\n\n");
  }

  /**
   * Format sản phẩm thành object để trả về cho frontend
   * @param {Array} products - Danh sách sản phẩm (có metadata)
   * @returns {Array} - Danh sách sản phẩm đã format
   */
  formatProductsForResponse(products) {
    if (!products || products.length === 0) return [];

    return products
      .filter((p) => {
        const hasMetadata = p && p.metadata;
        const hasId = hasMetadata && p.metadata._id;
        if (!hasId) {
          console.warn(
            "Filtering out product without _id:",
            p?.metadata?.name || "unknown"
          );
        }
        return hasId;
      })
      .map((p) => {
        const product = p.metadata;

        if (!product._id) {
          console.error("ERROR: Product without _id in map:", product.name);
          return null;
        }

        return {
          _id: product._id.toString(),
          name: product.name || "N/A",
          price: product.price || 0,
          salePrice: product.salePrice || null,
          images: Array.isArray(product.images) ? product.images : [],
          rating: product.rating || 0,
          reviewsCount: product.reviewsCount || 0,
          soldCount: product.soldCount || 0,
          brand: product.brand || null,
          category: product.category || null,
          description: product.description || null,
          store: product.store
            ? {
                name: product.store.name || "N/A",
                logoUrl: product.store.logoUrl || null,
              }
            : null,
        };
      })
      .filter((p) => p && p._id && typeof p._id === "string");
  }
}

module.exports = new ProductFormatService();

