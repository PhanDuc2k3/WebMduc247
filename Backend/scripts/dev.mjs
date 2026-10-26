import { execFileSync, spawn } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import { appendFileSync, existsSync, readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = fileURLToPath(new URL('../', import.meta.url));
const envFile = path.join(root, '.env.development.local');
const composeArgs = ['compose', '-p', 'backend-v2-dev', '--env-file', envFile, '-f', 'docker-compose.yml', '-f', 'docker-compose.dev.yml', '--profile', 'dev'];

function createDevEnv() {
  const password = randomBytes(24).toString('hex');
  const contents = [
    '# Generated local development settings. This file is ignored by Git.',
    `POSTGRES_PASSWORD=${password}`,
    `IDENTITY_DATABASE_URL=postgresql://identity:${password}@127.0.0.1:56434/identity`,
    'IDENTITY_DB_PORT=56434',
    `IDENTITY_JWT_SECRET=${randomBytes(48).toString('hex')}`,
    `IDENTITY_MAIL_KEY=${randomBytes(32).toString('base64')}`,
    'IDENTITY_PORT=5101',
    'FRONTEND_ORIGIN=http://localhost:5173',
    'REQUIRE_EMAIL_VERIFICATION=true',
    'SMTP_HOST=127.0.0.1',
    'SMTP_HOST_DOCKER=identity-mail',
    'SMTP_PORT=1026',
    'SMTP_PORT_DOCKER=1025',
    'SMTP_SECURE=false',
    'SMTP_USER=local-user',
    'SMTP_PASSWORD=local-password',
    'MAIL_FROM=no-reply@example.test',
    '',
  ].join('\n');
  writeFileSync(envFile, contents, { mode: 0o600, flag: 'wx' });
  console.log('Created .env.development.local for the isolated development database.');
}

function readDevEnv() {
  const values = {};
  for (const line of readFileSync(envFile, 'utf8').split(/\r?\n/)) {
    const match = /^([A-Z][A-Z0-9_]*)=(.*)$/.exec(line);
    if (match) values[match[1]] = match[2];
  }
  for (const key of ['POSTGRES_PASSWORD', 'IDENTITY_DATABASE_URL', 'IDENTITY_JWT_SECRET', 'IDENTITY_MAIL_KEY', 'FRONTEND_ORIGIN', 'SMTP_HOST', 'SMTP_PORT', 'SMTP_USER', 'SMTP_PASSWORD', 'MAIL_FROM']) {
    if (!values[key]) throw new Error(`Missing ${key} in .env.development.local`);
  }
  return values;
}

function ensureProfileDevEnv() {
  const values = readDevEnv();
  const mongoUser = values.CHAT_MONGO_USER || 'chatdev';
  const mongoPassword = values.CHAT_MONGO_PASSWORD || randomBytes(24).toString('hex');
  const notificationChatToken=values.NOTIFICATION_CHAT_TOKEN||randomBytes(32).toString('hex');
  const defaults = {
    CATALOG_DATABASE_URL: values.IDENTITY_DATABASE_URL,
    ORDER_DATABASE_URL: values.IDENTITY_DATABASE_URL,
    PAYMENT_DATABASE_URL: values.IDENTITY_DATABASE_URL,
    ENGAGEMENT_DATABASE_URL: values.IDENTITY_DATABASE_URL,
    S3_BUCKET: 'identity-avatars',
    S3_REGION: 'us-east-1',
    S3_ENDPOINT: 'http://127.0.0.1:9002',
    S3_ENDPOINT_DOCKER: 'http://identity-objects:9000',
    S3_PUBLIC_ENDPOINT: 'http://localhost:9002',
    S3_ACCESS_KEY: 'local-avatar-user',
    S3_SECRET_KEY: randomBytes(24).toString('hex'),
    S3_AUTO_CREATE_BUCKET: 'true',
    CLAMAV_HOST: '127.0.0.1',
    CLAMAV_HOST_DOCKER: 'identity-scanner',
    CLAMAV_PORT: '3311',
    CLAMAV_PORT_DOCKER: '3310',
    PHONE_OTP_MODE: 'email',
    CATALOG_SYNC_SECRET: randomBytes(32).toString('hex'),
    INVENTORY_INTERNAL_TOKEN: randomBytes(32).toString('hex'),
    ORDER_DELIVERY_TOKEN: randomBytes(32).toString('hex'),
    ORDER_PAYMENT_TOKEN: randomBytes(32).toString('hex'),
    PAYMENT_INTERNAL_TOKEN: randomBytes(32).toString('hex'),
    PAYMENT_SETTLEMENT_TOKEN: randomBytes(32).toString('hex'),
    PROMOTION_INTERNAL_TOKEN: randomBytes(32).toString('hex'),
    CHAT_ORDER_TOKEN: randomBytes(32).toString('hex'),
    CHAT_ATTACHMENT_SECRET: randomBytes(32).toString('hex'),
    CHAT_MONGO_USER: mongoUser,
    CHAT_MONGO_PASSWORD: mongoPassword,
    CHAT_MONGO_URL: `mongodb://${mongoUser}:${mongoPassword}@127.0.0.1:27018/mduc247_chat?authSource=admin`,
    CHAT_PUBLIC_URL: 'http://localhost:5106',
    CHAT_PORT: '5106',
    CHAT_RETENTION_DAYS: '365',
    NOTIFICATION_ORDER_TOKEN: randomBytes(32).toString('hex'),
    NOTIFICATION_PAYMENT_TOKEN: randomBytes(32).toString('hex'),
    NOTIFICATION_CHAT_TOKEN: notificationChatToken,
    NOTIFICATION_IDENTITY_TOKEN: randomBytes(32).toString('hex'),
    IDENTITY_EVENT_WEBHOOK_TOKEN: randomBytes(32).toString('hex'),
    IDENTITY_EVENT_WEBHOOK_URL: 'http://127.0.0.1:5105/api/v2/internal/notifications/identity-events',
    NOTIFICATION_ADMIN_TOKEN: randomBytes(32).toString('hex'),
    ORDER_NOTIFICATION_WEBHOOK_URL: 'http://127.0.0.1:5105/api/v2/internal/notifications/order-events',
    PAYMENT_NOTIFICATION_WEBHOOK_URL: 'http://127.0.0.1:5105/api/v2/internal/notifications/payment-events',
    CHAT_NOTIFICATION_WEBHOOK_URL: 'http://127.0.0.1:5105/api/v2/internal/notifications/chat-events',
    CHAT_NOTIFICATION_WEBHOOK_TOKEN: notificationChatToken,
    PAYMENT_PORT: '5104',
    ENGAGEMENT_PORT: '5105',
  };
  const lines = Object.entries(defaults).filter(([key]) => !values[key]).map(([key, value]) => `${key}=${value}`);
  if (lines.length) appendFileSync(envFile, `\n# User & Profile local development\n${lines.join('\n')}\n`);
}

function run(command, args, env) {
  execFileSync(command, args, { cwd: root, env, stdio: 'inherit' });
}

if (!existsSync(envFile) && process.argv.includes('--stop')) {
  console.log('No development environment to stop.');
  process.exit(0);
}
if (!existsSync(envFile)) createDevEnv();
ensureProfileDevEnv();
const env = { ...process.env, REQUIRE_EMAIL_VERIFICATION: 'true', ...readDevEnv() };
if (env.CHAT_MONGO_URL === 'mongodb://127.0.0.1:27018/mduc247_chat') {
  env.CHAT_MONGO_URL = `mongodb://${env.CHAT_MONGO_USER}:${env.CHAT_MONGO_PASSWORD}@127.0.0.1:27018/mduc247_chat?authSource=admin`;
}

let chatMongoAvailable = false;
try {
  if (process.argv.includes('--stop')) {
    run('docker', [...composeArgs, 'down'], env);
    process.exit(0);
  }
  if (process.argv.includes('--check')) {
    console.log('Development configuration is ready.');
    process.exit(0);
  }
  const useMailpit = env.SMTP_HOST_DOCKER === 'identity-mail';
  console.log(`Starting isolated PostgreSQL${useMailpit ? ' and Mailpit' : ''} containers...`);
  run('docker', [...composeArgs, 'up', '-d', '--wait', 'identity-db', ...(useMailpit ? ['identity-mail'] : [])], env);
  try { run('docker', [...composeArgs, 'up', '-d', '--wait', 'chat-mongo'], env); chatMongoAvailable = true; }
  catch { console.warn('MongoDB is unavailable; Chat Service will be skipped. Core services can continue.'); }
  try { run('docker', [...composeArgs, 'up', '-d', '--wait', 'identity-objects'], env); }
  catch { env.S3_BUCKET = ''; console.warn('MinIO is unavailable; avatar uploads will use private local development storage.'); }
  try { run('docker', [...composeArgs, 'up', '-d', 'identity-scanner'], env); }
  catch { env.CLAMAV_HOST = ''; console.warn('ClamAV is unavailable; avatar upload will remain disabled.'); }
  console.log('Nodemon will apply pending migrations before starting Identity Service.');
  run(process.execPath, ['services/catalog-service/scripts/migrate.js'], env);
  run(process.execPath, ['services/order-service/scripts/migrate.js'], env);
  run(process.execPath, ['services/payment-service/scripts/migrate.js'], env);
  run(process.execPath, ['services/engagement-service/scripts/migrate.js'], env);
} catch (error) {
  console.error('Could not start development dependencies. Start Docker Desktop and check ports 56434, 1026, 8025, 9002, 9003 and 3311.');
  process.exit(error.status || 1);
}

console.log('Starting Identity Service with nodemon on http://localhost:5101');
const nodemon = spawn(process.execPath, ['node_modules/nodemon/bin/nodemon.js', '--config', 'nodemon.json'], { cwd: root, env, stdio: 'inherit' });
const catalog = spawn(process.execPath, ['node_modules/nodemon/bin/nodemon.js', '--config', 'nodemon.catalog.json'], { cwd: root, env, stdio: 'inherit' });
const order = spawn(process.execPath, ['node_modules/nodemon/bin/nodemon.js', '--config', 'nodemon.order.json'], { cwd: root, env, stdio: 'inherit' });
const payment = spawn(process.execPath, ['node_modules/nodemon/bin/nodemon.js', '--config', 'nodemon.payment.json'], { cwd: root, env, stdio: 'inherit' });
const engagement = spawn(process.execPath, ['node_modules/nodemon/bin/nodemon.js', '--config', 'nodemon.engagement.json'], { cwd: root, env, stdio: 'inherit' });
const chat = chatMongoAvailable ? spawn(process.execPath,
  ['node_modules/nodemon/bin/nodemon.js', '--config', 'nodemon.chat.json'],
  { cwd: root, env, stdio: 'inherit' }) : null;
nodemon.on('error', error => { console.error('Could not start nodemon:', error.message); process.exitCode = 1; });
nodemon.on('exit', code => { process.exitCode = code ?? 0; });
catalog.on('error', error => { console.error('Could not start catalog:', error.message); process.exitCode = 1; });
catalog.on('exit', code => { process.exitCode = code ?? 0; });
order.on('error', error => { console.error('Could not start order:', error.message); process.exitCode = 1; });
order.on('exit', code => { process.exitCode = code ?? 0; });
payment.on('error', error => { console.error('Could not start payment:', error.message); process.exitCode = 1; });
payment.on('exit', code => { process.exitCode = code ?? 0; });
engagement.on('error', error => { console.error('Could not start engagement:', error.message); process.exitCode = 1; });
engagement.on('exit', code => { process.exitCode = code ?? 0; });
chat?.on('error', error => { console.error('Could not start Chat Service:', error.message); });
chat?.on('exit', code => { if (code) console.error('Chat Service exited with code', code); });
