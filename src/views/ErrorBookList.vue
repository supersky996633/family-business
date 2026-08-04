<template>
  <div class="page error-book-page">
    <HeaderNav
      title="数学思维训练"
      :show-back="true"
      to="/"
      label="资产汇总"
      icon="home"
    />

    <!-- 操作栏：新增 + 复习入口 -->
    <div class="action-bar">
      <button class="action-btn primary" @click="openAdd">
        <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
        <span>录入题目</span>
      </button>
      <button class="action-btn ghost" @click="goReview" :disabled="questions.length === 0">
        <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12a9 9 0 1018 0 9 9 0 00-18 0z"/><path d="M12 7v5l3 2"/></svg>
        <span>随机复习</span>
      </button>
      <button class="action-btn ghost" @click="goAll" :disabled="questions.length === 0">
        <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 6h16M4 12h16M4 18h16"/></svg>
        <span>全部题目</span>
      </button>
      <span class="online-tag" :class="{ offline: !online }">
        {{ online ? '云端' : '离线' }}
      </span>
    </div>

    <!-- 知识点筛选 -->
    <div v-if="knowledgePoints.length" class="filter-bar">
      <button
        class="filter-chip"
        :class="{ active: filterKp === '' }"
        @click="filterKp = ''"
      >全部</button>
      <button
        v-for="kp in knowledgePoints"
        :key="kp"
        class="filter-chip"
        :class="{ active: filterKp === kp }"
        @click="filterKp = kp"
      >{{ kp }}</button>
    </div>

    <!-- 加载 -->
    <div v-if="loading" class="state-tip">加载中…</div>

    <!-- 列表 -->
    <div v-else-if="filtered.length" class="question-list">
      <div v-for="q in filtered" :key="q.id" class="question-card">
        <div class="qc-head">
          <span class="qc-title">{{ q.title || '未命名' }}</span>
          <div class="qc-diff">
            <svg v-for="d in 5" :key="d" viewBox="0 0 24 24" width="13" height="13" :fill="q.difficulty >= d ? '#f6a609' : 'none'" stroke="#f6a609" stroke-width="1.5" stroke-linejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 20.02 12 17.77 5.82 20.02 7 14.14 2 9.27 8.91 8.26"/></svg>
          </div>
        </div>
        <div class="qc-content">{{ q.content }}</div>
        <div class="qc-tags">
          <span v-if="q.knowledgePoint" class="tag kp">{{ q.knowledgePoint }}</span>
          <span class="tag review">复习 {{ q.reviewCount || 0 }} 次</span>
          <span v-if="q.lastReviewTime" class="tag time">{{ fmtDate(q.lastReviewTime) }}</span>
        </div>
        <div class="qc-actions">
          <button class="qc-btn edit" @click="openEdit(q)">
            <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.12 2.12 0 013 3L12 15l-4 1 1-4z"/></svg>
            编辑
          </button>
          <button class="qc-btn del" @click="confirmDelete(q)">
            <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2m3 0v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6"/></svg>
            删除
          </button>
        </div>
      </div>
    </div>

    <!-- 空状态 -->
    <div v-else class="empty-state">
      <div class="empty-icon">
        <svg viewBox="0 0 24 24" width="48" height="48" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M4 19.5A2.5 2.5 0 016.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z"/></svg>
      </div>
      <p class="empty-title">{{ filterKp ? '该知识点暂无题目' : '暂无题目' }}</p>
      <p class="empty-sub">点击上方「录入题目」开始记录</p>
    </div>

    <!-- 录入/编辑弹窗 -->
    <ErrorQuestionDialog
      v-model:visible="dialogVisible"
      :question="editing"
      :knowledge-points="knowledgePoints"
      @saved="onSaved"
    />
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import HeaderNav from '../components/HeaderNav.vue'
import ErrorQuestionDialog from '../components/ErrorQuestionDialog.vue'
import {
  fetchAllQuestions,
  removeQuestion,
  registerMathOnlineListener,
} from '../utils/db-local.js'

const router = useRouter()

const loading = ref(true)
const questions = ref([])
const filterKp = ref('')
const online = ref(typeof navigator !== 'undefined' ? navigator.onLine : true)
const dialogVisible = ref(false)
const editing = ref(null)

// 全部知识点（去重，按出现顺序）
const knowledgePoints = computed(() => {
  const set = new Set()
  questions.value.forEach((q) => {
    if (q.knowledgePoint) set.add(q.knowledgePoint)
  })
  return [...set]
})

// 筛选后的列表
const filtered = computed(() => {
  if (!filterKp.value) return questions.value
  return questions.value.filter((q) => q.knowledgePoint === filterKp.value)
})

async function load() {
  loading.value = true
  try {
    const { data } = await fetchAllQuestions()
    questions.value = data || []
  } catch (err) {
    console.error(err)
    ElMessage.error('加载失败：' + (err.message || '未知错误'))
  } finally {
    loading.value = false
  }
}

function openAdd() {
  editing.value = null
  dialogVisible.value = true
}

function openEdit(q) {
  editing.value = { ...q }
  dialogVisible.value = true
}

function onSaved(saved) {
  // 本地保存已写入，这里同步刷新列表
  load()
}

