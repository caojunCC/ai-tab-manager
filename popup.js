import Config from './config.js';

class TabHarmonyUI {
  constructor() {
    this.searchInput = document.getElementById('searchInput');
    this.organizeButton = document.getElementById('organizeButton');
    this.tabGroups = document.getElementById('tabGroups');
    this.tabCount = document.getElementById('tabCount');
    this.loadingSpinner = this.organizeButton.querySelector('.loading-spinner');
    this.buttonText = this.organizeButton.querySelector('.button-text');
    this.aiSearchToggle = document.getElementById('aiSearchToggle');
    this.semanticSearchEnabled = false;

    this.setupEventListeners();
    this.setupTabListeners();
    this.loadExistingGroups();
  }

  setupTabListeners() {
    // 防抖：避免频繁刷新
    let debounceTimer;
    const debouncedRefresh = () => {
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => this.loadExistingGroups(), 100);
    };

    // 监听标签变化
    chrome.tabs.onRemoved.addListener(debouncedRefresh);
    chrome.tabs.onCreated.addListener(debouncedRefresh);
    chrome.tabs.onUpdated.addListener((tabId, changeInfo) => {
      if (changeInfo.status === 'complete' || changeInfo.title) {
        debouncedRefresh();
      }
    });
    chrome.tabs.onMoved.addListener(debouncedRefresh);

