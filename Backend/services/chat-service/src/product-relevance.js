export const normalize = value => String(value || '').normalize('NFD').replace(/\p{M}/gu, '')
  .replace(/đ/gi, 'd').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim().replace(/\s+/g, ' ');

// These aliases are a conservative fallback, not a substitute for semantic intent understanding.
const types = [
  ['op lung', ['op lung', 'phone case']],
  ['tai nghe', ['tai nghe', 'headphones', 'earbuds', 'headset']],
  ['dien thoai', ['dien thoai', 'smartphone', 'smartphones', 'mobile phone', 'cell phone', 'phone', 'iphone', 'galaxy']],
  ['laptop', ['laptop', 'may tinh xach tay', 'macbook']],
  ['ban phim', ['ban phim', 'keyboard']],
  ['loa', ['loa', 'speaker']],
  ['sach', ['sach', 'book', 'books']],
  ['ao thun', ['ao thun', 't shirt', 'tshirt']],
  ['giay', ['giay', 'shoes', 'sneakers']],
];
const contains = (text, phrase) => ` ${normalize(text)} `.includes(` ${normalize(phrase)} `);
export function productType(value) {
  return types.find(([, aliases]) => aliases.some(alias => contains(value, alias)))?.[0] || '';
}
const categoryAliases = [
  ['dien tu', ['dien tu', 'electronics']], ['thoi trang', ['thoi trang', 'fashion']],
  ['gia dung', ['gia dung', 'nha cua doi song', 'home']], ['lam dep', ['lam dep', 'beauty']],
  ['the thao', ['the thao', 'sports']], ['thuc pham', ['thuc pham', 'food']], ['sach', ['sach', 'books']],
];
export function categoryType(value) {
  return categoryAliases.find(([, aliases]) => aliases.some(alias => contains(value, alias)))?.[0] || '';
}
export function categoryBrowseType(value) {
  const text = normalize(value);
  const category = categoryAliases.find(([, aliases]) => aliases.some(alias => contains(text, alias)));
  if (!category) return '';
  const alias = category[1].find(item => contains(text, item));
  const rest = ` ${text} `.replace(` ${alias} `, ' ')
    .replace(/\b(san pham|thiet bi|vui long|giup|hien co|cho|toi|minh|ban|xem|mot|so|cac|vai|duoc|khong|nhe|tim|muon|mua|do|hang|\d+)\b/g, ' ').trim();
  return rest ? '' : category[0];
}
export function sameProductType(item, type, categoryVerified = false) {
  if (!type) return true;
  const title = normalize(item.name || item.title);
  const actual = productType(title);
  if (type === 'dien thoai' && /\b(op lung|bao da|cuong luc|gia do|cap sac|sach|book|do choi|mo hinh)\b/.test(title)) return false;
  if (type === 'laptop' && /\b(tui|balo|gia do|de tan nhiet|sach|book)\b/.test(title)) return false;
  if (categoryVerified && !types.some(([specificType]) => specificType === type)) return true;
  return actual === type || (!actual && (categoryVerified || contains(title, type)));
}
export function flattenCategories(categories, result = [], depth = 0, ancestors = []) {
  if (!Array.isArray(categories) || depth > 8) throw new Error('Invalid category response');
  for (const category of categories.slice(0, 200)) {
    if (result.length >= 500) throw new Error('Too many categories');
    if (!category || typeof category.name !== 'string' || typeof category.id !== 'string') throw new Error('Invalid category response');
    result.push({ id: category.id, name: category.name, slug: category.slug, depth, ancestors });
    if (category.children) flattenCategories(category.children, result, depth + 1, [...ancestors, category.id]);
  }
  return result;
}
export function matchingCategory(categories, type) {
  if (!type) return null;
  const exact = categories.filter(category => productType(category.name) === type || contains(category.slug, type) || normalize(category.name) === type || categoryType(category.slug) === type)
    .filter(category => type !== 'dien thoai' || !/phu kien|accessor/.test(normalize(category.name)))
    .sort((a, b) => Number(normalize(b.name) === type) - Number(normalize(a.name) === type) || a.depth - b.depth)[0] || null;
  if (exact) return exact;
  const parent = ['dien thoai','laptop','tai nghe','ban phim','loa','op lung'].includes(type) ? /^(electronics|dien tu|thiet bi dien tu)$/ :
    ['ao thun','giay'].includes(type) ? /^(fashion|thoi trang)$/ : type === 'sach' ? /^(books|sach)$/ : null;
  return parent ? categories.find(category => parent.test(normalize(category.slug)) || parent.test(normalize(category.name))) || null : null;
}
