import test from 'node:test';
import assert from 'node:assert/strict';
import { ShoppingTools } from '../src/shopping-tools.js';
import { ShoppingAssistant } from '../src/shopping-assistant.js';
import { ChatService, ChatError } from '../src/service.js';

const first = '11111111-1111-4111-8111-111111111111';
const second = '22222222-2222-4222-8222-222222222222';
const order = '33333333-3333-4333-8333-333333333333';
const item = (id, name, priceMinor) => ({ id, name, brand: null, priceMinor,
  imageUrl: 'https://img.example.test/item.webp', rating: null, reviewCount: 0,
  inStock: true, stock: 3, description: '', attributes: {}, variants: [],
  store: { name: 'Demo Shop' } });

test('search tool validates inputs and only returns public Catalog rows within budget', async () => {
  let calls = 0;
  const chat = { config: { catalogUrl: 'http://catalog.local' }, remote: async url => {
    const parsed = new URL(url);
    if (parsed.pathname.endsWith('/categories')) return { categories: [] };
    calls++;
    assert.equal(parsed.pathname, '/api/v2/products/search');
    assert.equal(parsed.searchParams.get('maxPrice'), '500000');
    assert.equal(parsed.searchParams.get('limit'), '5');
    return { total: 1, products: [item(first, 'Tai nghe Bluetooth mẫu', 399000)] };
  } };
  const tools = new ShoppingTools(chat);
  await assert.rejects(tools.execute('search_products', { query: 'tai nghe', limit: 50 }),
    error => error.code === 'INVALID_TOOL_INPUT');
  await assert.rejects(tools.execute('search_products', { query: 'tai nghe', userId: 'forged' }),
    error => error.code === 'INVALID_TOOL_INPUT');
  assert.equal(calls, 0);
  const result = await tools.execute('search_products', { query: 'tai nghe', maxPrice: 500000 });
  assert.equal(result.products[0].id, first);
  assert.deepEqual(result.sourceRefs, [`product:${first}`]);
  assert.equal(result.data.products[0].imageUrl, undefined);
});

test('details and comparison use current public product details; missing attributes stay unknown', async () => {
  const chat = { config: { catalogUrl: 'http://catalog.local' }, remote: async url => {
    const id = String(url).split('/').at(-1);
    return { product: id === first ? item(first, 'Tai nghe A', 399000) :
      { ...item(second, 'Tai nghe B', 499000), brand: 'Demo' } };
  } };
  const tools = new ShoppingTools(chat);
  const detail = await tools.execute('get_product_details', { productId: first });
  assert.equal(detail.data.inStock, true);
  const compared = await tools.execute('compare_products', { productIds: [first, second] });
  assert.equal(compared.comparison.products.length, 2);
  assert.equal(compared.comparison.rows.find(row => row.label === 'Đánh giá').values[0], 'Chưa có dữ liệu');
  await assert.rejects(tools.execute('compare_products', { productIds: [first, first] }),
    error => error.code === 'INVALID_TOOL_INPUT');
  chat.remote = async () => { throw new ChatError(404, 'PRODUCT_NOT_FOUND', 'Sản phẩm không còn hiển thị.'); };
  await assert.rejects(tools.execute('get_product_details', { productId: first }),
    error => error.code === 'PRODUCT_NOT_FOUND');
});