    // 监听分组变化
    chrome.tabGroups.onCreated.addListener(debouncedRefresh);
    chrome.tabGroups.onRemoved.addListener(debouncedRefresh);
    chrome.tabGroups.onUpdated.addListener(debouncedRefresh);
  }

  async loadExistingGroups() {
    try {
      const currentWindow = await chrome.windows.getCurrent();
      const allTabs = await chrome.tabs.query({ windowId: currentWindow.id });
      const tabGroupsInfo = await chrome.tabGroups.query({ windowId: currentWindow.id });

      if (this.tabCount) {
        this.tabCount.textContent = `管理 ${allTabs.length} 个标签页`;
      }

      const groupsMap = new Map();
      tabGroupsInfo.forEach(group => {
        groupsMap.set(group.id, {
          title: group.title || 'Unnamed',
          color: group.color,
          tabs: []
        });
      });

      const pinnedTabs = [];
      const ungroupedTabs = [];

      allTabs.forEach(tab => {
        if (tab.pinned) {
          pinnedTabs.push(tab);
        } else if (tab.groupId !== -1 && groupsMap.has(tab.groupId)) {
          groupsMap.get(tab.groupId).tabs.push(tab);
        } else {
          ungroupedTabs.push(tab);
        }
      });

      this.tabGroups.innerHTML = '';

      if (pinnedTabs.length > 0) {
        this.renderPinnedSection(pinnedTabs);
      }

      groupsMap.forEach((value, groupId) => {
        if (value.tabs.length > 0) {
          this.renderGroupSection(value.title, value.tabs, value.color, groupId);
        }
      });

      if (ungroupedTabs.length > 0) {
        this.renderUngroupedSection(ungroupedTabs);
      }
    } catch (error) {
      console.error('Error loading groups:', error);
    }
  }

  renderPinnedSection(tabs) {
    const section = document.createElement('div');
    section.className = 'section';
    section.innerHTML = `
      <div class="section-header">
        <svg class="expand-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M6 9l6 6 6-6"/>
        </svg>
        <div class="section-title">
          <svg class="icon pin" viewBox="0 0 24 24" fill="currentColor">
            <path d="M16 12V4h1V2H7v2h1v8l-2 2v2h5.2v6h1.6v-6H18v-2l-2-2z"/>
          </svg>
          已固定 (${tabs.length})
        </div>
        <div class="section-actions">
          <button class="section-btn danger" id="clearPinned">全部关闭</button>
        </div>
      </div>
      <div class="tab-list"></div>
    `;

    const tabList = section.querySelector('.tab-list');
    tabs.forEach(tab => {
      tabList.appendChild(this.createTabItem(tab));
    });

    section.querySelector('.section-header').addEventListener('click', (e) => {
      if (e.target.closest('.section-btn')) return;
      section.classList.toggle('collapsed');
    });

    section.querySelector('#clearPinned').addEventListener('click', async () => {
      await chrome.tabs.remove(tabs.map(t => t.id));
      this.loadExistingGroups();
    });

    this.tabGroups.appendChild(section);
  }

  renderGroupSection(title, tabs, color, groupId) {
    const section = document.createElement('div');
    section.className = 'section';

    const header = document.createElement('div');
    header.className = 'section-header';
    header.innerHTML = `
      <svg class="expand-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M6 9l6 6 6-6"/>
      </svg>
      <div class="section-title">
        <span class="tab-group-color" style="background: ${this.getColorHex(color)}"></span>
        ${title} (${tabs.length})
      </div>
      <div class="section-actions">
        <button class="section-btn ungroup-btn">取消分组</button>
      </div>
    `;

    const tabList = document.createElement('div');
    tabList.className = 'tab-list';
    tabs.forEach(tab => {
      tabList.appendChild(this.createTabItem(tab));
    });

    header.addEventListener('click', (e) => {
      if (e.target.closest('.section-btn')) return;
      section.classList.toggle('collapsed');
    });

    header.querySelector('.ungroup-btn').addEventListener('click', async () => {
      await chrome.tabs.ungroup(tabs.map(t => t.id));
      this.loadExistingGroups();
    });

    section.appendChild(header);
    section.appendChild(tabList);
    this.tabGroups.appendChild(section);
  }

  renderUngroupedSection(tabs) {
    const section = document.createElement('div');
    section.className = 'section';
    section.innerHTML = `
      <div class="section-header">
        <svg class="expand-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M6 9l6 6 6-6"/>
        </svg>
        <div class="section-title">
          <svg class="icon folder" viewBox="0 0 24 24" fill="currentColor">
            <path d="M10 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2h-8l-2-2z"/>
          </svg>
          未分组 (${tabs.length})
        </div>
        <div class="section-actions">
          <button class="section-btn" id="openNewWindow">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <rect x="3" y="3" width="18" height="18" rx="2"/>
              <path d="M9 3v18"/>
            </svg>
            新窗口打开
          </button>
          <button class="section-btn danger" id="closeUngrouped">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M3 6h18M8 6V4h8v2M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6"/>
            </svg>
            全部关闭
          </button>
        </div>
      </div>
      <div class="tab-list"></div>
    `;

    const tabList = section.querySelector('.tab-list');
    tabs.forEach(tab => {
      tabList.appendChild(this.createTabItem(tab));
    });

    section.querySelector('.section-header').addEventListener('click', (e) => {
      if (e.target.closest('.section-btn')) return;
      section.classList.toggle('collapsed');
    });

    section.querySelector('#openNewWindow').addEventListener('click', async () => {
      const tabIds = tabs.map(t => t.id);
      const newWindow = await chrome.windows.create({ tabId: tabIds[0] });
      if (tabIds.length > 1) {
        await chrome.tabs.move(tabIds.slice(1), { windowId: newWindow.id, index: -1 });
      }
    });

    section.querySelector('#closeUngrouped').addEventListener('click', async () => {
      await chrome.tabs.remove(tabs.map(t => t.id));
      this.loadExistingGroups();
    });

    this.tabGroups.appendChild(section);
  }

  createTabItem(tab) {
    const item = document.createElement('div');
    item.className = 'tab-item';

    // 提取域名
    let domain = '';
    try {
      const url = new URL(tab.url);
      domain = url.hostname.replace('www.', '');
    } catch (e) {
      domain = tab.url;
    }

    const lastAccessed = this.formatLastAccessed(tab.lastAccessed);
    item.innerHTML = `
      <img src="${tab.favIconUrl || 'icons/icon16.png'}" class="tab-favicon" alt="">
      <div class="tab-info">
        <span class="tab-title">${tab.title}</span>
        <span class="tab-url">${domain}${lastAccessed ? ' · ' + lastAccessed : ''}</span>
      </div>
      <button class="tab-close" title="关闭标签">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M18 6L6 18M6 6l12 12"/>
        </svg>
      </button>
    `;
    item.querySelector('.tab-info').addEventListener('click', () => chrome.tabs.update(tab.id, { active: true }));
    item.querySelector('.tab-close').addEventListener('click', async (e) => {
      e.stopPropagation();
      await chrome.tabs.remove(tab.id);
      item.remove();
    });
    return item;
  }

  formatLastAccessed(timestamp) {
    if (!timestamp) return '';
    const now = Date.now();
    const diff = Math.floor((now - timestamp) / 60000); // 分钟
    if (diff < 1) return '刚刚';
    if (diff < 30) return `${diff}分钟前`;
    const date = new Date(timestamp);
    return `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
  }

  getColorHex(color) {
    const colorMap = {
      blue: '#3b82f6',
      cyan: '#06b6d4',
      green: '#22c55e',
      grey: '#6b7280',
      orange: '#f97316',
      pink: '#ec4899',
      purple: '#8b5cf6',
      red: '#ef4444',
      yellow: '#eab308'
    };
    return colorMap[color] || '#3b82f6';
  }

  setupEventListeners() {
    this.organizeButton.addEventListener('click', () => this.organizeTabs());
    // input 事件：本地搜索实时触发，AI搜索只检查清空
    this.searchInput.addEventListener('input', (e) => {
      const query = e.target.value;
      if (!query.trim()) {
        this.loadExistingGroups();
      } else if (!this.semanticSearchEnabled) {
        this.handleSearch(query);
      }
    });
    // keydown 事件：AI搜索回车触发
    this.searchInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && this.semanticSearchEnabled && this.searchInput.value.trim()) {
        this.handleSearch(this.searchInput.value);
      }
    });
    document.getElementById('ungroupAllButton').addEventListener('click', () => this.ungroupAllTabs());
    if (this.aiSearchToggle) {
      this.aiSearchToggle.addEventListener('click', () => {
        this.semanticSearchEnabled = !this.semanticSearchEnabled;
        this.aiSearchToggle.classList.toggle('active', this.semanticSearchEnabled);
        this.searchInput.placeholder = this.semanticSearchEnabled ? 'AI 搜索，回车确认...' : '搜索标签页...';
        if (this.searchInput.value.trim() && !this.semanticSearchEnabled) {
          this.handleSearch(this.searchInput.value);
        }
      });
    }

    const sidePanelBtn = document.getElementById('sidePanelButton');
    if (sidePanelBtn) {
      sidePanelBtn.addEventListener('click', async () => {
        const currentWindow = await chrome.windows.getCurrent();
        await chrome.sidePanel.open({ windowId: currentWindow.id });
        window.close();
      });
    }

    const settingsBtn = document.getElementById('settingsButton');
    if (settingsBtn) {
      settingsBtn.addEventListener('click', () => {
        chrome.runtime.openOptionsPage();
      });
    }

    const collapseBtn = document.getElementById('collapseBtn');
    if (collapseBtn) {
      collapseBtn.addEventListener('click', () => {
        document.body.classList.toggle('collapsed');
        // 收起时图标旋转 180 度由 CSS 处理
      });
    }
  }

  setLoading(loading) {
    if (loading) {
      this.loadingSpinner.classList.remove('hidden');
      this.buttonText.textContent = '分组中...';
      this.organizeButton.disabled = true;
    } else {
      this.loadingSpinner.classList.add('hidden');
      this.buttonText.textContent = '智能分组';
      this.organizeButton.disabled = false;
    }
  }

  async organizeTabs() {
    try {
      this.setLoading(true);
      const allTabs = await chrome.tabs.query({ currentWindow: true });
      const tabs = allTabs.filter(tab => !tab.pinned && tab.groupId === -1);
      if (tabs.length === 0) {
        alert('没有需要分组的标签页');
        return;
      }
      const groupedTabs = await this.analyzeAndGroupTabs(tabs);
      await this.createChromeTabGroups(groupedTabs);
      await this.loadExistingGroups();
    } catch (error) {
      console.error('Grouping error:', error);
      alert(`错误: ${error.message}`);
    } finally {
      this.setLoading(false);
    }
  }

  async analyzeAndGroupTabs(tabs) {
    const tabData = tabs.map((tab, index) => ({
      index,
      title: tab.title,
      url: tab.url
    }));

    const config = await Config.getConfig();
    const response = await Config.makeRequest([
      { role: "system", content: config.groupPrompt },
      { role: "user", content: `需要整理的标签页: ${JSON.stringify(tabData)}` }
    ]);

    return this.parseAIResponse(response.content, tabs);
  }

  parseAIResponse(response, tabs) {
    let jsonStr = response.trim();
    if (jsonStr.startsWith('```')) {
      jsonStr = jsonStr.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '');
    }

    const parsed = JSON.parse(jsonStr);
    const result = {};

    const allIndices = parsed.groups.flatMap(g => g.tabs);
    const maxIndex = Math.max(...allIndices);
    const minIndex = Math.min(...allIndices);
    const isOneBased = minIndex >= 1 && maxIndex === tabs.length;

    parsed.groups.forEach(group => {
      const adjustedIndices = isOneBased ? group.tabs.map(i => i - 1) : group.tabs;
      const validTabs = adjustedIndices
        .filter(index => index >= 0 && index < tabs.length)
        .map(index => tabs[index])
        .filter(tab => tab !== undefined);

      if (validTabs.length > 0) {
        result[group.name] = {
          tabs: validTabs,
          color: group.color,
          description: group.description
        };
      }
    });

    if (Object.keys(result).length === 0) {
      throw new Error(`无效的索引: ${JSON.stringify(allIndices)}`);
    }

    return result;
  }

  normalizeColor(color) {
    const validColors = ['blue', 'cyan', 'green', 'grey', 'orange', 'pink', 'purple', 'red', 'yellow'];
    const colorMap = { 'gray': 'grey' };
    const normalized = colorMap[color] || color;
    return validColors.includes(normalized) ? normalized : 'blue';
  }

  async createChromeTabGroups(groups) {
    // 获取当前存在的标签 id
    const existingTabs = await chrome.tabs.query({ currentWindow: true });
    const existingIds = new Set(existingTabs.map(t => t.id));

    for (const [category, { tabs, color }] of Object.entries(groups)) {
      if (tabs.length === 0) continue;
      // 过滤掉已不存在的标签
      const tabIds = tabs.map(tab => tab.id).filter(id => existingIds.has(id));
      if (tabIds.length === 0) continue;
      try {
        const groupId = await chrome.tabs.group({ tabIds });
        await chrome.tabGroups.update(groupId, {
          title: category,
          color: this.normalizeColor(color)
        });
      } catch (e) {
        console.warn(`Failed to create group "${category}":`, e);
      }
    }
  }

  async handleSearch(query) {
    if (!query.trim()) {
      await this.loadExistingGroups();
      return;
    }

    try {
      const allTabs = await chrome.tabs.query({ currentWindow: true });
      let matchedTabs;

      if (this.semanticSearchEnabled) {
        matchedTabs = await this.semanticSearch(query, allTabs);
      } else {
        const lowerQuery = query.toLowerCase();
        matchedTabs = allTabs.filter(tab =>
          tab.title.toLowerCase().includes(lowerQuery) ||
          tab.url.toLowerCase().includes(lowerQuery)
        );
      }

      this.renderSearchResults(matchedTabs);
    } catch (error) {
      console.error('Search error:', error);
    }
  }

  async semanticSearch(query, tabs) {
    const tabData = tabs.map((tab, index) => ({
      index,
      title: tab.title,
      url: tab.url
    }));

    const config = await Config.getConfig();
    const response = await Config.makeRequest([
      { role: "system", content: config.searchPrompt },
      { role: "user", content: `搜索: "${query}"\n标签页: ${JSON.stringify(tabData)}` }
    ]);

    let indices;
    try {
      let jsonStr = response.content.trim();
      if (jsonStr.startsWith('```')) {
        jsonStr = jsonStr.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '');
      }
      indices = JSON.parse(jsonStr);
    } catch {
      indices = [];
    }

    return indices
      .filter(i => i >= 0 && i < tabs.length)
      .map(i => tabs[i]);
  }

  renderSearchResults(matchedTabs) {
    this.tabGroups.innerHTML = '';

    const section = document.createElement('div');
    section.className = 'section';
    section.innerHTML = `
      <div class="section-header">
        <div class="section-title">
          <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="11" cy="11" r="8"/>
            <path d="M21 21l-4.35-4.35"/>
          </svg>
          搜索结果 (${matchedTabs.length})
        </div>
      </div>
      <div class="tab-list"></div>
    `;

    const tabList = section.querySelector('.tab-list');
    matchedTabs.forEach(tab => {
      tabList.appendChild(this.createTabItem(tab));
    });

    this.tabGroups.appendChild(section);
  }

  async ungroupAllTabs() {
    const tabs = await chrome.tabs.query({ currentWindow: true });
    const tabIds = tabs.filter(tab => !tab.pinned && tab.groupId !== -1).map(tab => tab.id);
    if (tabIds.length > 0) {
      await chrome.tabs.ungroup(tabIds);
      await this.loadExistingGroups();
    }
  }
}

document.addEventListener('DOMContentLoaded', () => {
  new TabHarmonyUI();
});
