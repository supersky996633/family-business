<template>
  <div class="app-root">
    <router-view />

    <!-- 右下角手动锁定按钮 -->
    <button
      v-if="showLockBtn"
      class="lock-btn"
      :class="{ 'is-locked': locked }"
      @click="onToggleLock"
    >
      <svg class="lock-svg" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <template v-if="locked">
          <rect x="5" y="11" width="14" height="9" rx="2"/>
          <path d="M8 11V7a4 4 0 0 1 8 0"/>
        </template>
        <template v-else>
          <rect x="5" y="11" width="14" height="9" rx="2"/>
          <path d="M8 11V7a4 4 0 0 1 8 0v4"/>
        </template>
      </svg>
      <span class="lock-text">{{ locked ? '已锁定' : '已解锁' }}</span>
    </button>

    <!-- 网络状态提示条 -->
    <div v-if="store.netError" class="net-tip">{{ store.netError }}</div>
    <!-- 同步中提示 -->
    <div v-if="store.syncing" class="sync-tip">正在同步离线改动…</div>

    <!-- 操作密码校验弹窗 -->
    <PwdDialog
      :visible="pwdVisible"
      @success="onPwdSuccess"
      @cancel="onPwdCancel"
    />
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onBeforeUnmount, watch } from 'vue';
import { ElMessage } from 'element-plus';
import { useAssetStore } from './store/assetStore.js';
import { registerOnlineListener } from './utils/sync.js';
import { isUnlocked, lock, hasPwdConfigured } from './utils/auth.js';
import { resolveUnlock, rejectUnlock } from './utils/auth-bridge.js';
import PwdDialog from './components/PwdDialog.vue';

const store = useAssetStore();

const pwdVisible = ref(false);
const locked = ref(!isUnlocked());
const showLockBtn = computed(() => hasPwdConfigured());

function refreshLockState() {
  locked.value = !isUnlocked();
}

function onNeedUnlock() {
  // store 触发 ensureUnlocked 时派发该事件
  if (isUnlocked()) {
    resolveUnlock();
    return;
  }
  pwdVisible.value = true;
}

function onPwdSuccess() {
  pwdVisible.value = false;
  refreshLockState();
  resolveUnlock();
  ElMessage.success('解锁成功');
}

function onPwdCancel() {
  pwdVisible.value = false;
  rejectUnlock();
}

function onToggleLock() {
  lock();
  refreshLockState();
  ElMessage.info('已锁定，增删改操作需重新输入密码');
}

onMounted(() => {
  store.fetchAll();
  registerOnlineListener(async (res) => {
    ElMessage.success(`已恢复在线，同步了 ${res.synced} 条离线改动`);
    await store.onBackOnline(res);
  });
  window.addEventListener('need-unlock', onNeedUnlock);
  window.addEventListener('visibilitychange', refreshLockState);
});

onBeforeUnmount(() => {
  window.removeEventListener('need-unlock', onNeedUnlock);
  window.removeEventListener('visibilitychange', refreshLockState);
});

watch(
  () => store.netError,
  (val) => {
    if (val) ElMessage.warning(val);
  },
);
</script>

<style scoped>
.app-root {
  position: relative;
}
.lock-btn {
  position: fixed;
  right: 14px;
  bottom: calc(var(--safe-bottom, 0px) + 18px);
  z-index: 2000;
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 14px 8px 11px;
  font-size: 12px;
  font-weight: 600;
  border-radius: 999px;
  border: none;
  color: #1976d2;
  background: rgba(255, 255, 255, 0.92);
  box-shadow: 0 4px 16px rgba(25, 118, 210, 0.22), 0 1px 3px rgba(0, 0, 0, 0.06);
  backdrop-filter: blur(8px);
  transition: transform 0.18s ease, box-shadow 0.18s ease, background 0.18s;
}
.lock-btn:active {
  transform: scale(0.93);
}
.lock-btn.is-locked {
  color: #f56c6c;
  background: rgba(255, 245, 245, 0.95);
  box-shadow: 0 4px 16px rgba(245, 108, 108, 0.25), 0 1px 3px rgba(0, 0, 0, 0.06);
}
.lock-svg {
  flex-shrink: 0;
}

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
