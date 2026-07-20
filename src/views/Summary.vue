<template>
  <div class="page summary-page">
    <!-- 顶部标题栏 -->
    <div class="header">
      <span class="page-title">家庭资产汇总</span>
      <button class="add-fab" @click="goAdd" aria-label="新增">+</button>
    </div>

    <!-- 加载/空状态 -->
    <div v-if="store.loading && !store.loaded" class="state-tip">加载中…</div>

    <template v-else>
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
      <div class="section-card overview">
        <div class="block-title">最新账面资产总览</div>
        <div v-if="!latest" class="muted" style="padding:8px 0;">
          暂无记录，点击右上角 + 开始记账
        </div>
        <div v-else class="overview-grid">
          <div class="overview-item">
            <span class="ov-label">微信</span>
            <span class="ov-value amount">{{ fmt(sumAsset('wechat')) }}</span>
          </div>
          <div class="overview-item">
            <span class="ov-label">支付宝</span>
            <span class="ov-value amount">{{ fmt(sumAsset('alipay')) }}</span>
          </div>
          <div class="overview-item">
            <span class="ov-label">银行卡</span>
            <span class="ov-value amount">{{ fmt(sumAsset('bankCard')) }}</span>
          </div>
          <div class="overview-item">
            <span class="ov-label">现金</span>
            <span class="ov-value amount">{{ fmt(sumAsset('cash')) }}</span>
          </div>
          <div class="overview-item">
            <span class="ov-label">其他</span>
            <span class="ov-value amount">{{ fmt(sumAsset('other')) }}</span>
          </div>
          <div class="overview-item">
            <span class="ov-label">信用卡欠款</span>
            <span class="ov-value amount red">{{ fmt(sumDebt('creditCard')) }}</span>
          </div>
        </div>
      </div>

      <!-- 资产趋势 -->
      <div class="section-card">
        <div class="block-title">家庭总净值趋势</div>
        <div v-if="store.count < 2" class="trend-empty">
          至少记录 2 次可查看趋势曲线
        </div>
        <div v-else ref="chartEl" class="trend-chart"></div>
      </div>

      <!-- 历史记录列表 -->
      <div class="section-card">
        <div class="block-title">历史记录<span class="block-sub">左滑可删除，点击编辑</span></div>
        <div v-if="store.count === 0" class="muted" style="padding:8px 0;">
          暂无历史记录
        </div>
        <div v-else class="history-list">
          <div
            v-for="r in store.records"
            :key="r.id"
            class="swipe-wrap"
          >
            <div class="swipe-actions">
              <button class="swipe-del" @click.stop="confirmDelete(r)">删除</button>
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
                <span class="hi-net amount" :class="netClass(r.calc?.familyNet)">
                  净值 {{ fmt(r.calc?.familyNet ?? 0) }}
                </span>
              </div>
              <div class="hi-line">
                <span>总资产 {{ fmt(r.calc?.familyTotalAsset ?? 0) }}</span>
                <span class="red">欠款 {{ fmt(r.calc?.familyTotalDebt ?? 0) }}</span>
              </div>
              <div class="hi-line">
                <span>小新净值 {{ fmt(r.calc?.xiaoxinNet ?? 0) }}</span>
                <span>小闹净值 {{ fmt(r.calc?.xiaonaoNet ?? 0) }}</span>
              </div>
              <div class="hi-line muted small">
                <span>微信 {{ fmt(lineSub(r, 'wechat')) }}</span>
                <span>支付宝 {{ fmt(lineSub(r, 'alipay')) }}</span>
                <span>银行卡 {{ fmt(lineSub(r, 'bankCard')) }}</span>
                <span>其他 {{ fmt(lineSub(r, 'other')) }}</span>
                <span>欠款 {{ fmt(allDebt(r)) }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- 重置账本 -->
      <div class="section-card reset-area">
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
  padding-bottom: calc(var(--safe-bottom) + 24px);
}
.header {
  position: sticky;
  top: 0;
  z-index: 10;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: calc(var(--safe-top) + 12px) 12px 12px;
  background: #fff;
  border-bottom: 1px solid #ebeef5;
  margin: -12px -12px 12px;
}
.page-title {
  font-size: 18px;
  font-weight: 700;
  color: #303133;
}
.add-fab {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: var(--color-primary);
  color: #fff;
  font-size: 26px;
  line-height: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 2px 8px rgba(25, 118, 210, 0.35);
}
.state-tip {
  text-align: center;
  color: #909399;
  padding: 40px 0;
}
.person-row {
  display: flex;
  gap: 10px;
  margin-bottom: 12px;
}
.block-title {
  font-size: 14px;
  font-weight: 600;
  color: #303133;
  margin-bottom: 10px;
  padding-bottom: 6px;
  border-bottom: 1px solid #f0f2f5;
  display: flex;
  justify-content: space-between;
  align-items: baseline;
}
.block-sub {
  font-size: 11px;
  font-weight: 400;
  color: #c0c4cc;
}
.overview-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 10px;
}
.overview-item {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 8px;
  background: #fafbfc;
  border-radius: 8px;
}
.ov-label {
  font-size: 12px;
  color: #909399;
}
.ov-value {
  font-size: 14px;
  font-weight: 600;
  color: #303133;
}
.red { color: var(--color-red); }
.green { color: var(--color-green); }
.trend-empty {
  text-align: center;
  color: #909399;
  padding: 24px 0;
  font-size: 13px;
}
.trend-chart {
  width: 100%;
  height: 220px;
}
.history-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}
/* 左滑删除容器 */
.swipe-wrap {
  position: relative;
  overflow: hidden;
  border-radius: 10px;
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
  background: var(--color-red);
  color: #fff;
  font-size: 14px;
  font-weight: 600;
}
.history-item {
  position: relative;
  z-index: 1;
  padding: 10px;
  border-radius: 10px;
  background: #fafbfc;
  border: 1px solid #f0f2f5;
  transition: transform 0.2s ease;
  touch-action: pan-y;
}
.hi-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 6px;
}
.hi-date {
  font-weight: 600;
  font-size: 14px;
  color: #303133;
}
.hi-net {
  font-weight: 600;
  font-size: 14px;
}
.hi-line {
  display: flex;
  gap: 16px;
  font-size: 13px;
  color: #606266;
  margin: 2px 0;
}
.hi-line.small {
  font-size: 12px;
  flex-wrap: wrap;
  gap: 8px 12px;
}
.reset-area {
  text-align: center;
}
.btn-reset {
  width: 100%;
  height: 42px;
  border-radius: 21px;
  background: #fff;
  color: var(--color-red);
  border: 1px solid var(--color-red);
  font-size: 14px;
  font-weight: 600;
}
</style>
