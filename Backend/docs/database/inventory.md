# Inventory invariants

Migration `003_inventory.sql` adds `inventory` (one row per SKU), `inventory_reservations`,
`inventory_movements` and `inventory_anomalies`.

| Value | Meaning |
| --- | --- |
| `on_hand` | Physical units not yet committed to an order. |
| `reserved` | Units in ACTIVE, unexpired reservations. |
| `available` | `on_hand - reserved`. Public catalog stock uses this value. |
| `version` | Increments on every balance change. |

The service locks the inventory row in a PostgreSQL transaction before changing reservations or stock. Reservation transitions are one-way: ACTIVE → COMMITTED, RELEASED or EXPIRED. Commit subtracts both `on_hand` and `reserved`; release and expiry subtract only `reserved`. A retry with the same idempotency key returns the same reservation. Wrong terminal transitions return `INVALID_RESERVATION_STATE` and record a zero-delta movement.

The Catalog process sweeps expiry and checks the ACTIVE-reservation sum every 30 seconds. It repairs a reserved mismatch only when the expected amount is within `on_hand`; otherwise it records an unresolved anomaly for operator review. Inventory events are stored in `store_outbox` in the same transaction as the balance change. Optional `INVENTORY_EVENT_WEBHOOK_URL` delivery retries with backoff and a stable `X-Event-Id` for receiver deduplication. Permanent 4xx failures or 20 unsuccessful attempts move an event to dead letter state. Without a receiver, pending events stay in the outbox and are reported by reconciliation.

Order Service v2 is not yet wired to these internal endpoints. Preview may call availability, while order creation must reserve. Payment failure/cancel should release; order confirmation should commit. No cart view or add-to-cart call should reserve.
For multi-SKU orders, Order Service must derive a distinct idempotency key per order line. The development seed reset refuses to delete products that still have reservation records.
