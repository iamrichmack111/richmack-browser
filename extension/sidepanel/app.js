const $ = (id) => document.getElementById(id);
const API = 'http://127.0.0.1:8765';
let lastScan = null;
let currentView = 'workspace';

const escapeHtml = (s='') => String(s).replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
const safeName = (s='page') => s.replace(/[^a-z0-9._-]+/gi,'-').replace(/^-|-$/g,'').slice(0,80)||'page';

async function activeTab(){ const [tab]=await chrome.tabs.query({active:true,currentWindow:true}); return tab; }
async function sendToPage(message){
  const tab=await activeTab(); if(!tab?.id) throw new Error('No active tab');
  try{ await chrome.scripting.executeScript({target:{tabId:tab.id},files:['content.js']}); }
  catch{ throw new Error('Richmack cannot access this page'); }
  return chrome.tabs.sendMessage(tab.id,message);
}
async function ensureOriginPermission(url){
  const u=new URL(url); if(!['http:','https:'].includes(u.protocol)) throw new Error('HTTP/S pages only');
  const origin=`${u.protocol}//${u.hostname}/*`;
  if(await chrome.permissions.contains({origins:[origin]})) return true;
  return chrome.permissions.request({origins:[origin]});
}

async function setView(name){
  currentView=name;
  document.querySelectorAll('.view').forEach(v=>v.classList.toggle('active',v.id===name));
  document.querySelectorAll('.tabs button').forEach(b=>b.classList.toggle('active',b.dataset.view===name));
  if(name==='automate') await renderWorkflows();
  if(name==='terminal'||name==='extract') await checkBackend();
}
document.querySelectorAll('.tabs button').forEach(b=>b.addEventListener('click',()=>setView(b.dataset.view)));

async function loadCompact(){ const {compactPanel=false}=await chrome.storage.local.get('compactPanel'); document.body.classList.toggle('compact',compactPanel); }
$('collapseBtn').onclick=async()=>{ const {compactPanel=false}=await chrome.storage.local.get('compactPanel'); await chrome.storage.local.set({compactPanel:!compactPanel}); loadCompact(); };

async function loadMode(){ const {richmackMode=false}=await chrome.storage.local.get('richmackMode'); $('modeBtn').textContent=richmackMode?'MODE ON':'MODE OFF'; $('modeBtn').classList.toggle('accent',richmackMode); }
$('modeBtn').onclick=async()=>{
  const {richmackMode=false}=await chrome.storage.local.get('richmackMode'); const next=!richmackMode;
  await chrome.storage.local.set({richmackMode:next});
  try{ await sendToPage({type:'RM_SET_MODE',enabled:next,feedback:true}); }catch{}
  $('modeBtn').classList.remove('modePulse'); void $('modeBtn').offsetWidth; $('modeBtn').classList.add('modePulse');
  loadMode();
};

async function renderWorkspaces(){
  const {workspaces=[],activeWorkspace='Development'}=await chrome.storage.local.get(['workspaces','activeWorkspace']);
  const root=$('workspaceList'); root.replaceChildren();
  for(const w of workspaces){
    const el=document.createElement('button'); el.className='workspace '+(w.id===activeWorkspace?'active':'');
    el.innerHTML=`<strong>${escapeHtml(w.name)}</strong><small>${escapeHtml(w.id)}</small>`;
    el.onclick=async()=>{await chrome.storage.local.set({activeWorkspace:w.id}); renderWorkspaces();}; root.appendChild(el);
  }
}
$('newWorkspace').onclick=async(e)=>{e.preventDefault(); const name=prompt('Workspace name'); if(!name)return; const {workspaces=[]}=await chrome.storage.local.get('workspaces'); if(!workspaces.some(w=>w.id===name))workspaces.push({id:name,name,color:'blue'}); await chrome.storage.local.set({workspaces,activeWorkspace:name}); renderWorkspaces();};

async function renderTabs(){
  const tabs=await chrome.tabs.query({currentWindow:true}); const root=$('tabList'); root.replaceChildren();
  for(const tab of tabs.slice(0,25)){ const el=document.createElement('div'); el.className='item'; el.innerHTML=`<div class="grow"><strong>${escapeHtml(tab.title||'Untitled')}</strong><small>${escapeHtml(tab.url||'')}</small></div>`; el.onclick=()=>chrome.tabs.update(tab.id,{active:true}); root.appendChild(el); }
}
const activeTabsDetails=$('tabList').closest('details');
activeTabsDetails.addEventListener('toggle',()=>{ if(activeTabsDetails.open) renderTabs(); });

