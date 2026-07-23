/**
 * Supabase 云端数据接口封装
 * 表名: asset_records
 * 字段: id, record_date(jsonb: assets/debt/calc 由库结构定义, 此处 assets/debt/calc 为 jsonb), created_at, user_id
 *
 * 仅读取 .env.local 中的 VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY，禁止硬编码密钥。
 * 全程无登录，使用 anon key 直连。
 */
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const TABLE_NAME = 'asset_records';
/** 云端请求超时时间（毫秒），超时切本地兜底 */
export const CLOUD_TIMEOUT_MS = 8000;

let client = null;

/** 获取 Supabase 客户端单例 */
export function getClient() {
  if (client) return client;
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    throw new Error('缺少 Supabase 环境变量（VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY）');
  }
  client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { fetch: (...args) => fetchWithTimeout(...args) },
  });
  return client;
}

/** 带 AbortController 超时的 fetch 封装 */
function fetchWithTimeout(input, init = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), CLOUD_TIMEOUT_MS);
  return fetch(input, { ...init, signal: controller.signal }).finally(() => {
    clearTimeout(timer);
  });
}

/**
 * 云端 snake_case ↔ 前端 camelCase 字段映射
 * 云端: id, record_date, assets, debt, calc, created_at, user_id
 * 前端: id, recordDate, assets, debt, calc, createdAt, userId
 */
export function fromCloud(row) {
  if (!row) return null;
  return {
    id: row.id,
    recordDate: row.record_date,
    assets: row.assets,
    debt: row.debt,
    calc: row.calc,
    createdAt: row.created_at ? new Date(row.created_at).getTime() : Date.now(),
    userId: row.user_id ?? null,
  };
}

export function toCloud(record) {
  return {
    id: record.id,
    record_date: record.recordDate,
    assets: record.assets,
    debt: record.debt,
    calc: record.calc,
    created_at: record.createdAt ? new Date(record.createdAt).toISOString() : new Date().toISOString(),
    user_id: record.userId ?? null,
  };
}

/** 拉取全部云端记录 */
export async function getAllRecords() {
  const sb = getClient();
  const { data, error } = await sb
    .from(TABLE_NAME)
    .select('*')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data || []).map(fromCloud);
}

/** 新增一条云端记录 */
export async function addRecord(record) {
  const sb = getClient();
  const payload = toCloud(record);
  const { data, error } = await sb.from(TABLE_NAME).insert(payload).select();
  if (error) throw error;
  return fromCloud((data && data[0]) || payload);
}

/** 更新一条云端记录（整条覆盖） */
export async function updateRecord(record) {
  const sb = getClient();
  const { id, ...rest } = toCloud(record);
  const { data, error } = await sb
    .from(TABLE_NAME)
    .update(rest)
    .eq('id', id)
    .select();
  if (error) throw error;
  return fromCloud((data && data[0]) || record);
}

/** 删除一条云端记录 */
export async function deleteRecord(id) {
  const sb = getClient();
  const { error } = await sb.from(TABLE_NAME).delete().eq('id', id);
  if (error) throw error;
  return id;
}

/** 批量上传（历史迁移用），upsert 模式避免主键冲突 */
export async function batchUpsert(records) {
  if (!records || records.length === 0) return [];
  const sb = getClient();
  const payload = records.map(toCloud);
  const { data, error } = await sb
    .from(TABLE_NAME)
    .upsert(payload, { onConflict: 'id' })
    .select();
  if (error) throw error;
  return (data || []).map(fromCloud);
}
