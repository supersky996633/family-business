<template>
  <transition name="pwd-fade">
    <div v-if="visible" class="pwd-mask" @click.self="onCancel">
      <div class="pwd-box" @click.stop>
        <div class="pwd-icon">
          <svg viewBox="0 0 24 24" width="30" height="30" fill="none" stroke="#1976d2" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
            <rect x="4.5" y="10.5" width="15" height="10" rx="2.5"/>
            <path d="M8 10.5V7a4 4 0 0 1 8 0v3.5"/>
          </svg>
        </div>
        <div class="pwd-title">操作校验</div>
        <div class="pwd-desc">进行新增 / 编辑 / 删除操作前，请输入密码解锁</div>
        <div class="pwd-field" :class="{ 'is-error': error }">
          <svg class="pf-leading" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="#909399" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <rect x="4" y="10" width="16" height="11" rx="2"/>
            <path d="M8 10V7a4 4 0 0 1 8 0v3"/>
          </svg>
          <input
            ref="inputRef"
            v-model="value"
            :type="showPwd ? 'text' : 'password'"
            class="pwd-input"
            placeholder="请输入操作密码"
            autocomplete="off"
            @keyup.enter="onConfirm"
            @keyup.esc="onCancel"
            @input="error = false"
          />
          <button class="pf-toggle" type="button" @click="showPwd = !showPwd" tabindex="-1">
            <svg v-if="showPwd" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="#909399" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
            <svg v-else viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="#c0c4cc" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
          </button>
        </div>
        <transition name="err-fade">
          <div v-if="error" class="pwd-error">
            <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="#f56c6c" stroke-width="2.5" stroke-linecap="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
            密码错误，请重试
          </div>
        </transition>
        <div class="pwd-actions">
          <button class="pwd-btn cancel" @click="onCancel">取消</button>
          <button class="pwd-btn confirm" :disabled="loading" @click="onConfirm">
            <span v-if="loading" class="spin" />
            <span>{{ loading ? '校验中' : '确认解锁' }}</span>
          </button>
        </div>
      </div>
    </div>
  </transition>
</template>

<script setup>
import { ref, watch, nextTick } from 'vue';
import { verifyPassword, setUnlocked } from '../utils/auth.js';

const props = defineProps({
  visible: { type: Boolean, default: false },
});
const emit = defineEmits(['success', 'cancel']);

const value = ref('');
const error = ref(false);
const showPwd = ref(false);
const loading = ref(false);
const inputRef = ref(null);

watch(
  () => props.visible,
  (v) => {
    if (v) {
      value.value = '';
      error.value = false;
      nextTick(() => inputRef.value?.focus());
    }
  },
);

function onConfirm() {
  if (!value.value) {
    error.value = true;
    return;
  }
  loading.value = true;
  // 异步化以保留 UI 响应感
  setTimeout(() => {
    if (verifyPassword(value.value)) {
      setUnlocked();
      error.value = false;
      value.value = '';
      loading.value = false;
      emit('success');
    } else {
      error.value = true;
      loading.value = false;
      nextTick(() => inputRef.value?.select());
    }
  }, 150);
}

function onCancel() {
  error.value = false;
  value.value = '';
  emit('cancel');
}
</script>

'<style scoped>
.pwd-mask {
  position: fixed;
  inset: 0;
  z-index: 9999;
  background: rgba(30, 41, 59, 0.6);
  backdrop-filter: blur(6px);
  display: flex;
  align-items: center;
  justify-content: center;
}
.pwd-box {
  width: 86%;
  max-width: 360px;
  background: #fff;
  border-radius: 22px;
  padding: 26px 22px 20px;
  box-shadow: 0 24px 64px rgba(0, 0, 0, 0.28);
  animation: pop-in 0.26s cubic-bezier(0.16, 1, 0.3, 1);
}
@keyframes pop-in {
  from { opacity: 0; transform: translateY(12px) scale(0.96); }
  to { opacity: 1; transform: translateY(0) scale(1); }
}
.pwd-icon {
  width: 56px;
  height: 56px;
  margin: 0 auto 12px;
  border-radius: 50%;
  background: rgba(25, 118, 210, 0.1);
  display: flex;
  align-items: center;
  justify-content: center;
}
.pwd-title {
  font-size: 18px;
  font-weight: 700;
  text-align: center;
  color: #1d2129;
}
.pwd-desc {
  font-size: 12.5px;
  color: #86909c;
  text-align: center;
  margin: 6px 0 18px;
  line-height: 1.5;
}
.pwd-field {
  display: flex;
  align-items: center;
  gap: 8px;
  height: 48px;
  border-radius: 12px;
  background: #f5f7fa;
  border: 1.5px solid transparent;
  padding: 0 12px;
  transition: border-color 0.18s, background 0.18s, box-shadow 0.18s;
}
.pwd-field:focus-within {
  border-color: #1976d2;
  background: #fff;
  box-shadow: 0 0 0 4px rgba(25, 118, 210, 0.1);
}
.pwd-field.is-error {
  border-color: #f56c6c;
  background: #fef0f0;
  animation: shake 0.35s;
}
@keyframes shake {
  0%, 100% { transform: translateX(0); }
  25% { transform: translateX(-5px); }
  75% { transform: translateX(5px); }
}
.pf-leading {
  flex-shrink: 0;
}
.pwd-input {
  flex: 1;
  min-width: 0;
  border: none;
  background: transparent;
  font-size: 16px;
  letter-spacing: 1px;
  outline: none;
  height: 100%;
}
.pf-toggle {
  flex-shrink: 0;
  border: none;
  background: transparent;
  padding: 4px;
  display: flex;
  align-items: center;
  cursor: pointer;
}
.pwd-error {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-top: 10px;
  font-size: 12.5px;
  color: #f56c6c;
  justify-content: center;
}
.pwd-actions {
  display: flex;
  gap: 12px;
  margin-top: 18px;
}
.pwd-btn {
  flex: 1;
  height: 44px;
  border-radius: 22px;
  font-size: 15px;
  font-weight: 600;
  border: none;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  transition: transform 0.15s, background 0.15s, opacity 0.15s;
}
.pwd-btn:active {
  transform: scale(0.96);
}
.pwd-btn.cancel {
  background: #f2f5f9;
  color: #606266;
}
.pwd-btn.confirm {
  background: linear-gradient(135deg, #1e88e5, #1976d2);
  color: #fff;
  box-shadow: 0 6px 16px rgba(25, 118, 210, 0.32);
}
.pwd-btn.confirm:disabled {
  opacity: 0.7;
}
.spin {
  width: 15px;
  height: 15px;
  border: 2px solid rgba(255, 255, 255, 0.4);
  border-top-color: #fff;
  border-radius: 50%;
  animation: spin 0.6s linear infinite;
}
@keyframes spin {
  to { transform: rotate(360deg); }
}
.err-fade-enter-active,
.err-fade-leave-active {
  transition: opacity 0.2s;
}
.err-fade-enter-from,
.err-fade-leave-to {
  opacity: 0;
}
.pwd-fade-enter-active,
.pwd-fade-leave-active {
  transition: opacity 0.22s ease;
}
.pwd-fade-enter-from,
.pwd-fade-leave-to {
  opacity: 0;
}
</style>