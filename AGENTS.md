# Repository Guidelines

## 项目结构与模块组织
- `src/` 存放 React + TypeScript + Tailwind 的新版界面：`pages/` 为路由页面（`Index.tsx` 为入口页），`components/` 与 `components/ui/` 承载可复用和 shadcn 风格的基础组件，`hooks/` 为自定义逻辑，`lib/` 放通用工具，入口在 `App.tsx` 和 `main.tsx`。
- 根目录包含现有 MV3 扩展资源：`manifest.json`、`popup.html`/`popup.js`/`styles.css` 组成弹窗，`background.js` 为后台逻辑，`config.js` 读取 API Key 占位，静态素材在 `public/`。
- 构建产物默认输出到 `dist/`（Vite），作为 Chrome 扩展可在 `chrome://extensions` 通过“加载已解压扩展程序”指向包含 manifest 的目录。

## 构建、测试与开发命令
- `npm install` 安装依赖（使用 `package-lock.json`，避免混用 pnpm/bun）。
- `npm run dev` 启动本地开发服务器（端口 8080）；如需外部访问可附加 `--host`。
- `npm run build` 生成生产构建；`npm run preview` 在本地预览构建结果。
- `npm run lint` 执行 ESLint，提交前务必保持通过。

## 代码风格与命名约定
- TypeScript + React 函数组件，优先组合 hooks；缩进 2 空格，使用 ES 模块导入与解构。
- Tailwind 实用类为主，复杂样式抽到 `src/index.css`/`App.css` 或封装成 `components/ui`。
- 路径别名 `@` 指向 `src`（例如 `@/components/...`）；组件/文件名用帕斯卡命名，工具函数与变量用驼峰，枚举/常量全大写。
- 使用 ESLint 默认规则（含 React Hooks/Refresh），避免 `any`、未使用的导出或无依赖数组的 effect。

## 测试指南
- 当前无自动化测试框架；最低要求是 `npm run lint` 通过，并在 Chrome 中手动验证弹窗渲染、标签分组与搜索逻辑。
- 新增功能优先补充轻量单测或端到端方案（后续可接入 Vitest/Playwright，放置于 `src/tests` 或 `__tests__`），并在 PR 说明覆盖范围与手动验证步骤。

## 提交与 PR 规范
- 参考现有历史，提交信息保持简短祈使句（如 “Add tab grouping logic”），每个提交聚焦单一主题。
- PR 描述需包含：变更目的、主要改动点、测试方式/结果；涉及 UI 的改动附上截图或录屏，关联相关 issue。
- 合并前确保分支与主干同步、构建与 lint 通过；不得提交真实 API Key 或私密配置，保持 `config.js` 仅含占位值或使用浏览器安全存储。
