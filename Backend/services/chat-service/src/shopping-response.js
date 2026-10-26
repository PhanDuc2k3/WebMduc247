import { normalize } from './product-relevance.js';
import { fallbackPlan } from './intent-understanding.js';

export function catalogReply(products, comparison = null) {
  if (comparison) return 'Mình đã lấy dữ liệu hiện tại để so sánh trong bảng bên dưới. Trường chưa có dữ liệu được ghi rõ để bạn cân nhắc.';
  if (!products.length) return 'Mình chưa tìm thấy sản phẩm phù hợp trong Catalog hiện tại. Bạn có muốn đổi thương hiệu hoặc điều chỉnh ngân sách không?';
  return `Mình tìm thấy ${products.length} sản phẩm phù hợp trong Catalog hiện tại. Bạn có thể xem giá và tình trạng hàng trên từng thẻ; thông tin được kiểm tra lại khi đặt mua.`;
}

const suggestions = ['Tôi muốn mua điện thoại dưới 5 triệu', 'Tư vấn tai nghe cho học tập', 'Có voucher nào đang hoạt động?'];
export async function answerShopping(chat, text, plan, input) {
  const history = input?.history || [];
  // Only the most recent result set is a referent for "these products".
  const refs = history.filter(row => row.role === 'bot' && row.sourceRefs?.some(ref => ref.startsWith('product:'))).at(-1)?.sourceRefs || [];
  const ids = [...new Set(refs.filter(ref => ref.startsWith('product:')).map(ref => ref.slice(8)))];
  if (plan.intent === 'PRODUCT_COMPARISON') {
    if (ids.length >= 2 && /cái nào|cai nao|hai mẫu|hai mau|các mẫu|cac mau|rẻ hơn|re hon|chúng|chung/i.test(text))
      return chat.compareReply(text, ids.slice(0, 4));
    const parts = text.replace(/^\s*so sánh\s*|^\s*so sanh\s*/i, '').split(/\s+(?:và|va|vs)\s+/i);
    // Comparing two brands is not permission to pick arbitrary models on the customer's behalf.
    if (parts.length !== 2 || parts.some(part => /^(iphone|samsung|apple|xiaomi|oppo)$/i.test(normalize(part))))
      return { reply: 'Bạn muốn so sánh hai mẫu cụ thể nào? Hãy cho mình tên dòng sản phẩm và tiêu chí như pin, hiệu năng hay ngân sách để so sánh công bằng.', sourceRefs: [], suggestedQuestions: plan.productType === 'dien thoai' ? ['So sánh iPhone 15 và Samsung Galaxy A55'] : [] };
    const found = await Promise.all(parts.map(part => {
      const request = fallbackPlan(part);
      return chat.tools.execute('search_products', { query: request.query || normalize(part), limit: 5 });
    }));
    const exact = found.map((result, index) => result.products.filter(product => normalize(product.name) === normalize(parts[index])));
    if (exact.every(matches => matches.length === 1) && exact[0][0].id !== exact[1][0].id)
      return chat.compareReply(text, exact.map(matches => matches[0].id));
    return { reply: 'Mình chưa xác định được duy nhất hai mẫu trong Catalog. Bạn gửi tên chính xác hoặc liên kết của hai sản phẩm muốn so sánh nhé.', sourceRefs: [] };
  }
  if (plan.intent === 'PRODUCT_DETAIL') {
    const explicit = text.match(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i)?.[0];
    const productId = explicit || (ids.length === 1 ? ids[0] : null);
    if (!productId) return { reply: 'Bạn muốn xem chi tiết mẫu nào? Hãy gửi tên chính xác hoặc liên kết sản phẩm.', sourceRefs: [] };
    const result = await chat.tools.execute('get_product_details', { productId });
    const product = result.data;
    return { reply: `${product.name} có giá ${product.priceMinor.toLocaleString('vi-VN')}₫. ${product.inStock ? `Còn ${product.stock} sản phẩm.` : 'Hiện hết hàng.'} Thông số đã được cung cấp được hiển thị trên trang sản phẩm.`,
      products: result.products, sourceRefs: result.sourceRefs };
  }
  if (plan.clarifyBudget) return { reply: 'Khoảng giá tối thiểu đang cao hơn mức tối đa. Bạn muốn tìm trong khoảng ngân sách nào?', sourceRefs: [] };
  const query = plan.query || plan.productType;
  const n = normalize(text);
  const barePurchase = /\b(muon mua|can mua|tim mua)\b/.test(n) && plan.minPrice == null && plan.maxPrice == null &&
    !plan.brand && !plan.features?.length && !plan.needs?.length && !plan.cheap;
  if (!query || query.length < 2 || barePurchase) return {
    reply: query ? 'Bạn dự định chi khoảng bao nhiêu và ưu tiên nhu cầu nào: pin, chụp ảnh, học tập hay chơi game?' : 'Bạn muốn tìm loại sản phẩm nào và ngân sách khoảng bao nhiêu?',
    sourceRefs: [], suggestedQuestions: suggestions.slice(0, 2),
  };
  const type = plan.productType;
  // Generic requirements belong in filters, not an ever-growing keyword sentence.
  const withoutBrand = normalize(query).replace(normalize(plan.brand) || /$^/, '')
    .replace(/\b(san pham|mot so|1 so)\b/g, ' ').replace(/\s+/g, ' ').trim();
  const generic = type && (withoutBrand === type || withoutBrand === `${type} thong minh` || !withoutBrand);
  if (plan.aiUsed && chat.assistant && (plan.features?.length || plan.needs?.length)) {
    // Complex advice can use Claude's read-only tool loop; filters remain owned by the backend.
    const assisted = await chat.assistant.respond({ question: text, history, search: { ...plan, query: generic ? type : query },
      requireTool: true, allowedToolNames: ['search_products','get_product_details'] }).catch(() => null);
    if (assisted) return { ...assisted, emptySearch: !assisted.products?.length };
  }
  const result = await chat.tools.execute('search_products', { query: generic ? type : query, limit: 5,
    ...(type ? { productType: type } : {}), ...(plan.cheap ? { sort: 'price_asc' } : {}) }, { search: { ...plan, query: generic ? type : query } });
  if (result.products.length && (plan.features?.length || plan.needs?.length)) {
    const preferences = [...(plan.features || []), ...(plan.needs || [])].map(normalize);
    const checked = await Promise.all(result.products.map(async product => {
      const detail = await chat.tools.execute('get_product_details', { productId: product.id });
      const facts = normalize(JSON.stringify({ description: detail.data.description, attributes: detail.data.attributes }));
      const score = preferences.reduce((sum, preference) => sum + (facts.includes(preference) ? 3 : 0), 0) +
        (preferences.some(preference => preference.startsWith('pin')) && /\b(?:[5-9]\d{3}|1\d{4})\s*mah\b/.test(facts) ? 2 : 0);
      return { product: detail.products[0], original: product, score };
    }));
    result.products = checked.filter(({ product, original }) => product.inStock && product.name === original.name && product.categoryId === original.categoryId &&
      (!plan.brand || normalize(product.brand) === normalize(plan.brand)) &&
      (plan.maxPrice == null || product.priceMinor <= plan.maxPrice) && (plan.minPrice == null || product.priceMinor >= plan.minPrice))
      .sort((a, b) => b.score - a.score).map(({ product }) => product);
    result.sourceRefs = result.products.map(product => `product:${product.id}`);
  }
  let reply = catalogReply(result.products);
  if (result.products.length && (plan.features?.length || plan.needs?.length))
    reply += ` Với ưu tiên ${[...(plan.features || []), ...(plan.needs || [])].join(', ')}, cần kiểm tra thông số thực tế từng mẫu; kết quả tìm kiếm chưa xác nhận tất cả tiêu chí này.`;
  return { reply, products: result.products, sourceRefs: result.sourceRefs,
    emptySearch: !result.products.length,
    suggestedQuestions: result.products.length ? ['Cho tôi xem chi tiết sản phẩm'] : ['Cho tôi xem các danh mục sản phẩm'] };
}

export function knowledgeFallback(plan) {
  if (plan.productType === 'dien thoai') return 'Điện thoại thông minh kết hợp nghe gọi, truy cập Internet và chạy ứng dụng. Khi tìm hiểu để lựa chọn, bạn nên cân nhắc hệ điều hành, hiệu năng, chất lượng màn hình, camera, pin và thời gian cập nhật phần mềm. Bạn muốn tìm hiểu cách hoạt động hay ưu nhược điểm theo nhu cầu sử dụng?';
  return 'Để tìm hiểu loại sản phẩm này, bạn có thể bắt đầu từ công dụng, thông số chính, ưu nhược điểm và cách sử dụng. Bạn muốn mình giải thích phần nào trước?';
}
