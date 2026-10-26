import { normalize, productType, categoryType, sameProductType, flattenCategories, matchingCategory } from './product-relevance.js';
import { redactPrivateData } from './claude-proxy.js';
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const codePattern = /^[A-Z0-9_-]{4,32}$/;
const fail = (code, message) => Object.assign(new Error(message), { status: 400, code });
const object = (value, keys) => {
  if (!value || typeof value !== 'object' || Array.isArray(value) ||
    Object.keys(value).some(key => !keys.includes(key))) throw fail('INVALID_TOOL_INPUT', 'Tham số công cụ không hợp lệ.');
  return value;
};
const string = (value, min, max) => {
  if (typeof value !== 'string' || value.trim().length < min || value.trim().length > max || /[\u0000-\u001f\u007f]/.test(value))
    throw fail('INVALID_TOOL_INPUT', 'Tham số văn bản không hợp lệ.');
  return value.trim();
};
const id = value => { if (!uuid.test(String(value))) throw fail('INVALID_TOOL_INPUT', 'ID không hợp lệ.'); return value; };
const money = (value, fallback = null) => {
  if (value == null) return fallback;
  if (!Number.isSafeInteger(value) || value < 0 || value > 1_000_000_000_000)
    throw fail('INVALID_TOOL_INPUT', 'Khoảng giá không hợp lệ.');
  return value;
};
const amount = value => Number.isFinite(Number(value)) ? Number(value) : 0;
const vnd = value => `${amount(value).toLocaleString('vi-VN')}₫`;
const invalidResult = () => Object.assign(new Error('Dữ liệu sản phẩm tạm thời chưa hợp lệ.'), { status: 503, code: 'INVALID_TOOL_RESPONSE' });
const compact = item => {
  if (!item || !uuid.test(item.id) || typeof (item.name || item.title) !== 'string' || !(item.name || item.title).trim() ||
    !Number.isSafeInteger(item.priceMinor) || item.priceMinor < 0 ||
    !Number.isSafeInteger(item.stock) || item.stock < 0 || typeof item.inStock !== 'boolean' || item.inStock !== (item.stock > 0) ||
    item.rating != null && (!Number.isFinite(item.rating) || item.rating < 0 || item.rating > 5) ||
    item.reviewCount != null && (!Number.isSafeInteger(item.reviewCount) || item.reviewCount < 0)) throw invalidResult();
  return { id: item.id, name: (item.name || item.title).slice(0, 300), brand: item.brand || null, categoryId: item.categoryId || null,
  priceMinor: item.priceMinor, storeName: item.store?.name || '',
  imageUrl: item.imageUrl || null, rating: item.rating ?? null,
  reviewCount: item.reviewCount ?? null, inStock: item.inStock, stock: item.stock };
};
const modelProduct = item => ({ id: item.id, name: redactPrivateData(item.name), brand: item.brand ? redactPrivateData(item.brand) : null,
  priceMinor: item.priceMinor, storeName: redactPrivateData(item.storeName), rating: item.rating,
  inStock: item.inStock, stock: item.stock });
const attributes = value => {
  if (value == null) return {};
  if (typeof value !== 'object' || Array.isArray(value) || Object.keys(value).length > 100 ||
    Object.values(value).some(options => !Array.isArray(options) || options.some(option => typeof option !== 'string'))) throw invalidResult();
  return Object.fromEntries(Object.entries(value).slice(0, 20).map(([key, options]) =>
    [redactPrivateData(key).slice(0, 80), options.slice(0, 12).map(option => redactPrivateData(option).slice(0, 200))]));
};