test('order tool derives buyerId from verified session and denies foreign orders', async () => {
  let remoteCalls = 0;
  const chat = { config: { orderUrl: 'http://order.local', orderToken: 'internal-token' },
    remote: async (url, options) => { remoteCalls++;
      assert.equal(new URL(url).searchParams.get('buyerId'), 'verified-buyer');
      assert.equal(options.headers['X-Chat-Order-Token'], 'internal-token');
      throw new ChatError(404, 'ORDER_NOT_FOUND', 'Không tìm thấy đơn của bạn.'); } };
  const tools = new ShoppingTools(chat);
  const guest = await tools.execute('get_order_status', { orderGroupId: order }, { user: null });
  assert.equal(guest.data.loginRequired, true);
  assert.equal(remoteCalls, 0);
  await assert.rejects(tools.execute('get_order_status', { orderGroupId: order, userId: 'attacker' },
    { user: { id: 'verified-buyer' } }), error => error.code === 'INVALID_TOOL_INPUT');
  await assert.rejects(tools.execute('get_order_status', { orderGroupId: order },
    { user: { id: 'verified-buyer' } }), error => error.code === 'ORDER_NOT_FOUND');
  assert.equal(remoteCalls, 1);
});

test('voucher validation returns Promotion reason and policy tool refuses unapproved facts', async () => {
  const chat = { config: { engagementUrl: 'http://engagement.local' }, remote: async () => {
    throw new ChatError(409, 'VOUCHER_MIN_SPEND', 'Đơn chưa đạt mức tối thiểu.');
  } };
  const tools = new ShoppingTools(chat);
  const voucher = await tools.execute('get_voucher_information', { code: 'SHOP20' },
    { user: { id: 'buyer' }, bearer: 'Bearer verified' });
  assert.equal(voucher.data.valid, false);
  assert.match(voucher.data.reason, /tối thiểu/);
  const policy = await tools.execute('get_platform_policy', { topic: 'warranty' });
  assert.equal(policy.data.available, false);
  assert.equal(policy.data.url, '/support');
});

test('voucher question formats real active Promotion conditions', async () => {
  const chat = new ChatService({}, { engagementUrl: 'http://engagement.local' });
  chat.remote = async () => ({ promotions: [{ campaign: { storeId: null, endsAt: new Date().toISOString() },
    voucher: { code: 'WELCOME50', discountType: 'FIXED', discountValue: 50000,
      maxDiscountMinor: null, minSpendMinor: 299000 } }] });
  const result = await chat.answer('Có voucher nào?', null, {});
  assert.match(result.reply, /WELCOME50/);
  assert.match(result.reply, /299\.000/);
});

test('Haiku tool roundtrip uses backend result, bounded calls and omits private history', async () => {
  const seen = [];
  const ai = { eligible: text => !text.includes('private-order'), createMessage: async input => {
    seen.push(structuredClone(input));
    if (seen.length === 1) return { stopReason: 'tool_use', model: 'claude-haiku-5-5',
      usage: { inputTokens: 20, outputTokens: 10 }, content: [{ type: 'tool_use', id: 'tool-1',
        name: 'search_products', input: { query: 'tai nghe', maxPrice: 500000 } }] };
    return { stopReason: 'end_turn', model: 'claude-haiku-5-5',
      usage: { inputTokens: 30, outputTokens: 12 }, content: [{ type: 'text',
        text: 'Có tai nghe phù hợp ngân sách.' }] };
  } };
  const tools = { schemas: () => [{ name: 'search_products', input_schema: { type: 'object' } }],
    execute: async () => ({ data: { products: [{ id: first, name: 'Tai nghe Bluetooth mẫu' }] },
      products: [item(first, 'Tai nghe Bluetooth mẫu', 399000)], sourceRefs: [`product:${first}`] }) };
  const assistant = new ShoppingAssistant(ai, tools);
  const response = await assistant.respond({ question: 'Tư vấn tai nghe dưới 500k', requireTool: true,
    history: [{ role: 'user', text: 'private-order 123', sourceRefs: [`order:${order}`] }] });
  assert.equal(response.products[0].id, first);
  assert.equal(response.metadata.usage.inputTokens, 50);
  assert.equal(response.metadata.toolCalls, 1);
  assert.equal(seen[0].messages.length, 1);
  assert.equal(seen[1].tools.length, 1);
  assert.equal(seen[1].messages.at(-1).content[0].tool_use_id, 'tool-1');
});

