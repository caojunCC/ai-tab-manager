const PROVIDERS = {
  openai: {
    name: 'OpenAI',
    endpoint: 'https://api.openai.com/v1/chat/completions',
    models: ['gpt-4o-mini', 'gpt-4o', 'gpt-4.1', 'gpt-4.1-mini', 'gpt-4.1-nano', 'o1', 'o1-mini', 'o1-pro', 'o3-mini'],
    authHeader: 'Bearer'
  },
  claude: {
    name: 'Claude',
    endpoint: 'https://api.anthropic.com/v1/messages',
    models: ['claude-sonnet-4-20250514', 'claude-3-5-sonnet-20241022', 'claude-3-5-haiku-20241022', 'claude-3-opus-20240229'],
    authHeader: 'x-api-key'
  },
  custom: {
    name: 'Custom',
    endpoint: '',
    models: [],
    authHeader: 'Bearer'
  }
};

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
  endpoint: PROVIDERS.openai.endpoint,
  apiKey: '',
  model: 'gpt-4o-mini',
  temperature: 0.7,
  maxTokens: 2000,
  groupPrompt: DEFAULT_GROUP_PROMPT,
  searchPrompt: DEFAULT_SEARCH_PROMPT
};

class OptionsUI {
  constructor() {
    this.initElements();
    this.loadConfig();
    this.setupEventListeners();
  }

  initElements() {
    this.providerTabs = document.querySelectorAll('.provider-tab');
    this.endpointInput = document.getElementById('endpoint');
    this.apiKeyInput = document.getElementById('apiKey');
    this.toggleApiKeyBtn = document.getElementById('toggleApiKey');
    this.modelSelect = document.getElementById('model');
    this.customModelInput = document.getElementById('customModel');
    this.temperatureInput = document.getElementById('temperature');
    this.temperatureValue = document.getElementById('temperatureValue');
    this.maxTokensInput = document.getElementById('maxTokens');
    this.groupPromptInput = document.getElementById('groupPrompt');
    this.searchPromptInput = document.getElementById('searchPrompt');
    this.resetGroupPromptBtn = document.getElementById('resetGroupPrompt');
    this.resetSearchPromptBtn = document.getElementById('resetSearchPrompt');
    this.defaultOpenModeSelect = document.getElementById('defaultOpenMode');
    this.testButton = document.getElementById('testButton');
    this.testResult = document.getElementById('testResult');
    this.saveButton = document.getElementById('saveButton');
    this.resetButton = document.getElementById('resetButton');
  }

  setupEventListeners() {
    // Provider tabs
    this.providerTabs.forEach(tab => {
      tab.addEventListener('click', () => this.selectProvider(tab.dataset.provider));
    });

    // Toggle API key visibility
    this.toggleApiKeyBtn.addEventListener('click', () => {
      const isPassword = this.apiKeyInput.type === 'password';
      this.apiKeyInput.type = isPassword ? 'text' : 'password';
    });

    // Model selection
    this.modelSelect.addEventListener('change', () => {
      this.customModelInput.classList.toggle('hidden', this.modelSelect.value !== 'custom');
    });

    // Temperature slider
    this.temperatureInput.addEventListener('input', () => {
      this.temperatureValue.textContent = this.temperatureInput.value;
    });

    // Reset prompt buttons
    this.resetGroupPromptBtn.addEventListener('click', () => {
      this.groupPromptInput.value = DEFAULT_GROUP_PROMPT;
      this.showToast('分组提示词已恢复默认', 'success');
    });

    this.resetSearchPromptBtn.addEventListener('click', () => {
      this.searchPromptInput.value = DEFAULT_SEARCH_PROMPT;
      this.showToast('搜索提示词已恢复默认', 'success');
    });

    // Test button
    this.testButton.addEventListener('click', () => this.testConnection());

    // Save button
    this.saveButton.addEventListener('click', () => this.saveConfig());

    // Reset button
    this.resetButton.addEventListener('click', () => this.resetConfig());
  }

  async loadConfig() {
    const result = await chrome.storage.local.get('aiConfig');
    const config = { ...DEFAULT_CONFIG, ...result.aiConfig };

    this.selectProvider(config.provider, false);
    this.endpointInput.value = config.endpoint;
    this.apiKeyInput.value = config.apiKey;
    this.temperatureInput.value = config.temperature;
    this.temperatureValue.textContent = config.temperature;
    this.maxTokensInput.value = config.maxTokens;
    this.groupPromptInput.value = config.groupPrompt || DEFAULT_GROUP_PROMPT;
    this.searchPromptInput.value = config.searchPrompt || DEFAULT_SEARCH_PROMPT;
    this.defaultOpenModeSelect.value = config.defaultOpenMode || 'popup';

    // Set model
    const modelExists = Array.from(this.modelSelect.options).some(opt => opt.value === config.model);
    if (modelExists) {
      this.modelSelect.value = config.model;
    } else {
      this.modelSelect.value = 'custom';
      this.customModelInput.value = config.model;
      this.customModelInput.classList.remove('hidden');
    }
  }

  selectProvider(provider, updateEndpoint = true) {
    // Update tabs UI
    this.providerTabs.forEach(tab => {
      tab.classList.toggle('active', tab.dataset.provider === provider);
    });

    const providerConfig = PROVIDERS[provider];

    // Update endpoint
    if (updateEndpoint && providerConfig.endpoint) {
      this.endpointInput.value = providerConfig.endpoint;
    }

    // Update model options
    this.updateModelOptions(provider);
  }

