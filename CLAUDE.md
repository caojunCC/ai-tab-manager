# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 项目概述

TabHarmony 是一个 AI 驱动的 Chrome 扩展，使用 OpenAI GPT API 智能分组和管理浏览器标签页。

## 开发命令

```bash
npm run dev      # 启动 Vite 开发服务器
npm run build    # 生产构建
npm run lint     # ESLint 检查
npm run preview  # 预览构建结果
```

## 架构

项目包含两套代码：

### Chrome 扩展（原生 JS）
- `manifest.json` - Chrome 扩展配置 (Manifest V3)
- `popup.js` - 核心 UI 类 `TabHarmonyUI`，处理标签页分组和搜索
- `popup.html` - 弹窗界面
- `background.js` - Service Worker，处理 `createTabGroup` 消息
- `config.js` - API Key 配置

### React/Vite 应用
- `src/` - React + TypeScript + shadcn/ui 组件
- 使用 Vite + SWC 构建

## 关键实现

- 标签分组：`popup.js` 中 `analyzeAndGroupTabs()` 调用 OpenAI `gpt-4o-mini` 模型
- 搜索功能：`handleSearch()` 同样使用 GPT 进行自然语言搜索
- AI 分析失败时自动回退到基于域名的本地分组逻辑

## Chrome API 使用

- `chrome.tabs` - 查询、分组、取消分组标签页
- `chrome.tabGroups` - 更新分组标题和颜色
- `chrome.windows` - 在新窗口打开标签组

## 安装测试

1. Chrome 打开 `chrome://extensions/`
2. 启用开发者模式
3. 点击"加载已解压的扩展程序"选择项目目录
4. 在 `config.js` 中配置 OpenAI API Key
