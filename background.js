// 使用 storage.session 持久化 host 缓存（Service Worker 会休眠，Map 会丢失）
async function getHostCache() {
  const result = await chrome.storage.session.get('tabHostCache');
  return result.tabHostCache || {};
}

async function setHostCache(tabId, host) {
  const cache = await getHostCache();
  cache[tabId] = host;
  await chrome.storage.session.set({ tabHostCache: cache });
}

async function deleteHostCache(tabId) {
  const cache = await getHostCache();
  delete cache[tabId];
  await chrome.storage.session.set({ tabHostCache: cache });
}

async function getHostFromCache(tabId) {
  const cache = await getHostCache();
  return cache[tabId];
}

// 消息处理
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === 'createTabGroup') {
    chrome.tabs.group({ tabIds: request.tabIds }, (groupId) => {
      chrome.tabGroups.update(groupId, {
        title: request.groupName,
        color: request.color
      });
    });
  }
});

// 判断是否为新开页面
function isNewTabPage(url) {
  if (!url) return true;
  return url.startsWith('chrome://newtab') ||
         url.startsWith('chrome://new-tab-page') ||
         url === 'about:blank' ||
         url === 'chrome://blank';
}

// 提取 URL 的 host
function getHost(url) {
  try {
    return new URL(url).hostname;
  } catch {
    return '';
  }
}

// 获取配置
async function getConfig() {
  const result = await chrome.storage.local.get('aiConfig');
  return result.aiConfig || {};
}

// AI 匹配最佳分组
async function findBestGroupForTab(tab, existingGroups) {
  const config = await getConfig();
  if (!config.apiKey) return null;

  const groupList = existingGroups.map((g, i) => `${i}: ${g.title}`).join('\n');
  const prompt = `你是一个标签页分类助手。现有以下分组（格式：索引: 名称）：
${groupList}

请判断以下标签页应该归入哪个分组：
标题: ${tab.title}
URL: ${tab.url}

只返回最匹配的分组索引数字，如果都不匹配则返回 -1。`;

  try {
    const response = await fetch(config.endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${config.apiKey}`
      },
      body: JSON.stringify({
        model: config.model || 'gpt-4o-mini',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 10
      })
    });

    const data = await response.json();
    const result = data.choices?.[0]?.message?.content?.trim();
    const index = parseInt(result, 10);

    console.log(`[TabHarmony] AI returned index: ${result} -> ${index}`);

    if (!isNaN(index) && index >= 0 && index < existingGroups.length) {
      return existingGroups[index];
    }
  } catch (error) {
    console.error('[TabHarmony] AI matching error:', error);
  }
  return null;
}

// 自动分组单个 tab
async function autoGroupSingleTab(tab) {
  try {
    // 重新获取最新的 tab 信息
    const currentTab = await chrome.tabs.get(tab.id);
    console.log(`[TabHarmony] Auto grouping tab: ${currentTab.title} (${currentTab.url})`);

    if (isNewTabPage(currentTab.url)) {
      console.log('[TabHarmony] Skip new tab page');
      return;
    }

    const groups = await chrome.tabGroups.query({ windowId: currentTab.windowId });
    if (groups.length === 0) {
      console.log('[TabHarmony] No groups found');
      return;
    }

    const groupsInfo = groups.map(g => ({ id: g.id, title: g.title, color: g.color }));
    console.log(`[TabHarmony] Finding best group from: ${groupsInfo.map(g => g.title).join(', ')}`);

    const bestGroup = await findBestGroupForTab(currentTab, groupsInfo);

    if (bestGroup) {
      console.log(`[TabHarmony] Best group: ${bestGroup.title}`);
      await chrome.tabs.group({ tabIds: [currentTab.id], groupId: bestGroup.id });
      console.log('[TabHarmony] Tab grouped successfully');
    } else {
      console.log('[TabHarmony] No matching group found');
    }
  } catch (error) {
    console.error('[TabHarmony] Auto group error:', error);
  }
}

// 监听 tab 删除，清理缓存
chrome.tabs.onRemoved.addListener((tabId) => {
  deleteHostCache(tabId);
});

// 监听 URL 变化和页面加载
chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  // 只处理 URL 变化
  if (!changeInfo.url) return;

  const newUrl = changeInfo.url;
  const newHost = getHost(newUrl);
  const oldHost = await getHostFromCache(tabId);

  console.log(`[TabHarmony] Tab ${tabId} URL: ${oldHost || '(none)'} -> ${newHost}`);

  // 更新缓存
  await setHostCache(tabId, newHost);

  // 跳过新标签页
  if (isNewTabPage(newUrl)) {
    console.log('[TabHarmony] Skip new tab page');
    return;
  }

  // 检查是否有现有分组
  const groups = await chrome.tabGroups.query({ windowId: tab.windowId });
  if (groups.length === 0) {
    console.log('[TabHarmony] No existing groups');
    return;
  }

  // 情况1: 新 tab 首次设置真实 URL（oldHost 为空或是新标签页）
  // 情况2: host 发生变化
  const isNewTab = !oldHost || isNewTabPage('http://' + oldHost);
  const isHostChanged = oldHost && oldHost !== newHost;

  if (isNewTab || isHostChanged) {
    console.log(`[TabHarmony] Trigger auto group: isNewTab=${isNewTab}, isHostChanged=${isHostChanged}, groupId=${tab.groupId}`);

    // 如果已在分组中且 host 变化，先取消分组
    if (isHostChanged && tab.groupId !== -1) {
      try {
        await chrome.tabs.ungroup(tabId);
        console.log('[TabHarmony] Ungrouped tab');
      } catch (e) {
        console.error('[TabHarmony] Ungroup error:', e);
      }
    }

    // 只有未分组的 tab 才自动分组
    const currentTab = await chrome.tabs.get(tabId);
    if (currentTab.groupId === -1) {
      console.log('[TabHarmony] Will auto group in 500ms');
      setTimeout(() => autoGroupSingleTab(currentTab), 500);
    }
  }
});

// 初始化：缓存所有现有 tab 的 host
chrome.tabs.query({}, async (tabs) => {
  for (const tab of tabs) {
    if (tab.url) {
      await setHostCache(tab.id, getHost(tab.url));
    }
  }
  console.log('[TabHarmony] Host cache initialized');
});

// 根据配置更新打开方式
async function updateOpenMode() {
  const result = await chrome.storage.local.get('aiConfig');
  const config = result.aiConfig || {};

  if (config.defaultOpenMode === 'sidepanel') {
    // 侧边栏模式：清除 popup，让 onClicked 生效
    chrome.action.setPopup({ popup: '' });
    chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true });
  } else {
    // 弹窗模式：设置 popup
    chrome.action.setPopup({ popup: 'popup.html' });
    chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: false });
  }
}

// 启动时更新设置
chrome.runtime.onStartup.addListener(updateOpenMode);
chrome.runtime.onInstalled.addListener(updateOpenMode);

// 监听配置变化
chrome.storage.onChanged.addListener((changes, area) => {
  if (area === 'local' && changes.aiConfig) {
    updateOpenMode();
  }
});

// 初始化
updateOpenMode();
