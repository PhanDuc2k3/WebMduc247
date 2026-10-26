ALTER TABLE payment_service.payment_intents ADD COLUMN IF NOT EXISTS review_required boolean NOT NULL DEFAULT false;
ALTER TABLE payment_service.payment_intents ADD COLUMN IF NOT EXISTS review_reason text;
ALTER TABLE payment_service.payment_intents ADD COLUMN IF NOT EXISTS next_reconcile_at timestamptz NOT NULL DEFAULT now();
ALTER TABLE payment_service.refunds ADD COLUMN IF NOT EXISTS last_reconciled_at timestamptz;
