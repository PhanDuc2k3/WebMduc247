// services/productMatchingService.js
const { normalizeText } = require("./translationService");
const { retrieveTopKProducts } = require("./productSearchService");
const { createEmbedding } = require("./translationService");

/**
 * Trích xuất tên sản phẩm từ câu trả lời của chatbot
 * @param {string} reply - Câu trả lời của chatbot
 * @returns {string[]} - Mảng các từ khóa sản phẩm được đề cập
 */
function extractProductKeywordsFromReply(reply) {
  if (!reply) return [];

  const normalized = normalizeText(reply);
  const keywords = [];

  // Tìm các từ khóa sản phẩm phổ biến trong câu trả lời
  // Ví dụ: "Truyện Doremon", "iPhone", "Macbook", etc.
  
  // Pattern 1: Tên sản phẩm sau các từ như "truyện", "sách", "điện thoại", etc.
  const categoryProductPattern = /(?:truyện|sách|điện thoại|laptop|máy tính|tai nghe|bàn phím|chuột|màn hình|tivi|tủ lạnh|máy giặt|điều hòa|quần áo|áo|quần|giày|dép|túi xách|ví|vở|bút|bút chì)\s+([a-z0-9àáảãạăắằẳẵặâấầẩẫậèéẻẽẹêếềểễệìíỉĩịòóỏõọôốồổỗộơớờởỡợùúủũụưứừửữựỳýỷỹỵđ]+(?:\s+[a-z0-9àáảãạăắằẳẵặâấầẩẫậèéẻẽẹêếềểễệìíỉĩịòóỏõọôốồổỗộơớờởỡợùúủũụưứừửữựỳýỷỹỵđ]+)*)/gi;
  let match;
  while ((match = categoryProductPattern.exec(reply)) !== null) {
    const productName = match[1].trim().toLowerCase();
    if (productName && productName.length > 2) {
      // Tách thành các từ riêng lẻ
      const words = productName.split(/\s+/).filter(w => w.length > 2);
      keywords.push(...words);
    }
  }

  // Pattern 2: Tên thương hiệu và sản phẩm phổ biến (case-insensitive)
  const brandProductPattern = /\b(iphone|ipad|macbook|samsung|apple|doremon|doraemon|nintendo|sony|lg|xiaomi|oppo|vivo|realme|oneplus)\b/gi;
  while ((match = brandProductPattern.exec(reply)) !== null) {
    const brand = match[1].trim().toLowerCase();
    if (brand && brand.length > 2) {
      keywords.push(brand);
    }
  }

  // Pattern 3: Tên sản phẩm được viết hoa (thường là tên riêng như "Doremon", "iPhone")
  const capitalizedPattern = /\b([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)\b/g;
  while ((match = capitalizedPattern.exec(reply)) !== null) {
    const capitalized = match[1].trim().toLowerCase();
    // Loại bỏ các từ không phải tên sản phẩm (như "ShopMduc247", "BookStore", etc.)
    if (capitalized && 
        capitalized.length > 2 && 
        !capitalized.includes('shop') && 
        !capitalized.includes('store') &&
        !capitalized.includes('bookstore')) {
      const words = capitalized.split(/\s+/).filter(w => w.length > 2);
      keywords.push(...words);
    }
  }

  // Pattern 4: Tìm các từ khóa sản phẩm trong danh sách sản phẩm được đề cập
  // Ví dụ: "Truyện Doremon tại ShopMduc247" -> "doremon"
  const productInContextPattern = /(?:tại|từ|của|trong)\s+[A-Za-z0-9\s]+\s+(?:có|giá|giảm|đánh giá|đã bán|tồn kho)/gi;
  // Nếu có pattern này, có thể có tên sản phẩm trước đó
  if (productInContextPattern.test(reply)) {
    // Tìm các từ có thể là tên sản phẩm trước các từ như "tại", "có", "giá"
    const beforeContextPattern = /([a-zàáảãạăắằẳẵặâấầẩẫậèéẻẽẹêếềểễệìíỉĩịòóỏõọôốồổỗộơớờởỡợùúủũụưứừửữựỳýỷỹỵđ]+(?:\s+[a-zàáảãạăắằẳẵặâấầẩẫậèéẻẽẹêếềểễệìíỉĩịòóỏõọôốồổỗộơớờởỡợùúủũụưứừửữựỳýỷỹỵđ]+)*)\s+(?:tại|có|giá|giảm|đánh giá|đã bán|tồn kho)/gi;
    while ((match = beforeContextPattern.exec(normalized)) !== null) {
      const productName = match[1].trim();
      if (productName && productName.length > 2) {
        const words = productName.split(/\s+/).filter(w => w.length > 2);
        keywords.push(...words);
      }
    }
  }

  // Loại bỏ trùng lặp và các từ không có ý nghĩa
  const stopWords = [
    'có', 'là', 'tại', 'từ', 'của', 'trong', 'với', 'và', 'hoặc', 'này', 'đó', 'bạn', 'mình',
    'giá', 'đãi', 'nhận', 'được', 'chất', 'lượng', 'tốt', 'nhà', 'xuất', 'bản', 
    'tín', 'truy', 'kim', 'hiện', 'cuốn', 'kho', 'đây', 'một', 
    'lựa', 'chọn', 'tuyệt', 'vời', 'thể', 'mua', 'shopmduc247', 'bookstore',
    'shop', 'store', 'cửa', 'hàng', 'tại', 'có', 'giá', 'giảm', 'đánh', 'giá',
    'đã', 'bán', 'tồn', 'kho', 'cuốn', 'trong', 'kho'
  ];
  
  const uniqueKeywords = [...new Set(keywords)].filter(k => 
    k && k.length > 2 && 
    !stopWords.includes(k) &&
    !k.match(/^\d+$/) // Loại bỏ số thuần túy
  );

  console.log("Final extracted keywords (after filtering):", uniqueKeywords);
  return uniqueKeywords;
}

/**
 * Lọc danh sách sản phẩm để chỉ giữ lại những sản phẩm khớp với câu trả lời
 * @param {Array} products - Danh sách sản phẩm
 * @param {string} reply - Câu trả lời của chatbot
 * @returns {Array} - Danh sách sản phẩm đã được lọc
 */
function filterProductsByReply(products, reply) {
  if (!products || products.length === 0) return [];
  if (!reply) return products;

  // Trích xuất từ khóa từ câu trả lời
  const replyKeywords = extractProductKeywordsFromReply(reply);
  
  // Nếu không tìm thấy từ khóa, trả về danh sách gốc
  if (replyKeywords.length === 0) {
    console.log("No keywords extracted from reply, returning original products");
    return products;
  }

  console.log("Extracted keywords from reply:", replyKeywords);
  console.log("Original products:", products.map(p => (p.metadata || p).name));

  // Lọc sản phẩm dựa trên từ khóa với điểm số
  const scoredProducts = products.map((p) => {
    const product = p.metadata || p;
    const productName = normalizeText(product.name || "");
    const productBrand = normalizeText(product.brand || "");
    const productCategory = normalizeText(product.category || "");
    const productDescription = normalizeText(product.description || "");

    let score = 0;
    let hasImportantMatch = false; // Đánh dấu có match với từ khóa quan trọng không

    // Tách từ khóa thành 2 nhóm: quan trọng (tên sản phẩm) và không quan trọng
    const importantKeywords = replyKeywords.filter(kw => {
      const normalized = normalizeText(kw);
      // Các từ khóa quan trọng: tên sản phẩm cụ thể, không phải từ chung chung
      return normalized.length >= 4 && // Từ khóa dài hơn 3 ký tự
             !['giá', 'đãi', 'nhận', 'được', 'chất', 'lượng', 'tốt', 'nhà', 'xuất', 'bản', 
               'tín', 'truy', 'kim', 'truyện', 'hiện', 'cuốn', 'kho', 'đây', 'một', 
               'lựa', 'chọn', 'tuyệt', 'vời', 'thể', 'mua', 'shopmduc247'].includes(normalized);
    });

    // Kiểm tra xem sản phẩm có chứa bất kỳ từ khóa nào không
    replyKeywords.forEach((keyword) => {
      const normalizedKeyword = normalizeText(keyword);
      
      // Bỏ qua các từ không liên quan đến tên sản phẩm
      if (['giá', 'đãi', 'nhận', 'được', 'chất', 'lượng', 'tốt', 'nhà', 'xuất', 'bản', 
           'tín', 'truy', 'kim', 'hiện', 'cuốn', 'kho', 'đây', 'một', 
           'lựa', 'chọn', 'tuyệt', 'vời', 'thể', 'mua', 'shopmduc247'].includes(normalizedKeyword)) {
        return; // Bỏ qua từ này
      }
      
      // Điểm cao nhất: tên sản phẩm chứa từ khóa chính xác
      if (productName.includes(normalizedKeyword)) {
        // Kiểm tra xem từ khóa có phải là một từ hoàn chỉnh trong tên không
        const nameWords = productName.split(/\s+/);
        const isExactMatch = nameWords.some(word => 
          word === normalizedKeyword || 
          word.startsWith(normalizedKeyword) ||
          normalizedKeyword.startsWith(word)
        );
        if (isExactMatch) {
          score += 20; // Điểm cao cho match trong tên
          if (importantKeywords.includes(keyword)) {
            hasImportantMatch = true;
          }
        } else {
          score += 5; // Điểm thấp hơn cho partial match
        }
      }
      
      // Điểm trung bình: brand hoặc category chứa từ khóa
      if (productBrand.includes(normalizedKeyword) || productCategory.includes(normalizedKeyword)) {
        score += 3;
      }
      
      // Điểm thấp: description chứa từ khóa (chỉ nếu không có match nào khác)
      if (productDescription.includes(normalizedKeyword) && score === 0) {
        score += 1;
      }
    });

    // Nếu có từ khóa quan trọng nhưng không match, giảm điểm
    if (importantKeywords.length > 0 && !hasImportantMatch) {
      score = Math.max(0, score - 10); // Trừ điểm nếu không match từ khóa quan trọng
    }

    return { product: p, score };
  });

  // Sắp xếp theo điểm số giảm dần
  scoredProducts.sort((a, b) => b.score - a.score);

  console.log("Product scores:", scoredProducts.map(item => ({
    name: (item.product.metadata || item.product).name,
    score: item.score
  })));

  // Lọc sản phẩm có điểm số >= 5 (phải có match tốt, không phải match ngẫu nhiên)
  // Điểm 5 = match một từ khóa trong tên nhưng không chính xác
  // Điểm 20 = match chính xác từ khóa quan trọng trong tên
  const filteredProducts = scoredProducts
    .filter(item => item.score >= 5) // Chỉ giữ sản phẩm có điểm >= 5
    .map(item => item.product);

  console.log(`Filtered products: ${filteredProducts.length} from ${products.length}`);
  if (filteredProducts.length > 0) {
    console.log("Matched products:", filteredProducts.map(p => (p.metadata || p).name));
  }

  // Nếu sau khi lọc không còn sản phẩm nào, trả về danh sách gốc
  // (có thể chatbot nói về sản phẩm nhưng không khớp với tên trong database)
  if (filteredProducts.length === 0) {
    console.log("No products matched reply keywords, returning original products");
    return products;
  }

  return filteredProducts;
}

/**
 * Tìm lại sản phẩm dựa trên câu trả lời của chatbot
 * @param {string} reply - Câu trả lời của chatbot
 * @param {number} limit - Số lượng sản phẩm tối đa
 * @returns {Promise<Array>} - Danh sách sản phẩm tìm được
 */
async function findProductsFromReply(reply, limit = 5) {
  if (!reply) return [];

  // Trích xuất từ khóa từ câu trả lời
  const replyKeywords = extractProductKeywordsFromReply(reply);
  
  console.log("Finding products from reply keywords:", replyKeywords);
  
  if (replyKeywords.length === 0) {
    // Nếu không tìm thấy từ khóa, thử dùng toàn bộ câu trả lời
    console.log("No keywords extracted, trying to create embedding from full reply");
    const allKeywords = await createEmbedding(reply);
    if (allKeywords.length > 0) {
      console.log("Using embedding keywords:", allKeywords);
      return await retrieveTopKProducts(allKeywords, limit);
    }
    return [];
  }

  // Lọc chỉ lấy các từ khóa quan trọng (tên sản phẩm, không phải từ chung chung)
  const importantKeywords = replyKeywords.filter(kw => {
    const normalized = normalizeText(kw);
    return normalized.length >= 4 && // Từ khóa dài hơn 3 ký tự
           !['giá', 'đãi', 'nhận', 'được', 'chất', 'lượng', 'tốt', 'nhà', 'xuất', 'bản', 
             'tín', 'truy', 'kim', 'hiện', 'cuốn', 'kho', 'đây', 'một', 
             'lựa', 'chọn', 'tuyệt', 'vời', 'thể', 'mua', 'shopmduc247'].includes(normalized);
  });

  // Ưu tiên dùng từ khóa quan trọng, nếu không có thì dùng tất cả
  const keywordsToUse = importantKeywords.length > 0 ? importantKeywords : replyKeywords;
  
  console.log("Using keywords for search:", keywordsToUse);
  
  // Tìm sản phẩm dựa trên từ khóa đã trích xuất
  return await retrieveTopKProducts(keywordsToUse, limit);
}

module.exports = {
  extractProductKeywordsFromReply,
  filterProductsByReply,
  findProductsFromReply,
};

