/**
 * 数学错题本地 IndexedDB 仓库
 *  - 独立库名 math_book_db，避免与资产库 family_book_db 版本冲突
 *  - 新增仓库：math_questions（主键 id）、math_sync_queue（离线操作队列）
 *  - 不改动 asset_records / sync_queue 相关逻辑
 *
 * 提供能力：
 *  本地 CRUD、离线暂存队列、联网回放同步、云端全量覆盖本地
 */
import * as cloud from '../api/mathQuestion.js'
import { uuid } from './db.js'

export const MATH_STORE = 'math_questions'
export const MATH_QUEUE = 'math_sync_queue'
export const MATH_DB_VERSION = 1

let dbPromise = null

/** 打开/升级数据库（版本 3），初始化数学错题仓库 */
export function openDB() {
  if (dbPromise) return dbPromise
  dbPromise = new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('当前浏览器不支持 IndexedDB'))
      return
    }
    const req = indexedDB.open('math_book_db', MATH_DB_VERSION)
    req.onupgradeneeded = (e) => {
      const db = e.target.result
      // 仅在库不存在时创建，避免影响已有 asset 仓库
      if (!db.objectStoreNames.contains(MATH_STORE)) {
        const store = db.createObjectStore(MATH_STORE, { keyPath: 'id' })
        store.createIndex('knowledgePoint', 'knowledgePoint', { unique: false })
        store.createIndex('difficulty', 'difficulty', { unique: false })
        store.createIndex('nextReviewTime', 'nextReviewTime', { unique: false })
      }
      if (!db.objectStoreNames.contains(MATH_QUEUE)) {
        const q = db.createObjectStore(MATH_QUEUE, {
          keyPath: 'seq',
          autoIncrement: true,
        })
        q.createIndex('opType', 'opType', { unique: false })
      }
    }
    req.onsuccess = (e) => resolve(e.target.result)
    req.onerror = (e) => reject(e.target.error)
    req.onblocked = () => reject(new Error('数据库升级被阻塞，请关闭其他标签页后重试'))
  })
  return dbPromise
}

/** 通用事务执行器（单表） */
async function withStore(mode, storeName, fn) {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, mode)
    const store = tx.objectStore(storeName)
    let result
    const wrapped = fn(store)
    if (wrapped && typeof wrapped.then === 'function') {
      wrapped.then((r) => (result = r)).catch(reject)
    } else {
      result = wrapped
    }
    tx.oncomplete = () => resolve(result)
    tx.onerror = () => reject(tx.error)
    tx.onabort = () => reject(tx.error || new Error('事务被中止'))
  })
}

/* ============ math_questions 本地 CRUD ============ */

/** 查询全部错题（按创建时间倒序） */
export async function getAllLocalQuestions() {
  return withStore('readonly', MATH_STORE, (store) => {
    return new Promise((resolve, reject) => {
      const req = store.getAll()
      req.onsuccess = () => {
        const list = req.result || []
        list.sort((a, b) => (b.createdAt ?? 0) - (a.createdAt ?? 0))
        resolve(list)
      }
      req.onerror = () => reject(req.error)
    })
  })
}

/** 按 id 查询单条本地错题 */
export async function getLocalQuestion(id) {
  return withStore('readonly', MATH_STORE, (store) => {
    return new Promise((resolve, reject) => {
      const req = store.get(id)
      req.onsuccess = () => resolve(req.result || null)
      req.onerror = () => reject(req.error)
    })
  })
}

/** 新增单条本地错题 */
export async function addLocalQuestion(item) {
  return withStore('readwrite', MATH_STORE, (store) => {
    store.add(item)
  })
}

/** 编辑（整条覆盖）本地错题 */
export async function putLocalQuestion(item) {
  return withStore('readwrite', MATH_STORE, (store) => {
    store.put(item)
  })
}

/** 删除单条本地错题 */
export async function deleteLocalQuestion(id) {
  return withStore('readwrite', MATH_STORE, (store) => {
    store.delete(id)
  })
}

