import { defineStore } from 'pinia';
import {
  addRecord,
  putRecord,
  deleteRecord,
  getRecord,
  getAllRecords,
  clearAllRecords,
  uuid,
  enqueueSync,
  clearSyncQueue,
} from '../utils/db.js';
import * as cloud from '../supabase/index.js';
import {
  flushSyncQueue,
  migrateLocalToCloud,
  pullCloudToLocal,
} from '../utils/sync.js';
import { ensureUnlocked } from '../utils/auth-bridge.js';

/** 资产类别顺序 */
export const ASSET_KEYS = ['wechat', 'alipay', 'bankCard', 'cash', 'investment', 'other'];
export const DEBT_KEYS = ['creditCard', 'otherDebt'];

export const ASSET_LABELS = {
  wechat: '微信',
  alipay: '支付宝',
  bankCard: '银行卡',
  cash: '现金',
  investment: '理财',
  other: '其他',
};

export const DEBT_LABELS = {
  creditCard: '信用卡欠款',
  otherDebt: '其他负债',
};

function round2(n) {
  return Math.round((Number(n) || 0) * 100) / 100;
}

/** 计算衍生统计字段 */
export function calcSummary(assets, debt) {
  const num = (v) => Number(v) || 0;
  const xiaoxinTotalAsset = ASSET_KEYS.reduce((s, k) => s + num(assets[k]?.xiaoxin), 0);
  const xiaoxinDebt = DEBT_KEYS.reduce((s, k) => s + num(debt[k]?.xiaoxin), 0);
  const xiaonaoTotalAsset = ASSET_KEYS.reduce((s, k) => s + num(assets[k]?.xiaonao), 0);
  const xiaonaoTotalDebt = DEBT_KEYS.reduce((s, k) => s + num(debt[k]?.xiaonao), 0);

  return {
    xiaoxinTotalAsset: round2(xiaoxinTotalAsset),
    xiaoxinTotalDebt: round2(xiaoxinDebt),
    xiaoxinNet: round2(xiaoxinTotalAsset - xiaoxinDebt),
    xiaonaoTotalAsset: round2(xiaonaoTotalAsset),
    xiaonaoTotalDebt: round2(xiaonaoTotalDebt),
    xiaonaoNet: round2(xiaonaoTotalAsset - xiaonaoTotalDebt),
    familyTotalAsset: round2(xiaoxinTotalAsset + xiaonaoTotalAsset),
    familyTotalDebt: round2(xiaoxinDebt + xiaonaoTotalDebt),
    familyNet: round2(xiaoxinTotalAsset + xiaonaoTotalAsset - xiaoxinDebt - xiaonaoTotalDebt),
  };
}

/** 创建一条空记录骨架 */
export function createEmptyRecord(recordDate) {
  const empty = () => ({ xiaoxin: 0, xiaonao: 0 });
  const assets = {};
  ASSET_KEYS.forEach((k) => (assets[k] = empty()));
  const debt = {};
  DEBT_KEYS.forEach((k) => (debt[k] = empty()));
  return {
    id: '',
    recordDate: recordDate || today(),
    assets,
    debt,
    calc: calcSummary(assets, debt),
  };
}

