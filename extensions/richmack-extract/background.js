chrome.runtime.onMessage.addListener((m,s,send)=>{if(m?.type==='RM_PING'){send({ok:true});return true;}});