test('assistant refuses ungrounded product claims and excess tool loops', async () => {
  const bare = new ShoppingAssistant({ eligible: () => true,
    createMessage: async () => ({ stopReason: 'end_turn', content: [{ type: 'text', text: 'Invented phone' }], usage: {} }) },
  { schemas: () => [], execute: async () => { throw new Error('not called'); } });
  assert.equal(await bare.respond({ question: 'Tư vấn điện thoại', requireTool: true }), null);
  let calls = 0;
  const looping = new ShoppingAssistant({ eligible: () => true, createMessage: async () => {
    calls++; return { stopReason: 'tool_use', content: [{ type: 'tool_use', id: String(calls),
      name: 'search_products', input: { query: 'phone' } }], usage: {} };
  } }, { schemas: () => [], execute: async () => ({ data: { products: [] } }) });
  assert.equal(await looping.respond({ question: 'Tư vấn điện thoại', requireTool: true }), null);
  assert.ok(calls <= 3);
});

test('backend login requirement overrides a model claim about an order', async () => {
  let call = 0;
  const assistant = new ShoppingAssistant({ eligible: () => true, createMessage: async () => {
    call++;
    return call === 1 ? { stopReason: 'tool_use', content: [{ type: 'tool_use', id: 'order-tool',
      name: 'get_order_status', input: { orderGroupId: order } }], usage: {} } :
      { stopReason: 'end_turn', content: [{ type: 'text', text: 'Your order was delivered.' }], usage: {} };
  } }, { schemas: () => [{ name: 'get_order_status' }], execute: async () =>
    ({ data: { loginRequired: true, message: 'Vui lòng đăng nhập để tra cứu đơn.' } }) });
  const result = await assistant.respond({ question: 'Where is my order?', user: null });
  assert.equal(result.reply, 'Vui lòng đăng nhập để tra cứu đơn.');
});

test('same client message ID shares one in-flight answer', async () => {
  let answers = 0;
  const sessionId = 'aaaaaaaaaaaaaaaaaaaaaaaa';
  const repo = { bot_sessions: { findOne: async () => ({ _id: sessionId, userId: 'buyer', expiresAt: new Date(Date.now()+60000) }) },
    bot_messages: { findOne: async () => null, insertMany: async () => ({ insertedIds: { 1: 'bbbbbbbbbbbbbbbbbbbbbbbb' } }) } };
  const chat = new ChatService(repo, {});
  chat.answer = async () => { answers++; await new Promise(resolve => setTimeout(resolve, 10));
    return { reply: 'Xin chào', sourceRefs: [] }; };
  const input = { text: 'Xin chào', clientMessageId: 'client-message-123' };
  const [a,b] = await Promise.all([
    chat.botMessage({ id: 'buyer' }, sessionId, '', input, 'buyer'),
    chat.botMessage({ id: 'buyer' }, sessionId, '', input, 'buyer'),
  ]);
  assert.equal(answers, 1);
  assert.deepEqual(a,b);
  await assert.rejects(chat.botMessage({ id: 'buyer' }, sessionId, '',
    { text: 'Nội dung khác', clientMessageId: input.clientMessageId }, 'buyer'),
  error => error.code === 'IDEMPOTENCY_CONFLICT');
});

test('follow-up compares prior real products and exposes unknown ratings', async () => {
  const chat = new ChatService({}, { catalogUrl: 'http://catalog.local' });
  chat.remote = async url => ({ product: String(url).endsWith(first) ?
    item(first, 'Tai nghe A', 399000) : item(second, 'Tai nghe B', 499000) });
  const result = await chat.answer('Cái nào rẻ hơn?', null, { history: [{ role: 'bot', text: 'Hai mẫu tai nghe',
    sourceRefs: [`product:${first}`, `product:${second}`] }] });
  assert.equal(result.comparison.products.length, 2);
  assert.deepEqual(result.comparison.rows.find(row => row.label === 'Giá hiện tại').values,
    ['399.000₫', '499.000₫']);
  assert.equal(result.comparison.rows.find(row => row.label === 'Đánh giá').values[0], 'Chưa có dữ liệu');
});

