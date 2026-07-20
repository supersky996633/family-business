<template>
  <div class="page summary-page">
    <!-- 顶部标题栏 -->
    <header class="hero-header">
      <span class="page-title">家庭资产汇总</span>
      <button class="add-fab" @click="goAdd" aria-label="新增">
        <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
      </button>
    </header>

    <div v-if="store.loading && !store.loaded" class="state-tip">加载中…</div>

    <template v-else>
      <!-- 家庭总览卡片（首位） -->
      <section class="hero-card">
        <div class="hero-card-top">
          <span class="hero-title">家庭总览</span>
          <span v-if="latest" class="hero-date">
            <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>
            {{ latest.recordDate }}
          </span>
        </div>
        <div v-if="!latest" class="hero-empty">暂无记录，点击右上角 + 开始记账</div>
        <div v-else class="hero-body">
          <div class="hero-net">
            <div class="hn-label">资产净值</div>
            <div class="hn-value">¥ {{ fmt(latest.calc?.familyNet ?? 0) }}</div>
            <div class="hn-sub">家庭总净值</div>
          </div>
          <div class="hero-side">
            <div class="hs-cell">
              <div class="hs-label">总资产</div>
              <div class="hs-value green">¥ {{ fmt(latest.calc?.familyTotalAsset ?? 0) }}</div>
            </div>
            <div class="hs-cell">
              <div class="hs-label">总欠款</div>
              <div class="hs-value red">¥ {{ fmt(latest.calc?.familyTotalDebt ?? 0) }}</div>
            </div>
          </div>
        </div>
      </section>

      <!-- 双人信息卡片 -->
      <div class="person-row">
        <PersonSummaryCard
          person="xiaoxin"
          name="小新"
          :total-asset="latest?.calc?.xiaoxinTotalAsset ?? 0"
          :total-debt="latest?.calc?.xiaoxinTotalDebt ?? 0"
          :net="latest?.calc?.xiaoxinNet ?? 0"
        />
        <PersonSummaryCard
          person="xiaonao"
          name="小闹"
          :total-asset="latest?.calc?.xiaonaoTotalAsset ?? 0"
          :total-debt="latest?.calc?.xiaonaoTotalDebt ?? 0"
          :net="latest?.calc?.xiaonaoNet ?? 0"
        />
      </div>

      <!-- 横向资产总览 -->
      <section class="card">
        <div class="card-title"><span class="ct-bar"></span>最新账面资产总览</div>
        <div v-if="!latest" class="card-empty">暂无记录</div>
        <div v-else class="ov-grid">
          <div class="ov-item" v-for="it in overviewItems" :key="it.label" :class="it.cls">
            <span class="ov-label">{{ it.label }}</span>
            <span class="ov-value">{{ fmt(it.value) }}</span>
          </div>
        </div>
      </section>

      <!-- 资产趋势 -->
      <section class="card">
        <div class="card-title"><span class="ct-bar"></span>家庭总净值趋势</div>
        <div v-if="store.count < 2" class="trend-empty">至少记录 2 次可查看趋势曲线</div>
        <div v-else ref="chartEl" class="trend-chart"></div>
      </section>

      <!-- 历史记录列表 -->
      <section class="card">
        <div class="card-title">
          <span class="ct-bar"></span>历史记录
          <span class="card-sub">左滑删除 · 点击编辑</span>
        </div>
        <div v-if="store.count === 0" class="card-empty">暂无历史记录</div>
        <div v-else class="history-list">
          <div v-for="r in store.records" :key="r.id" class="swipe-wrap">
            <div class="swipe-actions">
              <button class="swipe-del" @click.stop="confirmDelete(r)">
                <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2m3 0v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6"/><path d="M10 11v6M14 11v6"/></svg>
                <span>删除</span>
              </button>
            </div>
            <div
              class="history-item"
              :style="{ transform: `translateX(${offsets[r.id] || 0}px)` }"
              @click="onItemClick(r, $event)"
              @touchstart="onTouchStart($event, r.id)"
              @touchmove="onTouchMove($event, r.id)"
              @touchend="onTouchEnd($event, r.id)"
            >
              <div class="hi-head">
                <span class="hi-date">{{ r.recordDate }}</span>
                <span class="hi-badge" :class="netClass(r.calc?.familyNet)">
                  净值 ¥ {{ fmt(r.calc?.familyNet ?? 0) }}
                </span>
              </div>
              <div class="hi-stats">
                <div class="hi-stat">
                  <span class="hi-stat-label">总资产</span>
                  <span class="hi-stat-value green">{{ fmt(r.calc?.familyTotalAsset ?? 0) }}</span>
                </div>
                <div class="hi-stat">
                  <span class="hi-stat-label">总欠款</span>
                  <span class="hi-stat-value red">{{ fmt(r.calc?.familyTotalDebt ?? 0) }}</span>
                </div>
                <div class="hi-stat">
                  <span class="hi-stat-label">小新净值</span>
                  <span class="hi-stat-value">{{ fmt(r.calc?.xiaoxinNet ?? 0) }}</span>
                </div>
                <div class="hi-stat">
                  <span class="hi-stat-label">小闹净值</span>
                  <span class="hi-stat-value">{{ fmt(r.calc?.xiaonaoNet ?? 0) }}</span>
                </div>
              </div>
              <div class="hi-tags">
                <span class="tag">微信 {{ fmt(lineSub(r, 'wechat')) }}</span>
                <span class="tag">支付宝 {{ fmt(lineSub(r, 'alipay')) }}</span>
                <span class="tag">银行卡 {{ fmt(lineSub(r, 'bankCard')) }}</span>
                <span class="tag">理财 {{ fmt(lineSub(r, 'investment')) }}</span>
                <span class="tag">其他 {{ fmt(lineSub(r, 'other')) }}</span>
                <span class="tag tag-red">欠款 {{ fmt(allDebt(r)) }}</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <!-- 重置账本 -->
      <div class="reset-area">
        <button class="btn-reset" @click="onReset">重置账本（清空全部数据）</button>
      </div>
    </template>
  </div>
