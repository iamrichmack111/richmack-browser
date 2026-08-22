const keyForTab = id => `recording:${id}`;

chrome.runtime.onMessage.addListener((m,s,send)=>{
  (async()=>{
    if(m?.type==='RM_PING') return send({ok:true});
    if(m?.type==='RM_RECORD_EVENT'){
      const tabId=s.tab?.id; if(tabId==null) return send({ok:false});
      const k=keyForTab(tabId); const obj=await chrome.storage.session.get(k); const state=obj[k];
      if(!state?.active) return send({ok:false,ignored:true});
      state.steps.push(m.step); state.updated=Date.now(); await chrome.storage.session.set({[k]:state});
      return send({ok:true,count:state.steps.length});
    }
    send({ok:true});
  })().catch(e=>send({ok:false,error:e.message}));
  return true;
});

chrome.tabs.onRemoved.addListener(tabId=>chrome.storage.session.remove(keyForTab(tabId)).catch(()=>{}));

// Keep an active recorder alive across same-site navigations after the user has
// explicitly granted that site's origin permission.
chrome.tabs.onUpdated.addListener((tabId,info,tab)=>{
  if(info.status!=='complete' || !/^https?:/.test(tab.url||'')) return;
  (async()=>{
    const k=keyForTab(tabId); const o=await chrome.storage.session.get(k); const state=o[k];
    if(!state?.active) return;
    const u=new URL(tab.url); const origin=`${u.origin}/*`;
    if(!(await chrome.permissions.contains({origins:[origin]}))) return;
    await chrome.scripting.executeScript({target:{tabId},files:['content.js']});
    await chrome.tabs.sendMessage(tabId,{type:'RM_RECORD_START'}).catch(()=>{});
  })().catch(()=>{});
});