test('two named products are resolved to real IDs before comparison', async () => {
  const chat = new ChatService({}, { catalogUrl: 'http://catalog.local' });
  chat.remote = async url => {
    const parsed = new URL(url);
    if (parsed.pathname.endsWith('/categories')) return { categories: [] };
    if (parsed.pathname.endsWith('/search')) {
      const q = parsed.searchParams.get('q');
      return { total: 1, products: [q.startsWith('tai nghe') ? item(first, 'Tai nghe Bluetooth mẫu', 399000) :
        item(second, 'Loa Bluetooth mini mẫu', 429000)] };
    }
    return { product: parsed.pathname.endsWith(first) ? item(first, 'Tai nghe Bluetooth mẫu', 399000) :
      item(second, 'Loa Bluetooth mini mẫu', 429000) };
  };
  const result = await chat.answer('So sánh Tai nghe Bluetooth mẫu và Loa Bluetooth mini mẫu', null, {});
  assert.deepEqual(result.comparison.products.map(product => product.id), [first, second]);
  assert.deepEqual(result.comparison.rows[0].values, ['399.000₫', '429.000₫']);
});

test('out-of-stock product is excluded from shopping results', async () => {
  const chat = { config: { catalogUrl: 'http://catalog.local' }, remote: async url => new URL(url).pathname.endsWith('/categories') ? { categories: [] } : ({
    total: 1, products: [{ ...item(first, 'Tai nghe hết hàng', 399000), inStock: false, stock: 0 }],
  }) };
  const result = await new ShoppingTools(chat).execute('search_products', { query: 'tai nghe' });
  assert.deepEqual(result.products, []);
  assert.equal(result.data.matchedCount, 0);
});

test('Claude classification timeout falls back to Catalog without a second paid call', async () => {
  let aiCalls = 0, catalogCalls = 0;
  const ai = { eligible: () => true, createMessage: async () => {
    aiCalls++; throw new DOMException('Timed out', 'TimeoutError'); } };
  const chat = new ChatService({}, { catalogUrl: 'http://catalog.local', ai });
  chat.remote = async url => {
    if (new URL(url).pathname.endsWith('/categories')) return { categories: [] };
    catalogCalls++; return { products: [item(first, 'Tai nghe Bluetooth mẫu', 399000)] };
  };
  const result = await chat.answer('Tư vấn tai nghe Bluetooth', null, {});
  assert.match(result.reply, /Catalog/);
  assert.equal(aiCalls, 1);
  assert.equal(catalogCalls, 1);
});

test('guest history and deletion enforce the bot session token', async () => {
  const sessionId = 'aaaaaaaaaaaaaaaaaaaaaaaa';
  const guestToken = 'guest-token';
  let deleted = false;
  const repo = {
    bot_sessions: { findOne: async () => ({ _id: sessionId, userId: null,
      guestTokenHash: (await import('../src/repository.js')).hashToken(guestToken),
      expiresAt: new Date(Date.now()+60000) }), deleteOne: async () => { deleted = true; } },
    bot_messages: { find: () => ({ sort() { return this; }, limit() { return this; },
      toArray: async () => [{ _id: 'bbbbbbbbbbbbbbbbbbbbbbbb', role: 'bot', text: 'Xin chào',
        sourceRefs: [], createdAt: new Date() }] }), deleteMany: async () => {} },
  };
  const chat = new ChatService(repo, {});
  await assert.rejects(chat.botHistory(null, sessionId, 'wrong'), error => error.code === 'FORBIDDEN');
  const history = await chat.botHistory(null, sessionId, guestToken);
  assert.equal(history.messages[0].text, 'Xin chào');
  await chat.deleteBotSession(null, sessionId, guestToken);
  assert.equal(deleted, true);
});
