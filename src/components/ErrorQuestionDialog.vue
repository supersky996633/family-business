<template>
  <transition name="dialog-fade">
    <div v-if="visible" class="dialog-mask" @click.self="onClose">
      <div class="dialog-panel">
        <div class="dialog-header">
          <span class="dialog-title">{{ isEdit ? '编辑题目' : '录入题目' }}</span>
          <button class="dialog-close" @click="onClose" aria-label="关闭">
            <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>

        <div class="dialog-body">
          <div class="field">
            <label>题目标题</label>
            <input
              class="input"
              type="text"
              v-model="form.title"
              placeholder="简述题目，如：两位数进位加法"
            />
          </div>

          <div class="field">
            <label>题目内容</label>
            <textarea
              class="input textarea"
              v-model="form.content"
              placeholder="完整题干，支持复制粘贴"
              rows="3"
            ></textarea>
          </div>

          <div class="field-row">
            <div class="field">
              <label>正确答案</label>
              <textarea
                class="input textarea"
                v-model="form.correctAnswer"
                placeholder="标准答案"
                rows="2"
              ></textarea>
            </div>
            <div class="field">
              <label>孩子作答</label>
              <textarea
                class="input textarea"
                v-model="form.childAnswer"
                placeholder="孩子的作答"
                rows="2"
              ></textarea>
            </div>
          </div>

          <div class="field">
            <label>错因分析</label>
            <textarea
              class="input textarea"
              v-model="form.analysis"
              placeholder="为什么错、如何纠正"
              rows="3"
            ></textarea>
          </div>

          <div class="field-row">
            <div class="field">
              <label>知识点</label>
              <input
                class="input"
                type="text"
                v-model="form.knowledgePoint"
                placeholder="如：进位加法"
                list="kp-list"
              />
              <datalist id="kp-list">
                <option v-for="kp in knowledgePoints" :key="kp" :value="kp"></option>
              </datalist>
            </div>
            <div class="field">
              <label>难度</label>
              <div class="difficulty-picker">
                <button
                  v-for="d in 5"
                  :key="d"
                  class="diff-star"
                  :class="{ active: form.difficulty >= d }"
                  type="button"
                  @click="form.difficulty = d"
                >
                  <svg viewBox="0 0 24 24" width="22" height="22" :fill="form.difficulty >= d ? '#f6a609' : 'none'" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 20.02 12 17.77 5.82 20.02 7 14.14 2 9.27 8.91 8.26"/></svg>
                </button>
              </div>
            </div>
          </div>
        </div>

        <div class="dialog-footer">
          <button class="btn-cancel" @click="onClose">取消</button>
          <button class="btn-save" :disabled="saving" @click="onSave">
            {{ saving ? '保存中…' : '保存' }}
          </button>
        </div>
      </div>
    </div>
  </transition>
</template>

<script setup>
import { ref, reactive, computed, watch } from 'vue'
import { ElMessage } from 'element-plus'
import { saveNewQuestion, saveEditQuestion } from '../utils/db-local.js'

const props = defineProps({
  visible: { type: Boolean, default: false },
  // 编辑模式传入完整题目对象；新增模式传 null
  question: { type: Object, default: null },
  // 可选：已有知识点列表，用于 datalist 输入提示
  knowledgePoints: { type: Array, default: () => [] },
})

const emit = defineEmits(['update:visible', 'saved'])

const isEdit = computed(() => !!props.question)
const saving = ref(false)

function emptyForm() {
  return {
    id: null,
    title: '',
    content: '',
    correctAnswer: '',
    childAnswer: '',
    analysis: '',
    knowledgePoint: '',
    difficulty: 1,
    reviewCount: 0,
    lastReviewTime: null,
    nextReviewTime: null,
    createdAt: Date.now(),
  }
}

const form = reactive(emptyForm())

watch(
  () => props.visible,
  (v) => {
    if (!v) return
    if (props.question) {
      Object.assign(form, emptyForm(), props.question)
    } else {
      Object.assign(form, emptyForm())
    }
  },
  { immediate: true }
)

function validate() {
  if (!form.title.trim()) {
    ElMessage.warning('请填写题目标题')
    return false
  }
  if (!form.content.trim()) {
    ElMessage.warning('请填写题目内容')
    return false
  }
  return true
}

