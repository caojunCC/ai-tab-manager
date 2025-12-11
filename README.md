# TabHarmony

AI 驱动的 Chrome 标签页管理扩展，让标签页井井有条。

## 截图

<p align="center">
  <img src="screenshots/popup.png" width="280" alt="智能分组效果">
  <img src="screenshots/sidepanel.png" width="280" alt="侧边栏">
  <img src="screenshots/settings.png" width="280" alt="AI配置">
</p>

## 核心功能

### 🤖 AI 智能分组
点击「智能分组」，AI 自动分析所有标签页内容，按类别归类：
- **文档** - API文档、设计文档、帮助文档
- **代码仓库** - GitHub、GitLab、代码审查
- **构建** - Jenkins、CI/CD 流水线
- **日志** - Kibana、Grafana、监控平台
- **数据库** - DMS、数据库管理工具
- **API** - Postman、Swagger、接口测试
- **项目管理** - Jira、Notion、Confluence
- **AI** - ChatGPT、Claude 等 AI 工具
- 以及更多自动识别的类别...

### 🔍 双模式搜索
- **本地搜索** - 实时过滤，输入即搜
- **AI 语义搜索** - 点击麦克风图标开启，支持自然语言（如"找到我的购物页面"），回车确认

### 📌 标签管理
- **可折叠分组** - 点击分组标题折叠/展开
- **快速关闭** - 悬停显示关闭按钮
- **实时同步** - 标签变化自动刷新列表
- **批量操作** - 取消分组、新窗口打开、全部关闭

### ⚙️ 灵活配置
- **多服务商支持** - OpenAI、Claude、或自定义兼容端点
- **打开方式** - 可选弹窗或侧边栏作为默认
- **自定义 Prompt** - 可调整分组和搜索的提示词

## 安装

1. 下载或克隆项目
2. Chrome 打开 `chrome://extensions/`
3. 启用「开发者模式」
4. 点击「加载已解压的扩展程序」选择项目目录

## 配置 AI 服务

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

## License

MIT
