const required = (env, key) => {
  const value = env[key];
  if (!value) throw new Error(`Missing ${key}`);
  return value;
};

export function loadConfig(env = process.env) {
  if (env.REQUIRE_EMAIL_VERIFICATION === 'false') throw new Error('Email verification is required; remove REQUIRE_EMAIL_VERIFICATION=false');
  const config = {
    port: Number(env.IDENTITY_PORT || 5101),
    databaseUrl: required(env, 'IDENTITY_DATABASE_URL'),
    jwtSecret: required(env, 'IDENTITY_JWT_SECRET'),
    issuer: 'identity-service',
    audience: 'backend-v2',
    frontendOrigin: required(env, 'FRONTEND_ORIGIN'),
    refreshDays: Number(env.REFRESH_DAYS || 30),
    loginLimit: Number(env.LOGIN_LIMIT || 5),
    emailVerificationRequired: true,
    secureCookie: env.NODE_ENV === 'production',
    mailKey: Buffer.from(required(env, 'IDENTITY_MAIL_KEY'), 'base64'),
    trustedProxyIp: env.TRUSTED_PROXY_IP || null,
    catalogSyncSecret: env.CATALOG_SYNC_SECRET || null,
    adminAuthorizationToken: env.ADMIN_AUTHORIZATION_TOKEN || null,
    notificationIdentityToken: env.NOTIFICATION_IDENTITY_TOKEN || null,
    eventWebhookUrl: env.IDENTITY_EVENT_WEBHOOK_URL || null,
    eventWebhookToken: env.IDENTITY_EVENT_WEBHOOK_TOKEN || null,
    smtp: {
      host: required(env, 'SMTP_HOST'),
      port: Number(env.SMTP_PORT || 587),
      secure: env.SMTP_SECURE === 'true',
      user: required(env, 'SMTP_USER'),
      password: required(env, 'SMTP_PASSWORD'),
      from: required(env, 'MAIL_FROM'),
    },
    objectStorage: env.S3_BUCKET && env.S3_ACCESS_KEY && env.S3_SECRET_KEY ? {
      bucket: env.S3_BUCKET,
      region: env.S3_REGION || 'us-east-1',
      endpoint: env.S3_ENDPOINT || null,
      publicEndpoint: env.S3_PUBLIC_ENDPOINT || null,
      accessKey: env.S3_ACCESS_KEY,
      secretKey: env.S3_SECRET_KEY,
      autoCreateBucket: env.S3_AUTO_CREATE_BUCKET === 'true',
    } : null,
    scanner: env.CLAMAV_HOST ? { host: env.CLAMAV_HOST, port: Number(env.CLAMAV_PORT || 3310) } : null,
    phoneSender: {
      mode: env.PHONE_OTP_MODE || 'email',
      webhookUrl: env.SMS_WEBHOOK_URL || null,
      webhookToken: env.SMS_WEBHOOK_TOKEN || null,
      mailFrom: env.MAIL_FROM,
      nodeEnv: env.NODE_ENV || 'development',
    },
  };
  if (config.jwtSecret.length < 32 || !Number.isInteger(config.loginLimit) || config.loginLimit < 1 || !Number.isInteger(config.refreshDays) || config.refreshDays < 1 || !Number.isInteger(config.port) || config.port < 1) throw new Error('Invalid identity configuration');
  if (config.mailKey.length !== 32) throw new Error('IDENTITY_MAIL_KEY must decode to 32 bytes');
  if (config.secureCookie && !config.frontendOrigin.startsWith('https://')) throw new Error('Production FRONTEND_ORIGIN must use HTTPS');
  if (!['disabled', 'email', 'sms-webhook'].includes(config.phoneSender.mode)) throw new Error('Invalid PHONE_OTP_MODE');
  if (config.phoneSender.mode === 'sms-webhook' && (!config.phoneSender.webhookUrl || !config.phoneSender.webhookToken)) throw new Error('SMS webhook URL and token are required');
  if (env.NODE_ENV === 'production' && !config.objectStorage) throw new Error('Production avatar storage is required');
  if (env.NODE_ENV === 'production' && !config.scanner) throw new Error('Production ClamAV scanner is required');
  if (env.NODE_ENV === 'production' && config.objectStorage?.publicEndpoint && !config.objectStorage.publicEndpoint.startsWith('https://')) throw new Error('Production S3_PUBLIC_ENDPOINT must use HTTPS');
  if (env.NODE_ENV === 'production' && config.phoneSender.mode === 'sms-webhook' && !config.phoneSender.webhookUrl.startsWith('https://')) throw new Error('Production SMS_WEBHOOK_URL must use HTTPS');
  if (config.eventWebhookUrl && !config.eventWebhookToken) throw new Error('IDENTITY_EVENT_WEBHOOK_TOKEN is required');
  if (env.NODE_ENV === 'production' && config.eventWebhookUrl && !config.eventWebhookUrl.startsWith('https://')) throw new Error('Production IDENTITY_EVENT_WEBHOOK_URL must use HTTPS');
  return config;
}
