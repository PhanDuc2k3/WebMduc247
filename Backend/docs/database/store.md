# Store & Seller data

Catalog Service owns the `catalog` schema. Local development uses the same PostgreSQL instance as Identity Service but a separate schema. Production can set `CATALOG_DATABASE_URL` to a dedicated database.

| Table | Purpose |
| --- | --- |
| `catalog.stores` | Public slug, profile and active/paused status; slug remains immutable after creation. |
| `catalog.store_members` | Owner and staff permissions scoped by store ID; every seller API checks this table. |
| `catalog.store_addresses` | Pickup and return addresses, hidden from public responses. |
| `catalog.store_settings` | Order acceptance, hours and contact information. |
| `catalog.products` | Product metadata and draft, active, hidden or discontinued state; public queries require active status and an active shop. |
| `catalog.categories` | Parent-child categories with a database cycle guard, slug, media keys and display order. |
| `catalog.product_attributes` | Option values for color, size and other named attributes. |
| `catalog.product_variants` | Store-unique SKU and whole-VND original/sale prices; Inventory owns the authoritative stock balance. |
| `catalog.product_images` | Ordered object keys, primary image and optional variant link. |
| `catalog.catalog_banners` | Scheduled home banners and target paths. |
| `catalog.store_invitations` | One-time, seven-day invitation hashes; raw token is only returned at creation. |
| `catalog.store_audit_logs` | Actor and changed field names for important changes. |
| `catalog.store_outbox` | StoreCreated.v1, StoreStatusChanged.v1, and membership events. |

The Catalog worker publishes membership changes to a secret-protected Identity endpoint. Identity updates its seller role and store membership projection idempotently. StoreStatusChanged remains in the outbox for future Order/Product consumers. A paused store is hidden from the public Catalog API; the future Order Service must also reject new orders transactionally while leaving historical orders readable.
