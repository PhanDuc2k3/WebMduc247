import { StoreError } from './store.service.js';
import { ProductSearchRepository } from './product-search.repository.js';

const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const slug = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const invalid = () => new StoreError(400, 'INVALID_FILTER', 'Bộ lọc tìm kiếm không hợp lệ.');
const integer = (value, fallback, min, max) => {
  if (value == null || value === '') return fallback;
  const number = Number(value);
  if (!Number.isSafeInteger(number) || number < min || number > max) throw invalid();
  return number;
};
const bool = value => {
  if (value == null || value === false || value === 'false') return false;
  if (value === true || value === 'true') return true;
  throw invalid();
};

export function parseProductSearchQuery(query = {}, requireQuery = false) {
  const allowed = ['q', 'search', 'page', 'limit', 'category', 'categoryId', 'store', 'shopId', 'brand',
    'sort', 'minPrice', 'maxPrice', 'minRating', 'inStock', 'sale'];
  if (Object.keys(query).some(key => !allowed.includes(key)) || (query.q != null && query.search != null)) throw invalid();
  const input = query.q ?? query.search ?? '';
  if (typeof input !== 'string') throw invalid();
  const search = input.normalize('NFC').trim().replace(/\s+/gu, ' ');
  if ([...search].length > 100 || /[\u0000-\u001f\u007f]/u.test(search) ||
    (requireQuery && search.length < 2)) throw new StoreError(400, 'INVALID_SEARCH_QUERY', 'Từ khóa phải có 2–100 ký tự.');
  const category = query.category ?? '';
  const store = query.store ?? '';
  const brand = query.brand ?? '';
  const categoryId = query.categoryId ?? null;
  const shopId = query.shopId ?? null;
  if (typeof category !== 'string' || category.length > 80 || (category && !slug.test(category)) ||
    typeof store !== 'string' || store.length > 80 || (store && !uuid.test(store) && !slug.test(store)) ||
    typeof brand !== 'string' || brand.length > 80 || /[\u0000-\u001f\u007f]/u.test(brand) ||
    (categoryId != null && (typeof categoryId !== 'string' || !uuid.test(categoryId))) ||
    (shopId != null && (typeof shopId !== 'string' || !uuid.test(shopId)))) throw invalid();
  const minPrice = integer(query.minPrice, 0, 0, 1_000_000_000_000);
  const maxPrice = integer(query.maxPrice, 1_000_000_000_000, minPrice, 1_000_000_000_000);
  const minRating = query.minRating == null ? 0 : Number(query.minRating);
  if (!Number.isFinite(minRating) || minRating < 0 || minRating > 5) throw invalid();
  const sort = query.sort ?? (search ? 'relevance' : 'newest');
  if (!['relevance', 'newest', 'price_asc', 'price_desc'].includes(sort)) throw invalid();
  return { search, category, categoryId, store, shopId, brand: brand.trim(), minPrice, maxPrice, minRating,
    inStock: bool(query.inStock), sale: bool(query.sale), sort,
    page: integer(query.page, 1, 1, 10000), limit: integer(query.limit, 12, 1, 50) };
}

export class ProductSearchService {
  constructor(pool, imageUrl) {
    this.repository = new ProductSearchRepository(pool);
    this.imageUrl = imageUrl;
  }
  async list(query = {}, requireQuery = false) {
    const options = parseProductSearchQuery(query, requireQuery);
    const { rows, total } = await this.repository.find(options);
    return { products: await Promise.all(rows.map(async row => ({
      id: row.id, slug: row.slug, name: row.name, title: row.name, brand: row.brand,
      storeId: row.store_id, store: { slug: row.store_slug, name: row.store_name },
      categoryId: row.category_id, currency: 'VND', priceMinor: Number(row.display_price),
      priceOriginalMinor: Number(row.original_price), stock: row.total_stock, inStock: row.total_stock > 0,
      imageUrl: await this.imageUrl(row.primary_key) ||
        (row.seed_key && /^https:\/\//.test(row.image_url || '') ? row.image_url : null),
      rating: row.review_count ? Number(row.average_rating) : null,
      reviewCount: row.review_count || 0, soldCount: null, createdAt: row.created_at,
    }))), page: options.page, limit: options.limit, total,
      totalPages: Math.ceil(total / options.limit), hasNextPage: options.page * options.limit < total,
      ratingSource: 'reviews' };
  }
}
