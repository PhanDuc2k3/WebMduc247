# Identity events

Identity writes these records to `identity_outbox` in the same PostgreSQL transaction as the associated state change. Each payload is JSON and contains no password or token. When `IDENTITY_EVENT_WEBHOOK_URL` and `IDENTITY_EVENT_WEBHOOK_TOKEN` are configured, a worker delivers them to Engagement Notification over an authenticated internal webhook. Delivery retries with backoff, stops after ten failures, and keeps failed events for investigation. The receiver deduplicates by source and outbox `id`. Kafka is not configured in the local stack.

| Event type | Payload | Trigger |
| --- | --- | --- |
| `UserRegistered.v1` | `{ "userId": "uuid", "email": "normalized@example.test", "verificationRequired": false }` | Account created; status depends on deployment configuration |
| `UserEmailVerified.v1` | `{ "userId": "uuid" }` | Verification token consumed |
| `RefreshReuseDetected.v1` | `{ "userId": "uuid", "familyId": "uuid" }` | Rotated refresh token reused while its family was active |

Identity notifications use in-app templates and a `/profile` link. They do not enqueue an additional email; verification and password reset emails remain in Identity's encrypted mail queue. Notification delivery must avoid disclosing account data to untrusted recipients.
