# TabHarmony

AI 驱动的 Chrome 标签页管理扩展，支持智能分组和语义搜索。

![Demo](https://github.com/user-attachments/assets/cd8aafdc-c0ae-4ab9-8c36-824ab611cfd0)

## 功能

- **智能分组** - 使用 AI 分析标签内容，自动归类到文档、代码、日志、API 等开发相关类别
- **语义搜索** - 支持自然语言搜索标签（AI 模式回车确认，本地模式实时搜索）
- **侧边栏/弹窗** - 可配置默认打开方式
- **实时同步** - 标签变化自动刷新列表
- **可折叠分组** - 点击分组标题折叠/展开

## 安装

1. 下载或克隆项目
2. Chrome 打开 `chrome://extensions/`
3. 启用「开发者模式」
4. 点击「加载已解压的扩展程序」选择项目目录

## 配置

点击设置图标配置 AI 服务：

| 服务商 | 端点 | 推荐模型 |
|--------|------|----------|
| OpenAI | `https://api.openai.com/v1/chat/completions` | gpt-4o-mini |
| Claude | `https://api.anthropic.com/v1/messages` | claude-3-haiku |
| 自定义 | 兼容 OpenAI 格式的端点 | - |

## 文件结构

```
├── manifest.json    # 扩展配置 (Manifest V3)
├── popup.html/js    # 弹窗界面
├── sidepanel.html   # 侧边栏界面
├── background.js    # Service Worker
├── config.js        # API 配置管理
├── options.html/js  # 设置页面
└── styles.css       # 样式
```

## 开发

```bash
# 无需构建，修改后在 chrome://extensions 刷新即可
```

## License

MIT
