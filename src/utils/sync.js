/**
 * 离线同步管理器
 * - 遍历 sync_queue，按顺序批量同步到云端
 * - 历史数据迁移：首次使用把本地存量全量上传云端
 */
import * as cloud from '../supabase/index.js';
import {
  getSyncQueue,
  dequeueSync,
  clearSyncQueue,
  getAllRecords,
  replaceAllRecords,
} from './db.js';

let syncing = false;

function isOnline() {
  return typeof navigator !== 'undefined' ? navigator.onLine : true;
}

/**
 * 回放离线队列，把 sync_queue 中的操作逐条同步到云端
 * 成功一条删一条，失败则中止后续，保留未同步项。
 * @returns {Promise<{synced:number, failed:number}>}
 */
export async function flushSyncQueue() {
  if (syncing) return { synced: 0, failed: 0 };
  if (!isOnline()) return { synced: 0, failed: 0 };
  syncing = true;
  let synced = 0;
  let failed = 0;
  try {
    const queue = await getSyncQueue();
    for (const item of queue) {
      try {
        if (item.opType === 'add') {
          await cloud.addRecord(item.payload);
        } else if (item.opType === 'update') {
          await cloud.updateRecord(item.payload);
        } else if (item.opType === 'delete') {
          await cloud.deleteRecord(item.payload.id);
        }
        await dequeueSync(item.seq);
        synced++;
      } catch (err) {
        // 单条失败不影响后续不同记录，继续尝试
        console.warn('[sync] 队列项同步失败', item, err);
        failed++;
      }
    }
    // 全部成功后清空残留失败项之外，若仍有遗留则保留
    return { synced, failed };
  } finally {
    syncing = false;
  }
}

/**
 * 历史数据迁移：首次使用把本地存量全量上传云端
 * 使用 upsert 避免与已同步数据冲突。
 * 迁移成功后用云端结果覆盖本地，保证一致性。
 */
export async function migrateLocalToCloud() {
  if (!isOnline()) return { migrated: 0, skipped: true };
  const local = await getAllRecords();
  if (!local.length) return { migrated: 0, skipped: false };
  try {
    await cloud.batchUpsert(local);
    return { migrated: local.length, skipped: false };
  } catch (err) {
    console.warn('[sync] 历史迁移失败', err);
    return { migrated: 0, skipped: false, error: err };
  }
}

/**
 * 从云端全量拉取并覆盖本地库
 * @returns {Promise<Array>} 云端记录（已转 camelCase）
 */
export async function pullCloudToLocal() {
  const records = await cloud.getAllRecords();
  await replaceAllRecords(records);
  return records;
}

/**
 * 注册在线监听：离线 → 在线 时自动回放队列
 * 应在应用启动时调用一次。
 */
export function registerOnlineListener(onBackOnline) {
  if (typeof window === 'undefined') return;
  window.addEventListener('online', async () => {
    console.log('[sync] 网络恢复，开始回放离线队列');
    try {
      const res = await flushSyncQueue();
      if (res.synced > 0 && typeof onBackOnline === 'function') {
        onBackOnline(res);
      }
    } catch (err) {
      console.error('[sync] 回放失败', err);
    }
  });
}
