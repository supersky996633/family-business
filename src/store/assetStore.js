import { defineStore } from 'pinia';
import {
  addRecord,
  putRecord,
  deleteRecord,
  getRecord,
  getAllRecords,
  clearAllRecords,
  uuid,
} from '../utils/db.js';

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
  }),

  getters: {
    count: (s) => s.records.length,
    hasLatest: (s) => !!s.latest,
    trendData: (s) =>
      [...s.records]
        .slice()
        .sort((a, b) => {
          const ta = a.createdAt ?? 0;
          const tb = b.createdAt ?? 0;
          if (ta !== tb) return ta - tb;
          // 兜底：createdAt 缺失时按日期升序
          return a.recordDate < b.recordDate ? -1 : 1;
        })
        .map((r) => ({ date: r.recordDate, familyNet: r.calc?.familyNet ?? 0 })),
  },

  actions: {
    async fetchAll() {
      this.loading = true;
      try {
        this.records = await getAllRecords();
        this.latest = this.records[0] || null;
        this.loaded = true;
      } finally {
        this.loading = false;
      }
    },

    async add(data) {
      const record = {
        ...data,
        id: data.id || uuid(),
        createdAt: Date.now(),
        calc: calcSummary(data.assets, data.debt),
      };
      await addRecord(record);
      await this.fetchAll();
      return record;
    },

    async update(data) {
      if (!data.id) throw new Error('缺少记录 ID，无法更新');
      const prev = this.records.find((r) => r.id === data.id);
      const record = {
        ...data,
        createdAt: prev?.createdAt ?? Date.now(),
        calc: calcSummary(data.assets, data.debt),
      };
      await putRecord(record);
      await this.fetchAll();
      return record;
    },

    async save(data) {
      if (data.id) return this.update(data);
      return this.add(data);
    },

    async remove(id) {
      await deleteRecord(id);
      await this.fetchAll();
    },

    async getById(id) {
      const cached = this.records.find((r) => r.id === id);
      if (cached) return cached;
      return await getRecord(id);
    },

    async resetAll() {
      await clearAllRecords();
      await this.fetchAll();
    },
  },
});