</template>

<script setup>
import { ref, reactive, computed, watch, onMounted, onBeforeUnmount, nextTick } from 'vue';
import { useRouter } from 'vue-router';
import { ElMessageBox, ElMessage } from 'element-plus';
import * as echarts from 'echarts';
import PersonSummaryCard from '../components/PersonSummaryCard.vue';
import { useAssetStore, ASSET_KEYS, DEBT_KEYS } from '../store/assetStore.js';

const router = useRouter();
const store = useAssetStore();

// 最新一条记录：用真正的 computed，保证响应式更新
const latest = computed(() => store.latest);

// 资产总览项（模板遍历用）
const overviewItems = computed(() => {
  const l = store.latest;
  if (!l) return [];
  return [
    { label: '微信', value: sumAsset('wechat') },
    { label: '支付宝', value: sumAsset('alipay') },
    { label: '银行卡', value: sumAsset('bankCard') },
    { label: '现金', value: sumAsset('cash') },
    { label: '理财', value: sumAsset('investment') },
    { label: '其他', value: sumAsset('other') },
    { label: '信用卡欠款', value: sumDebt('creditCard'), cls: 'is-debt' },
  ];
});

const chartEl = ref(null);
let chart = null;

// 左滑删除状态
const DELETE_WIDTH = 76;
const offsets = reactive({});
const touchState = reactive({
  id: null,
  startX: 0,
  startY: 0,
  current: 0,
  dragging: false,
  horizontal: null,
});

