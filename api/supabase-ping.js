/**
 * Vercel Cron 保活接口
 * 每 5 天触发一次对 Supabase asset_records 表的极简查询，
 * 刷新免费库 7 天休眠倒计时，避免闲置自动休眠。
 *
 * 定时规则(UTC) 每5天8点触发，配置在 vercel.json crons。
 * 复用 Vercel 环境变量 VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY，无需新增。
 * 不引入任何依赖，使用原生 fetch。
 */
export default async function handler(req, res) {
  const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
  const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY;

  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    return res.status(500).json({
      success: false,
      error: '缺少环境变量 VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY',
    });
  }

  // 极简 GET：查询 asset_records 表 limit=1，仅做数据库连通触发
  const url = `${SUPABASE_URL}/rest/v1/asset_records?select=id&limit=1`;

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 8000);
    const resp = await fetch(url, {
      method: 'GET',
      headers: {
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json',
      },
      signal: controller.signal,
    }).finally(() => clearTimeout(timer));

    if (!resp.ok) {
      const text = await resp.text().catch(() => '');
      return res.status(502).json({
        success: false,
        status: resp.status,
        error: `Supabase 返回非 2xx：${resp.status} ${text.slice(0, 200)}`,
      });
    }

    return res.status(200).json({
      success: true,
      message: '保活成功：已触发 Supabase asset_records 访问',
      time: new Date().toISOString(),
    });
  } catch (err) {
    const aborted = err && err.name === 'AbortError';
    return res.status(502).json({
      success: false,
      error: aborted
        ? '请求超时（8s），未确认 Supabase 连通'
        : `请求失败：${err && err.message ? err.message : '未知错误'}`,
    });
  }
}
