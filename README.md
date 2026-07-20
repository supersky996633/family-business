# 家庭业务管理 · 家庭资产管理 PWA 网页应用

一个纯前端、零后端的家庭资产记账与汇总 PWA 应用。基于 Vite + Vue3 + Pinia + Element Plus + ECharts + IndexedDB，原生支持 PWA 离线、iPhone Safari 添加到桌面独立打开、Vercel 一键部署。

## 功能概览

- **新增 / 编辑资产**：记账日期、五大资产（微信 / 支付宝 / 银行卡 / 现金 / 其他）与两项负债（信用卡欠款 / 其他负债），每项均区分【小新】【小闹】两个金额，输入实时计算本行合计。
- **资产汇总首页**：双人信息卡片（总资产 / 总欠款 / 净值）、横向资产总览、ECharts 家庭总净值趋势折线图、历史记录列表（点击弹出编辑 / 删除操作菜单）。
- **数据本地化**：全部数据存于浏览器 IndexedDB，断网可正常使用。
- **PWA**：可安装到 iPhone 桌面，独立窗口、隐藏 Safari 地址栏。
- **重置账本**：一键清空全部数据，附二次确认。

## 技术栈

Vue 3 · Vue Router 4 · Pinia · Element Plus · ECharts 5 · IndexedDB · Vite 5 · vite-plugin-pwa

## 目录结构

```
FamilyBusiness/
├── package.json
├── vite.config.js
├── vercel.json
├── index.html
├── .gitignore
├── README.md
├── public/
│   ├── manifest.webmanifest
│   └── icons/
│       ├── icon-192.png
│       └── icon-512.png
└── src/
    ├── main.js
    ├── App.vue
    ├── router/index.js
    ├── store/assetStore.js
    ├── utils/db.js
    ├── styles/global.css
    ├── components/
    │   ├── AmountInput.vue
    │   └── PersonSummaryCard.vue
    └── views/
        ├── AddAsset.vue
        └── Summary.vue
```

## 本地启动步骤

1. 确保本机已安装 Node.js 18+ 与 npm。
2. 进入项目根目录：

```bash
cd FamilyBusiness
```

3. 安装依赖：

```bash
npm install
```

4. 启动开发服务器（默认 http://localhost:5173）：

```bash
npm run dev
```

5. 打包生产产物到 `dist/`：

```bash
npm run build
```

6. 本地预览生产构建：

```bash
npm run preview
```

> 移动端调试：用 iPhone 在同一局域网访问电脑 IP（例如 `http://192.168.x.x:5173`），可在 Safari 添加到桌面体验 PWA。注意：Service Worker 仅在生产构建（`npm run build && npm run preview`）后生效。

## Vercel 线上部署步骤（图文文字版）

1. **推送代码到 GitHub**
   - 在 GitHub 新建一个仓库（例如 `FamilyBusiness`）。
   - 本地执行：
     ```bash
     git init
     git add .
     git commit -m "init: 家庭业务管理 PWA"
     git branch -M main
     git remote add origin https://github.com/<你的用户名>/FamilyBusiness.git
     git push -u origin main
     ```

2. **在 Vercel 导入项目**
   - 打开 https://vercel.com 并登录（推荐用 GitHub 账号登录）。
   - 点击右上角 **Add New… → Project**。
   - 在列表中找到并选中 `FamilyBusiness` 仓库，点击 **Import**。

3. **配置构建（仓库已自带 `vercel.json`，通常自动识别）**
   - Framework Preset：自动识别为 **Vite**。
   - Build Command：`npm run build`（已由 `vercel.json` 指定）。
   - Output Directory：`dist`（已由 `vercel.json` 指定）。
   - Install Command：`npm install`（已由 `vercel.json` 指定）。
   - 其余保持默认，点击 **Deploy**。

4. **等待构建完成**
   - Vercel 会自动执行安装与构建，通常 1–2 分钟。
   - 构建成功后会显示 **Congratulations** 页面，并分配一个 `xxx.vercel.app` 域名，点击即可访问。

5. **（可选）绑定自定义域名**
   - 进入项目 **Settings → Domains**，输入你的域名并按提示添加 CNAME 记录。

6. **更新代码自动部署**
   - 之后每次 `git push` 到 `main` 分支，Vercel 会自动重新构建并发布。

## iPhone Safari 添加到桌面教程

1. 在 iPhone 上用 **Safari** 打开已部署的 `https://xxx.vercel.app`（必须用 Safari，不能用 Chrome）。
2. 点击 Safari 底部工具栏中间的 **分享图标**（方框向上箭头）。
3. 在弹出的分享菜单中向下滑，找到并点击 **"添加到主屏幕"**。
4. 在弹出页面可修改名称（默认"家庭业务管理"），点击右上角 **"添加"**。
5. 回到桌面即可看到「家庭业务管理」图标，点击打开即为独立窗口：无 Safari 地址栏、无导航栏，体验类似原生 App。
6. 首次打开会自动注册 Service Worker，之后即使断网也可正常打开查看本地账本数据（IndexedDB 存于本机）。

## 数据存储说明

- 数据库名：`family_book_db`
- 数据表：`asset_records`（主键 `id`，索引 `recordDate`）
- 全部数据仅保存在当前设备浏览器内，**不会上传任何服务器**。清除浏览器数据 / 卸载 PWA 将导致账本数据丢失，请自行做好备份。

## 常见问题

- **输入框聚焦时 iPhone 自动放大**：已在 `index.html` 设置 `user-scalable=no` 与 16px 字号，避免放大。
- **Service Worker 不更新**：部署新版后请关闭并重新打开 PWA，或下拉刷新；`vercel.json` 已为 `/sw.js` 设置 `no-cache` 头。
- **图标显示为默认**：`public/icons/` 下为占位图标，可自行替换为 192×192 与 512×512 的 PNG。

## 操作流程速览

```bash
# 1. 安装依赖
npm install

# 2. 本地调试
npm run dev

# 3. 打包生产
npm run build

# 4. 推送 GitHub 后在 Vercel 一键部署
git push origin main
```
