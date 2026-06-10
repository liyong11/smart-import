// Database module - Neon PostgreSQL
import { neon } from '@neondatabase/serverless';

function getDb() {
  const sql = neon(process.env.DATABASE_URL || '');
  return sql;
}

export async function initDatabase() {
  const sql = getDb();
  
  await sql`CREATE TABLE IF NOT EXISTS parse_rules (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    file_type TEXT NOT NULL,
    config JSONB NOT NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
  )`;

  await sql`CREATE TABLE IF NOT EXISTS orders (
    id SERIAL PRIMARY KEY,
    external_code TEXT,
    store_name TEXT,
    recipient_name TEXT,
    recipient_phone TEXT,
    recipient_address TEXT,
    sku_code TEXT NOT NULL,
    sku_name TEXT NOT NULL,
    sku_quantity NUMERIC NOT NULL,
    sku_spec TEXT,
    remarks TEXT,
    file_name TEXT,
    rule_name TEXT,
    batch_id TEXT,
    submitted_at TIMESTAMP DEFAULT NOW()
  )`;
}

export async function getRules() {
  const sql = getDb();
  const rows = await sql`SELECT * FROM parse_rules ORDER BY updated_at DESC`;
  return rows.map(r => ({
    id: r.id,
    name: r.name,
    description: r.description,
    fileType: r.file_type,
    config: r.config,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  }));
}

export async function getRule(id: string) {
  const sql = getDb();
  const rows = await sql`SELECT * FROM parse_rules WHERE id = ${id}`;
  if (rows.length === 0) return null;
  const r = rows[0];
  return {
    id: r.id,
    name: r.name,
    description: r.description,
    fileType: r.file_type,
    config: r.config,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

export async function saveRule(rule: any) {
  const sql = getDb();
  await sql`INSERT INTO parse_rules (id, name, description, file_type, config, updated_at)
    VALUES (${rule.id}, ${rule.name}, ${rule.description || ''}, ${rule.fileType}, ${JSON.stringify(rule.config)}, NOW())
    ON CONFLICT (id) DO UPDATE SET
      name = ${rule.name},
      description = ${rule.description || ''},
      file_type = ${rule.fileType},
      config = ${JSON.stringify(rule.config)},
      updated_at = NOW()`;
}

export async function deleteRule(id: string) {
  const sql = getDb();
  await sql`DELETE FROM parse_rules WHERE id = ${id}`;
}

export async function saveOrders(orders: any[], fileName: string, ruleName: string, batchId: string) {
  const sql = getDb();
  for (const order of orders) {
    await sql`INSERT INTO orders (external_code, store_name, recipient_name, recipient_phone, recipient_address, sku_code, sku_name, sku_quantity, sku_spec, remarks, file_name, rule_name, batch_id)
      VALUES (${order.externalCode || ''}, ${order.storeName || ''}, ${order.recipientName || ''}, ${order.recipientPhone || ''}, ${order.recipientAddress || ''}, ${order.skuCode}, ${order.skuName}, ${order.skuQuantity}, ${order.skuSpec || ''}, ${order.remarks || ''}, ${fileName}, ${ruleName}, ${batchId})`;
  }
}

export async function getOrders(params: { search?: string; page?: number; pageSize?: number }) {
  const sql = getDb();
  const { search, page = 1, pageSize = 50 } = params;
  const offset = (page - 1) * pageSize;

  if (search) {
    const pattern = `%${search}%`;
    const rows = await sql`SELECT * FROM orders WHERE external_code ILIKE ${pattern} OR recipient_name ILIKE ${pattern} OR sku_name ILIKE ${pattern} ORDER BY submitted_at DESC LIMIT ${pageSize} OFFSET ${offset}`;
    const countResult = await sql`SELECT COUNT(*) as total FROM orders WHERE external_code ILIKE ${pattern} OR recipient_name ILIKE ${pattern} OR sku_name ILIKE ${pattern}`;
    return { rows, total: Number(countResult[0].total) };
  }

  const rows = await sql`SELECT * FROM orders ORDER BY submitted_at DESC LIMIT ${pageSize} OFFSET ${offset}`;
  const countResult = await sql`SELECT COUNT(*) as total FROM orders`;
  return { rows, total: Number(countResult[0].total) };
}

export { getDb };
