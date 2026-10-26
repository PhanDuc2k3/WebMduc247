CREATE UNIQUE INDEX IF NOT EXISTS refund_provider_transaction_unique
  ON payment_service.refunds(provider,provider_refund_txn_id)
  WHERE provider_refund_txn_id IS NOT NULL;