/** 清空全部本地错题 */
export async function clearLocalQuestions() {
  return withStore('readwrite', MATH_STORE, (store) => {
    store.clear()
  })
}

/** 用云端全量数据覆盖本地（先清空再批量写入） */
export async function replaceAllLocalQuestions(items) {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(MATH_STORE, 'readwrite')
    const store = tx.objectStore(MATH_STORE)
    store.clear()
    ;(items || []).forEach((r) => store.put(r))
    tx.oncomplete = () => resolve(true)
    tx.onerror = () => reject(tx.error)
    tx.onabort = () => reject(tx.error || new Error('覆盖写入被中止'))
  })
}

/* ============ math_sync_queue 离线队列 ============ */

/**
 * 入队一条离线操作
 * @param {string} opType - 'add' | 'update' | 'delete'
 * @param {object} payload - add/update 传完整错题；delete 传 { id }
 */
export async function enqueueMathSync(opType, payload) {
  return withStore('readwrite', MATH_QUEUE, (store) => {
    return new Promise((resolve, reject) => {
      const req = store.add({ opType, payload, createdAt: Date.now() })
      req.onsuccess = () => resolve(req.result)
      req.onerror = () => reject(req.error)
    })
  })
}

/** 读取全部队列项（按 seq 升序） */
export async function getMathSyncQueue() {
  return withStore('readonly', MATH_QUEUE, (store) => {
    return new Promise((resolve, reject) => {
      const req = store.getAll()
      req.onsuccess = () => {
        const list = (req.result || []).sort((a, b) => a.seq - b.seq)
        resolve(list)
      }
      req.onerror = () => reject(req.error)
    })
  })
}

/** 按 seq 删除队列项 */
export async function dequeueMathSync(seq) {
  return withStore('readwrite', MATH_QUEUE, (store) => {
    store.delete(seq)
  })
}

/** 清空队列 */
export async function clearMathSyncQueue() {
  return withStore('readwrite', MATH_QUEUE, (store) => {
    store.clear()
  })
}

/** 队列是否非空 */
export async function hasMathSyncQueue() {
  return withStore('readonly', MATH_QUEUE, (store) => {
    return new Promise((resolve, reject) => {
      const req = store.count()
      req.onsuccess = () => resolve(req.result > 0)
      req.onerror = () => reject(req.error)
    })
  })
}

/* ============ 云端同步 ============ */

let syncing = false

function isOnline() {
  return typeof navigator !== 'undefined' ? navigator.onLine : true
}

/**
 * 回放离线队列：逐条同步到云端，成功一条删一条
 * 单条失败不阻断后续，返回 {synced, failed}
 */
export async function flushMathSyncQueue() {
  if (syncing) return { synced: 0, failed: 0 }
  if (!isOnline()) return { synced: 0, failed: 0 }
  syncing = true
  let synced = 0
  let failed = 0
  try {
    const queue = await getMathSyncQueue()
    for (const item of queue) {
      try {
        if (item.opType === 'add') {
          const saved = await cloud.addQuestion(item.payload)
          // 回放成功后用云端真实 id 替换本地临时记录
          if (saved && saved.id && item.payload.id && String(saved.id) !== String(item.payload.id)) {
            try {
              await deleteLocalQuestion(item.payload.id)
              await addLocalQuestion(saved)
            } catch (e) {
              console.warn('[math-sync] 回放校正本地失败', e)
            }
          }
        } else if (item.opType === 'update') {
          await cloud.updateQuestion(item.payload)
        } else if (item.opType === 'delete') {
          await cloud.deleteQuestion(item.payload.id)
        }
        await dequeueMathSync(item.seq)
        synced++
      } catch (err) {
        console.warn('[math-sync] 队列项同步失败', item, err)
        failed++
      }
    }
    return { synced, failed }
  } finally {
    syncing = false
  }
}

/** 从云端全量拉取并覆盖本地库 */
export async function pullMathCloudToLocal() {
  const items = await cloud.getAllQuestions()
  await replaceAllLocalQuestions(items)
  return items
}

/**
 * 历史迁移：首次使用把本地存量全量上传云端（upsert 去重）
 */
