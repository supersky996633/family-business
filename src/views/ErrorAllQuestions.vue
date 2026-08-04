<template>
  <div class="page all-page">
    <HeaderNav
      title="全部题目"
      :show-back="true"
      to="/error-book"
      label="思维训练"
      icon="book"
      back-to="/error-book"
    />

    <div v-if="loading" class="state-tip">加载中…</div>

    <div v-else-if="questions.length === 0" class="empty-state">
      <div class="empty-icon">
        <svg viewBox="0 0 24 24" width="48" height="48" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M4 19.5A2.5 2.5 0 016.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z"/></svg>
      </div>
      <p class="empty-title">暂无题目</p>
      <p class="empty-sub">去思维训练录入一些题目吧</p>
    </div>

    <div v-else>
      <!-- 概览 -->
      <div class="overview-bar">
        <span class="ov-chip">共 {{ questions.length }} 题</span>
        <span class="ov-chip">{{ groupCount }} 个知识点</span>
      </div>

      <!-- 按知识点分组 -->
      <section
        v-for="grp in groups"
        :key="grp.knowledgePoint"
        class="group-card"
      >
        <div class="group-head" @click="toggleGroup(grp.knowledgePoint)">
          <span class="group-name">{{ grp.knowledgePoint }}</span>
          <span class="group-count">{{ grp.items.length }} 题</span>
          <svg class="group-arrow" :class="{ open: openGroups[grp.knowledgePoint] }" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18l6-6-6-6"/></svg>
        </div>

        <transition name="expand">
          <div v-if="openGroups[grp.knowledgePoint]" class="group-body">
            <div
              v-for="q in grp.items"
              :key="q.id"
              class="q-row"
            >
              <div class="q-head" @click="toggleItem(q.id)">
                <span class="q-title">{{ q.title || '未命名' }}</span>
                <div class="q-diff">
                  <svg v-for="d in 5" :key="d" viewBox="0 0 24 24" width="12" height="12" :fill="q.difficulty >= d ? '#f6a609' : 'none'" stroke="#f6a609" stroke-width="1.5" stroke-linejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 20.02 12 17.77 5.82 20.02 7 14.14 2 9.27 8.91 8.26"/></svg>
                </div>
              </div>
              <div class="q-content">{{ q.content }}</div>

              <transition name="expand">
                <div v-if="openItems[q.id]" class="q-detail">
                  <div v-if="q.childAnswer" class="detail-row">
                    <span class="d-label">孩子作答</span>
                    <span class="d-val wrong">{{ q.childAnswer }}</span>
                  </div>
                  <div class="detail-row">
                    <span class="d-label">正确答案</span>
                    <span class="d-val right">{{ q.correctAnswer }}</span>
                  </div>
                  <div v-if="q.analysis" class="detail-row">
                    <span class="d-label">错因分析</span>
                    <span class="d-val">{{ q.analysis }}</span>
                  </div>
                  <div class="detail-meta">
                    <span class="tag">复习 {{ q.reviewCount || 0 }} 次</span>
                    <span v-if="q.lastReviewTime" class="tag">上次 {{ fmtDate(q.lastReviewTime) }}</span>
                  </div>
                </div>
              </transition>
            </div>
          </div>
        </transition>
      </section>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import HeaderNav from '../components/HeaderNav.vue'
import { fetchAllQuestions } from '../utils/db-local.js'

const loading = ref(true)
const questions = ref([])
const openGroups = reactive({})
const openItems = reactive({})

const groups = computed(() => {
  const map = new Map()
  for (const q of questions.value) {
    const kp = q.knowledgePoint || '未分类'
    if (!map.has(kp)) map.set(kp, [])
    map.get(kp).push(q)
  }
  return [...map.entries()].map(([knowledgePoint, items]) => ({ knowledgePoint, items }))
})

const groupCount = computed(() => groups.value.length)