async function confirmDelete(q) {
  try {
    await ElMessageBox.confirm(
      `确定删除「${q.title || '该题目'}」吗？此操作不可恢复。`,
      '删除确认',
      { confirmButtonText: '确认删除', cancelButtonText: '取消', type: 'warning' }
    )
    await removeQuestion(q.id)
    ElMessage.success('已删除')
    load()
  } catch (e) {
    // 取消或失败
    if (e && e.message) {
      ElMessage.error('删除失败：' + e.message)
    }
  }
}

function goReview() {
  router.push('/error-review')
}

function goAll() {
  router.push('/error-all')
}

function fmtDate(ts) {
  if (!ts) return ''
  const d = new Date(Number(ts))
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${d.getFullYear()}-${m}-${day}`
}

function updateOnline() {
  online.value = navigator.onLine
}

let onBackOnline
onMounted(() => {
  load()
  window.addEventListener('online', updateOnline)
  window.addEventListener('offline', updateOnline)
  onBackOnline = () => load()
  registerMathOnlineListener(onBackOnline)
})

onBeforeUnmount(() => {
  window.removeEventListener('online', updateOnline)
  window.removeEventListener('offline', updateOnline)
})
</script>

<style scoped>
.error-book-page {
  padding-bottom: calc(var(--safe-bottom) + 28px);
}

/* 操作栏 */
.action-bar {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 14px;
}
.action-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  height: 40px;
  padding: 0 16px;
  border-radius: 999px;
  font-size: 14px;
  font-weight: 600;
  transition: transform 0.18s, box-shadow 0.18s;
}
.action-btn:active {
  transform: scale(0.95);
}
.action-btn.primary {
  background: linear-gradient(135deg, #0f4c81 0%, #1a6fb5 50%, #2680d6 100%);
  color: #fff;
  box-shadow: 0 4px 14px rgba(15, 76, 129, 0.28);
}
.action-btn.ghost {
  background: #fff;
  color: #2680d6;
  border: 1px solid #d6e6ff;
  box-shadow: 0 2px 8px rgba(38, 128, 214, 0.08);
}
.action-btn.ghost:disabled {
  opacity: 0.45;
  color: #c0c4cc;
  background: #f7f8fa;
}
.online-tag {
  margin-left: auto;
  font-size: 11px;
  font-weight: 700;
  padding: 4px 10px;
  border-radius: 999px;
  background: rgba(46, 158, 91, 0.12);
  color: #2e9e5b;
}
.online-tag.offline {
  background: rgba(224, 82, 77, 0.12);
  color: #e0524d;
}

/* 筛选条 */
.filter-bar {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 14px;
}
.filter-chip {
  padding: 6px 14px;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 600;
  background: #f4f6f9;
  color: #606266;
  transition: background 0.15s, color 0.15s;
}
.filter-chip.active {
  background: linear-gradient(135deg, #0f4c81 0%, #2680d6 100%);
  color: #fff;
}

.state-tip {
  text-align: center;
  color: #909399;
  padding: 48px 0;
  font-size: 14px;
}

/* 题目列表 */
.question-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.question-card {
  background: #fff;
  border-radius: 16px;
  padding: 16px;
  box-shadow: 0 4px 16px rgba(15, 76, 129, 0.06), 0 1px 3px rgba(0, 0, 0, 0.03);
}
.qc-head {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 10px;
  margin-bottom: 8px;
}
.qc-title {
  font-size: 15px;
  font-weight: 700;
  color: #1f3a5f;
  flex: 1;
  line-height: 1.4;
}
.qc-diff {
  display: flex;
  gap: 1px;
  flex-shrink: 0;
  padding-top: 2px;
}
.qc-content {
  font-size: 13px;
  color: #5a6b80;
  line-height: 1.6;
  margin-bottom: 10px;
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
.qc-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-bottom: 12px;
}
.tag {
  font-size: 11px;
  font-weight: 600;
  padding: 3px 9px;
  border-radius: 999px;
}
.tag.kp {
  background: rgba(38, 128, 214, 0.1);
  color: #1a6fb5;
}
.tag.review {
  background: #f4f6f9;
  color: #606266;
}
.tag.time {
  background: rgba(146, 158, 175, 0.14);
  color: #7a8fab;
}
.qc-actions {
  display: flex;
  gap: 8px;
  border-top: 1px solid #eef2f7;
  padding-top: 10px;
}
.qc-btn {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 6px 12px;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 600;
  transition: background 0.15s;
}
.qc-btn.edit {
  color: #2680d6;
  background: rgba(38, 128, 214, 0.08);
}
.qc-btn.edit:active {
  background: rgba(38, 128, 214, 0.16);
}
.qc-btn.del {
  color: #e0524d;
  background: rgba(224, 82, 77, 0.08);
}
.qc-btn.del:active {
  background: rgba(224, 82, 77, 0.16);
}

/* 空状态 */
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  padding: 64px 24px;
}
.empty-icon {
  width: 88px;
  height: 88px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #eef4fb 0%, #e3edf8 100%);
  color: #4a90d9;
  margin-bottom: 18px;
  box-shadow: 0 6px 18px rgba(38, 128, 214, 0.12);
}
.empty-title {
  font-size: 15px;
  font-weight: 700;
  color: #303133;
  margin: 0 0 6px;
}
.empty-sub {
  font-size: 13px;
  color: #909399;
  margin: 0;
}
</style>