function classify(url){const u=url.toLowerCase(),tags=[];if(u.includes('.pdf'))tags.push('PDF');if(/youtube|vimeo|\.mp4/.test(u))tags.push('Media');if(/arxiv|wikipedia|docs/.test(u))tags.push('Research');return tags;}
async function bookmarkCurrent(){
  const tab=await activeTab(); if(!tab?.url)return; const data=await chrome.storage.local.get(['smartBookmarks','activeWorkspace']); const list=data.smartBookmarks||[]; const existing=list.find(x=>x.url===tab.url);
  if(existing){existing.visits=(existing.visits||1)+1;existing.updatedAt=Date.now();} else list.unshift({id:crypto.randomUUID(),url:tab.url,title:tab.title||tab.url,workspace:data.activeWorkspace||'Development',tags:classify(tab.url),unread:true,createdAt:Date.now(),visits:1});
  await chrome.storage.local.set({smartBookmarks:list}); renderBookmarks();
}
$('bookmarkCurrent').onclick=bookmarkCurrent;
async function renderBookmarks(){
  const q=$('bookmarkSearch').value.toLowerCase(),filter=$('bookmarkFilter').value; const {smartBookmarks=[]}=await chrome.storage.local.get('smartBookmarks'); const root=$('bookmarkList'); root.replaceChildren();
  const items=smartBookmarks.filter(b=>(!q||`${b.title} ${b.url} ${(b.tags||[]).join(' ')}`.toLowerCase().includes(q))&&(filter==='All'||(filter==='Unread'&&b.unread)||(b.tags||[]).includes(filter)));
  for(const b of items.slice(0,40)){const el=document.createElement('div');el.className='item';el.innerHTML=`<div class="grow"><strong>${b.unread?'● ':''}${escapeHtml(b.title)}</strong><small>${escapeHtml(b.workspace)} · ${(b.tags||[]).join(', ')||'bookmark'}</small></div><button>Open</button>`;el.querySelector('button').onclick=async()=>{await chrome.tabs.create({url:b.url});b.unread=false;await chrome.storage.local.set({smartBookmarks});renderBookmarks();};root.appendChild(el);}
}
$('bookmarkSearch').oninput=renderBookmarks; $('bookmarkFilter').onchange=renderBookmarks;

$('scanPage').onclick=async()=>{ $('extractOutput').textContent='Scanning…'; try{lastScan=await sendToPage({type:'RM_EXTRACT'});renderScan(lastScan);}catch(e){$('extractOutput').textContent=`Scan failed: ${e.message}`;} };
function renderScan(s){const stats=[['Links',s.links.length],['Images',s.images.length],['Videos',s.videos.length],['PDFs',s.pdfs.length],['Files',s.files.length],['Text',`${Math.round(s.text.length/1000)}k`]];$('scanStats').innerHTML=stats.map(([k,v])=>`<div class="stat"><strong>${v}</strong><small>${k}</small></div>`).join('');$('extractOutput').textContent=[`TITLE: ${s.title}`,`URL: ${s.url}`,'',...s.links.slice(0,80)].join('\n');}
$('copyLinks').onclick=async()=>{if(lastScan)await navigator.clipboard.writeText(lastScan.links.join('\n'));};
async function downloadList(list){for(const url of list.slice(0,25)){try{await chrome.downloads.download({url});}catch{}}}
$('downloadImages').onclick=()=>lastScan&&downloadList(lastScan.images); $('downloadPdfs').onclick=()=>lastScan&&downloadList(lastScan.pdfs);
$('saveText').onclick=async()=>{if(!lastScan)return;const blob=new Blob([lastScan.text],{type:'text/plain'}),url=URL.createObjectURL(blob);await chrome.downloads.download({url,filename:`richmack/${safeName(lastScan.title)}.txt`,saveAs:false});setTimeout(()=>URL.revokeObjectURL(url),5000);};
$('downloadVideo').onclick=async()=>{const tab=await activeTab();if(!tab?.url)return;$('extractOutput').textContent='Sending to yt-dlp…';try{const r=await fetch(`${API}/media/download`,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({url:tab.url})});const j=await r.json();$('extractOutput').textContent=JSON.stringify(j,null,2);}catch(e){$('extractOutput').textContent=`Backend unavailable: ${e.message}`;}};

