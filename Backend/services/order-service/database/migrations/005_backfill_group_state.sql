WITH totals AS (
  SELECT group_id,
    sum(payable_total_minor)::bigint AS grand_total,
    coalesce(sum(payable_total_minor) FILTER (WHERE status <> 'CANCELLED'),0)::bigint AS current_total,
    coalesce(sum(payable_total_minor) FILTER (WHERE status = 'CANCELLED'),0)::bigint AS cancelled_total,
    CASE
      WHEN bool_and(status='CANCELLED') THEN 'CANCELLED'
      WHEN bool_or(status='CANCELLED') THEN 'PARTIAL_CANCELLED'
      WHEN bool_and(status='COMPLETED') THEN 'COMPLETED'
      WHEN bool_or(status='DELIVERED') THEN 'DELIVERED'
      WHEN bool_or(status='SHIPPING') THEN 'SHIPPING'
      WHEN bool_or(status='READY_TO_SHIP') THEN 'READY_TO_SHIP'
      WHEN bool_or(status='PREPARING') THEN 'PREPARING'
      WHEN bool_or(status='CONFIRMED') THEN 'CONFIRMED'
      WHEN bool_or(status='PENDING_INVENTORY') THEN 'PENDING_INVENTORY'
      ELSE 'PLACED'
    END AS group_status
  FROM order_service.orders GROUP BY group_id
)
UPDATE order_service.order_groups g
SET grand_total_minor=t.grand_total,
  current_total_minor=t.current_total,
  cancelled_total_minor=t.cancelled_total,
  status=t.group_status
FROM totals t WHERE g.id=t.group_id;