function today() {
  const d = new Date();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${m}-${day}`;
}

export const useAssetStore = defineStore('asset', {
  state: () => ({
    records: [],
    latest: null,
    loading: false,
    loaded: false,
    /** 数据来源: 'cloud' | 'local' | null */
    source: null,
    /** 网络错误提示文案，null 表示无错误 */
    netError: null,
    /** 是否正在同步离线队列 */
    syncing: false,
    /** 标记历史迁移是否已完成 */
    migrated: false,
  }),

  getters: {
    count: (s) => s.records.length,
    hasLatest: (s) => !!s.latest,
    isOnline: (s) => (typeof navigator !== 'undefined' ? navigator.onLine : true),
    trendData: (s) =>
      [...s.records]
        .slice()
        .sort((a, b) => {
          const ta = a.createdAt ?? 0;
          const tb = b.createdAt ?? 0;
          if (ta !== tb) return ta - tb;
          return a.recordDate < b.recordDate ? -1 : 1;
        })
        .map((r) => ({ date: r.recordDate, familyNet: r.calc?.familyNet ?? 0 })),
  },

  actions: {
    /** 刷新本地缓存到 state（不动云端） */
    async refreshLocalState() {
      this.records = await getAllRecords();
      this.latest = this.records[0] || null;
      this.loaded = true;
    },

    /**
     * 全局数据读取：
     * ① 页面打开先请求云端；正常 → 展示云端数据并覆盖写入本地
     * ② 云端超时/报错/无网络 → 读取本地 IndexedDB 渲染
     */
    async fetchAll() {
      this.loading = true;
      this.netError = null;
      try {
        if (!this.isOnline) {
          throw new Error('当前处于离线状态');
        }
        // 先尝试历史迁移（若未迁移），再拉取云端
        if (!this.migrated) {
          await migrateLocalToCloud();
          this.migrated = true;
        }
        const cloudRecords = await pullCloudToLocal();
        this.records = cloudRecords;
        this.latest = cloudRecords[0] || null;
        this.source = 'cloud';
        this.loaded = true;
      } catch (err) {
        console.warn('[store] 云端读取失败，切本地兜底', err);
        await this.refreshLocalState();
        this.source = 'local';
        this.netError = this.isOnline
          ? '云端响应超时，已显示本地数据'
          : '当前离线，已显示本地数据';
      } finally {
        this.loading = false;
      }
    },

    /** 网络恢复后重新拉取云端 */
    async onBackOnline(syncRes) {
      if (syncRes && syncRes.synced > 0) {
        this.syncing = true;
        try {
          await this.fetchAll();
        } finally {
          this.syncing = false;
        }
      } else {
        await this.fetchAll();
      }
    },

    /**
     * 新增记录：
     * 联网 → 先云端，成功后写本地
     * 断网 → 只写本地，并入队
     */
    async add(data) {
      await ensureUnlocked();
      const record = {
        ...data,
        id: data.id || uuid(),
        createdAt: Date.now(),
        calc: calcSummary(data.assets, data.debt),
      };
      if (this.isOnline) {
        try {
          const cloudRec = await cloud.addRecord(record);
          await addRecord(cloudRec);
          await this.refreshLocalState();
          return cloudRec;
        } catch (err) {
          console.warn('[store] 云端新增失败，降级本地+入队', err);
        }
      }
      // 断网或云端失败
      await addRecord(record);
      await enqueueSync('add', record);
      await this.refreshLocalState();
      return record;
    },

    /**
     * 更新记录：
     * 联网 → 先云端，成功后写本地
     * 断网 → 只写本地，并入队
     */
    async update(data) {
      await ensureUnlocked();
      if (!data.id) throw new Error('缺少记录 ID，无法更新');
      const prev = this.records.find((r) => r.id === data.id);
      const record = {
        ...data,
        createdAt: prev?.createdAt ?? Date.now(),
        calc: calcSummary(data.assets, data.debt),
      };
      if (this.isOnline) {
        try {
          const cloudRec = await cloud.updateRecord(record);
          await putRecord(cloudRec);
          await this.refreshLocalState();
          return cloudRec;
        } catch (err) {
          console.warn('[store] 云端更新失败，降级本地+入队', err);
        }
      }
      await putRecord(record);
      await enqueueSync('update', record);
      await this.refreshLocalState();
      return record;
    },

    async save(data) {
      if (data.id) return this.update(data);
      return this.add(data);
    },

    /**
     * 删除记录：
     * 联网 → 先云端，成功后删本地
     * 断网 → 只删本地，并入队
     */
    async remove(id) {
      await ensureUnlocked();
      if (this.isOnline) {
        try {
          await cloud.deleteRecord(id);
          await deleteRecord(id);
          await this.refreshLocalState();
          return;
        } catch (err) {
          console.warn('[store] 云端删除失败，降级本地+入队', err);
        }
      }
      await deleteRecord(id);
      await enqueueSync('delete', { id });
      await this.refreshLocalState();
    },

    async getById(id) {
      const cached = this.records.find((r) => r.id === id);
      if (cached) return cached;
      return await getRecord(id);
    },

    /** 手动触发离线队列回放 */
    async flushQueue() {
      this.syncing = true;
      try {
        const res = await flushSyncQueue();
        if (res.synced > 0) await this.fetchAll();
        return res;
      } finally {
        this.syncing = false;
      }
    },

    /**
     * 重置全部：先清云端无能力（无登录安全考虑），清本地并清空队列
     */
    async resetAll() {
      await ensureUnlocked();
      await clearAllRecords();
      await clearSyncQueue();
      await this.refreshLocalState();
    },
  },
});