async function load() {
  loading.value = true
  try {
    const { data } = await fetchAllQuestions()
    questions.value = data || []
    // 默认展开第一个分组
    if (groups.value.length) {
      openGroups[groups.value[0].knowledgePoint] = true
    }
  } catch (err) {
    console.error(err)
    ElMessage.error('加载失败：' + (err.message || '未知错误'))
  } finally {
    loading.value = false
  }
}

function toggleGroup(kp) {
  openGroups[kp] = !openGroups[kp]
}

function toggleItem(id) {
  openItems[id] = !openItems[id]
}

function fmtDate(ts) {
  if (!ts) return ''
  const d = new Date(Number(ts))
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${d.getFullYear()}-${m}-${day}`
}

onMounted(() => {
  load()
})
</script>

<style scoped>
.all-page {
  padding-bottom: calc(var(--safe-bottom) + 28px);
}

.state-tip {
  text-align: center;
  color: #909399;
  padding: 48px 0;
  font-size: 14px;
}

.overview-bar {
  display: flex;
  gap: 8px;
  margin-bottom: 14px;
}
.ov-chip {
  font-size: 12px;
  font-weight: 600;
  padding: 5px 12px;
  border-radius: 999px;
  background: rgba(38, 128, 214, 0.1);
  color: #1a6fb5;
}

/* 分组卡片 */
.group-card {
  background: #fff;
  border-radius: 16px;
  margin-bottom: 12px;
  box-shadow: 0 4px 16px rgba(15, 76, 129, 0.06), 0 1px 3px rgba(0, 0, 0, 0.03);
  overflow: hidden;
}
.group-head {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 14px 16px;
}
.group-name {
  font-size: 15px;
  font-weight: 700;
  color: #1f3a5f;
  flex: 1;
}
.group-count {
  font-size: 12px;
  font-weight: 600;
  color: #7a8fab;
  background: #f4f6f9;
  padding: 3px 10px;
  border-radius: 999px;
}
.group-arrow {
  color: #c0c4cc;
  transition: transform 0.25s ease;
}
.group-arrow.open {
  transform: rotate(90deg);
}
.group-body {
  padding: 0 16px 12px;
  border-top: 1px solid #eef2f7;
}

/* 题目行 */
.q-row {
  padding: 12px 0;
  border-bottom: 1px dashed #eef2f7;
}
.q-row:last-child {
  border-bottom: none;
}
.q-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 8px;
}
.q-title {
  font-size: 14px;
  font-weight: 600;
  color: #303133;
  flex: 1;
}
.q-diff {
  display: flex;
  gap: 1px;
}
.q-content {
  font-size: 13px;
  color: #5a6b80;
  line-height: 1.6;
  margin: 6px 0 0;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

/* 详情展开 */
.q-detail {
  margin-top: 10px;
  padding: 12px;
  background: #f7faff;
  border-radius: 10px;
}
.detail-row {
  display: flex;
  gap: 8px;
  margin-bottom: 8px;
  font-size: 13px;
  line-height: 1.6;
}
.detail-row:last-child {
  margin-bottom: 0;
}
.d-label {
  flex-shrink: 0;
  color: #7a8fab;
  font-weight: 600;
  width: 64px;
}
.d-val {
  color: #303133;
  flex: 1;
  word-break: break-word;
}
.d-val.right { color: #2e9e5b; font-weight: 600; }
.d-val.wrong { color: #e0524d; }
.detail-meta {
  display: flex;
  gap: 6px;
  margin-top: 8px;
}
.tag {
  font-size: 11px;
  color: #5a6b80;
  background: #eef2f7;
  padding: 3px 9px;
  border-radius: 999px;
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

/* 折叠动画 */
.expand-enter-active,
.expand-leave-active {
  transition: max-height 0.3s ease, opacity 0.25s ease;
  overflow: hidden;
  max-height: 1200px;
}
.expand-enter-from,
.expand-leave-to {
  max-height: 0;
  opacity: 0;
}
</style>
