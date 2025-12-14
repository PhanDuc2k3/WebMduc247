// services/translationService.js
const { groq, chatModelName } = require("../config/groqConfig");
const {
  vietnameseToEnglishMap,
  englishToVietnameseCategoryMap,
  STOP_WORDS,
  PRODUCT_KEYWORDS,
  keywordExpansionMap,
} = require("../constants/translationMaps");

// ====== Helpers ======
function normalizeText(text) {
  if (!text) return "";
  return text.toLowerCase().trim().replace(/\s+/g, " ");
}

// Hàm dịch từ tiếng Việt sang tiếng Anh
async function translateVietnameseToEnglish(text) {
  if (!text) return [];

  const normalized = normalizeText(text);
  const keywords = [];
  let remainingText = normalized;

  // Kiểm tra các cụm từ trong từ điển (theo thứ tự từ dài đến ngắn)
  const sortedEntries = Object.entries(vietnameseToEnglishMap).sort(
    (a, b) => b[0].length - a[0].length
  );
  for (const [vn, en] of sortedEntries) {
    if (remainingText.includes(vn)) {
      keywords.push(en);
      // Loại bỏ cụm từ đã dịch để tránh trùng lặp
      remainingText = remainingText.replace(vn, "").trim();
    }
  }

  // Nếu vẫn còn text chưa được dịch, dùng Groq để dịch
  const remainingWords = remainingText.split(/\s+/).filter((w) => w.length > 2);
  if (remainingWords.length > 0) {
    try {
      const translationPrompt = `
Bạn là công cụ dịch từ tiếng Việt sang tiếng Anh cho tìm kiếm sản phẩm e-commerce.
Người dùng muốn tìm: "${text}"

Hãy trả về từ khóa tiếng Anh ngắn gọn để tìm sản phẩm (ví dụ: "máy tính xách tay" => "laptop", "điện thoại" => "phone").
QUAN TRỌNG: 
- CHỈ dịch các từ liên quan đến TÊN SẢN PHẨM, THƯƠNG HIỆU, DANH MỤC
- KHÔNG dịch các từ câu hỏi như "bao nhiêu", "số lượng", "có mấy" - BỎ QUA chúng
- KHÔNG dịch các từ không liên quan như "bên mình", "của bạn", "shop"
- Chỉ trả về từ khóa sản phẩm, không giải thích thêm.
      `;

      const translation = await groq.chat.completions.create({
        messages: [
          {
            role: "system",
            content:
              "You are a translation tool from Vietnamese to English for e-commerce product search. Return only keywords separated by space, no explanations.",
          },
          {
            role: "user",
            content: translationPrompt,
          },
        ],
        model: chatModelName,
        temperature: 0.1,
        max_tokens: 50,
      });

      const translated =
        translation.choices[0]?.message?.content?.trim() || "";
      if (translated) {
        // Loại bỏ dấu chấm câu và chia thành từ
        const translatedKeywords = translated
          .toLowerCase()
          .replace(/[.,;:!?\-]/g, " ")
          .split(/\s+/)
          .filter((w) => w.length > 2);
        keywords.push(...translatedKeywords);
      }
    } catch (error) {
      console.error("Error translating with Groq:", error);
      // Fallback: giữ lại các từ gốc nếu là tiếng Anh
      keywords.push(
        ...remainingWords.filter((w) => /^[a-z0-9]+$/i.test(w))
      );
    }
  }

  // Thêm các từ khóa gốc nếu là tiếng Anh hoặc số (chỉ nếu chưa có từ khóa đã dịch)
  if (keywords.length === 0) {
    const originalKeywords = normalized.split(/\s+/).filter((w) => {
      return (
        w.length > 2 &&
        (/^[a-z0-9]+$/i.test(w) ||
          (!/[àáảãạăắằẳẵặâấầẩẫậèéẻẽẹêếềểễệìíỉĩịòóỏõọôốồổỗộơớờởỡợùúủũụưứừửữựỳýỷỹỵđ]/i.test(
            w
          ) &&
            /[a-z0-9]/i.test(w)))
      );
    });
    keywords.push(...originalKeywords);
  }

  // Loại bỏ trùng lặp và trả về mảng keywords tiếng Anh
  const uniqueKeywords = [...new Set(keywords)];

  console.log(`Translation: "${text}" => [${uniqueKeywords.join(", ")}]`);

  return uniqueKeywords;
}

