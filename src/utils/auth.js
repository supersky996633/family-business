/**
 * 操作密码校验与解锁状态管理
 * - 密码哈希来自环境变量 VITE_OPERATE_PWD_HASH，前端全程不出现明文密码
 * - 解锁有效期 60 分钟，存于 localStorage
 * - 校验逻辑与在线/离线无关，完全一致
 */
import { md5 } from './md5.js';

const STORAGE_KEY = 'operate_unlock_expiry';
/** 解锁有效期（毫秒） */
export const UNLOCK_TTL = 60 * 60 * 1000;

const PWD_HASH = import.meta.env.VITE_OPERATE_PWD_HASH;

/** 当前是否有有效解锁 */
export function isUnlocked() {
  const expiry = Number(localStorage.getItem(STORAGE_KEY) || 0);
  if (!expiry) return false;
  if (Date.now() >= expiry) {
    localStorage.removeItem(STORAGE_KEY);
    return false;
  }
  return true;
}

/** 写入解锁过期时间（当前时间 + 60 分钟） */
export function setUnlocked() {
  localStorage.setItem(STORAGE_KEY, String(Date.now() + UNLOCK_TTL));
}

/** 强制上锁：清空解锁时间 */
export function lock() {
  localStorage.removeItem(STORAGE_KEY);
}

/** 比对输入密码的 MD5 与环境变量哈希是否一致 */
export function verifyPassword(input) {
  if (!PWD_HASH) {
    console.warn('[auth] 未配置 VITE_OPERATE_PWD_HASH');
    return false;
  }
  return md5(input) === String(PWD_HASH).toLowerCase();
}

/** 是否已配置密码哈希（用于决定是否启用校验） */
export function hasPwdConfigured() {
  return !!PWD_HASH;
}
