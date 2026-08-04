/**
 * 数学错题云端接口封装（Supabase）
 * 表名: math_error_questions
 *
 * 复用项目已导入的 Supabase 单例（src/supabase/index.js → getClient）。
 * 字段映射：云端 snake_case ↔ 前端 camelCase
 *   title / content / correct_answer / child_answer / analysis
 *   knowledge_point / difficulty / review_count
 *   last_review_time / next_review_time / created_at
 */
import { getClient } from '../supabase/index.js'

export const MATH_TABLE = 'math_error_questions'

/** 云端行 → 前端对象（camelCase） */
export function fromCloud(row) {
  if (!row) return null
  return {
    id: row.id,
    title: row.title ?? '',
    content: row.content ?? '',
    correctAnswer: row.correct_answer ?? '',
    childAnswer: row.child_answer ?? '',
    analysis: row.analysis ?? '',
    knowledgePoint: row.knowledge_point ?? '',
    difficulty: row.difficulty ?? 1,
    reviewCount: row.review_count ?? 0,
    lastReviewTime: row.last_review_time ?? null,
    nextReviewTime: row.next_review_time ?? null,
    createdAt: row.created_at ? new Date(row.created_at).getTime() : Date.now(),
  }
}

/** 前端对象 → 云端行（snake_case） */
export function toCloud(item) {
  const out = {
    id: item.id,
    title: item.title ?? '',
    content: item.content ?? '',
    correct_answer: item.correctAnswer ?? '',
    child_answer: item.childAnswer ?? '',
    analysis: item.analysis ?? '',
    knowledge_point: item.knowledgePoint ?? '',
    difficulty: item.difficulty ?? 1,
    review_count: item.reviewCount ?? 0,
    last_review_time: item.lastReviewTime ?? null,
    next_review_time: item.nextReviewTime ?? null,
  }
  if (item.createdAt) {
    out.created_at = new Date(item.createdAt).toISOString()
  }
  return out
}

/** 查询全部错题（按创建时间倒序） */
export async function getAllQuestions() {
  const sb = getClient()
  const { data, error } = await sb
    .from(MATH_TABLE)
    .select('*')
    .order('created_at', { ascending: false })
  if (error) throw error
  return (data || []).map(fromCloud)
}

/** 按 id 查询单条错题 */
export async function getQuestionById(id) {
  const sb = getClient()
  const { data, error } = await sb.from(MATH_TABLE).select('*').eq('id', id).maybeSingle()
  if (error) throw error
  return fromCloud(data)
}

/** 新增一条错题（id 由数据库自增，前端不指定） */
export async function addQuestion(item) {
  const sb = getClient()
  const payload = toCloud(item)
  const { data, error } = await sb.from(MATH_TABLE).insert(payload).select()
  if (error) throw error
  return fromCloud((data && data[0]) || null)
}

/** 编辑（整条覆盖）一条错题 */
export async function updateQuestion(item) {
  const sb = getClient()
  const rest = toCloud(item)
  const { data, error } = await sb
    .from(MATH_TABLE)
    .update(rest)
    .eq('id', item.id)
    .select()
  if (error) throw error
  return fromCloud((data && data[0]) || item)
}

/** 删除一条错题 */
export async function deleteQuestion(id) {
  const sb = getClient()
  const { error } = await sb.from(MATH_TABLE).delete().eq('id', id)
  if (error) throw error
  return id
}

/** 批量 upsert（迁移用，按主键去重） */
export async function batchUpsertQuestions(items) {
  if (!items || items.length === 0) return []
  const sb = getClient()
  const payload = items.map(toCloud)
  const { data, error } = await sb
    .from(MATH_TABLE)
    .upsert(payload, { onConflict: 'id' })
    .select()
  if (error) throw error
  return (data || []).map(fromCloud)
}
