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
  smartBookmarks: [],
  tabWorkspace: {},
  lastPicked: null
};

chrome.runtime.onInstalled.addListener(async () => {
  const current = await chrome.storage.local.get(Object.keys(DEFAULTS));
  const patch = {};
  for (const [key, value] of Object.entries(DEFAULTS)) {
    if (current[key] === undefined) patch[key] = value;
  }
  if (Object.keys(patch).length) await chrome.storage.local.set(patch);
});

async function activeTab() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  return tab || null;
}

async function inject(tabId) {
  await chrome.scripting.executeScript({ target: { tabId }, files: ["content.js"] });
}

async function setMode(next, feedback = true) {
  await chrome.storage.local.set({ richmackMode: next });
  const tab = await activeTab();
  if (!tab?.id) return;
  try {
    await inject(tab.id);
    await chrome.tabs.sendMessage(tab.id, { type: "RM_SET_MODE", enabled: next, feedback });
  } catch {}
}

chrome.commands.onCommand.addListener(async (command) => {
  if (command !== "toggle-richmack-mode") return;
  const { richmackMode = false } = await chrome.storage.local.get("richmackMode");
  await setMode(!richmackMode);
});

async function getOrCreateWorkspaceGroup(windowId, workspace) {
  const { workspaces = [] } = await chrome.storage.local.get("workspaces");
  const entry = workspaces.find(w => w.id === workspace) || { color: "grey" };
  const groups = await chrome.tabGroups.query({ windowId });
  const existing = groups.find(g => g.title === `RM · ${workspace}`);
  if (existing) return existing.id;
  return { newGroup: true, color: entry.color || "grey" };
}

async function assignTabToWorkspace(tabId, workspace) {
  const tab = await chrome.tabs.get(tabId);
  const target = await getOrCreateWorkspaceGroup(tab.windowId, workspace);
  let groupId;
  if (typeof target === "number") {
    groupId = await chrome.tabs.group({ tabIds: [tabId], groupId: target });
  } else {
    groupId = await chrome.tabs.group({ tabIds: [tabId] });
    await chrome.tabGroups.update(groupId, {
      title: `RM · ${workspace}`,
      color: target.color,
      collapsed: false
    });
  }
  const { tabWorkspace = {} } = await chrome.storage.local.get("tabWorkspace");
  tabWorkspace[String(tabId)] = workspace;
  await chrome.storage.local.set({ tabWorkspace, activeWorkspace: workspace });
  return groupId;
}

async function switchWorkspace(workspace) {
  const tabs = await chrome.tabs.query({ currentWindow: true });
  const { tabWorkspace = {} } = await chrome.storage.local.get("tabWorkspace");
  const match = tabs.find(t => tabWorkspace[String(t.id)] === workspace);
  await chrome.storage.local.set({ activeWorkspace: workspace });
  const groups = await chrome.tabGroups.query({ windowId: tabs[0]?.windowId });
  await Promise.all(groups.filter(g => g.title?.startsWith("RM · ")).map(g =>
    chrome.tabGroups.update(g.id, { collapsed: g.title !== `RM · ${workspace}` }).catch(() => {})
  ));
  if (match?.id) await chrome.tabs.update(match.id, { active: true });
  return Boolean(match);
}

chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  if (!tab.url || !(changeInfo.url || changeInfo.status === "complete")) return;
  let host;
  try { host = new URL(tab.url).hostname; } catch { return; }
  const { domainRoutes = {}, tabWorkspace = {} } = await chrome.storage.local.get(["domainRoutes", "tabWorkspace"]);
  const workspace = domainRoutes[host];
  if (workspace && tabWorkspace[String(tabId)] !== workspace) {
    try { await assignTabToWorkspace(tabId, workspace); } catch {}
  }
});

chrome.tabs.onRemoved.addListener(async (tabId) => {
  const { tabWorkspace = {} } = await chrome.storage.local.get("tabWorkspace");
  if (tabWorkspace[String(tabId)] !== undefined) {
    delete tabWorkspace[String(tabId)];
    await chrome.storage.local.set({ tabWorkspace });
  }
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message?.type === "RM_GET_ACTIVE_TAB") {
    activeTab().then(sendResponse);
    return true;
  }
  if (message?.type === "RM_SET_MODE_BG") {
    setMode(Boolean(message.enabled), true).then(() => sendResponse({ ok: true }));
    return true;
  }
  if (message?.type === "RM_DOWNLOAD") {
    chrome.downloads.download({ url: message.url, saveAs: Boolean(message.saveAs) })
      .then(id => sendResponse({ ok: true, id }))
      .catch(error => sendResponse({ ok: false, error: error.message }));
    return true;
  }
  if (message?.type === "RM_ASSIGN_WORKSPACE") {
    const tabId = message.tabId || sender.tab?.id;
    assignTabToWorkspace(tabId, message.workspace)
      .then(groupId => sendResponse({ ok: true, groupId }))
      .catch(error => sendResponse({ ok: false, error: error.message }));
    return true;
  }
  if (message?.type === "RM_SWITCH_WORKSPACE") {
    switchWorkspace(message.workspace)
      .then(found => sendResponse({ ok: true, found }))
      .catch(error => sendResponse({ ok: false, error: error.message }));
    return true;
  }
  if (message?.type === "RM_ELEMENT_PICKED") {
    const picked = {
      selector: message.selector,
      text: message.text || "",
      url: message.url || sender.tab?.url || "",
      tabId: sender.tab?.id || null,
      at: Date.now()
    };
    chrome.storage.local.set({ lastPicked: picked }).then(() => sendResponse({ ok: true }));
    return true;
  }
});
