// Read-only local query-plan snapshot. Run after catalog migration.
import pg from 'pg';
import { fileURLToPath } from 'node:url';
import { ProductSearchRepository } from '../services/catalog-service/src/product-search.repository.js';
import { parseProductSearchQuery } from '../services/catalog-service/src/product-search.service.js';

process.loadEnvFile(fileURLToPath(new URL('../.env.development.local', import.meta.url)));
const url = process.env.CATALOG_DATABASE_URL || process.env.IDENTITY_DATABASE_URL;
if (!['localhost', '127.0.0.1'].includes(new URL(url).hostname)) throw new Error('Benchmark must use local PostgreSQL');
const pool = new pg.Pool({ connectionString: url });
const keyword = process.argv[2] || 'tai nghe';
const captured = [];
const fakePool = { query: async (sql, args) => {
  captured.push({ sql, args });
  return { rows: sql.includes('SELECT count(*)') ? [{ total: 0 }] : [] };
} };
await new ProductSearchRepository(fakePool).find(parseProductSearchQuery({ q: keyword, limit: 12 }, true));
const list = captured.find(item => item.sql.includes('ORDER BY'));
const plans = [
  { name: 'previous name scan', sql: `SELECT id FROM catalog.products
    WHERE status IN ('active','published') AND unaccent(lower(name)) LIKE '%'||unaccent(lower($1))||'%' LIMIT 12`, args: [keyword] },
  { name: 'indexed normalized predicate', sql: `SELECT id FROM catalog.products
    WHERE status IN ('active','published') AND search_text ILIKE '%'||catalog.normalize_search_text($1)||'%' LIMIT 12`, args: [keyword] },
  { name: 'complete ranked search', ...list },
];
try {
  const count = await pool.query('SELECT count(*)::int AS total FROM catalog.products');
  for (const item of plans) {
    const result = await pool.query(`EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON) ${item.sql}`, item.args);
    const plan = result.rows[0]['QUERY PLAN'][0];
    const nodes = [];
    const visit = node => { nodes.push(node['Node Type']); for (const child of node.Plans || []) visit(child); };
    visit(plan.Plan);
    console.log(JSON.stringify({ name: item.name, products: count.rows[0].total,
      planningMs: plan['Planning Time'], executionMs: plan['Execution Time'],
      nodes: [...new Set(nodes)] }));
  }
} finally { await pool.end(); }
