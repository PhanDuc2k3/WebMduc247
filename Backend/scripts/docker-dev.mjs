import { spawn, spawnSync } from 'node:child_process';

const service = process.argv[2];
const scanner = 'services/identity-service/src/services/clam-scanner.service.js';
const imageValidation = 'packages/contracts/image-validation.js';
const services = {
  'identity-service': { migration: 'identity:migrate', shared: [] },
  'catalog-service': { migration: 'catalog:migrate', shared: [
    'services/identity-service/src/services/avatar-storage.service.js', scanner,
  ] },
  'order-service': { migration: 'order:migrate', shared: [scanner, imageValidation] },
  'payment-service': { migration: 'payment:migrate', shared: [] },
  'engagement-service': { migration: 'engagement:migrate', shared: [scanner, imageValidation] },
  'chat-service': { migration: null, shared: [scanner, imageValidation] },
};
const config = services[service];
if (!config) throw new Error(`Unknown Docker development service: ${service}`);

if (config.migration) {
  console.log(`[dev:${service}] Applying pending migrations once before starting`);
  const result = spawnSync('npm', ['run', config.migration], { stdio: 'inherit' });
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status || 1);
}

const paths = [`services/${service}/src`, ...config.shared];
const args = [
  'node_modules/nodemon/bin/nodemon.js', '--legacy-watch', '--polling-interval', '1000', '--delay', '500ms',
  ...paths.flatMap(item => ['--watch', item]),
  '--ext', 'js,json',
  '--exec', `${process.execPath} services/${service}/src/server.js`,
];
console.log(`[dev:${service}] Watching ${paths.join(', ')}`);
const watcher = spawn(process.execPath, args, { stdio: 'inherit' });
for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => watcher.kill(signal));
watcher.on('error', error => { console.error(`[dev:${service}] Watcher failed:`, error); process.exitCode = 1; });
watcher.on('exit', code => { process.exitCode = code ?? 1; });
