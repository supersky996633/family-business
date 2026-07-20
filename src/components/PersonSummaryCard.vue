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
  border-radius: 12px;
  padding: 14px;
  box-shadow: 0 1px 6px rgba(0, 0, 0, 0.05);
}
.person-card.is-primary {
  border-top: 3px solid var(--color-primary);
}
.person-name {
  font-size: 15px;
  font-weight: 600;
  margin-bottom: 8px;
  color: #303133;
}
.row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin: 6px 0;
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