const definitions = [
  { name: 'get_product_categories', description: 'Read the current active public category tree. Use real category IDs only.',
    input_schema: { type: 'object', additionalProperties: false, properties: {} } },
  { name: 'get_applicable_vouchers', description: 'Read public voucher conditions, or validate a supplied code against the authenticated customer cart. A public listing does not establish eligibility.',
    input_schema: { type: 'object', additionalProperties: false, properties: { code: { type: 'string', minLength: 4, maxLength: 32 }, storeId: { type: 'string', format: 'uuid' } } } },
  { name: 'search_products', description: 'Search public, currently sellable MDUC247 products by Vietnamese need, category, shop, price and brand. Returns verified name, current price, stock and rating; call get_product_details only for descriptions, specs or variants.',
    input_schema: { type: 'object', additionalProperties: false, properties: {
      query: { type: 'string', minLength: 2, maxLength: 100, description: 'Short product keywords, not the whole customer sentence.' },
      productType: { type: 'string', maxLength: 80 },
      categoryId: { type: 'string', format: 'uuid' }, shopId: { type: 'string', format: 'uuid' }, minPrice: { type: 'integer', minimum: 0, maximum: 1000000000000 },
      maxPrice: { type: 'integer', minimum: 0, maximum: 1000000000000 }, brand: { type: 'string', maxLength: 80 }, limit: { type: 'integer', minimum: 1, maximum: 5 },
      sort: { type: 'string', enum: ['relevance','price_asc','newest'] },
    }, required: ['query'] } },
  { name: 'get_product_details', description: 'Get the current public details of one product by UUID. Use this before stating specs, variants or stock.',
    input_schema: { type: 'object', additionalProperties: false, properties: { productId: { type: 'string' } }, required: ['productId'] } },
  { name: 'compare_products', description: 'Compare 2 to 4 real public product UUIDs using verified details. Missing specs remain unknown.',
    input_schema: { type: 'object', additionalProperties: false, properties: { productIds: { type: 'array', items: { type: 'string' }, minItems: 2, maxItems: 4 } }, required: ['productIds'] } },
  { name: 'get_order_status', description: 'Read an order status owned by the authenticated customer. Never accept userId as an argument.',
    input_schema: { type: 'object', additionalProperties: false, properties: { orderGroupId: { type: 'string' } }, required: ['orderGroupId'] } },
  { name: 'get_voucher_information', description: 'Read active platform/shop voucher conditions or validate a code against the authenticated customer cart. Never calculate final checkout totals.',
    input_schema: { type: 'object', additionalProperties: false, properties: { code: { type: 'string' }, storeId: { type: 'string' } } } },
  { name: 'get_platform_policy', description: 'Find the published policy page for shipping, payment, returns, warranty or privacy. If no verified policy content exists, say so.',
    input_schema: { type: 'object', additionalProperties: false, properties: { topic: { type: 'string', enum: ['shipping','payment','returns','warranty','privacy','terms'] } }, required: ['topic'] } },
];

