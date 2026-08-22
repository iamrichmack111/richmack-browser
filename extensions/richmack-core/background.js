const defaults={richmackMode:false,activeWorkspace:'Development',workspaces:['Development','Research','Automation','Media']};
chrome.runtime.onInstalled.addListener(async()=>{const x=await chrome.storage.local.get(defaults);await chrome.storage.local.set({...defaults,...x});});
async function toggle(){const {richmackMode=false}=await chrome.storage.local.get('richmackMode');await chrome.storage.local.set({richmackMode:!richmackMode});const [t]=await chrome.tabs.query({active:true,currentWindow:true});if(t?.id)chrome.tabs.sendMessage(t.id,{type:'RM_MODE',enabled:!richmackMode}).catch(()=>{});return !richmackMode;}
chrome.commands.onCommand.addListener(c=>{if(c==='toggle-richmack-mode')toggle();});
chrome.runtime.onMessage.addListener((m,s,send)=>{
 if(m?.type==='RM_TOGGLE'){toggle().then(enabled=>send({ok:true,enabled}));return true;}
 if(m?.type==='RM_NEXT'){chrome.tabs.query({currentWindow:true}).then(async tabs=>{const i=tabs.findIndex(t=>t.active),d=Number(m.direction)||1;if(i>=0&&tabs.length)await chrome.tabs.update(tabs[(i+d+tabs.length)%tabs.length].id,{active:true});send({ok:true});});return true;}
 if(m?.type==='RM_CLOSE'){const id=s.tab?.id; if(id)chrome.tabs.remove(id).then(()=>send({ok:true})); else send({ok:false});return true;}
 if(m?.type==='RM_UNDO'){chrome.sessions.restore().then(()=>send({ok:true})).catch(()=>send({ok:false}));return true;}
 if(m?.type==='RM_OPEN'){chrome.tabs.create({url:m.url}).then(()=>send({ok:true}));return true;}
 if(m?.type==='RM_WORKSPACE'){
   chrome.storage.local.set({activeWorkspace:m.workspace}).then(async()=>{
     const tabs=await chrome.tabs.query({currentWindow:true}); if(!tabs.length){send({ok:true});return;}
     const groups=await chrome.tabGroups.query({windowId:tabs[0].windowId});
     await Promise.all(groups.filter(g=>g.title?.startsWith('RM · ')).map(g=>chrome.tabGroups.update(g.id,{collapsed:g.title!==`RM · ${m.workspace}`}).catch(()=>{})));
     send({ok:true});
   }); return true;
 }
});
