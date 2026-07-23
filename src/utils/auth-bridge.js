/**
 * 解锁守卫桥接：store 层调用 ensureUnlocked()，UI 层挂载 PwdDialog 响应
 * - 已解锁：直接 resolve
 * - 未解锁：等待一次 resolve/reject（由弹窗 confirm/cancel 触发）
 */
import { isUnlocked, hasPwdConfigured } from './auth.js';

let pendingResolve = null;
let pendingReject = null;

/** 是否有正在等待的解锁请求 */
export function hasPendingUnlock() {
  return !!pendingResolve;
}

/**
 * 触发一次解锁流程：
 * - 未配置密码哈希：直接放行（兼容未启用校验的场景）
 * - 已在有效解锁期内：直接放行
 * - 否则挂起，等待 resolveUnlock/rejectUnlock
 */
export function ensureUnlocked() {
  if (!hasPwdConfigured()) return Promise.resolve();
  if (isUnlocked()) return Promise.resolve();
  return new Promise((resolve, reject) => {
    pendingResolve = resolve;
    pendingReject = reject;
    window.dispatchEvent(new CustomEvent('need-unlock'));
  });
}

/** 弹窗校验成功时调用 */
export function resolveUnlock() {
  if (pendingResolve) {
    const r = pendingResolve;
    pendingResolve = null;
    pendingReject = null;
    r();
  }
}

/** 弹窗取消/关闭时调用 */
export function rejectUnlock() {
  if (pendingReject) {
    const r = pendingReject;
    pendingResolve = null;
    pendingReject = null;
    r(new Error('用户取消解锁'));
  }
}
