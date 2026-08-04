<template>
  <header class="nav-header">
    <div class="nav-bg-circle c1"></div>
    <div class="nav-bg-circle c2"></div>
    <div class="nav-inner">
      <button v-if="showBack" class="nav-btn back" @click="onBack" aria-label="返回">
        <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 18l-6-6 6-6"/></svg>
      </button>
      <span v-else class="nav-btn-placeholder"></span>

      <span class="nav-title">{{ title }}</span>

      <router-link v-if="to" :to="to" class="nav-btn action" :class="btnClass">
        <svg v-if="icon === 'book'" viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 19.5A2.5 2.5 0 016.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z"/></svg>
        <svg v-else-if="icon === 'home'" viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 9.5L12 3l9 6.5V20a1 1 0 01-1 1h-5v-6h-6v6H4a1 1 0 01-1-1V9.5z"/></svg>
        <span v-if="label" class="nav-btn-text">{{ label }}</span>
      </router-link>
      <span v-else class="nav-btn-placeholder"></span>
    </div>
  </header>
</template>

<script setup>
import { useRouter } from 'vue-router'

const props = defineProps({
  title: { type: String, default: '' },
  showBack: { type: Boolean, default: false },
  to: { type: [String, Object], default: null },
  label: { type: String, default: '' },
  icon: { type: String, default: 'home' },
  btnClass: { type: String, default: '' },
})

const router = useRouter()

function onBack() {
  // 返回欢迎页：通知 App 收起路由视图并显示欢迎页
  window.dispatchEvent(new Event('back-home'))
}
</script>

<style scoped>
.nav-header {
  position: sticky;
  top: 0;
  z-index: 10;
  display: flex;
  align-items: center;
  background: linear-gradient(135deg, #0f4c81 0%, #1a6fb5 50%, #2680d6 100%);
  color: #fff;
  padding: calc(var(--safe-top) + 16px) 18px 16px;
  margin: calc(var(--safe-top) * -1 - 12px) -12px 16px;
  box-shadow: 0 6px 20px rgba(15, 76, 129, 0.3);
  overflow: hidden;
}
.nav-bg-circle {
  position: absolute;
  border-radius: 50%;
  filter: blur(2px);
  pointer-events: none;
}
.nav-bg-circle.c1 {
  top: -40px;
  right: -30px;
  width: 140px;
  height: 140px;
  background: rgba(255, 255, 255, 0.08);
}
.nav-bg-circle.c2 {
  bottom: -50px;
  left: 40%;
  width: 100px;
  height: 100px;
  background: rgba(79, 195, 247, 0.12);
}
.nav-inner {
  position: relative;
  z-index: 1;
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}
.nav-title {
  font-size: 18px;
  font-weight: 700;
  letter-spacing: 0.5px;
  text-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
  flex: 1;
  text-align: center;
}
.nav-btn {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  min-width: 38px;
  height: 38px;
  padding: 0 12px;
  border-radius: 999px;
  color: #fff;
  background: rgba(255, 255, 255, 0.2);
  backdrop-filter: blur(8px);
  border: 1px solid rgba(255, 255, 255, 0.25);
  box-shadow: 0 4px 14px rgba(0, 0, 0, 0.12);
  transition: transform 0.18s, background 0.18s;
  text-decoration: none;
}
.nav-btn:active {
  transform: scale(0.9);
  background: rgba(255, 255, 255, 0.35);
}
.nav-btn-text {
  font-size: 13px;
  font-weight: 600;
  white-space: nowrap;
}
.nav-btn-placeholder {
  min-width: 38px;
  height: 38px;
}
</style>