async function onSave() {
  if (!validate()) return
  saving.value = true
  try {
    const payload = { ...form }
    let result
    if (isEdit.value) {
      result = await saveEditQuestion(payload)
    } else {
      result = await saveNewQuestion(payload)
    }
    ElMessage.success(isEdit.value ? '已更新' : '已录入')
    emit('saved', result)
    onClose()
  } catch (err) {
    console.error(err)
    ElMessage.error('保存失败：' + (err.message || '未知错误'))
  } finally {
    saving.value = false
  }
}

function onClose() {
  emit('update:visible', false)
}
</script>

<style scoped>
.dialog-mask {
  position: fixed;
  inset: 0;
  z-index: 2000;
  display: flex;
  align-items: flex-end;
  justify-content: center;
  background: rgba(15, 23, 42, 0.45);
  backdrop-filter: blur(2px);
}
.dialog-panel {
  width: 100%;
  max-width: 520px;
  max-height: 88vh;
  display: flex;
  flex-direction: column;
  background: #fff;
  border-radius: 20px 20px 0 0;
  box-shadow: 0 -8px 40px rgba(0, 0, 0, 0.2);
  overflow: hidden;
}
.dialog-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 18px;
  border-bottom: 1px solid #eef2f7;
  background: linear-gradient(135deg, #f7faff 0%, #eef4fb 100%);
}
.dialog-title {
  font-size: 16px;
  font-weight: 700;
  color: #1f3a5f;
}
.dialog-close {
  color: #909399;
  display: flex;
  padding: 4px;
  border-radius: 50%;
  transition: background 0.15s, color 0.15s;
}
.dialog-close:active {
  background: #eef0f4;
  color: #303133;
}
.dialog-body {
  flex: 1;
  overflow-y: auto;
  padding: 16px 18px;
  -webkit-overflow-scrolling: touch;
}
.field {
  margin-bottom: 14px;
}
.field label {
  display: block;
  font-size: 13px;
  font-weight: 600;
  color: #5a6b80;
  margin-bottom: 6px;
}
.input {
  width: 100%;
  border: 1px solid #e0e8f0;
  border-radius: 12px;
  padding: 10px 12px;
  background: #f7faff;
  color: #303133;
  font-size: 15px;
  outline: none;
  transition: border-color 0.2s, box-shadow 0.2s, background 0.2s;
  font-family: inherit;
}
.input:focus {
  border-color: #2680d6;
  background: #fff;
  box-shadow: 0 0 0 3px rgba(38, 128, 214, 0.12);
}
.textarea {
  resize: vertical;
  min-height: 48px;
  line-height: 1.5;
}
.field-row {
  display: flex;
  gap: 12px;
}
.field-row > .field {
  flex: 1;
}
.difficulty-picker {
  display: flex;
  gap: 2px;
  height: 44px;
  align-items: center;
}
.diff-star {
  color: #c0c4cc;
  padding: 4px;
  transition: transform 0.12s, color 0.15s;
}
.diff-star:active {
  transform: scale(0.85);
}
.diff-star.active {
  color: #f6a609;
}
.dialog-footer {
  display: flex;
  gap: 12px;
  padding: 14px 18px calc(var(--safe-bottom) + 14px);
  border-top: 1px solid #eef2f7;
  background: #fff;
}
.btn-cancel {
  flex: 1;
  height: 46px;
  border-radius: 999px;
  background: #f4f6f9;
  color: #606266;
  font-size: 15px;
  font-weight: 600;
}
.btn-cancel:active {
  background: #eef0f4;
}
.btn-save {
  flex: 2;
  height: 46px;
  border-radius: 999px;
  background: linear-gradient(135deg, #0f4c81 0%, #1a6fb5 50%, #2680d6 100%);
  color: #fff;
  font-size: 15px;
  font-weight: 700;
  box-shadow: 0 6px 18px rgba(15, 76, 129, 0.3);
  transition: transform 0.18s, box-shadow 0.18s;
}
.btn-save:active {
  transform: scale(0.97);
}
.btn-save:disabled {
  opacity: 0.6;
}
.dialog-fade-enter-active,
.dialog-fade-leave-active {
  transition: opacity 0.25s ease;
}
.dialog-fade-enter-active .dialog-panel,
.dialog-fade-leave-active .dialog-panel {
  transition: transform 0.25s cubic-bezier(0.16, 1, 0.3, 1);
}
.dialog-fade-enter-from,
.dialog-fade-leave-to {
  opacity: 0;
}
.dialog-fade-enter-from .dialog-panel,
.dialog-fade-leave-to .dialog-panel {
  transform: translateY(100%);
}
</style>
