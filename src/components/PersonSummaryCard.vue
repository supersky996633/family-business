<template>
  <div class="person-card" :class="{ 'is-primary': person === 'xiaoxin' }">
    <div class="person-name">{{ name }}</div>
    <div class="row">
      <span class="label">总资产</span>
      <span class="value amount green">{{ fmt(totalAsset) }}</span>
    </div>
    <div class="row">
      <span class="label">总欠款</span>
      <span class="value amount red">{{ fmt(totalDebt) }}</span>
    </div>
    <div class="row">
      <span class="label">净值</span>
      <span class="value amount blue">{{ fmt(net) }}</span>
    </div>
  </div>
</template>

<script setup>
defineProps({
  person: { type: String, required: true },
  name: { type: String, required: true },
  totalAsset: { type: Number, default: 0 },
  totalDebt: { type: Number, default: 0 },
  net: { type: Number, default: 0 },
});

function fmt(n) {
  const v = Number(n) || 0;
  return v.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
</script>

<style scoped>
.person-card {
  flex: 1;
  background: #fff;
  border-radius: 14px;
  padding: 16px 14px;
  box-shadow: 0 4px 14px rgba(15, 76, 129, 0.07), 0 1px 3px rgba(0, 0, 0, 0.03);
  position: relative;
  overflow: hidden;
}
 .person-card::before {
  content: '';
  position: absolute;
  top: -24px;
  right: -24px;
  width: 70px;
  height: 70px;
  border-radius: 50%;
  background: linear-gradient(135deg, rgba(38, 128, 214, 0.06), rgba(79, 195, 247, 0.04));
  pointer-events: none;
}
.person-card.is-primary {
  border-top: 3px solid #2680d6;
}
.person-name {
  font-size: 15px;
  font-weight: 700;
  margin-bottom: 10px;
  color: #1f3a5f;
  position: relative;
  z-index: 1;
}
.row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin: 7px 0;
  position: relative;
  z-index: 1;
}
.label {
  color: #909399;
  font-size: 13px;
}
.value {
  font-weight: 600;
}
.green { color: var(--color-green); }
.red { color: var(--color-red); }
.blue { color: var(--color-blue); }
</style>