function fmt(n) {
  const v = Number(n) || 0;
  return v.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function num(v) {
  const n = Number(v);
  return Number.isFinite(n) && n >= 0 ? n : 0;
}

function sumAsset(key) {
  const l = store.latest;
  if (!l) return 0;
  return num(l.assets?.[key]?.xiaoxin) + num(l.assets?.[key]?.xiaonao);
}

function sumDebt(key) {
  const l = store.latest;
  if (!l) return 0;
  return num(l.debt?.[key]?.xiaoxin) + num(l.debt?.[key]?.xiaonao);
}

function lineSub(r, key) {
  return num(r.assets?.[key]?.xiaoxin) + num(r.assets?.[key]?.xiaonao);
}

function allDebt(r) {
  return DEBT_KEYS.reduce(
    (s, k) => s + num(r.debt?.[k]?.xiaoxin) + num(r.debt?.[k]?.xiaonao),
    0
  );
}

function netClass(v) {
  const n = Number(v) || 0;
  if (n > 0) return 'green';
  if (n < 0) return 'red';
  return '';
}

function goAdd() {
  router.push('/add');
}

// 点击：若当前项已展开删除按钮，先收起；否则进入编辑
function onItemClick(r, e) {
  if (touchState.dragging) return;
  if (offsets[r.id]) {
    offsets[r.id] = 0;
    return;
  }
  // 关闭其他展开项
  Object.keys(offsets).forEach((k) => (offsets[k] = 0));
  router.push({ path: '/add', query: { id: r.id } });
}

// ===== 左滑删除 touch 逻辑 =====
function onTouchStart(e, id) {
  const t = e.touches[0];
  touchState.id = id;
  touchState.startX = t.clientX;
  touchState.startY = t.clientY;
  touchState.current = offsets[id] || 0;
  touchState.dragging = false;
  touchState.horizontal = null;
}

function onTouchMove(e, id) {
  if (touchState.id !== id) return;
  const t = e.touches[0];
  const dx = t.clientX - touchState.startX;
  const dy = t.clientY - touchState.startY;
  // 判断主方向（水平/垂直），仅水平才拦截
  if (touchState.horizontal === null) {
    if (Math.abs(dx) < 6 && Math.abs(dy) < 6) return;
    touchState.horizontal = Math.abs(dx) > Math.abs(dy);
  }
  if (!touchState.horizontal) return;
  // 阻止垂直滚动被误触
  e.preventDefault();
  touchState.dragging = true;
  let next = touchState.current + dx;
  if (next > 0) next = 0; // 不允许向右滑出
  if (next < -DELETE_WIDTH) {
    // 超过删除按钮宽度，加阻尼
    next = -DELETE_WIDTH - (-(next + DELETE_WIDTH)) * 0.3;
  }
  offsets[id] = next;
}

function onTouchEnd(e, id) {
  if (touchState.id !== id) return;
  const cur = offsets[id] || 0;
  // 超过一半阈值则吸附展开，否则收回
  offsets[id] = cur < -DELETE_WIDTH / 2 ? -DELETE_WIDTH : 0;
  // 延迟复位 dragging 标记，避免触发 click 编辑
  setTimeout(() => {
    touchState.dragging = false;
    touchState.horizontal = null;
  }, 50);
}

// 数据变化时关闭所有展开项
watch(
  () => store.records,
  () => {
    Object.keys(offsets).forEach((k) => (offsets[k] = 0));
    nextTick(() => renderChart());
  },
  { deep: true }
);

async function confirmDelete(r) {
  try {
    await ElMessageBox.confirm(
      `确定删除 ${r.recordDate} 这条记录吗？此操作不可恢复。`,
      '删除确认',
      {
        confirmButtonText: '确认删除',
        cancelButtonText: '取消',
        type: 'warning',
      }
    );
    await store.remove(r.id);
    ElMessage.success('已删除');
  } catch (e) {
    // 取消
  }
}

async function onReset() {
  try {
    await ElMessageBox.confirm(
      '此操作将清空账本全部数据，且不可恢复，确定继续吗？',
      '重置账本',
      {
        confirmButtonText: '确认清空',
        cancelButtonText: '取消',
        type: 'warning',
      }
    );
    await store.resetAll();
    ElMessage.success('账本已清空');
  } catch (e) {
    // 取消
  }
}

function renderChart() {
  if (store.count < 2) {
    if (chart) {
      chart.dispose();
      chart = null;
    }
    return;
  }
  if (!chartEl.value) return;
  if (!chart) {
    chart = echarts.init(chartEl.value);
  }
  const data = store.trendData;
  // Y 轴以「万」为单位显示
  const toWan = (v) => {
    const w = (Number(v) || 0) / 10000;
    return Math.round(w * 100) / 100;
  };
  chart.clear();
  chart.setOption({
    grid: { left: 52, right: 18, top: 20, bottom: 40 },
    tooltip: {
      trigger: 'axis',
      formatter: (params) => {
        const p = params[0];
        // tooltip 显示原始「元」值，避免单位换算误差
        return `${p.axisValue}<br/>家庭净值: ${fmt(p.value)} 元`;
      },
    },
    xAxis: {
      type: 'category',
      boundaryGap: false,
      data: data.map((d) => d.date),
      axisLabel: { fontSize: 11, color: '#909399' },
    },
    yAxis: {
      type: 'value',
      axisLabel: {
        fontSize: 11,
        color: '#909399',
        formatter: (v) => toWan(v) + '万',
      },
      splitLine: { lineStyle: { color: '#f0f2f5' } },
    },
    series: [
      {
        type: 'line',
        smooth: true,
        symbol: 'circle',
        symbolSize: 6,
        data: data.map((d) => Number(d.familyNet) || 0),
        lineStyle: { color: '#1976d2', width: 2 },
        itemStyle: { color: '#1976d2' },
        areaStyle: {
          color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
            { offset: 0, color: 'rgba(25,118,210,0.25)' },
            { offset: 1, color: 'rgba(25,118,210,0.02)' },
          ]),
        },
      },
    ],
  });
}

