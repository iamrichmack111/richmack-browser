let tab, recorded=[];
const keyForTab=id=>`recording:${id}`;
async function active(){[tab]=await chrome.tabs.query({active:true,currentWindow:true});return tab;}
async function ensureScript(){await active();await chrome.scripting.executeScript({target:{tabId:tab.id},files:['content.js']});}
async function sitePermission(){
  await active(); const u=new URL(tab.url); if(!/^https?:$/.test(u.protocol)) throw new Error('Open a normal website first.');
  const origin=`${u.origin}/*`; const has=await chrome.permissions.contains({origins:[origin]});
  if(has) return true; return chrome.permissions.request({origins:[origin]});
}
async function refreshRecording(){
  await active(); const k=keyForTab(tab.id); const o=await chrome.storage.session.get(k); const s=o[k];
  recorded=s?.steps||[]; const on=!!s?.active;
  record.disabled=on; stop.disabled=!on; save.disabled=recorded.length===0||on;
  recStatus.textContent=on?`Recording · ${recorded.length} step${recorded.length===1?'':'s'}`:`${recorded.length} recorded step${recorded.length===1?'':'s'}`;
}
async function renderWorkflows(){
  const o=await chrome.storage.local.get('workflows'); const arr=o.workflows||[]; workflows.replaceChildren();
  if(!arr.length){workflows.textContent='No saved workflows yet.';workflows.className='muted';return;}
  workflows.className='';
  for(const wf of arr){
    const box=document.createElement('div'); box.className='workflow';
    const title=document.createElement('div'); title.innerHTML=`<b>${esc(wf.name)}</b><small>${wf.steps.length} steps · ${esc(wf.origin||'')}</small>`;
    const run=document.createElement('button'); run.textContent='▶ Run'; run.onclick=async()=>{
      try{await ensureScript(); const r=await chrome.tabs.sendMessage(tab.id,{type:'RM_RUN_WORKFLOW',steps:wf.steps});
        if(r?.stopped) recStatus.textContent=`Stopped safely: ${r.reason}`; else if(r?.ok) recStatus.textContent='Workflow finished.'; else recStatus.textContent=`Workflow failed: ${r?.error||'unknown error'}`;
      }catch(e){recStatus.textContent=e.message;}
    };
    const del=document.createElement('button'); del.textContent='×'; del.className='mini'; del.onclick=async()=>{const n=arr.filter(x=>x.id!==wf.id);await chrome.storage.local.set({workflows:n});renderWorkflows();};
    const actions=document.createElement('div'); actions.className='actions'; actions.append(run,del); box.append(title,actions); workflows.append(box);
  }
}
function esc(s){return String(s||'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
record.onclick=async()=>{
  try{if(!(await sitePermission())){recStatus.textContent='Site permission was not granted.';return;} await ensureScript(); const k=keyForTab(tab.id); await chrome.storage.session.set({[k]:{active:true,steps:[],origin:new URL(tab.url).origin,started:Date.now()}}); await chrome.tabs.sendMessage(tab.id,{type:'RM_RECORD_START'}); recorded=[];refreshRecording(); window.close();}catch(e){recStatus.textContent=e.message;}
};
stop.onclick=async()=>{await ensureScript();await chrome.tabs.sendMessage(tab.id,{type:'RM_RECORD_STOP'}).catch(()=>{});const k=keyForTab(tab.id);const o=await chrome.storage.session.get(k);const s=o[k]||{steps:[]};s.active=false;await chrome.storage.session.set({[k]:s});refreshRecording();};
save.onclick=async()=>{await refreshRecording();if(!recorded.length)return;const name=workflowName.value.trim()||`Workflow ${new Date().toLocaleString()}`;const o=await chrome.storage.local.get('workflows');const arr=o.workflows||[];arr.unshift({id:crypto.randomUUID(),name,origin:tab?new URL(tab.url).origin:'',steps:recorded,created:Date.now()});await chrome.storage.local.set({workflows:arr.slice(0,50)});workflowName.value='';recStatus.textContent=`Saved “${name}”`;renderWorkflows();};
find.onclick=async()=>{try{await ensureScript();const r=await chrome.tabs.sendMessage(tab.id,{type:'RM_FIND',query:q.value.trim()});results.replaceChildren();for(const m of r.matches||[]){const b=document.createElement('button');b.textContent=m.text||m.selector;b.title=m.selector;b.onclick=async()=>{if(!confirm(`Click “${m.text||m.selector}” on this page?`))return;await chrome.tabs.sendMessage(tab.id,{type:'RM_CLICK',selector:m.selector,text:m.text});window.close();};results.appendChild(b);}if(!r.matches?.length)results.textContent='No matching controls.';}catch(e){results.textContent=e.message;}};
q.addEventListener('keydown',e=>{if(e.key==='Enter')find.click();});
(async()=>{await active();await refreshRecording();await renderWorkflows();})();