  updateModelOptions(provider) {
    const currentModel = this.modelSelect.value;

    // Clear options
    this.modelSelect.innerHTML = '';

    // Add provider-specific models
    if (provider === 'openai') {
      this.addModelOptions(PROVIDERS.openai.models);
    } else if (provider === 'claude') {
      this.addModelOptions(PROVIDERS.claude.models);
    }

    // Always add custom option
    const customOption = document.createElement('option');
    customOption.value = 'custom';
    customOption.textContent = 'Custom...';
    this.modelSelect.appendChild(customOption);

    // Try to restore previous selection
    const modelExists = Array.from(this.modelSelect.options).some(opt => opt.value === currentModel);
    if (modelExists && currentModel !== 'custom') {
      this.modelSelect.value = currentModel;
      this.customModelInput.classList.add('hidden');
    } else if (this.customModelInput.value) {
      this.modelSelect.value = 'custom';
      this.customModelInput.classList.remove('hidden');
    } else {
      this.modelSelect.selectedIndex = 0;
      this.customModelInput.classList.add('hidden');
    }
  }

  addModelOptions(models) {
    models.forEach(model => {
      const option = document.createElement('option');
      option.value = model;
      option.textContent = model;
      this.modelSelect.appendChild(option);
    });
  }

  getSelectedProvider() {
    const activeTab = document.querySelector('.provider-tab.active');
    return activeTab ? activeTab.dataset.provider : 'openai';
  }

  getSelectedModel() {
    return this.modelSelect.value === 'custom'
      ? this.customModelInput.value
      : this.modelSelect.value;
  }

  getCurrentConfig() {
    return {
      provider: this.getSelectedProvider(),
      endpoint: this.endpointInput.value.trim(),
      apiKey: this.apiKeyInput.value.trim(),
      model: this.getSelectedModel(),
      temperature: parseFloat(this.temperatureInput.value),
      maxTokens: parseInt(this.maxTokensInput.value),
      groupPrompt: this.groupPromptInput.value.trim() || DEFAULT_GROUP_PROMPT,
      searchPrompt: this.searchPromptInput.value.trim() || DEFAULT_SEARCH_PROMPT,
      defaultOpenMode: this.defaultOpenModeSelect.value
    };
  }

  async testConnection() {
    const config = this.getCurrentConfig();

    if (!config.apiKey) {
      this.showTestResult('请输入 API 密钥', 'warning');
      return;
    }

    if (!config.endpoint) {
      this.showTestResult('请输入 API 端点', 'warning');
      return;
    }

    this.setTestLoading(true);

    try {
      const response = await this.makeTestRequest(config);

      if (response.ok) {
        this.showTestResult('连接成功！API 正常工作。', 'success');
      } else {
        const error = await response.json().catch(() => ({}));
        const message = error.error?.message || error.message || `HTTP ${response.status}`;
        this.showTestResult(`错误: ${message}`, 'error');
      }
    } catch (error) {
      this.showTestResult(`连接失败: ${error.message}`, 'error');
    } finally {
      this.setTestLoading(false);
    }
  }

  async makeTestRequest(config) {
    const provider = config.provider;
    const headers = {
      'Content-Type': 'application/json'
    };

    let body;

    if (provider === 'claude') {
      headers['x-api-key'] = config.apiKey;
      headers['anthropic-version'] = '2023-06-01';
      body = JSON.stringify({
        model: config.model,
        max_tokens: 10,
        messages: [{ role: 'user', content: 'Hi' }]
      });
    } else {
      headers['Authorization'] = `Bearer ${config.apiKey}`;
      body = JSON.stringify({
        model: config.model,
        messages: [{ role: 'user', content: 'Hi' }],
        max_tokens: 10
      });
    }

    return fetch(config.endpoint, {
      method: 'POST',
      headers,
      body
    });
  }

  setTestLoading(loading) {
    const spinner = this.testButton.querySelector('.loading-spinner');
    const text = this.testButton.querySelector('.button-text');

    if (loading) {
      spinner.classList.remove('hidden');
      text.textContent = '测试中...';
      this.testButton.disabled = true;
    } else {
      spinner.classList.add('hidden');
      text.textContent = '测试 API';
      this.testButton.disabled = false;
    }
  }

  showTestResult(message, type) {
    this.testResult.textContent = message;
    this.testResult.className = `test-result ${type}`;
    this.testResult.classList.remove('hidden');
  }

  async saveConfig() {
    const config = this.getCurrentConfig();

    if (!config.apiKey) {
      this.showToast('请输入 API 密钥', 'error');
      return;
    }

    await chrome.storage.local.set({ aiConfig: config });
    this.showToast('配置已保存！', 'success');
  }

  async resetConfig() {
    await chrome.storage.local.set({ aiConfig: DEFAULT_CONFIG });
    await this.loadConfig();
    this.testResult.classList.add('hidden');
    this.showToast('已恢复默认设置', 'success');
  }

  showToast(message, type) {
    // Remove existing toast
    const existingToast = document.querySelector('.toast');
    if (existingToast) existingToast.remove();

    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;
    document.body.appendChild(toast);

    setTimeout(() => toast.remove(), 3000);
  }
}

document.addEventListener('DOMContentLoaded', () => {
  new OptionsUI();
});