function onResize() {
  chart && chart.resize();
}

onMounted(async () => {
  if (!store.loaded) await store.fetchAll();
  nextTick(() => renderChart());
  window.addEventListener('resize', onResize);
});

onBeforeUnmount(() => {
  window.removeEventListener('resize', onResize);
  if (chart) {
    chart.dispose();
    chart = null;
  }
});
</script>

<style scoped>
.summary-page {
  padding-bottom: calc(var(--safe-bottom) + 28px);
}

/* ===== 顶部栏 ===== */
.hero-header {
  position: sticky;
  top: 0;
  z-index: 10;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: calc(var(--safe-top) + 14px) 16px 14px;
  background: linear-gradient(135deg, #1976d2 0%, #1565c0 100%);
  color: #fff;
  margin: calc(var(--safe-top) * -1 - 12px) -12px 14px;
  box-shadow: 0 4px 16px rgba(25, 118, 210, 0.25);
}
.page-title {
  font-size: 19px;
  font-weight: 700;
  letter-spacing: 0.5px;
}
.add-fab {
  width: 38px;
  height: 38px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.22);
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  backdrop-filter: blur(4px);
  transition: transform 0.15s, background 0.15s;
}
.add-fab:active {
  transform: scale(0.9);
  background: rgba(255, 255, 255, 0.35);
}

.state-tip {
  text-align: center;
  color: #909399;
  padding: 48px 0;
  font-size: 14px;
}

