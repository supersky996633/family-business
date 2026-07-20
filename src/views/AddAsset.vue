<template>
  <div class="page add-page">
    <!-- 顶部栏 -->
    <div class="topbar">
      <button class="btn-text" @click="onCancel">取消</button>
      <span class="title">{{ isEdit ? '编辑资产' : '新增资产' }}</span>
      <button class="btn-text primary" @click="onSave">保存</button>
    </div>

    <!-- 区块1：记账日期 -->
    <div class="section-card">
      <div class="block-title">记账日期</div>
      <input
        class="date-input"
        type="date"
        v-model="form.recordDate"
        :max="todayStr"
      />
    </div>

    <!-- 区块2：资产分组 -->
    <div class="section-card">
      <div class="block-title">资产</div>
      <div
        v-for="key in ASSET_KEYS"
        :key="key"
        class="group-row"
      >
        <div class="group-head">
          <span class="group-name">{{ ASSET_LABELS[key] }}</span>
          <span class="group-sub amount">合计 {{ fmt(lineSubtotal(key, 'asset')) }}</span>
        </div>
        <div class="pair-inputs">
          <div class="pair-item">
            <label>小新</label>
            <AmountInput v-model="form.assets[key].xiaoxin" placeholder="小新金额" />
          </div>
          <div class="pair-item">
            <label>小闹</label>
            <AmountInput v-model="form.assets[key].xiaonao" placeholder="小闹金额" />
          </div>
        </div>
      </div>
    </div>

    <!-- 区块3：负债分组 -->
    <div class="section-card">
      <div class="block-title">负债</div>
      <div
        v-for="key in DEBT_KEYS"
        :key="key"
        class="group-row"
      >
        <div class="group-head">
          <span class="group-name">{{ DEBT_LABELS[key] }}</span>
          <span class="group-sub amount">合计 {{ fmt(lineSubtotal(key, 'debt')) }}</span>
        </div>
        <div class="pair-inputs">
          <div class="pair-item">
            <label>小新</label>
            <AmountInput v-model="form.debt[key].xiaoxin" placeholder="小新金额" />
          </div>
          <div class="pair-item">
            <label>小闹</label>
            <AmountInput v-model="form.debt[key].xiaonao" placeholder="小闹金额" />
          </div>
        </div>
      </div>
    </div>

    <!-- 保存按钮（底部固定） -->
    <div class="footer-bar">
      <button class="btn-save" @click="onSave">保存</button>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { ElMessage, ElMessageBox } from 'element-plus';
import AmountInput from '../components/AmountInput.vue';
import {
  useAssetStore,
  ASSET_KEYS,
  DEBT_KEYS,
  ASSET_LABELS,
  DEBT_LABELS,
  createEmptyRecord,
} from '../store/assetStore.js';

const route = useRoute();
const router = useRouter();
const store = useAssetStore();

const editId = computed(() => (route.query.id ? String(route.query.id) : ''));
const isEdit = computed(() => !!editId.value);

const form = ref(createEmptyRecord());

const todayStr = (() => {
  const d = new Date();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${m}-${day}`;
})();

function num(v) {
  const n = Number(v);
  return Number.isFinite(n) && n >= 0 ? n : 0;
}

function lineSubtotal(key, type) {
  const group = type === 'asset' ? form.value.assets : form.value.debt;
  return num(group[key].xiaoxin) + num(group[key].xiaonao);
}

function fmt(n) {
  return Number(n).toLocaleString('zh-CN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function onCancel() {
  router.push('/');
}

function validate() {
  // 至少填写一个金额
  const all = [
    ...ASSET_KEYS.map((k) => [form.value.assets[k].xiaoxin, form.value.assets[k].xiaonao]),
    ...DEBT_KEYS.map((k) => [form.value.debt[k].xiaoxin, form.value.debt[k].xiaonao]),
  ].flat();
  const hasAny = all.some((v) => v !== '' && v !== 0 && num(v) > 0);
  if (!hasAny) {
    ElMessage.warning('请至少填写一项金额');
    return false;
  }
  if (!form.value.recordDate) {
    ElMessage.warning('请选择记账日期');
    return false;
  }
  return true;
}

async function onSave() {
  if (!validate()) return;
  try {
    // 归一化为数字
    const normalize = (obj) => {
      const out = {};
      Object.keys(obj).forEach((k) => {
        out[k] = {
          xiaoxin: num(obj[k].xiaoxin),
          xiaonao: num(obj[k].xiaonao),
        };
      });
      return out;
    };
    const payload = {
      id: editId.value || undefined,
      recordDate: form.value.recordDate,
      assets: normalize(form.value.assets),
      debt: normalize(form.value.debt),
    };
    await store.save(payload);
    ElMessage.success(isEdit.value ? '保存成功' : '新增成功');
    router.replace('/');
  } catch (err) {
    console.error(err);
    ElMessage.error('保存失败：' + (err.message || '未知错误'));
  }
}

async function loadEdit() {
  if (!editId.value) return;
  const rec = await store.getById(editId.value);
  if (!rec) {
    ElMessage.error('未找到该记录');
    router.replace('/');
    return;
  }
  // 回填，补全缺失字段
  const form_ = createEmptyRecord(rec.recordDate);
  form_.id = rec.id;
  ASSET_KEYS.forEach((k) => {
    form_.assets[k] = {
      xiaoxin: rec.assets?.[k]?.xiaoxin ?? 0,
      xiaonao: rec.assets?.[k]?.xiaonao ?? 0,
    };
  });
  DEBT_KEYS.forEach((k) => {
    form_.debt[k] = {
      xiaoxin: rec.debt?.[k]?.xiaoxin ?? 0,
      xiaonao: rec.debt?.[k]?.xiaonao ?? 0,
    };
  });
  form.value = form_;
}

onMounted(() => {
  loadEdit();
});
</script>

<style scoped>
.add-page {
  padding-bottom: 80px;
}
.topbar {
  position: sticky;
  top: 0;
  z-index: 10;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: calc(var(--safe-top) + 10px) 12px 10px;
  background: #fff;
  border-bottom: 1px solid #ebeef5;
  margin: -12px -12px 12px;
}
.title {
  font-size: 16px;
  font-weight: 600;
}
.btn-text {
  font-size: 15px;
  color: #606266;
  padding: 6px 4px;
}
.btn-text.primary {
  color: var(--color-primary);
  font-weight: 600;
}
.block-title {
  font-size: 14px;
  font-weight: 600;
  color: #303133;
  margin-bottom: 10px;
  padding-bottom: 6px;
  border-bottom: 1px solid #f0f2f5;
}
.date-input {
  width: 100%;
  height: 40px;
  border: 1px solid #dcdfe6;
  border-radius: 8px;
  padding: 0 10px;
  background: #fafbfc;
  color: #303133;
}
.group-row {
  padding: 10px 0;
  border-bottom: 1px dashed #ebeef5;
}
.group-row:last-child {
  border-bottom: none;
}
.group-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}
.group-name {
  font-size: 14px;
  font-weight: 500;
}
.group-sub {
  font-size: 13px;
  color: var(--color-primary);
}
.pair-inputs {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
}
.pair-item label {
  display: block;
  font-size: 12px;
  color: #909399;
  margin-bottom: 4px;
}
.footer-bar {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  padding: 10px 12px calc(var(--safe-bottom) + 10px);
  background: #fff;
  border-top: 1px solid #ebeef5;
  z-index: 20;
}
.btn-save {
  width: 100%;
  height: 44px;
  border-radius: 22px;
  background: var(--color-primary);
  color: #fff;
  font-size: 16px;
  font-weight: 600;
}
</style>
