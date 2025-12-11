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

// 启用侧边栏
chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: false }).catch(() => {});

// 处理扩展图标点击
chrome.action.onClicked.addListener(async (tab) => {
  const result = await chrome.storage.local.get('aiConfig');
  const config = result.aiConfig || {};
  if (config.defaultOpenMode === 'sidepanel') {
    chrome.sidePanel.open({ windowId: tab.windowId });
  } else {
    chrome.action.setPopup({ popup: 'popup.html' });
    chrome.action.openPopup();
  }
});
