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
