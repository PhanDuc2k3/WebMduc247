await import('./migrate.js');
const { startServer } = await import('../src/server.js');
await startServer();
