# Catalog data and visibility

The `catalog` schema is owned by Catalog Service. Migration `002_catalog.sql` adds:

| Table | Purpose |
| --- | --- |
| `categories` | Parent-child tree with unique slug, display order, active flag and a database trigger that rejects cycles. |
| `products` | Store-scoped slug, category, brand, draft/active/hidden/discontinued state and featured flag. Products are never hard-deleted by seller APIs. |
| `product_attributes` | Available values for named options such as color and size. |
| `product_variants` | Store-unique SKU, whole-VND original/sale price and promotion window. Its legacy `stock` column mirrors physical on-hand; Inventory owns the authoritative balance. |
| `product_images` | Ordered WebP object keys, one primary image and optional variant link. |
| `catalog_banners` | Scheduled home banners stored by object key. |

Public product queries join the store and its order-acceptance setting before returning active products. A product under an inactive category or inactive ancestor is hidden. Price is computed from active SKUs at request time; a sale is effective only within its start/end window. Rating, reviews and sold count remain null until trusted aggregates exist. `ProductPublished.v1`, `ProductUpdated.v1` and `ProductPriceChanged.v1` are written to `store_outbox` in the transaction that changes the product.

`npm run catalog:seed` imports the ten stores and 42 products in `Frontend/src/mocks/catalogData.ts` only when explicitly run in dev/test. The stable `seed_key` prevents duplicates. `npm run catalog:seed:reset` deletes only seeded records. Demo images may use the source HTTPS URLs without server-side fetching; ordinary uploaded images use private object keys and signed URLs.
