<template>
  <router-view />
  <!-- 网络状态提示条 -->
  <div v-if="store.netError" class="net-tip">{{ store.netError }}</div>
  <!-- 同步中提示 -->
  <div v-if="store.syncing" class="sync-tip">正在同步离线改动…</div>
</template>

<script setup>
import { onMounted, watch } from 'vue';
import { useAssetStore } from './store/assetStore.js';
import { registerOnlineListener } from './utils/sync.js';
import { ElMessage } from 'element-plus';

const store = useAssetStore();

onMounted(() => {
  // 启动时拉取数据（云端优先，本地兜底）
  store.fetchAll();
  // 注册在线监听：离线→在线自动回放队列
  registerOnlineListener(async (res) => {
    ElMessage.success(`已恢复在线，同步了 ${res.synced} 条离线改动`);
    await store.onBackOnline(res);
  });
});

// 监听网络错误，做即时提示
watch(
  () => store.netError,
  (val) => {
    if (val) ElMessage.warning(val);
  },
);
</script>

<style scoped>
.net-tip {
  position: fixed;
  left: 0;
  right: 0;
  top: 0;
  z-index: 3000;
  text-align: center;
  padding: 8px;
  font-size: 12px;
  color: #fff;
  background: #e6a23c;
}
.sync-tip {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 3000;
  text-align: center;
  padding: 8px;
  font-size: 12px;
  color: #fff;
  background: #1976d2;
}
</style>
