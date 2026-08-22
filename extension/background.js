const DEFAULTS = {
  richmackMode: false,
  activeWorkspace: "Development",
  workspaces: [
    { id: "Development", name: "Development", color: "blue" },
    { id: "Research", name: "Research", color: "cyan" },
    { id: "Automation", name: "Automation", color: "purple" },
    { id: "Media", name: "Media", color: "green" }
  ],
  domainRoutes: {
    "github.com": "Development",
    "docs.python.org": "Development",
    "arxiv.org": "Research",
    "youtube.com": "Media",
    "www.youtube.com": "Media"
  },
  smartBookmarks: []
};

chrome.runtime.onInstalled.addListener(async () => {
  const current = await chrome.storage.local.get(Object.keys(DEFAULTS));
  const patch = {};
  for (const [key, value] of Object.entries(DEFAULTS)) {
    if (current[key] === undefined) patch[key] = value;
  }
  if (Object.keys(patch).length) await chrome.storage.local.set(patch);
  await chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true });
});

chrome.commands.onCommand.addListener(async (command) => {
  if (command !== "toggle-richmack-mode") return;
  const { richmackMode = false } = await chrome.storage.local.get("richmackMode");
  const next = !richmackMode;
  await chrome.storage.local.set({ richmackMode: next });
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (tab?.id) {
    try {
      await chrome.scripting.executeScript({ target: { tabId: tab.id }, files: ['content.js'] });
      await chrome.tabs.sendMessage(tab.id, { type: 'RM_SET_MODE', enabled: next });
    } catch {}
  }
});

chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  if (changeInfo.status !== "complete" || !tab.url) return;
  let host;
  try { host = new URL(tab.url).hostname; } catch { return; }
  const { domainRoutes = {} } = await chrome.storage.local.get("domainRoutes");
  const workspace = domainRoutes[host];
  if (!workspace) return;
  await chrome.storage.local.set({ activeWorkspace: workspace });
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message?.type === "RM_GET_ACTIVE_TAB") {
    chrome.tabs.query({ active: true, currentWindow: true }).then(([tab]) => sendResponse(tab || null));
    return true;
  }
  if (message?.type === "RM_DOWNLOAD") {
    chrome.downloads.download({ url: message.url, saveAs: Boolean(message.saveAs) })
      .then((id) => sendResponse({ ok: true, id }))
      .catch((error) => sendResponse({ ok: false, error: error.message }));
    return true;
  }
});
