// Explicit development data setup. Never run automatically with service startup.
import { randomBytes } from 'node:crypto';
import { existsSync } from 'node:fs';
import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { IdentityRepository } from '../services/identity-service/src/models/identity.model.js';
import { IdentityService } from '../services/identity-service/src/services/identity.service.js';
import { loadConfig } from '../services/identity-service/src/config/env.js';
import { extraSellers } from './demo-sellers-extra.mjs';

const devEnv = fileURLToPath(new URL('../.env.development.local', import.meta.url));
const credentialsPath = fileURLToPath(new URL('../.env.demo-sellers.local', import.meta.url));
const userDocPath = fileURLToPath(new URL('../../user.md', import.meta.url));
if (!existsSync(devEnv)) throw new Error('Missing .env.development.local');
process.loadEnvFile(devEnv);
for (const key of ['IDENTITY_DATABASE_URL', 'CATALOG_DATABASE_URL']) {
  const host = new URL(process.env[key]).hostname;
  if (!['localhost', '127.0.0.1'].includes(host)) throw new Error(`${key} must point to the local dev database`);
}
if (process.env.NODE_ENV === 'production') throw new Error('Demo sellers cannot be created in production');
const config = loadConfig(process.env);
if (!config.frontendOrigin.startsWith('http://localhost:')) throw new Error('Expected the local frontend origin');

const samples = [
  { email: 'seller-demo-1@example.test', fullName: 'Người bán mẫu Công Nghệ', categorySlug: 'electronics',
    store: { name: 'Gian hàng Công Nghệ Mẫu', slug: 'gian-hang-cong-nghe-mau', category: 'Điện tử',
      description: 'Cửa hàng mẫu phục vụ kiểm thử trên môi trường phát triển.' },
    products: [
      { title: 'Tai nghe Bluetooth mẫu', slug: 'tai-nghe-bluetooth-mau', brand: 'MDUC247 Demo',
        description: 'Tai nghe không dây mẫu dùng để kiểm thử gian hàng và giỏ hàng.', priceMinor: 399000, stock: 20, image: 'tai-nghe-bluetooth-mau.png' },
      { title: 'Bàn phím cơ RGB mẫu', slug: 'ban-phim-co-rgb-mau', brand: 'MDUC247 Demo',
        description: 'Bàn phím cơ nhỏ gọn với đèn RGB, sản phẩm thử nghiệm.', priceMinor: 899000, stock: 12, image: 'ban-phim-co-rgb-mau.png' },
      { title: 'Loa Bluetooth mini mẫu', slug: 'loa-bluetooth-mini-mau', brand: 'MDUC247 Demo',
        description: 'Loa Bluetooth nhỏ gọn, sản phẩm thử nghiệm.', priceMinor: 429000, stock: 18, image: 'loa-bluetooth-mini-mau.png' },
    ] },
  { email: 'seller-demo-2@example.test', fullName: 'Người bán mẫu Thời Trang', categorySlug: 'fashion',
    store: { name: 'Gian hàng Thời Trang Mẫu', slug: 'gian-hang-thoi-trang-mau', category: 'Thời trang',
      description: 'Cửa hàng mẫu phục vụ kiểm thử trên môi trường phát triển.' },
    products: [
      { title: 'Áo thun cotton mẫu', slug: 'ao-thun-cotton-mau', brand: 'MDUC247 Demo',
        description: 'Áo thun cotton màu kem, sản phẩm thử nghiệm.', priceMinor: 159000, stock: 25, image: 'ao-thun-cotton-mau.png' },
      { title: 'Áo khoác denim mẫu', slug: 'ao-khoac-denim-mau', brand: 'MDUC247 Demo',
        description: 'Áo khoác denim màu xanh cổ điển, sản phẩm thử nghiệm.', priceMinor: 499000, stock: 14, image: 'ao-khoac-denim-mau.png' },
      { title: 'Túi tote canvas mẫu', slug: 'tui-tote-canvas-mau', brand: 'MDUC247 Demo',
        description: 'Túi tote vải canvas màu tự nhiên, sản phẩm thử nghiệm.', priceMinor: 129000, stock: 30, image: 'tui-tote-canvas-mau.png' },
    ] },
  { email: 'seller-demo-3@example.test', fullName: 'Người bán mẫu Gia Dụng', categorySlug: 'home',
    store: { name: 'Gian hàng Gia Dụng Mẫu', slug: 'gian-hang-gia-dung-mau', category: 'Nhà cửa',
      description: 'Cửa hàng mẫu phục vụ kiểm thử trên môi trường phát triển.' },
    products: [
      { title: 'Bình giữ nhiệt mẫu', slug: 'binh-giu-nhiet-mau', brand: 'MDUC247 Demo',
        description: 'Bình giữ nhiệt màu xanh rêu, sản phẩm thử nghiệm.', priceMinor: 189000, stock: 15, image: 'binh-giu-nhiet-mau.png' },
      { title: 'Đèn bàn LED mẫu', slug: 'den-ban-led-mau', brand: 'MDUC247 Demo',
        description: 'Đèn bàn LED màu trắng có thể điều chỉnh, sản phẩm thử nghiệm.', priceMinor: 259000, stock: 16, image: 'den-ban-led-mau.png' },
      { title: 'Bộ hộp thủy tinh mẫu', slug: 'hop-thuy-tinh-mau', brand: 'MDUC247 Demo',
        description: 'Bộ ba hộp đựng thực phẩm bằng thủy tinh, sản phẩm thử nghiệm.', priceMinor: 219000, stock: 24, image: 'hop-thuy-tinh-mau.png' },
    ] },
  ...extraSellers,
];

