<template>
  <div class="page review-page">
    <HeaderNav
      title="思维训练复习"
      :show-back="true"
      to="/error-book"
      label="思维训练"
      icon="book"
      back-to="/error-book"
    />

    <!-- 加载 -->
    <div v-if="loading" class="state-tip">加载中…</div>

    <!-- 无题可复习 -->
    <div v-else-if="!current" class="empty-state">
      <div class="empty-icon">
        <svg viewBox="0 0 24 24" width="48" height="48" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M9 12l2 2 4-4"/><circle cx="12" cy="12" r="9"/></svg>
      </div>
      <p class="empty-title">暂无题目可复习</p>
      <p class="empty-sub">去思维训练录入一些题目吧</p>
    </div>

    <!-- 复习卡片 -->
    <div v-else class="review-card">
      <div class="rc-head">
        <span class="rc-title">{{ current.title || '未命名' }}</span>
        <span class="rc-progress">{{ index + 1 }} / {{ pool.length }}</span>
      </div>

      <div class="rc-section">
        <div class="rc-label">题目内容</div>
        <div class="rc-text">{{ current.content }}</div>
      </div>

      <div class="rc-meta">
        <span class="tag kp">{{ kpText(current.knowledgePoint) }}</span>
        <span class="tag diff">
          难度
          <svg v-for="d in 5" :key="d" viewBox="0 0 24 24" width="12" height="12" :fill="current.difficulty >= d ? '#f6a609' : 'none'" stroke="#f6a609" stroke-width="1.5" stroke-linejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 20.02 12 17.77 5.82 20.02 7 14.14 2 9.27 8.91 8.26"/></svg>
        </span>
      </div>

      <!-- 答题输入 -->
      <div class="rc-section">
        <div class="rc-label">输入你的答案</div>
        <textarea
          class="rc-input"
          v-model="userAnswer"
          :disabled="submitted"
          placeholder="在此输入作答，支持复制粘贴"
          rows="2"
        ></textarea>
        <button
          v-if="!submitted"
          class="submit-btn"
          :disabled="!userAnswer.trim()"
          @click="submitAnswer"
        >提交作答</button>
      </div>

      <!-- 提交后对照 -->
      <div v-if="submitted" class="rc-section compare">
        <div class="rc-label">你的作答</div>
        <div class="rc-text" :class="isCorrect ? 'right' : 'wrong'">{{ userAnswer }}</div>
        <div v-if="!isCorrect" class="rc-label" style="margin-top:10px">正确答案</div>
        <div v-if="!isCorrect" class="rc-text right">{{ current.correctAnswer }}</div>
      </div>

      <!-- 历史作答（录入时保存的） -->
      <div v-if="!submitted && current.childAnswer" class="rc-section child-answer">
        <div class="rc-label">历史作答</div>
        <div class="rc-text wrong">{{ current.childAnswer }}</div>
      </div>

      <!-- 答案/解析 折叠 -->
      <div class="rc-toggle">
        <button class="toggle-btn" @click="showAnswer = !showAnswer">
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
          {{ showAnswer ? '收起答案' : '查看答案与解析' }}
        </button>
      </div>
      <transition name="expand">
        <div v-if="showAnswer" class="rc-answer-area">
          <div class="rc-section">
            <div class="rc-label">正确答案</div>
            <div class="rc-text right">{{ current.correctAnswer }}</div>
          </div>
          <div v-if="current.analysis" class="rc-section">
            <div class="rc-label">错因分析</div>
            <div class="rc-text">{{ current.analysis }}</div>
          </div>
        </div>
      </transition>

      <!-- 底部操作 -->
      <div class="rc-actions">
        <button class="rc-btn skip" @click="next">换一题</button>
        <button class="rc-btn mark" :disabled="marking" @click="markReviewed">
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6L9 17l-5-5"/></svg>
          {{ marking ? '记录中…' : '已掌握，标记复习' }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { ElMessage } from 'element-plus'

function kpText(v) {
  if (!v) return '默认'
  if (Array.isArray(v)) return v[0] || '默认'
  return v || '默认'
}
import HeaderNav from '../components/HeaderNav.vue'
import { fetchAllQuestions, saveEditQuestion } from '../utils/db-local.js'

const loading = ref(true)
const pool = ref([])
const index = ref(0)
const current = ref(null)
const showAnswer = ref(false)
const marking = ref(false)
const userAnswer = ref('')
const submitted = ref(false)
const isCorrect = ref(false)

function normalize(s) {
  return String(s || '').trim().replace(/\s+/g, '').toLowerCase()
}

function submitAnswer() {
  if (!userAnswer.value.trim()) return
  isCorrect.value = normalize(userAnswer.value) === normalize(current.value.correctAnswer)
  submitted.value = true
  if (isCorrect.value) {
    ElMessage.success('回答正确！')
  } else {
    ElMessage.warning('答案不对，看看正确答案')
  }
  showAnswer.value = true
}

function shuffle(arr) {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

async function load() {
  loading.value = true
  try {
    const { data } = await fetchAllQuestions()
    pool.value = shuffle(data || [])
    index.value = 0
    pickCurrent()
  } catch (err) {
    console.error(err)
    ElMessage.error('加载失败：' + (err.message || '未知错误'))
  } finally {
    loading.value = false
  }
}

function pickCurrent() {
  if (pool.value.length === 0) {
    current.value = null
    return
  }
  if (index.value >= pool.value.length) index.value = 0
  current.value = pool.value[index.value]
  showAnswer.value = false
  userAnswer.value = ''
  submitted.value = false
  isCorrect.value = false
}

function next() {
  index.value++
  pickCurrent()
}

async function markReviewed() {
  if (!current.value) return
  marking.value = true
  try {
    const q = { ...current.value }
    const now = Date.now()
    q.reviewCount = (q.reviewCount || 0) + 1
    q.lastReviewTime = now
    // 简易间隔复习：难度越高、复习次数越少则下次间隔越久
    const baseDays = 1 + (q.difficulty || 1) * 0.5
    const interval = Math.round(baseDays * Math.pow(1.4, q.reviewCount - 1))
    q.nextReviewTime = now + interval * 24 * 60 * 60 * 1000
    await saveEditQuestion(q)
    // 同步更新池中数据
    const idx = pool.value.findIndex((x) => x.id === q.id)
    if (idx > -1) pool.value[idx] = q
    ElMessage.success(`已记录复习（第 ${q.reviewCount} 次）`)
    next()
  } catch (err) {
    console.error(err)
    ElMessage.error('标记失败：' + (err.message || '未知错误'))
  } finally {
    marking.value = false
  }
}

onMounted(() => {
  load()
})
</script>

<style scoped>
.review-page {
  padding-bottom: calc(var(--safe-bottom) + 28px);
}

.state-tip {
  text-align: center;
  color: #909399;
  padding: 48px 0;
  font-size: 14px;
}

/* 空状态 */
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  padding: 80px 24px;
}
.empty-icon {
  width: 96px;
  height: 96px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #eef4fb 0%, #e3edf8 100%);
  color: #4a90d9;
  margin-bottom: 20px;
  box-shadow: 0 6px 18px rgba(38, 128, 214, 0.12);
}
.empty-title {
  font-size: 16px;
  font-weight: 700;
  color: #303133;
  margin: 0 0 6px;
}
.empty-sub {
  font-size: 13px;
  color: #909399;
  margin: 0;
}

/* 复习卡片 */
.review-card {
  background: #fff;
  border-radius: 18px;
  padding: 20px 18px;
  box-shadow: 0 4px 16px rgba(15, 76, 129, 0.06), 0 1px 3px rgba(0, 0, 0, 0.03);
}
.rc-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
  padding-bottom: 12px;
  border-bottom: 1px solid #eef2f7;
}
.rc-title {
  font-size: 17px;
  font-weight: 700;
  color: #1f3a5f;
  flex: 1;
  line-height: 1.4;
}
.rc-progress {
  font-size: 12px;
  font-weight: 700;
  color: #4a90d9;
  background: rgba(38, 128, 214, 0.1);
  padding: 4px 12px;
  border-radius: 999px;
  white-space: nowrap;
}
.rc-section {
  margin-bottom: 14px;
}
.rc-label {
  font-size: 12px;
  font-weight: 700;
  color: #7a8fab;
  margin-bottom: 6px;
}
.rc-text {
  font-size: 15px;
  color: #303133;
  line-height: 1.7;
  white-space: pre-wrap;
  word-break: break-word;
}
.rc-text.right {
  color: #2e9e5b;
  font-weight: 600;
}
.rc-text.wrong {
  color: #e0524d;
}
.rc-input {
  width: 100%;
  border: 1px solid #e0e8f0;
  border-radius: 12px;
  padding: 12px;
  background: #f7faff;
  color: #303133;
  font-size: 15px;
  line-height: 1.6;
  outline: none;
  resize: vertical;
  font-family: inherit;
  transition: border-color 0.2s, box-shadow 0.2s, background 0.2s;
}
.rc-input:focus {
  border-color: #2680d6;
  background: #fff;
  box-shadow: 0 0 0 3px rgba(38, 128, 214, 0.12);
}
.rc-input:disabled {
  background: #f4f6f9;
  color: #5a6b80;
}
.submit-btn {
  margin-top: 10px;
  padding: 10px 24px;
  border-radius: 999px;
  font-size: 14px;
  font-weight: 700;
  color: #fff;
  background: linear-gradient(135deg, #0f4c81 0%, #1a6fb5 50%, #2680d6 100%);
  box-shadow: 0 4px 14px rgba(15, 76, 129, 0.28);
  transition: transform 0.18s, box-shadow 0.18s;
}
.submit-btn:active {
  transform: scale(0.96);
}
.submit-btn:disabled {
  opacity: 0.5;
}
.compare {
  background: rgba(38, 128, 214, 0.04);
  border-radius: 12px;
  padding: 14px;
}
.rc-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 14px;
}
.tag {
  display: inline-flex;
  align-items: center;
  gap: 3px;
  font-size: 11px;
  font-weight: 600;
  padding: 4px 10px;
  border-radius: 999px;
}
.tag.kp {
  background: rgba(38, 128, 214, 0.1);
  color: #1a6fb5;
}
.tag.diff {
  background: rgba(246, 166, 9, 0.1);
  color: #b07809;
}

