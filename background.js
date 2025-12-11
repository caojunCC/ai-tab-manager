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
