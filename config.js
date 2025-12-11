const DEFAULT_GROUP_PROMPT = `你是一个开发者工作流助手，帮助软件工程师整理浏览器标签页。

将标签页分组到以下开发相关的类别：
- 文档 (API文档、框架文档、语言参考、MDN、DevDocs)
- 代码 (GitHub、GitLab、Bitbucket、代码审查、PR、仓库)
- CI/CD (Jenkins、GitHub Actions、CircleCI、流水线、构建)
- 日志 (Kibana、Grafana、Datadog、CloudWatch、Sentry、监控)
- 基础设施 (AWS/GCP/Azure控制台、Docker、K8s、Terraform)
- 数据库 (数据库客户端、DBeaver、MongoDB、Redis、SQL工具)
- API (Postman、Swagger、API测试、接口)
- 环境 (开发/测试/生产环境、localhost、测试服务器)
- 项目管理 (Jira、Linear、Notion、Confluence)
- 调试 (Stack Overflow、错误搜索、调试资源)
- AI (ChatGPT、Claude、Copilot、AI助手)
- 依赖 (NPM、PyPI、Maven、包管理)
- 学习 (教程、技术博客、课程)
- 其他 (不属于以上类别的标签)

规则：
1. 根据开发工作流上下文优先分组
2. 同一项目/服务的标签尽量放在一起
3. 区分不同环境（开发/测试/生产）
4. 监控和日志工具与基础设施分开
5. 使用简短清晰的类别名称（最多4个字）

仅返回JSON：
{
  "groups": [
    {
      "name": "类别名称",
      "color": "blue|red|yellow|green|pink|purple|cyan|orange|grey",
      "tabs": [索引数组],
      "description": "简短描述"
    }
  ]
}`;

const DEFAULT_SEARCH_PROMPT = `你是一个标签页搜索助手。给定标签页列表和搜索查询，返回相关标签页的索引数组（JSON格式）。考虑搜索查询的内容、目的和上下文。`;

const DEFAULT_CONFIG = {
  provider: 'openai',
  endpoint: 'https://api.openai.com/v1/chat/completions',
  apiKey: '',
  model: 'gpt-4o-mini',
  temperature: 0.7,
  maxTokens: 2000,
  groupPrompt: DEFAULT_GROUP_PROMPT,
  searchPrompt: DEFAULT_SEARCH_PROMPT
};

export { DEFAULT_GROUP_PROMPT, DEFAULT_SEARCH_PROMPT };

class Config {
  static async getConfig() {
    const result = await chrome.storage.local.get('aiConfig');
    const stored = result.aiConfig || {};

    // 合并配置，用户设置优先
    return { ...DEFAULT_CONFIG, ...stored };
  }

  static async getApiKey() {
    const config = await this.getConfig();
    return config.apiKey;
  }

  static async getEndpoint() {
    const config = await this.getConfig();
    return config.endpoint;
  }

  static async getModel() {
    const config = await this.getConfig();
    return config.model;
  }

  static async getProvider() {
    const config = await this.getConfig();
    return config.provider;
  }

  static async getTemperature() {
    const config = await this.getConfig();
    return config.temperature;
  }

  static async getMaxTokens() {
    const config = await this.getConfig();
    return config.maxTokens;
  }

  static async setConfig(config) {
    await chrome.storage.local.set({ aiConfig: { ...DEFAULT_CONFIG, ...config } });
  }

  static async makeRequest(messages) {
    const config = await this.getConfig();

    if (!config.apiKey) {
      throw new Error('未配置 API 密钥，请在扩展设置中配置。');
    }

    const headers = {
      'Content-Type': 'application/json'
    };

    let body;

    if (config.provider === 'claude') {
      headers['x-api-key'] = config.apiKey;
      headers['anthropic-version'] = '2023-06-01';
      body = JSON.stringify({
        model: config.model,
        max_tokens: config.maxTokens,
        messages: messages.filter(m => m.role !== 'system').map(m => ({
          role: m.role,
          content: m.content
        })),
        system: messages.find(m => m.role === 'system')?.content || ''
      });
    } else {
      headers['Authorization'] = `Bearer ${config.apiKey}`;
      body = JSON.stringify({
        model: config.model,
        messages,
        temperature: config.temperature,
        max_tokens: config.maxTokens
      });
    }

    const response = await fetch(config.endpoint, {
      method: 'POST',
      headers,
      body
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.error?.message || error.message || `HTTP ${response.status}`);
    }

    const data = await response.json();

    let content;
    if (data.content && Array.isArray(data.content)) {
      content = data.content[0].text;
    } else if (data.choices && data.choices[0]) {
      content = data.choices[0].message.content;
    } else {
      throw new Error('API 响应格式异常');
    }

    return { content };
  }
}

export default Config;
