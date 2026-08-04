<template>
  <div class="app-root">
    <router-view v-show="pageUnlocked" />

    <!-- 首页访问锁定遮罩 -->
    <transition name="welcome-fade">
      <div v-if="!pageUnlocked" class="welcome-page">
        <div class="welcome-bg-circle c1"></div>
        <div class="welcome-bg-circle c2"></div>
        <div class="welcome-bg-circle c3"></div>
        <div class="welcome-content">
          <div class="welcome-logo">
            <svg viewBox="0 0 24 24" width="38" height="38" fill="none" stroke="#fff" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
              <path d="M3 9.5L12 3l9 6.5V20a1 1 0 0 1-1 1h-5v-6h-6v6H4a1 1 0 0 1-1-1V9.5z"/>
            </svg>
          </div>
          <h1 class="welcome-title">家庭资产管理</h1>
          <p class="welcome-subtitle">让每一笔家庭资产清晰可见</p>
          <button class="welcome-enter-btn" @click="onEnterClick">
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <rect x="4" y="10" width="16" height="11" rx="2"/>
              <path d="M8 10V7a4 4 0 0 1 8 0v3"/>
            </svg>
            <span>进入</span>
          </button>
          <p class="welcome-hint">点击进入，输入密码查看</p>
        </div>
      </div>
    </transition>

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
const pageUnlocked = ref(!hasPwdConfigured() || isUnlocked());
const dataLoaded = ref(false);
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

function onEnterClick() {
  // 已解锁则直接进入
  if (isUnlocked()) {
    pageUnlocked.value = true;
    if (!dataLoaded.value) {
      dataLoaded.value = true;
      store.fetchAll();
    }
    return;
  }
  pwdVisible.value = true;
}

function onPwdSuccess() {
  pwdVisible.value = false;
  const wasLocked = !pageUnlocked.value;
  pageUnlocked.value = true;
  refreshLockState();
  resolveUnlock();
  // 首次页面解锁后拉取数据
  if (wasLocked && !dataLoaded.value) {
    dataLoaded.value = true;
    store.fetchAll();
  }
  ElMessage.success('解锁成功');
}

function onPwdCancel() {
  pwdVisible.value = false;
  rejectUnlock();
}

function onToggleLock() {
  lock();
  refreshLockState();
  // 手动锁定后，页面重新需密码访问
  if (hasPwdConfigured()) {
    pageUnlocked.value = false;
  }
  ElMessage.info('已锁定，增删改操作需重新输入密码');
}

onMounted(() => {
  // 首页访问需先解锁，解锁后再拉取数据
  if (!pageUnlocked.value) {
  } else {
    dataLoaded.value = true;
    store.fetchAll();
  }
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
.welcome-page {
  position: fixed;
  inset: 0;
  z-index: 1400;
  overflow: hidden;
  background: linear-gradient(135deg, #0f4c81 0%, #1a6fb5 45%, #2680d6 100%);
  display: flex;
  align-items: center;
  justify-content: center;
}
.welcome-content {
  position: relative;
  z-index: 2;
  text-align: center;
  padding: 0 28px;
  animation: pop-in 0.26s cubic-bezier(0.16, 1, 0.3, 1);
}
@keyframes pop-in {
  from { opacity: 0; transform: translateY(20px) scale(0.94); }
  to { opacity: 1; transform: translateY(0) scale(1); }
}
.welcome-bg-circle {
  position: absolute;
  border-radius: 50%;
  opacity: 0.16;
  filter: blur(2px);
}
.welcome-bg-circle.c1 {
  width: 320px;
  height: 320px;
  top: -60px;
  right: -80px;
  background: #4fc3f7;
  animation: float-c1 8s ease-in-out infinite;
}
.welcome-bg-circle.c2 {
  width: 220px;
  height: 220px;
  bottom: -40px;
  left: -50px;
  background: #42a5f5;
  animation: float-c2 7s ease-in-out infinite;
}
.welcome-bg-circle.c3 {
  width: 140px;
  height: 140px;
  top: 30%;
  left: 55%;
  background: #81d4fa;
  animation: float-c3 9s ease-in-out infinite;
}
@keyframes float-c1 {
  0%, 100% { transform: translate(0, 0) scale(1); }
  50% { transform: translate(-12px, 14px) scale(1.06); }
}
@keyframes float-c2 {
  0%, 100% { transform: translate(0, 0) scale(1); }
  50% { transform: translate(16px, -10px) scale(1.04); }
}
@keyframes float-c3 {
  0%, 100% { transform: translate(0, 0) scale(1); }
  50% { transform: translate(-20px, -16px) scale(0.94); }
}
.welcome-logo {
  width: 80px;
  height: 80px;
  margin: 0 auto 20px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(255, 255, 255, 0.15);
  backdrop-filter: blur(10px);
  border: 1.5px solid rgba(255, 255, 255, 0.3);
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.12);
}
.welcome-title {
  font-size: 26px;
  font-weight: 700;
  color: #fff;
  letter-spacing: 1px;
  text-shadow: 0 2px 12px rgba(0, 0, 0, 0.18);
  margin: 0 0 8px;
}
.welcome-subtitle {
  font-size: 14px;
  color: rgba(255, 255, 255, 0.82);
  margin: 0 0 36px;
  font-weight: 400;
  letter-spacing: 0.5px;
}
.welcome-enter-btn {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 14px 48px;
  font-size: 16px;
  font-weight: 600;
  color: #0f4c81;
  background: #fff;
  border-radius: 999px;
  border: none;
  letter-spacing: 2px;
  box-shadow: 0 8px 28px rgba(0, 0, 0, 0.22), 0 2px 8px rgba(0, 0, 0, 0.1);
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}
.welcome-enter-btn:active {
  transform: scale(0.95);
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.2);
}
.welcome-hint {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.6);
  margin: 18px 0 0;
}
.welcome-fade-leave-active {
  transition: opacity 0.4s ease, transform 0.4s ease;
}
.welcome-fade-leave-to {
  opacity: 0;
  transform: scale(1.04);
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
