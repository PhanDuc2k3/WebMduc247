// Explicit local-only replacement of illustrated demo listings with generated product photos.
import { existsSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { IdentityRepository } from '../services/identity-service/src/models/identity.model.js';
import { IdentityService } from '../services/identity-service/src/services/identity.service.js';
import { loadConfig } from '../services/identity-service/src/config/env.js';
import { extraSellers } from './demo-sellers-extra.mjs';

const devEnv = fileURLToPath(new URL('../.env.development.local', import.meta.url));
const credentialsPath = fileURLToPath(new URL('../.env.demo-sellers.local', import.meta.url));
if (!existsSync(devEnv) || !existsSync(credentialsPath)) throw new Error('Missing local demo setup');
process.loadEnvFile(devEnv);
for (const key of ['IDENTITY_DATABASE_URL', 'CATALOG_DATABASE_URL']) {
  if (!['localhost', '127.0.0.1'].includes(new URL(process.env[key]).hostname)) throw new Error(`${key} must be local`);
}
if (process.env.NODE_ENV === 'production') throw new Error('Demo images cannot be changed in production');
const config = loadConfig(process.env);
if (!config.frontendOrigin.startsWith('http://localhost:')) throw new Error('Expected local frontend');
const credentials = Object.fromEntries((await readFile(credentialsPath, 'utf8')).split(/\r?\n/).filter(Boolean).map(line => {
  const index = line.indexOf('='); return [line.slice(0, index), line.slice(index + 1)];
}));
const repo = new IdentityRepository(config.databaseUrl);
const identity = new IdentityService({ repository: repo, mailer: {}, config });
const base = 'http://127.0.0.1:5102/api/v2';
async function catalog(path, method, token, body) {
  const response = await fetch(base + path, { method,
    headers: { Origin: config.frontendOrigin, Authorization: `Bearer ${token}`,
      ...(body ? { 'Content-Type': 'application/json' } : {}) },
    ...(body ? { body: JSON.stringify(body) } : {}), signal: AbortSignal.timeout(30000) });
  const data = await response.json();
  if (!response.ok) throw new Error(`${method} ${path}: HTTP ${response.status} ${data.code || data.message || ''}`);
  return data;
}
async function upload(productId, token, filename) {
  const path = new URL(`../assets/demo-products/${filename}`, import.meta.url);
  const response = await fetch(`${base}/seller/products/${productId}/images`, { method: 'POST',
    headers: { Origin: config.frontendOrigin, Authorization: `Bearer ${token}`,
      'Content-Type': 'image/png', 'X-Primary': 'true' },
    body: await readFile(path), signal: AbortSignal.timeout(30000) });
  const data = await response.json();
  if (!response.ok) throw new Error(`Upload ${filename}: HTTP ${response.status} ${data.code || data.message || ''}`);
  return data.image.id;
}
try {
  for (const [sellerIndex, seller] of extraSellers.entries()) {
    const number = sellerIndex + 4;
    if (credentials[`SELLER_${number}_EMAIL`] !== seller.email) throw new Error(`Credentials mismatch: seller ${number}`);
    const { accessToken } = await identity.login({ email: seller.email,
      password: credentials[`SELLER_${number}_PASSWORD`] }, { ip: '127.0.0.20', userAgent: 'local-demo-photo-update' });
    const stores = await catalog('/seller/stores', 'GET', accessToken);
    const store = stores.stores.find(item => item.slug === seller.store.slug);
    if (!store) throw new Error(`Store missing: ${seller.store.slug}`);
    const listing = await catalog(`/seller/stores/${store.id}/products`, 'GET', accessToken);
    for (const item of seller.products) {
      const product = listing.products.find(candidate => candidate.slug === item.slug);
      if (!product) throw new Error(`Product missing: ${item.slug}`);
      const imagePath = fileURLToPath(new URL(`../assets/demo-products/${item.image}`, import.meta.url));
      if (!existsSync(imagePath)) throw new Error(`Photo missing: ${item.image}`);
      const detail = (await catalog(`/seller/products/${product.id}`, 'GET', accessToken)).product;
      const oldIds = detail.images.map(image => image.id);
      const newId = await upload(product.id, accessToken, item.image);
      for (const imageId of oldIds) await catalog(`/seller/products/${product.id}/images/${imageId}`, 'DELETE', accessToken);
      const updated = (await catalog(`/seller/products/${product.id}`, 'GET', accessToken)).product;
      if (updated.images.length !== 1 || updated.images[0].id !== newId || !updated.imageUrl) {
        throw new Error(`Photo verification failed: ${item.slug}`);
      }
      console.log(`${seller.email} | ${item.slug} | photo live`);
    }
  }
} finally {
  await repo.close();
}
