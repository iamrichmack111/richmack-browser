const $=id=>document.getElementById(id);
const API='http://127.0.0.1:8765';
let scan=null, tab=null, resource=null;

async function activeTab(){const [t]=await chrome.tabs.query({active:true,currentWindow:true});return t||null;}
async function injectAndSend(message){if(!tab?.id)throw new Error('No active tab');await chrome.scripting.executeScript({target:{tabId:tab.id},files:['content.js']});return chrome.tabs.sendMessage(tab.id,message);}
function resourceFromUrl(raw){try{const u=new URL(raw),p=u.pathname.toLowerCase();const map=[['PDF','.pdf'],['EPUB','.epub'],['TEXT','.txt'],['MARKDOWN','.md'],['CSV','.csv'],['JSON','.json'],['VIDEO','.mp4'],['AUDIO','.mp3'],['ZIP','.zip']];for(const [type,ext] of map)if(p.endsWith(ext))return{type,url:u.href,name:decodeURIComponent(u.pathname.split('/').pop()||type.toLowerCase())};}catch{}return null;}
function classifyDocCount(s){return (s.pdfs?.length||0)+(s.files?.length||0);}
function normalizeUrl(raw){try{const u=new URL(raw);['utm_source','utm_medium','utm_campaign','utm_term','utm_content','ref','from_choice','from_home_module'].forEach(k=>u.searchParams.delete(k));u.hash='';return u.toString();}catch{return raw;}}

async function loadMode(){const{richmackMode=false}=await chrome.storage.local.get('richmackMode');$('mode').textContent=richmackMode?'MODE ON':'MODE OFF';$('mode').classList.toggle('on',richmackMode);}
$('mode').onclick=async()=>{const{richmackMode=false}=await chrome.storage.local.get('richmackMode');await chrome.runtime.sendMessage({type:'RM_SET_MODE_BG',enabled:!richmackMode});await loadMode();};

async function loadWorkspaces(){const{workspaces=[],activeWorkspace='Development',tabWorkspace={}}=await chrome.storage.local.get(['workspaces','activeWorkspace','tabWorkspace']);const assigned=tab?.id?tabWorkspace[String(tab.id)]:null;const root=$('workspaces');root.replaceChildren();for(const w of workspaces){const b=document.createElement('button');if(w.id===activeWorkspace)b.classList.add('active');b.innerHTML=`<strong>${w.name}</strong><small>${assigned===w.id?'current tab':'switch'}</small>`;b.onclick=async()=>{await chrome.runtime.sendMessage({type:'RM_SWITCH_WORKSPACE',workspace:w.id});window.close();};b.dataset.workspace=w.id;root.appendChild(b);}}
$('assign').onclick=async()=>{const{activeWorkspace='Development'}=await chrome.storage.local.get('activeWorkspace');if(tab?.id)await chrome.runtime.sendMessage({type:'RM_ASSIGN_WORKSPACE',tabId:tab.id,workspace:activeWorkspace});await loadWorkspaces();};

async function addBookmark(){if(!tab?.url)return;const data=await chrome.storage.local.get(['smartBookmarks','activeWorkspace']);const list=data.smartBookmarks||[];const clean=normalizeUrl(tab.url);const existing=list.find(x=>normalizeUrl(x.url)===clean);if(existing){existing.visits=(existing.visits||1)+1;existing.updatedAt=Date.now();}else list.unshift({id:crypto.randomUUID(),url:clean,title:tab.title||clean,workspace:data.activeWorkspace||'Development',tags:resource?[resource.type]:[],unread:true,createdAt:Date.now(),visits:1});await chrome.storage.local.set({smartBookmarks:list});$('status').textContent='Saved bookmark';}
$('bookmark').onclick=addBookmark;

function renderScan(s){scan=s;$('results').hidden=false;$('nLinks').textContent=s.links?.length||0;$('nImages').textContent=s.images?.length||0;$('nEmails').textContent=s.emails?.length||0;$('nDocs').textContent=classifyDocCount(s);$('status').textContent='Scan complete';}
$('extract').onclick=async()=>{if(resource){renderScan({links:[resource.url],images:[],emails:[],pdfs:resource.type==='PDF'?[resource.url]:[],files:resource.type==='PDF'?[]:[resource.url],text:''});return;}try{const s=await injectAndSend({type:'RM_EXTRACT'});renderScan(s);}catch(e){$('status').textContent='Cannot scan this browser page';}};
$('copyLinks').onclick=async()=>{if(scan)await navigator.clipboard.writeText([...new Set((scan.links||[]).map(normalizeUrl))].join('\n'));};
$('copyEmails').onclick=async()=>{if(scan)await navigator.clipboard.writeText((scan.emails||[]).join('\n'));};
$('images').onclick=async()=>{if(!scan){try{renderScan(await injectAndSend({type:'RM_EXTRACT'}));}catch{return;}}for(const url of (scan.images||[]).slice(0,25))await chrome.downloads.download({url}).catch(()=>{});$('status').textContent='Images queued';};
$('saveText').onclick=async()=>{if(!scan?.text)return;const blob=new Blob([scan.text],{type:'text/plain'}),url=URL.createObjectURL(blob);await chrome.downloads.download({url,filename:'richmack/page-text.txt'});setTimeout(()=>URL.revokeObjectURL(url),3000);};
$('media').onclick=async()=>{if(!tab?.url)return;$('status').textContent='Sending to downloader…';try{const r=await fetch(`${API}/media/download`,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({url:tab.url})});const j=await r.json();$('status').textContent=r.ok?'Download queued':(j.detail||'Unsupported media page').toString().slice(0,40);}catch{$('status').textContent='Backend offline';}};

$('pick').onclick=async()=>{try{await injectAndSend({type:'RM_START_PICKER'});window.close();}catch{$('status').textContent='Cannot automate this page';}};
async function loadPicked(){const{lastPicked=null}=await chrome.storage.local.get('lastPicked');$('picked').hidden=!lastPicked;if(lastPicked){$('pickedSelector').textContent=lastPicked.selector;$('pickedText').textContent=lastPicked.text||lastPicked.url||'';}}
$('clearPicked').onclick=async()=>{await chrome.storage.local.set({lastPicked:null});loadPicked();};
$('runPicked').onclick=async()=>{const{lastPicked=null}=await chrome.storage.local.get('lastPicked');if(!lastPicked)return;try{await injectAndSend({type:'RM_CLICK_SELECTOR',selector:lastPicked.selector});$('status').textContent='Clicked target';}catch{$('status').textContent='Target unavailable';}};

$('panel').onclick=async()=>{const win=await chrome.windows.getCurrent();await chrome.sidePanel.open({windowId:win.id});window.close();};
$('resourceDownload').onclick=async()=>{if(resource)await chrome.downloads.download({url:resource.url,saveAs:true});};

async function init(){tab=await activeTab();$('pageHost').textContent=(()=>{try{return new URL(tab?.url||'').hostname||'browser tools'}catch{return'browser tools'}})();resource=resourceFromUrl(tab?.url||'');if(resource){$('resource').hidden=false;$('resourceType').textContent=resource.type;$('resourceName').textContent=resource.name;}await loadMode();await loadWorkspaces();await loadPicked();}
init();