const credentials = existsSync(credentialsPath)
  ? Object.fromEntries((await readFile(credentialsPath, 'utf8')).split(/\r?\n/).filter(Boolean).map(line => {
      const index = line.indexOf('=');
      return [line.slice(0, index), line.slice(index + 1)];
    }))
  : {};
for (const [index, sample] of samples.entries()) {
  const prefix = `SELLER_${index + 1}`;
  if (credentials[`${prefix}_EMAIL`] && credentials[`${prefix}_EMAIL`] !== sample.email) {
    throw new Error('Existing demo seller credentials file does not match the expected accounts');
  }
  if (!credentials[`${prefix}_EMAIL`]) credentials[`${prefix}_EMAIL`] = sample.email;
  if (!credentials[`${prefix}_PASSWORD`]) credentials[`${prefix}_PASSWORD`] = `${randomBytes(15).toString('base64url')}a!`;
}

const repo = new IdentityRepository(config.databaseUrl);
const verificationTokens = new Map();
const identity = new IdentityService({ repository: repo,
  mailer: { verification: async (email, token) => verificationTokens.set(email, token) }, config });
const context = { ip: '127.0.0.20', userAgent: 'local-demo-data-setup' };
const catalogBase = 'http://127.0.0.1:5102/api/v2';
const reports = [];
async function catalog(path, method, token, body) {
  const response = await fetch(`${catalogBase}${path}`, {
    method,
    headers: { Origin: config.frontendOrigin, Authorization: `Bearer ${token}`,
      ...(body ? { 'Content-Type': 'application/json' } : {}) },
    ...(body ? { body: JSON.stringify(body) } : {}),
    signal: AbortSignal.timeout(10000),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(`Catalog ${method} ${path}: HTTP ${response.status} ${data.code || data.message || ''}`);
  return data;
}
async function uploadProductImage(productId, token, filename) {
  const imagePath = fileURLToPath(new URL(`../assets/demo-products/${filename}`, import.meta.url));
  const response = await fetch(`${catalogBase}/seller/products/${productId}/images`, {
    method: 'POST',
    headers: { Origin: config.frontendOrigin, Authorization: `Bearer ${token}`,
      'Content-Type': 'image/png', 'X-Primary': 'true' },
    body: await readFile(imagePath),
    signal: AbortSignal.timeout(30000),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(`Image upload ${filename}: HTTP ${response.status} ${data.code || data.message || ''}`);
}
async function ensureCategories() {
  const specs = [
    ['electronics', 'Điện tử'], ['fashion', 'Thời trang'], ['home', 'Gia dụng'],
    ['beauty', 'Làm đẹp'], ['sports', 'Thể thao'], ['food', 'Thực phẩm'], ['books', 'Sách'],
  ];
  const response = await fetch(`${catalogBase}/categories`);
  if (!response.ok) throw new Error('Cannot read Catalog categories');
  const existing = (await response.json()).categories;
  const ids = new Map(existing.map(item => [item.slug, item.id]));
  for (const [index, [slug, name]] of specs.entries()) {
    if (ids.has(slug)) continue;
    const created = await fetch(`${catalogBase}/internal/categories`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Catalog-Secret': config.catalogSyncSecret },
      body: JSON.stringify({ slug, name, sortOrder: index }),
      signal: AbortSignal.timeout(10000),
    });
    const data = await created.json();
    if (!created.ok) throw new Error(`Category ${slug}: HTTP ${created.status} ${data.code || data.message || ''}`);
    ids.set(slug, data.category.id);
  }
  return ids;
}

try {
  // Fail before writing credentials or creating any account if another user already owns one of these emails.
  const storedCredentials = existsSync(credentialsPath)
    ? await readFile(credentialsPath, 'utf8') : '';
  for (const [index, sample] of samples.entries()) {
    if (!storedCredentials.includes(`SELLER_${index + 1}_EMAIL=`) && await repo.userByEmail(sample.email)) {
      throw new Error(`Account already exists without saved credentials: ${sample.email}`);
    }
  }
  const credentialText = Object.entries(credentials).map(([key, value]) => `${key}=${value}`).join('\n') + '\n';
  if (credentialText !== storedCredentials) {
    await writeFile(credentialsPath, credentialText, { flag: storedCredentials ? 'w' : 'wx', mode: 0o600 });
  }
  const categoryIds = await ensureCategories();
  for (const [index, sample] of samples.entries()) {
    const password = credentials[`SELLER_${index + 1}_PASSWORD`];
    let user = await repo.userByEmail(sample.email);
    if (!user) {
      await identity.register({ email: sample.email, fullName: sample.fullName,
        password, confirmPassword: password }, context);
      await identity.verifyEmail({ email: sample.email, token: verificationTokens.get(sample.email) }, context);
      user = await repo.userByEmail(sample.email);
    }
    if (!user.email_verified_at) throw new Error(`Email is not verified: ${sample.email}`);
    const { accessToken } = await identity.login({ email: sample.email, password }, context);
    const mine = await catalog('/seller/stores', 'GET', accessToken);
    let store = mine.stores.find(item => item.slug === sample.store.slug);
    if (!store) {
      store = (await catalog('/seller/stores', 'POST', accessToken, {
        ...sample.store, contactEmail: sample.email, contactPhone: `000000000${index + 1}`,
        pickupAddress: 'Địa chỉ thử nghiệm - không giao hàng thật',
      })).store;
    }
    // The regular Catalog outbox also syncs this projection; this makes setup immediately usable.
    await repo.syncStoreMembership(user.id, store.id, true);
    const meResponse = await fetch('http://127.0.0.1:5101/api/v2/auth/me', {
      headers: { Authorization: `Bearer ${accessToken}` }, signal: AbortSignal.timeout(10000),
    });
    const me = await meResponse.json();
    if (!meResponse.ok || !me.user?.roles?.includes('seller')) throw new Error(`Seller API role missing: ${sample.email}`);
    const listing = await catalog(`/seller/stores/${store.id}/products`, 'GET', accessToken);
    const reportedProducts = [];
    for (const sampleProduct of sample.products) {
      let product = listing.products.find(item => item.slug === sampleProduct.slug);
      const categoryId = categoryIds.get(sample.categorySlug);
      if (!product) {
        const { image, icon, ...input } = sampleProduct;
        product = (await catalog(`/seller/stores/${store.id}/products`, 'POST', accessToken, { ...input, categoryId })).product;
      }
      if (product.categoryId !== categoryId) product = (await catalog(`/seller/products/${product.id}`, 'PATCH', accessToken, { categoryId })).product;
      if (product.status !== 'active') product = (await catalog(`/seller/products/${product.id}/publish`, 'POST', accessToken, {})).product;
      if (!product.images?.length) await uploadProductImage(product.id, accessToken, sampleProduct.image);
      const publicProduct = await catalog(`/products/${product.id}`, 'GET', accessToken);
      if (!publicProduct.product?.imageUrl) throw new Error(`Image is not public for ${sampleProduct.slug}`);
      reportedProducts.push({ ...sampleProduct, id: product.id,
        priceMinor: publicProduct.product.priceMinor, stock: publicProduct.product.stock });
      console.log(`${sample.email} | ${store.slug} | ${sampleProduct.slug} | image ready`);
    }
    if (!(await repo.sellerMember(user.id, store.id))) throw new Error(`Seller role missing: ${sample.email}`);
    const publicStore = await catalog(`/stores/${store.slug}`, 'GET', accessToken);
    const publicProducts = await catalog(`/stores/${store.slug}/products`, 'GET', accessToken);
    if (publicStore.store.productCount < sample.products.length ||
      sample.products.some(item => !publicProducts.products.some(product => product.slug === item.slug && product.imageUrl))) {
      throw new Error(`${sample.products.length} pictured products are not visible for ${store.slug}`);
    }
    console.log(`${sample.email} | seller | ${store.slug} | ${publicProducts.products.length} public products`);
    reports.push({ sample, store, products: reportedProducts, password });
  }
  const document = [
    `# ${reports.length} tài khoản seller thử nghiệm`,
    '',
    `Đăng nhập tại [MDUC247 local](http://localhost:5173/login). File này chứa mật khẩu dạng rõ chữ và được Git bỏ qua. Dữ liệu được đối chiếu ngày ${new Intl.DateTimeFormat('vi-VN', { timeZone: 'Asia/Bangkok' }).format(new Date())}.`,
    '',
    '| Tài khoản | Mật khẩu | Cửa hàng | Sản phẩm đã đăng bán |',
    '| --- | --- | --- | --- |',
    ...reports.map(({ sample, store, password }) => `| \`${sample.email}\` | \`${password}\` | [${store.name}](http://localhost:5173/store/${store.slug}) | ${sample.products.length} sản phẩm có ảnh |`),
    '',
    ...reports.flatMap(({ sample, store, products, password }, index) => [
      `## Tài khoản ${index + 1} — ${store.name}`,
      '',
      `- **Tên hiển thị:** ${sample.fullName}`,
      `- **Email đăng nhập:** \`${sample.email}\``,
      `- **Mật khẩu:** \`${password}\``,
      '- **Trạng thái:** `active`; email đã được đánh dấu xác minh trong dev',
      '- **Quyền:** `buyer`, `seller`; chủ sở hữu (`owner`) cửa hàng',
      `- **Cửa hàng:** [${store.name}](http://localhost:5173/store/${store.slug}) — \`${store.slug}\``,
      `- **Store ID:** \`${store.id}\``,
      '',
      '| Sản phẩm | Giá | Tồn khả dụng | Ảnh nguồn |',
      '| --- | ---: | ---: | --- |',
      ...products.map(item => `| [${item.title}](http://localhost:5173/products/${item.id}) | ${item.priceMinor.toLocaleString('vi-VN')}₫ | ${item.stock} | [Xem ảnh](Backend/assets/demo-products/${item.image}) |`),
      '',
    ]),
    'Các email `@example.test` không nhận được thư thật. Chúng phù hợp để thử đăng nhập, quản lý cửa hàng và sản phẩm; không dùng để nghiệm thu OTP email hoặc quên mật khẩu. Tồn kho có thể thay đổi sau khi mua thử.',
    '',
    'Ảnh của 70 sản phẩm thuộc bảy gian hàng mới là ảnh sản phẩm chân thực do AI tạo để minh họa đúng loại vật phẩm; không phải ảnh chụp hàng hóa thực tế.',
    '',
  ].join('\n');
  await writeFile(userDocPath, document, 'utf8');
  console.log(`Credentials saved in ${credentialsPath}`);
  console.log(`Demo account summary saved in ${userDocPath}`);
} finally {
  await repo.close();
}
