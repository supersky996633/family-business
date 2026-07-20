/**
 * IndexedDB 底层数据库工具封装
 * 库名: family_book_db
 * 表名: asset_records
 * 主键: id (UUID 字符串)
 * 索引: recordDate 用于排序查询
 */

export const DB_NAME = 'family_book_db';
export const STORE_NAME = 'asset_records';
export const DB_VERSION = 1;

let dbPromise = null;

/** 打开/初始化数据库，返回 Promise<IDBDatabase> */
export function openDB() {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('当前浏览器不支持 IndexedDB'));
      return;
    }
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = (e) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
        store.createIndex('recordDate', 'recordDate', { unique: false });
      }
    };
    req.onsuccess = (e) => resolve(e.target.result);
    req.onerror = (e) => reject(e.target.error);
    req.onblocked = () => reject(new Error('数据库升级被阻塞，请关闭其他标签页后重试'));
  });
  return dbPromise;
}

/** 通用事务执行器 */
async function withStore(mode, fn) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, mode);
    const store = tx.objectStore(STORE_NAME);
    let result;
    const wrapped = fn(store);
    if (wrapped && typeof wrapped.then === 'function') {
      wrapped.then((r) => (result = r)).catch(reject);
    } else {
      result = wrapped;
    }
    tx.oncomplete = () => resolve(result);
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error || new Error('事务被中止'));
  });
}

/** 生成 UUID v4 */
export function uuid() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/** 新增单条记录 */
export async function addRecord(record) {
  return withStore('readwrite', (store) => {
    store.add(record);
  });
}

/** 根据 ID 编辑覆盖记录（整条覆盖） */
export async function putRecord(record) {
  return withStore('readwrite', (store) => {
    store.put(record);
  });
}

/** 根据 ID 删除单条记录 */
export async function deleteRecord(id) {
  return withStore('readwrite', (store) => {
    store.delete(id);
  });
}

/** 根据 ID 查询单条记录 */
export async function getRecord(id) {
  return withStore('readonly', (store) => {
    return new Promise((resolve, reject) => {
      const req = store.get(id);
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => reject(req.error);
    });
  });
}

/** 查询全部记录并按录入先后顺序排列（最新在最上面） */
export async function getAllRecords() {
  return withStore('readonly', (store) => {
    return new Promise((resolve, reject) => {
      const req = store.getAll();
      req.onsuccess = () => {
        const list = req.result || [];
        // 按录入先后顺序排列：createdAt 大的（最新录入）在最上面
        list.sort((a, b) => {
          const ta = a.createdAt ?? 0;
          const tb = b.createdAt ?? 0;
          if (ta !== tb) return tb - ta;
          // 兜底：无 createdAt 时按日期倒序，同日期按 id 倒序
          if (a.recordDate < b.recordDate) return 1;
          if (a.recordDate > b.recordDate) return -1;
          return a.id < b.id ? 1 : -1;
        });
        resolve(list);
      };
      req.onerror = () => reject(req.error);
    });
  });
}

/** 清空全部账本数据 */
export async function clearAllRecords() {
  return withStore('readwrite', (store) => {
    store.clear();
  });
}
