# Identity database

Run `npm run identity:migrate` from `Backend` with `IDENTITY_DATABASE_URL` set. The runner records applied SQL files in `schema_migrations` and applies new files in filename order within transactions.

The Identity Service owns its tables. `store_memberships` is an authorization projection keyed by `store_id`; Catalog owns store records and synchronizes memberships through the secret-protected internal endpoint. Never expose direct membership or role writes in public auth APIs.

`database/seeds/001_seed_roles.sql` documents that Buyer is assigned during registration and Seller is granted during trusted onboarding. No production user or password seed is included.
