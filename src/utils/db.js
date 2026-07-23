/**
 * IndexedDB 底层数据库工具封装
 * 库名: family_book_db
 * 表: asset_records (主键 id), sync_queue (离线操作队列, 自增 seq)
 */

export const DB_NAME = 'family_book_db';
export const STORE_NAME = 'asset_records';
export const SYNC_QUEUE_STORE = 'sync_queue';
export const DB_VERSION = 2;

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
      if (!db.objectStoreNames.contains(SYNC_QUEUE_STORE)) {
        const q = db.createObjectStore(SYNC_QUEUE_STORE, {
          keyPath: 'seq',
          autoIncrement: true,
        });
        q.createIndex('opType', 'opType', { unique: false });
      }
    };
    req.onsuccess = (e) => resolve(e.target.result);
    req.onerror = (e) => reject(e.target.error);
    req.onblocked = () => reject(new Error('数据库升级被阻塞，请关闭其他标签页后重试'));
  });
  return dbPromise;
}

/** 通用事务执行器（单表） */
async function withStore(mode, storeName, fn) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, mode);
    const store = tx.objectStore(storeName);
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

/* ============ asset_records 表 CRUD ============ */

/** 新增单条记录 */
export async function addRecord(record) {
  return withStore('readwrite', STORE_NAME, (store) => {
    store.add(record);
  });
}

/** 根据 ID 编辑覆盖记录（整条覆盖） */
export async function putRecord(record) {
  return withStore('readwrite', STORE_NAME, (store) => {
    store.put(record);
  });
}

/** 根据 ID 删除单条记录 */
export async function deleteRecord(id) {
  return withStore('readwrite', STORE_NAME, (store) => {
    store.delete(id);
  });
}

/** 根据 ID 查询单条记录 */
export async function getRecord(id) {
  return withStore('readonly', STORE_NAME, (store) => {
    return new Promise((resolve, reject) => {
      const req = store.get(id);
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => reject(req.error);
    });
  });
}

/** 查询全部记录并按录入先后顺序排列（最新在最上面） */
export async function getAllRecords() {
  return withStore('readonly', STORE_NAME, (store) => {
    return new Promise((resolve, reject) => {
      const req = store.getAll();
      req.onsuccess = () => {
        const list = req.result || [];
        list.sort((a, b) => {
          const ta = a.createdAt ?? 0;
          const tb = b.createdAt ?? 0;
          if (ta !== tb) return tb - ta;
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
  return withStore('readwrite', STORE_NAME, (store) => {
    store.clear();
  });
}

/**
 * 用云端全量数据覆盖本地库（先清空再批量写入）
 * 用于"云端正常 → 覆盖写入本地 IndexedDB"
 */
export async function replaceAllRecords(records) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    store.clear();
    (records || []).forEach((r) => store.put(r));
    tx.oncomplete = () => resolve(true);
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error || new Error('覆盖写入被中止'));
  });
}

/* ============ sync_queue 离线队列 CRUD ============ */

/**
 * 入队一条离线操作
 * @param {string} opType - 'add' | 'update' | 'delete'
 * @param {object} payload - add/update 传完整 record; delete 传 { id }
 */
export async function enqueueSync(opType, payload) {
  return withStore('readwrite', SYNC_QUEUE_STORE, (store) => {
    return new Promise((resolve, reject) => {
      const req = store.add({ opType, payload, createdAt: Date.now() });
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  });
}

/** 读取全部队列项（按 seq 升序，即入队顺序） */
export async function getSyncQueue() {
  return withStore('readonly', SYNC_QUEUE_STORE, (store) => {
    return new Promise((resolve, reject) => {
      const req = store.getAll();
      req.onsuccess = () => {
        const list = (req.result || []).sort((a, b) => a.seq - b.seq);
        resolve(list);
      };
      req.onerror = () => reject(req.error);
    });
  });
}

/** 按 seq 删除队列项 */
export async function dequeueSync(seq) {
  return withStore('readwrite', SYNC_QUEUE_STORE, (store) => {
    store.delete(seq);
  });
}

/** 清空整个队列 */
export async function clearSyncQueue() {
  return withStore('readwrite', SYNC_QUEUE_STORE, (store) => {
    store.clear();
  });
}

/** 队列是否非空 */
export async function hasSyncQueue() {
  return withStore('readonly', SYNC_QUEUE_STORE, (store) => {
    return new Promise((resolve, reject) => {
      const req = store.count();
      req.onsuccess = () => resolve(req.result > 0);
      req.onerror = () => reject(req.error);
    });
  });
}
