import http from 'node:http';
import { createHmac } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import nodemailer from 'nodemailer';
import { loadConfig } from './config/env.js';
import { IdentityRepository } from './models/identity.model.js';
import { ProfileRepository } from './models/profile.model.js';
import { createRequestHandler } from './routes/index.js';
import { IdentityService } from './services/identity.service.js';
import { createMailQueue } from './services/mail-queue.service.js';
import { ProfileService } from './services/profile.service.js';
import { AvatarStorage } from './services/avatar-storage.service.js';
import { LocalAvatarStorage } from './services/local-avatar-storage.service.js';
import { scanWithClamAv } from './services/clam-scanner.service.js';
import { createPhoneSender } from './services/phone-sender.service.js';
import {UserAdminService} from './services/user-admin.service.js';
import {UserAdminWorker} from './services/user-admin.worker.js';

const config = loadConfig();
const repo = new IdentityRepository(config.databaseUrl);
const schema = await repo.pool.query("SELECT to_regclass('public.user_profiles') AS profiles, to_regclass('public.user_preferences') AS preferences, to_regclass('public.addresses') AS addresses");
if (!schema.rows[0].profiles || !schema.rows[0].preferences || !schema.rows[0].addresses) {
  await repo.close();
  throw new Error('Identity database schema is incomplete. Run npm run identity:migrate before starting the API.');
}
const transport = nodemailer.createTransport({
  host: config.smtp.host,
  port: config.smtp.port,
  secure: config.smtp.secure,
  auth: { user: config.smtp.user, pass: config.smtp.password },
});
const mailer = createMailQueue(repo, transport, {
  key: config.mailKey,
  from: config.smtp.from,
  frontendOrigin: config.frontendOrigin,
});
const service = new IdentityService({ repository: repo, mailer, config });
let avatarStorage = config.objectStorage ? new AvatarStorage(config.objectStorage) : null;
if (avatarStorage) {
  try { await avatarStorage.ensureBucket(); }
  catch (error) {
    if (process.env.NODE_ENV === 'production') throw new Error('Avatar storage unavailable at startup', { cause: error });
    console.warn('Avatar storage unavailable at startup'); avatarStorage = null;
  }
}
if (!avatarStorage && process.env.NODE_ENV !== 'production') {
  const directory = fileURLToPath(new URL('../../../.local-avatars/', import.meta.url));
  avatarStorage = new LocalAvatarStorage(directory);
  console.warn('Using private local avatar storage for development.');
}
const profileService = new ProfileService({
  repository: new ProfileRepository(repo),
  identityService: service,
  avatarStorage,
  scanner: config.scanner ? buffer => scanWithClamAv(buffer, config.scanner) : null,
  phoneSender: createPhoneSender(config.phoneSender, transport),
  otpKey: createHmac('sha256', config.jwtSecret).update('phone-otp-v1').digest(),
});
const server = http.createServer(createRequestHandler(service, profileService, config));
const userWorker=new UserAdminWorker(new UserAdminService(service,profileService,config));
const runUserWorker=()=>userWorker.run().catch(()=>console.error('User administration worker failed'));
void runUserWorker();const userTimer=setInterval(runUserWorker,30000);

server.listen(config.port, () => console.log(`Identity service listening on ${config.port}`));
const mailTimer = setInterval(() => repo.deliverEmails(mailer.deliver).catch(() => console.error('Email delivery worker failed')), 5000);
let publishing = false;
const eventTimer = setInterval(() => {
  if (publishing || !config.eventWebhookUrl) return;
  publishing = true;
  (async () => { for (let i = 0; i < 10; i++) if (!(await repo.publishEvents(config.eventWebhookUrl, config.eventWebhookToken))) break; })()
    .catch(() => console.error('Identity event delivery worker failed'))
    .finally(() => { publishing = false; });
}, 1000);
const cleanupTimer = setInterval(() => repo.cleanupRateLimits().catch(() => console.error('Rate limit cleanup failed')), 3600_000);
process.on('SIGTERM', async () => {
  clearInterval(mailTimer);
  clearInterval(eventTimer);
  clearInterval(cleanupTimer);
  clearInterval(userTimer);
  server.close();
  await repo.close();
});
