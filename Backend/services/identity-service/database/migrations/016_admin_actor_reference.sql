-- Keep a stable audit actor reference if the Identity record is later erased after privacy review.
ALTER TABLE platform_admin_actions ADD COLUMN actor_reference uuid;
UPDATE platform_admin_actions SET actor_reference=actor_id WHERE actor_id IS NOT NULL;
