# User & Profile data

Migration `006_create_profiles_addresses.sql` creates `user_profiles`, `user_preferences`, `phone_challenges`, and `addresses`, then backfills profiles/preferences for existing users. New registration creates both rows in the same transaction as `users`.

The partial unique index `addresses_one_default_per_user` guarantees at most one active default address. Address writes also lock the owner row to serialize concurrent changes. Deletion sets `deleted_at` and reassigns the default if needed. List responses mask recipient phone; owner-only detail responses contain the full recipient phone.

New address forms use province and ward without a district. `districtCode` remains in the API and shipping snapshot for older addresses; when omitted, Identity stores and returns an empty string. Province and ward fields accept either a code or a readable locality name. Order Service treats an empty district as valid while still requiring the other address fields.

The account phone is assigned only after a six-digit OTP succeeds. OTP hashes are HMAC verifiers, expire after five minutes, allow five checks, and are rate limited. `PHONE_OTP_MODE=email` sends the code to the account email in development and production. A successful email OTP sets `phone_email_confirmed_at`, while `phone_verified_at` remains null because this does not prove possession of the phone. Email-confirmed numbers are not globally unique, so a user cannot reserve someone else's number. Optional `PHONE_OTP_MODE=sms-webhook` requires `SMS_WEBHOOK_URL` and `SMS_WEBHOOK_TOKEN` and can set `phone_verified_at` after successful SMS OTP. Only SMS-verified numbers are unique. The delivery channel is stored with each challenge so a config change cannot change the meaning of an existing OTP. Recipient phone in an address is independent of the account phone.

Avatar uploads require ClamAV scanning and S3-compatible object storage in production. Startup fails if either dependency is absent or the bucket cannot be reached. Only `avatar_key` is stored in PostgreSQL; clients receive a short-lived signed GET URL. The service attempts to delete a newly uploaded object if the database update fails. Local ClamAV and a protocol-level S3 test have passed; production S3 remains unverified.

`ProfileService.shippingSnapshot(userId, addressId)` returns a copy matching `packages/contracts/shipping-snapshot.schema.json`. Order Service must persist that copy in each order when it is implemented; Identity does not update past orders.

Marketing opt-in defaults to false. The authenticated data export covers Identity data. Account deletion is requested with a password and processed manually after checking the other services and their retention policy. See `docs/operations/privacy.md`.