// Hàm lọc bỏ stop words (nhưng giữ lại các từ khóa sản phẩm quan trọng)
function filterStopWords(keywords) {
  if (!keywords || !Array.isArray(keywords)) return [];

  const normalizedStopWords = STOP_WORDS.map((w) => normalizeText(w));
  const normalizedProductKeywords = PRODUCT_KEYWORDS.map((w) => normalizeText(w));

  return keywords
    .filter((keyword) => {
      const normalized = normalizeText(keyword);
      
      // KHÔNG loại bỏ nếu là từ khóa sản phẩm quan trọng
      const isProductKeyword = normalizedProductKeywords.some(
        (productKw) =>
          normalized === productKw ||
          normalized.includes(productKw) ||
          productKw.includes(normalized)
      );
      
      if (isProductKeyword) {
        return true; // Giữ lại từ khóa sản phẩm
      }
      
      // Loại bỏ nếu là stop word
      return !normalizedStopWords.some(
        (stopWord) =>
          normalized === stopWord ||
          normalized.includes(stopWord) ||
          stopWord.includes(normalized)
      );
    })
    .filter((k) => k && k.length > 1); // Giữ lại keywords có độ dài > 1
}

// Hàm mở rộng từ khóa (expand keywords) - khi có "máy tính" thì thêm "laptop", "máy tính xách tay"
function expandKeywords(keywords) {
  if (!keywords || keywords.length === 0) return keywords;

  const expanded = new Set(keywords);

  keywords.forEach((keyword) => {
    const normalized = normalizeText(keyword);
    
    // Kiểm tra trong keywordExpansionMap
    const expansion = keywordExpansionMap[normalized];
    if (expansion) {
      expansion.forEach((expandedKw) => expanded.add(expandedKw));
    }
    
    // Kiểm tra ngược lại (nếu keyword là tiếng Anh, thêm tiếng Việt và ngược lại)
    Object.entries(keywordExpansionMap).forEach(([key, values]) => {
      if (values.includes(normalized)) {
        // Thêm key và tất cả values
        expanded.add(key);
        values.forEach((v) => expanded.add(v));
      }
    });
  });

  return Array.from(expanded);
}

// Groq không có embedding API, dùng text search thay thế
async function createEmbedding(text) {
  if (!text) return [];

  const normalized = normalizeText(text);
  const allKeywords = new Set();

  // 1. Giữ lại từ khóa gốc (tiếng Việt)
  const originalWords = normalized.split(/\s+/).filter((w) => w.length > 2);
  originalWords.forEach((w) => allKeywords.add(w));

  // 2. Dịch từ tiếng Việt sang tiếng Anh
  const translatedKeywords = await translateVietnameseToEnglish(text);
  translatedKeywords.forEach((kw) => allKeywords.add(kw));

  // 3. Mở rộng từ khóa (expand keywords)
  const expandedKeywords = expandKeywords(Array.from(allKeywords));
  expandedKeywords.forEach((kw) => allKeywords.add(kw));

  // 4. Lọc bỏ stop words (nhưng giữ lại từ khóa sản phẩm)
  const filteredKeywords = filterStopWords(Array.from(allKeywords));

  // 5. Mở rộng lại sau khi lọc (để đảm bảo có đủ từ khóa)
  const finalKeywords = expandKeywords(filteredKeywords);

  if (finalKeywords.length > 0) {
    console.log(
      `Expanded keywords (Vietnamese + English): [${finalKeywords.join(", ")}]`
    );
    return finalKeywords;
  }

  // Fallback: dùng từ khóa gốc và lọc stop words
  const keywords = normalizeText(text)
    .split(/\s+/)
    .filter((w) => w.length > 2);
  const filteredOriginal = filterStopWords(keywords);

  return filteredOriginal.length > 0 ? filteredOriginal : keywords;
}

module.exports = {
  normalizeText,
  translateVietnameseToEnglish,
  filterStopWords,
  expandKeywords,
  createEmbedding,
};