/* ===== 家庭总览英雄卡 ===== */
.hero-card {
  background: linear-gradient(135deg, #e8f1ff 0%, #f3f8ff 50%, #eef6ff 100%);
  border: 1px solid #d6e6ff;
  border-radius: 16px;
  padding: 16px;
  margin-bottom: 14px;
  box-shadow: 0 4px 14px rgba(25, 118, 210, 0.1);
}
.hero-card-top {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 14px;
}
.hero-title {
  font-size: 15px;
  font-weight: 700;
  color: #1f3a5f;
}
.hero-date {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 11px;
  color: #6b8aaf;
  background: rgba(25, 118, 210, 0.08);
  padding: 3px 8px;
  border-radius: 10px;
}
.hero-empty {
  text-align: center;
  color: #7a8fab;
  padding: 16px 0;
  font-size: 13px;
}
.hero-body {
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.hero-net {
  flex: 1.4;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background: #fff;
  border-radius: 12px;
  padding: 18px 8px;
  box-shadow: 0 3px 12px rgba(25, 118, 210, 0.12);
}
.hn-label {
  font-size: 12px;
  color: #909399;
}
.hn-value {
  font-size: 26px;
  font-weight: 800;
  color: var(--color-primary);
  letter-spacing: 0.5px;
  margin: 4px 0 2px;
  font-variant-numeric: tabular-nums;
}
.hn-sub {
  font-size: 11px;
  color: #b0b8c4;
}
.hero-side {
  display: flex;
  gap: 10px;
}
.hs-cell {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background: #fff;
  border-radius: 12px;
  padding: 12px 10px;
}
.hs-label {
  font-size: 11px;
  color: #909399;
}
.hs-value {
  font-size: 17px;
  font-weight: 700;
  margin-top: 2px;
  font-variant-numeric: tabular-nums;
}

/* ===== 双人卡片行 ===== */
.person-row {
  display: flex;
  gap: 10px;
  margin-bottom: 14px;
}

/* ===== 通用卡片 ===== */
.card {
  background: #fff;
  border-radius: 14px;
  padding: 16px;
  margin-bottom: 14px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.04);
}
.card-title {
  font-size: 14px;
  font-weight: 700;
  color: #303133;
  margin-bottom: 12px;
  display: flex;
  align-items: center;
  gap: 8px;
}
.ct-bar {
  width: 4px;
  height: 15px;
  border-radius: 2px;
  background: linear-gradient(180deg, #1976d2, #42a5f5);
  display: inline-block;
}
.card-sub {
  margin-left: auto;
  font-size: 11px;
  font-weight: 400;
  color: #c0c4cc;
}
.card-empty {
  text-align: center;
  color: #909399;
  padding: 14px 0;
  font-size: 13px;
}

/* ===== 资产总览 grid ===== */
.ov-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 10px;
}
.ov-item {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 12px;
  border-radius: 10px;
  background: linear-gradient(135deg, #f7f9fc 0%, #eef2f7 100%);
  border-left: 3px solid #1976d2;
}
.ov-item.is-debt {
  border-left-color: var(--color-red);
}
.ov-label {
  font-size: 12px;
  color: #909399;
}
.ov-value {
  font-size: 16px;
  font-weight: 700;
  color: #303133;
  font-variant-numeric: tabular-nums;
}
.ov-value.red { color: var(--color-red); }

/* ===== 趋势 ===== */
.trend-empty {
  text-align: center;
  color: #909399;
  padding: 32px 0;
  font-size: 13px;
  background: #f7f9fc;
  border-radius: 10px;
}
.trend-chart {
  width: 100%;
  height: 220px;
}

/* ===== 历史记录 ===== */
.history-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.swipe-wrap {
  position: relative;
  overflow: hidden;
  border-radius: 12px;
}
.swipe-actions {
  position: absolute;
  top: 0;
  right: 0;
  bottom: 0;
  display: flex;
  align-items: stretch;
}
.swipe-del {
  width: 76px;
  background: linear-gradient(180deg, #ef5350 0%, #d32f2f 100%);
  color: #fff;
  font-size: 13px;
  font-weight: 600;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 4px;
}
.history-item {
  position: relative;
  z-index: 1;
  padding: 12px;
  border-radius: 12px;
  background: #fff;
  border: 1px solid #eef0f4;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.03);
  transition: transform 0.2s ease;
  touch-action: pan-y;
}
.hi-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 10px;
}
.hi-date {
  font-weight: 700;
  font-size: 15px;
  color: #303133;
}
.hi-badge {
  font-size: 13px;
  font-weight: 700;
  padding: 4px 12px;
  border-radius: 20px;
  background: #f0f2f5;
  color: #606266;
  font-variant-numeric: tabular-nums;
}
.hi-badge.green { background: #e8f7ee; color: #2e9e5b; }
.hi-badge.red { background: #fdecea; color: #d32f2f; }
.hi-stats {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 8px;
  margin-bottom: 10px;
}
.hi-stat {
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.hi-stat-label {
  font-size: 11px;
  color: #909399;
}
.hi-stat-value {
  font-size: 13px;
  font-weight: 600;
  color: #303133;
  font-variant-numeric: tabular-nums;
}
.hi-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}
.tag {
  font-size: 11px;
  color: #606266;
  background: #f4f6f9;
  padding: 3px 8px;
  border-radius: 6px;
  font-variant-numeric: tabular-nums;
}
.tag-red {
  background: #fdecea;
  color: #d32f2f;
}

/* ===== 重置 ===== */
.reset-area {
  text-align: center;
  padding: 8px 0 4px;
}
.btn-reset {
  width: 100%;
  height: 44px;
  border-radius: 22px;
  background: #fff;
  color: var(--color-red);
  border: 1px solid #f0c4c2;
  font-size: 14px;
  font-weight: 600;
}
.btn-reset:active {
  background: #fdecea;
}

.red { color: var(--color-red); }
.green { color: var(--color-green); }
</style>