export async function migrateLocalMathToCloud() {
  if (!isOnline()) return { migrated: 0, skipped: true }
  const local = await getAllLocalQuestions()
  if (!local.length) return { migrated: 0, skipped: false }
  try {
    await cloud.batchUpsertQuestions(local)
    return { migrated: local.length, skipped: false }
  } catch (err) {
    console.warn('[math-sync] 历史迁移失败', err)
    return { migrated: 0, skipped: false, error: err }
  }
}

/* ============ 业务封装：云端优先 + 离线兜底 ============ */

/**
 * 查询全部：云端优先，失败/离线兜底本地
 * @returns {Promise<{data:Array, fromCloud:boolean}>}
 */
export async function fetchAllQuestions() {
  const local = await getAllLocalQuestions()
  if (isOnline()) {
    try {
      const data = await cloud.getAllQuestions()
      // 云端为空且本地有未同步数据时，不清空本地，直接返回本地
      if (data.length === 0 && local.length > 0) {
        return { data: local, fromCloud: false }
      }
      if (data.length > 0) {
        await replaceAllLocalQuestions(data)
      }
      return { data: data.length ? data : local, fromCloud: data.length > 0 }
    } catch (err) {
      console.warn('[math] 云端查询失败，回退本地', err)
    }
  }
  return { data: local, fromCloud: false }
}

/**
 * 按 id 查询：云端优先，失败兜底本地
 */
export async function fetchQuestionById(id) {
  if (isOnline()) {
    try {
      return await cloud.getQuestionById(id)
    } catch (err) {
      console.warn('[math] 云端按 id 查询失败，回退本地', err)
    }
  }
  return getLocalQuestion(id)
}

/**
 * 新增错题：在线直写云端 + 本地；离线入队暂存
 */
export async function saveNewQuestion(item) {
  // 本地先用临时 id 落盘，保证离线立即可见
  const tempId = item.id || uuid()
  const localRecord = { ...item, id: tempId }
  await addLocalQuestion(localRecord)

  if (isOnline()) {
    try {
      // 云端 id 由数据库自增，不传 id
      const saved = await cloud.addQuestion(item)
      if (saved && saved.id) {
        // 用云端真实 id 替换本地临时记录
        await deleteLocalQuestion(tempId)
        await addLocalQuestion(saved)
        return saved
      }
      return localRecord
    } catch (err) {
      console.warn('[math] 云端新增失败，入队暂存', err)
    }
  }
  // 离线：入队，待联网回放（回放时用临时 payload，add 由云端生成 id）
  await enqueueMathSync('add', localRecord)
  return localRecord
}

/**
 * 编辑错题：在线直写云端 + 本地；离线入队暂存
 */
export async function saveEditQuestion(item) {
  await putLocalQuestion(item)
  if (isOnline()) {
    try {
      const saved = await cloud.updateQuestion(item)
      if (saved) await putLocalQuestion(saved)
      return saved
    } catch (err) {
      console.warn('[math] 云端编辑失败，入队暂存', err)
    }
  }
  await enqueueMathSync('update', item)
  return item
}

/**
 * 删除错题：在线直删云端 + 本地；离线入队暂存
 */
export async function removeQuestion(id) {
  await deleteLocalQuestion(id)
  if (isOnline()) {
    try {
      await cloud.deleteQuestion(id)
      return id
    } catch (err) {
      console.warn('[math] 云端删除失败，入队暂存', err)
    }
  }
  await enqueueMathSync('delete', { id })
  return id
}

/**
 * 注册在线监听：离线→在线时自动回放错题队列
 */
export function registerMathOnlineListener(onBackOnline) {
  if (typeof window === 'undefined') return
  window.addEventListener('online', async () => {
    console.log('[math-sync] 网络恢复，开始回放错题离线队列')
    try {
      const res = await flushMathSyncQueue()
      if (res.synced > 0 && typeof onBackOnline === 'function') {
        onBackOnline(res)
      }
    } catch (err) {
      console.error('[math-sync] 回放失败', err)
    }
  })
}