/* 答案折叠 */
.rc-toggle {
  margin-bottom: 4px;
}
.toggle-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 8px 16px;
  border-radius: 999px;
  font-size: 13px;
  font-weight: 600;
  color: #2680d6;
  background: rgba(38, 128, 214, 0.08);
  transition: background 0.15s;
}
.toggle-btn:active {
  background: rgba(38, 128, 214, 0.16);
}
.rc-answer-area {
  padding-top: 12px;
  border-top: 1px dashed #e8eef5;
  margin-top: 8px;
}

/* 底部操作 */
.rc-actions {
  display: flex;
  gap: 12px;
  margin-top: 18px;
  padding-top: 16px;
  border-top: 1px solid #eef2f7;
}
.rc-btn {
  flex: 1;
  height: 46px;
  border-radius: 999px;
  font-size: 14px;
  font-weight: 700;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  transition: transform 0.18s, box-shadow 0.18s;
}
.rc-btn:active {
  transform: scale(0.97);
}
.rc-btn.skip {
  background: #f4f6f9;
  color: #606266;
}
.rc-btn.mark {
  flex: 2;
  background: linear-gradient(135deg, #2e9e5b 0%, #1e8c4f 100%);
  color: #fff;
  box-shadow: 0 6px 18px rgba(46, 158, 91, 0.3);
}
.rc-btn.mark:disabled {
  opacity: 0.6;
}

/* 折叠动画 */
.expand-enter-active,
.expand-leave-active {
  transition: max-height 0.3s ease, opacity 0.25s ease, padding 0.3s ease;
  overflow: hidden;
  max-height: 600px;
}
.expand-enter-from,
.expand-leave-to {
  max-height: 0;
  opacity: 0;
  padding-top: 0;
}
</style>