export class ShoppingTools {
  constructor(chat) { this.chat = chat; }
  schemas() { return definitions; }
  async execute(name, input, context = {}) {
    if (!definitions.some(tool => tool.name === name)) throw fail('UNKNOWN_TOOL', 'Công cụ không được phép.');
    if (name === 'get_product_categories') {
      object(input, []);
      const response = await this.chat.remote(new URL('/api/v2/categories', this.chat.config.catalogUrl));
      let categories;
      try { categories = flattenCategories(response.categories); } catch { throw invalidResult(); }
      if (categories.some(category => !uuid.test(category.id))) throw invalidResult();
      return { data: { categories }, sourceRefs: ['catalog:categories'] };
    }
    if (name === 'search_products') {
      object(input, ['query','productType','categoryId','shopId','minPrice','maxPrice','brand','limit','sort']);
      // Server-owned conversation filters cannot be removed or widened by model tool arguments.
      const args = { ...input };
      for (const key of ['query','productType','brand','minPrice','maxPrice','categoryId','shopId'])
        if (context.search?.[key] != null && context.search[key] !== '') args[key] = context.search[key];
      const query = string(args.query, 2, 100), brand = args.brand == null ? '' : string(args.brand, 1, 80);
      const type = args.productType == null ? productType(query) || categoryType(query) || normalize(query) :
        productType(string(args.productType, 1, 80)) || categoryType(args.productType) || normalize(args.productType);
      if (args.categoryId != null) id(args.categoryId);
      if (args.shopId != null) id(args.shopId);
      const minPrice = money(args.minPrice), maxPrice = money(args.maxPrice);
      if (minPrice != null && maxPrice != null && minPrice > maxPrice) throw fail('INVALID_TOOL_INPUT','Khoảng giá không hợp lệ.');
      const limit = args.limit == null ? 5 : args.limit;
      if (!Number.isInteger(limit) || limit < 1 || limit > 5) throw fail('INVALID_TOOL_INPUT','Giới hạn kết quả không hợp lệ.');
      if (args.sort != null && !['relevance','price_asc','newest'].includes(args.sort))
        throw fail('INVALID_TOOL_INPUT','Sắp xếp không hợp lệ.');
      const categories = type ? (await this.execute('get_product_categories', {})).data.categories : [];
      const category = matchingCategory(categories, type);
      const scoped = args.categoryId || category?.id;
      const categoryIds = new Set(categories.filter(item => item.id === scoped || item.ancestors.includes(scoped)).map(item => item.id));
      if (scoped) categoryIds.add(scoped);
      // Browse the category when the query is only the product type: models named Galaxy/A-series
      // still qualify without requiring the literal words "điện thoại" in their title.
      const exactCategory = categories.find(item => item.id === scoped);
      const categoryMatchesType = exactCategory && (productType(exactCategory.name) === type || normalize(exactCategory.name) === type);
      const categoryBrowse = scoped && categoryMatchesType && normalize(query) === type;
      const url = new URL(categoryBrowse ? '/api/v2/products' : '/api/v2/products/search', this.chat.config.catalogUrl);
      if (!categoryBrowse) url.searchParams.set('q', query);
      url.searchParams.set('limit', String(limit));
      url.searchParams.set('inStock', 'true');
      if (scoped) url.searchParams.set('categoryId', scoped);
      if (args.shopId) url.searchParams.set('shopId', args.shopId);
      if (minPrice != null) url.searchParams.set('minPrice', String(minPrice));
      if (maxPrice != null) url.searchParams.set('maxPrice', String(maxPrice));
      if (brand) url.searchParams.set('brand', brand);
      if (args.sort) url.searchParams.set('sort', args.sort);
      const found = await this.chat.remote(url);
      if (!Array.isArray(found.products)) throw invalidResult();
      let products = found.products.slice(0, 50).map(item => ({ card: compact(item), raw: item }))
        .filter(({ card, raw }) => sameProductType(card, type, categoryMatchesType && categoryIds.has(raw.categoryId)) && (!scoped || categoryIds.has(raw.categoryId)) &&
          (minPrice == null || card.priceMinor >= minPrice) && (maxPrice == null || card.priceMinor <= maxPrice) &&
          (!brand || normalize(card.brand) === normalize(brand)) && card.inStock)
        .map(({ card }) => card);
      if (args.sort === 'price_asc') products.sort((a, b) => a.priceMinor - b.priceMinor);
      products = products.slice(0, limit);
      return { data: { query, matchedCount: products.length, products: products.map(modelProduct) },
        products, sourceRefs: products.map(item => `product:${item.id}`) };
    }
    if (name === 'get_product_details') {
      const args = object(input, ['productId']); id(args.productId);
      const { product } = await this.chat.remote(new URL(`/api/v2/products/${args.productId}`, this.chat.config.catalogUrl));
      const card = compact(product);
      if (card.id !== args.productId) throw invalidResult();
      if (product.variants != null && !Array.isArray(product.variants)) throw invalidResult();
      const variants = (product.variants || []).filter(variant => variant?.status === 'active').slice(0, 8).map(variant => {
        if (!Number.isSafeInteger(variant.priceMinor) || variant.priceMinor < 0 || !Number.isSafeInteger(variant.stock) || variant.stock < 0) throw invalidResult();
        return { attributes: attributes(variant.attributes), priceMinor: variant.priceMinor, stock: variant.stock };
      });
      const details = { ...modelProduct(card), description: redactPrivateData(String(product.description || '')).slice(0, 400),
        attributes: attributes(product.attributes), variants };
      return { data: details, products: [card], sourceRefs: [`product:${card.id}`] };
    }
    if (name === 'compare_products') {
      const args = object(input, ['productIds']);
      if (!Array.isArray(args.productIds) || args.productIds.length < 2 || args.productIds.length > 4 ||
        new Set(args.productIds).size !== args.productIds.length) throw fail('INVALID_TOOL_INPUT','Cần 2–4 sản phẩm khác nhau.');
      args.productIds.forEach(id);
      const details = await Promise.all(args.productIds.map(productId => this.chat.remote(
        new URL(`/api/v2/products/${productId}`, this.chat.config.catalogUrl))));
      const products = details.map((result, index) => {
        const card = compact(result.product);
        if (card.id !== args.productIds[index]) throw invalidResult();
        return card;
      });
      const values = details.map(result => ({ ...result.product, attributes: attributes(result.product.attributes) }));
      const rating = item => item.rating == null ? 'Chưa có dữ liệu' : `${item.rating}/5 (${item.reviewCount || 0})`;
      const rows = [
        { label: 'Giá hiện tại', values: values.map(item => vnd(item.priceMinor)) },
        { label: 'Thương hiệu', values: values.map(item => item.brand || 'Chưa có dữ liệu') },
        { label: 'Cửa hàng', values: values.map(item => item.store?.name || 'Chưa có dữ liệu') },
        { label: 'Tồn kho', values: values.map(item => item.inStock ? `${item.stock} sản phẩm` : 'Hết hàng') },
        { label: 'Đánh giá', values: values.map(rating) },
        { label: 'Mô tả', values: values.map(item => String(item.description || 'Chưa có dữ liệu').slice(0, 150)) },
      ];
      const attributeKeys = [...new Set(values.flatMap(item => Object.keys(item.attributes || {})))].slice(0, 5);
      for (const key of attributeKeys) rows.push({ label: key, values: values.map(item =>
        Array.isArray(item.attributes?.[key]) ? item.attributes[key].join(', ') : 'Chưa có dữ liệu') });
      return { data: { products: products.map(modelProduct), rows },
        comparison: { products, rows }, products, sourceRefs: products.map(item => `product:${item.id}`) };
    }
    if (name === 'get_order_status') {
      const args = object(input, ['orderGroupId']); id(args.orderGroupId);
      if (!context.user) return { data: { loginRequired: true, message: 'Vui lòng đăng nhập để tra cứu đơn.' }, sourceRefs: [] };
      const url = new URL(`/api/v2/internal/chat/orders/${args.orderGroupId}`, this.chat.config.orderUrl);
      url.searchParams.set('buyerId', context.user.id);
      const result = await this.chat.remote(url, { headers: { 'X-Chat-Order-Token': this.chat.config.orderToken } });
      if (result.id !== args.orderGroupId || typeof result.status !== 'string') throw invalidResult();
      return { data: { id: result.id, status: result.status }, sourceRefs: [`order:${result.id}`] };
    }
    if (name === 'get_voucher_information' || name === 'get_applicable_vouchers') {
      const args = object(input, ['code','storeId']);
      const code = args.code == null ? '' : string(args.code, 4, 32).toUpperCase();
      if (code && !codePattern.test(code)) throw fail('INVALID_TOOL_INPUT','Mã voucher không hợp lệ.');
      if (args.storeId != null) id(args.storeId);
      if (code && context.user && context.bearer) {
        try {
          const verified = await this.chat.remote(new URL('/api/v2/promotions/vouchers/validate',this.chat.config.engagementUrl),
            { method:'POST',headers:{Authorization:context.bearer,'Content-Type':'application/json'},body:JSON.stringify({code}) });
          if (!verified.voucher || !Number.isSafeInteger(verified.voucher.discountMinor) || verified.voucher.discountMinor < 0) throw invalidResult();
          return { data: { code, valid: true, discountMinor: verified.voucher.discountMinor,
            message: 'Số tiền cuối cùng được kiểm tra lại tại checkout.' }, sourceRefs: [`voucher:${code}`] };
        } catch(error) {
          if(error.status < 500)return { data: { code, valid: false, reason: error.message }, sourceRefs: [] };
          throw error;
        }
      }
      const listing = await this.chat.remote(new URL('/api/v2/promotions/active',this.chat.config.engagementUrl));
      if (!Array.isArray(listing.promotions) || listing.promotions.some(entry => !entry?.campaign || !entry.voucher)) throw invalidResult();
      const vouchers = (listing.promotions || []).filter(entry => !args.storeId || entry.campaign.storeId === args.storeId)
        .filter(entry => !code || entry.voucher.code === code).slice(0, 5).map(entry => ({
          code: entry.voucher.code, kind: entry.campaign.storeId ? 'shop' : 'platform',
          storeId: entry.campaign.storeId || null, discountType: entry.voucher.discountType,
          discountValue: entry.voucher.discountValue, maxDiscountMinor: entry.voucher.maxDiscountMinor,
          minSpendMinor: entry.voucher.minSpendMinor, endsAt: entry.campaign.endsAt,
        }));
      return { data: { vouchers, eligibilityVerified: false, message: code && !vouchers.length ?
        'Mã không nằm trong danh sách đang hoạt động; checkout sẽ kiểm tra điều kiện chính xác.' :
        'Điều kiện và giá cuối cùng được xác nhận tại checkout.' },
      sourceRefs: vouchers.map(item => `voucher:${item.code}`) };
    }
    const args = object(input, ['topic']);
    if (!['shipping','payment','returns','warranty','privacy','terms'].includes(args.topic))
      throw fail('INVALID_TOOL_INPUT','Chủ đề chính sách không hợp lệ.');
    const routes = { shipping:'/terms', payment:'/terms', returns:'/terms', warranty:'/support',
      privacy:'/privacy', terms:'/terms' };
    return { data: { available: false, message: 'Chưa có bản tóm tắt chính sách được phê duyệt cho chatbot. Xem trang chính sách chính thức.',
      url: routes[args.topic] }, sourceRefs: [`policy:${args.topic}`] };
  }
}
