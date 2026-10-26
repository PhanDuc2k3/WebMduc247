// Nodemon restarts this entrypoint when service code or migrations change.
// Applying pending migrations before opening the HTTP listener keeps the
// running API and the local development database on the same schema version.
await import('./migrate.js');
await import('../src/server.js');