$('clickSelector').onclick=async()=>{const selector=$('selector').value.trim();if(!selector)return;const tab=await activeTab();try{if(!(await ensureOriginPermission(tab.url)))throw new Error('Site permission denied');const res=await sendToPage({type:'RM_CLICK_SELECTOR',selector});alert(res.ok?'Clicked':'Failed: '+res.error);}catch(e){alert(e.message);}};
$('showSelector').onclick=async()=>{const s=$('selector').value.trim();if(!s)return;try{const r=await sendToPage({type:'RM_TEST_SELECTOR',selector:s});alert(r.ok?`Found ${r.tag}: ${r.text||s}`:'Not found');}catch(e){alert(e.message);}};
$('saveWorkflow').onclick=async()=>{const name=$('workflowName').value.trim(),selector=$('selector').value.trim();if(!name||!selector)return;const {workflows={}}=await chrome.storage.local.get('workflows');workflows[name]=[{action:'click',selector}];await chrome.storage.local.set({workflows});renderWorkflows();};
async function renderWorkflows(){const {workflows={}}=await chrome.storage.local.get('workflows');const root=$('workflowList');root.replaceChildren();for(const [name,steps] of Object.entries(workflows)){const el=document.createElement('div');el.className='item';el.innerHTML=`<div class="grow"><strong>${escapeHtml(name)}</strong><small>${steps.length} step(s)</small></div><button>Run</button>`;el.querySelector('button').onclick=async()=>{const tab=await activeTab();if(!(await ensureOriginPermission(tab.url)))return;for(const step of steps)if(step.action==='click')await sendToPage({type:'RM_CLICK_SELECTOR',selector:step.selector});};root.appendChild(el);}}

async function runCommand(cmd){$('terminalOutput').textContent+=`${cmd}\n`;try{const r=await fetch(`${API}/terminal/run`,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({command:cmd})});const j=await r.json();if(!r.ok)throw new Error(typeof j.detail==='string'?j.detail:JSON.stringify(j.detail));$('terminalOutput').textContent+=(j.output||'')+'\nrichmack@browser:~$ ';}catch(e){$('terminalOutput').textContent+=`backend: ${e.message}\nrichmack@browser:~$ `;}$('terminalOutput').scrollTop=$('terminalOutput').scrollHeight;}
$('runCommand').onclick=()=>{const c=$('terminalInput').value.trim();if(c){runCommand(c);$('terminalInput').value='';}};$('terminalInput').onkeydown=e=>{if(e.key==='Enter')$('runCommand').click();};document.querySelectorAll('[data-cmd]').forEach(b=>b.onclick=()=>runCommand(b.dataset.cmd));

async function checkBackend(){ $('backendStatus').textContent='checking'; try{const ctl=new AbortController();const t=setTimeout(()=>ctl.abort(),900);const r=await fetch(`${API}/health`,{signal:ctl.signal});clearTimeout(t);if(!r.ok)throw new Error();$('backendStatus').textContent='ready';$('backendDot').className='ok';}catch{$('backendStatus').textContent='offline';$('backendDot').className='bad';} }

chrome.storage.onChanged.addListener((changes,area)=>{if(area!=='local')return;if(changes.richmackMode)loadMode();if(changes.activeWorkspace||changes.workspaces)renderWorkspaces();if(changes.smartBookmarks)renderBookmarks();});
chrome.tabs.onCreated.addListener(()=>{if(activeTabsDetails.open&&currentView==='workspace')renderTabs();});
chrome.tabs.onRemoved.addListener(()=>{if(activeTabsDetails.open&&currentView==='workspace')renderTabs();});
chrome.tabs.onUpdated.addListener((_id,change)=>{if(change.title&&activeTabsDetails.open&&currentView==='workspace')renderTabs();});

loadCompact();loadMode();renderWorkspaces();renderBookmarks();
