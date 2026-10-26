// PostgreSQL implementation behind ProductSearchService. Keep ranking changes here.
const effectivePrice = `CASE WHEN v.sale_price_minor IS NOT NULL
  AND (v.sale_starts_at IS NULL OR v.sale_starts_at<=now())
  AND (v.sale_ends_at IS NULL OR v.sale_ends_at>now())
  THEN v.sale_price_minor ELSE v.price_minor END`;

const withClause = `WITH RECURSIVE active_categories AS (
  SELECT id,slug FROM catalog.categories WHERE parent_id IS NULL AND is_active=true
  UNION ALL SELECT c.id,c.slug FROM catalog.categories c
    JOIN active_categories a ON c.parent_id=a.id WHERE c.is_active=true
), selected_categories AS (
  SELECT id FROM active_categories WHERE slug=$3 OR id=$9::uuid
  UNION ALL SELECT c.id FROM catalog.categories c
    JOIN selected_categories a ON c.parent_id=a.id WHERE c.is_active=true
), query_terms AS (
  SELECT catalog.normalize_search_text($4::text) AS q,
    websearch_to_tsquery('simple', catalog.normalize_search_text($4::text)) AS tsq
)`;

const variantPrice = `CROSS JOIN LATERAL (
  SELECT (array_agg(${effectivePrice} ORDER BY ${effectivePrice},v.id))[1]::bigint AS display_price,
    (array_agg(v.price_minor ORDER BY ${effectivePrice},v.id))[1]::bigint AS original_price,
    coalesce(sum(coalesce(i.on_hand-i.reserved,v.stock)),0)::int AS total_stock,
    bool_or(v.sale_price_minor IS NOT NULL AND v.sale_price_minor<v.price_minor
      AND (v.sale_starts_at IS NULL OR v.sale_starts_at<=now())
      AND (v.sale_ends_at IS NULL OR v.sale_ends_at>now())) AS on_sale
  FROM catalog.product_variants v LEFT JOIN catalog.inventory i ON i.variant_id=v.id
  WHERE v.product_id=p.id AND v.status='active'
) vp`;

// Require every meaningful query token to resemble a word in the product.
// The trigram-assisted prefix/whole-query condition bounds fuzzy candidates.
const fuzzy = `((qt.q <% p.search_text OR p.search_text ILIKE '%'||left(qt.q,3)||'%')
  AND NOT EXISTS (
    SELECT 1 FROM regexp_split_to_table(qt.q, ' ') AS token
    WHERE (length(token)>=3 AND word_similarity(token,p.search_text)<0.50)
      OR (length(token)<3 AND p.search_text NOT LIKE '%'||token||'%')
  ))`;

// UNION lets PostgreSQL use each search index separately instead of an OR across joined tables.
const candidateProducts = `, candidate_products AS MATERIALIZED (
  SELECT p.id FROM catalog.products p CROSS JOIN query_terms qt
    WHERE p.status IN ('active','published') AND p.search_text ILIKE '%'||qt.q||'%'
  UNION
  SELECT p.id FROM catalog.products p CROSS JOIN query_terms qt
    WHERE p.status IN ('active','published') AND p.search_vector @@ qt.tsq
  UNION
  SELECT p.id FROM catalog.products p CROSS JOIN query_terms qt
    WHERE p.status IN ('active','published') AND ${fuzzy}
  UNION
  SELECT p.id FROM catalog.products p JOIN catalog.stores s ON s.id=p.store_id
    CROSS JOIN query_terms qt
    WHERE p.status IN ('active','published') AND s.status='active'
      AND s.search_name ILIKE '%'||qt.q||'%'
)`;

const from = searching => `FROM catalog.products p
  ${searching ? 'JOIN candidate_products hits ON hits.id=p.id' : ''}
  JOIN catalog.stores s ON s.id=p.store_id
  JOIN catalog.store_settings st ON st.store_id=s.id
  LEFT JOIN catalog.product_rating_summary rs ON rs.product_id=p.id
  CROSS JOIN query_terms qt
  ${variantPrice}
  WHERE p.status IN ('active','published') AND s.status='active' AND st.accepting_orders=true
    AND (p.category_id IS NULL OR p.category_id IN (SELECT id FROM active_categories))
    AND vp.display_price IS NOT NULL AND vp.display_price BETWEEN $1 AND $2
    AND (($3='' AND $9::uuid IS NULL) OR p.category_id IN (SELECT id FROM selected_categories))
    AND ($5='' OR s.id::text=$5 OR s.slug=$5)
    AND ($10::uuid IS NULL OR s.id=$10::uuid)
    AND ($11='' OR catalog.normalize_search_text(p.brand)=catalog.normalize_search_text($11))
    AND ($6=false OR vp.total_stock>0)
    AND ($7=false OR vp.on_sale=true)
    AND ($8::numeric=0 OR coalesce(rs.average_rating,0)>=$8)`;

// The tier keeps exact/prefix/substring results above fuzzy and description-only FTS hits.
const relevance = `CASE
    WHEN qt.q<>'' AND p.search_name=qt.q THEN 0
    WHEN qt.q<>'' AND p.search_name LIKE qt.q||'%' THEN 1
    WHEN qt.q<>'' AND p.search_name LIKE '%'||qt.q||'%' THEN 2
    WHEN qt.q<>'' AND p.search_text LIKE '%'||qt.q||'%' THEN 3
    WHEN qt.q<>'' AND p.search_vector @@ qt.tsq THEN 4
    WHEN qt.q<>'' AND ${fuzzy} THEN 5
    ELSE 6 END ASC,
    (ts_rank_cd(p.search_vector,qt.tsq)*100 + word_similarity(qt.q,p.search_text)*20) DESC,
    (vp.total_stock>0) DESC,p.is_featured DESC,p.created_at DESC,p.id DESC`;

const orderBy = {
  relevance,
  newest: 'p.created_at DESC,p.id DESC',
  price_asc: 'vp.display_price ASC,p.id ASC',
  price_desc: 'vp.display_price DESC,p.id DESC',
};

export class ProductSearchRepository {
  constructor(pool) { this.pool = pool; }
  async find(options) {
    const args = [options.minPrice, options.maxPrice, options.category, options.search,
      options.store, options.inStock, options.sale, options.minRating, options.categoryId, options.shopId, options.brand];
    const ctes = withClause + (options.search ? candidateProducts : '');
    const source = from(Boolean(options.search));
    const [count, list] = await Promise.all([
      this.pool.query(`${ctes} SELECT count(*)::int AS total ${source}`, args),
      this.pool.query(`${ctes} SELECT p.id,p.slug,p.name,p.brand,p.store_id,p.category_id,
        p.created_at,p.seed_key,p.image_url,s.slug AS store_slug,s.name AS store_name,
        vp.display_price,vp.original_price,vp.total_stock,rs.average_rating,rs.review_count,
        (SELECT object_key FROM catalog.product_images WHERE product_id=p.id
          ORDER BY is_primary DESC,position,id LIMIT 1) AS primary_key
        ${source} ORDER BY ${orderBy[options.sort]} LIMIT $12 OFFSET $13`,
      [...args, options.limit, (options.page - 1) * options.limit]),
    ]);
    return { rows: list.rows, total: count.rows[0].total };
  }
}
