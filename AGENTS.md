# Repository Guidelines

家庭业务管理 PWA：Vue3 + Vite 前端，Vercel 部署，对接 Supabase，云端优先 + IndexedDB 本地兜底，前端 MD5 密码限时解锁，Vercel Cron 定时保活。

## Project Structure & Module Organization

- `src/views/` — 页面（`Summary.vue` 总览、`AddAsset.vue` 新增/编辑）
- `src/components/` — 复用组件（`PwdDialog.vue`、`PersonSummaryCard.vue`、`AmountInput.vue`）
- `src/store/assetStore.js` — Pinia 状态：云端优先读取、增删改双写、解锁守卫
- `src/supabase/index.js` — 云端接口封装（`getAllRecords`/`addRecord`/`updateRecord`/`deleteRecord`/`batchUpsert`），snake_case↔camelCase 字段映射
- `src/utils/db.js` — IndexedDB 工具（`asset_records` + `sync_queue` 两表）
- `src/utils/sync.js` — 离线队列回放与历史迁移
- `src/utils/auth.js`、`auth-bridge.js`、`md5.js` — 密码哈希校验与解锁桥接
- `api/supabase-ping.js` — Vercel Serverless 保活接口
- `vercel.json` — 构建/路由/Cron 配置
- `public/`、根目录 `icon-*.png` — PWA 图标与静态资源

## Build, Test, and Development Commands

- `npm run dev` — 启动 Vite 本地开发（端口 5173）
- `npm run build` — 生产构建，产物输出到 `dist/`
- `npm run preview` — 预览构建产物

无测试框架与 lint 配置；验证以 `npm run build` 通过为准。

## Coding Style & Naming Conventions

- 模块语法：ES Modules，文件 `.js` / `.vue`，无分号、2 空格缩进、单引号
- 变量命名：camelCase（前端态），数据库字段 snake_case（`record_date`/`created_at`/`user_id`），转换在 `src/supabase/index.js`
- 环境变量统一 `VITE_` 前缀，本地 `.env.local`，线上 Vercel Environment Variables
- 注释避开 `*/` 序列（Serverless 注释中曾触发解析错误）

## Security & Configuration Tips

- 密码以 MD5 哈希存于 `VITE_OPERATE_PWD_HASH`，前端全程不出现明文，解锁态存 localStorage（60 分钟过期）
- Supabase 使用 anon key，无登录；密钥仅走环境变量，禁止硬编码
- 保活接口仅做 `asset_records?select=id&limit=1` 连通触发，不返回业务数据

## Commit & Pull Request Guidelines

提交信息用中文简述改动，如 `定时5天访问一次数据库，防止休眠`、`增加md5密码校验`。改动需 `npm run build` 通过后再提交；新增业务逻辑时保持云端/本地/解锁三层职责分离，不交叉改动。
