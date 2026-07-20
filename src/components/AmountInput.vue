<template>
  <input
    class="amount-input"
    type="text"
    inputmode="decimal"
    :value="modelValue"
    :placeholder="placeholder"
    @input="onInput"
    @focus="onFocus"
    @blur="onBlur"
  />
</template>

<script setup>
defineProps({
  modelValue: { type: [Number, String], default: '' },
  placeholder: { type: String, default: '0' },
});
const emit = defineEmits(['update:modelValue']);

function onFocus(e) {
  // 聚焦时若当前为 0 则清空，方便直接输入，避免先删 0
  const cur = e.target.value;
  if (cur === '0' || cur === 0 || Number(cur) === 0) {
    e.target.value = '';
  }
}

function onBlur(e) {
  // 失焦时若为空则回填 0，保证字段始终有数值
  if (e.target.value === '') {
    e.target.value = '0';
    emit('update:modelValue', '0');
  }
}

function onInput(e) {
  let v = e.target.value;
  // 仅保留数字与单个小数点，禁止负号、字母、特殊符号
  v = v.replace(/[^\d.]/g, '');
  // 去除多余小数点
  const parts = v.split('.');
  if (parts.length > 2) {
    v = parts[0] + '.' + parts.slice(1).join('');
  }
  // 限制小数位两位
  if (parts.length === 2 && parts[1].length > 2) {
    v = parts[0] + '.' + parts[1].slice(0, 2);
  }
  e.target.value = v;
  emit('update:modelValue', v === '' ? '' : v);
}
</script>

<style scoped>
.amount-input {
  width: 100%;
  height: 38px;
  padding: 0 10px;
  border: 1px solid #dcdfe6;
  border-radius: 8px;
  background: #fafbfc;
  color: #303133;
  text-align: right;
  outline: none;
  transition: border-color 0.2s;
}
.amount-input:focus {
  border-color: var(--color-primary);
  background: #fff;
}
</style>
