(() => {
  if (globalThis.__RICHMACK_CONTENT_LOADED__) return;
  globalThis.__RICHMACK_CONTENT_LOADED__ = true;
  let enabled = false;
  let hintLayer = null;
  let hintTargets = [];
  let hintBuffer = '';
  let pickerCleanup = null;

  const isEditable = el => el && el.matches?.('input,textarea,select,[contenteditable="true"]');
  async function refreshMode(){const {richmackMode=false}=await chrome.storage.local.get('richmackMode');enabled=Boolean(richmackMode);}
  function toast(text){const old=document.getElementById('richmack-toast');old?.remove();const el=document.createElement('div');el.id='richmack-toast';el.textContent=text;Object.assign(el.style,{position:'fixed',right:'16px',bottom:'16px',zIndex:'2147483647',background:'#07131e',color:'#83dcff',border:'1px solid #1c75a8',borderRadius:'7px',padding:'7px 10px',font:'600 11px system-ui',boxShadow:'0 4px 20px #0008',pointerEvents:'none'});document.documentElement.appendChild(el);setTimeout(()=>el.remove(),1000);}
  function cleanupHints(){hintLayer?.remove();hintLayer=null;hintTargets=[];hintBuffer='';document.querySelectorAll('[data-rm-hint-target]').forEach(el=>delete el.dataset.rmHintTarget);}
  const alphabet='asdfghjklqwertyuiopzxcvbnm';
  function labelFor(i){return i<alphabet.length?alphabet[i]:alphabet[Math.floor(i/alphabet.length)-1]+alphabet[i%alphabet.length];}
  function showHints(){cleanupHints();hintTargets=[...document.querySelectorAll('a[href],button,input[type="button"],input[type="submit"],[role="button"]')].filter(el=>{const r=el.getBoundingClientRect();return r.width>3&&r.height>3&&r.bottom>0&&r.right>0&&r.top<innerHeight&&r.left<innerWidth;}).slice(0,80);hintLayer=document.createElement('div');hintLayer.id='richmack-hints';Object.assign(hintLayer.style,{position:'fixed',inset:'0',zIndex:'2147483647',pointerEvents:'none'});hintTargets.forEach((el,i)=>{const r=el.getBoundingClientRect(),label=labelFor(i),badge=document.createElement('span');badge.textContent=label;badge.dataset.label=label;Object.assign(badge.style,{position:'fixed',left:`${Math.max(0,r.left)}px`,top:`${Math.max(0,r.top)}px`,background:'#07131e',color:'#74dcff',font:'700 10px monospace',padding:'2px 4px',border:'1px solid #2584b8',borderRadius:'4px',boxShadow:'0 2px 8px #0007'});hintLayer.appendChild(badge);el.dataset.rmHintTarget=label;});document.documentElement.appendChild(hintLayer);}
  function updateHints(){if(!hintLayer)return;const matches=hintTargets.filter(el=>(el.dataset.rmHintTarget||'').startsWith(hintBuffer));hintLayer.querySelectorAll('span').forEach(s=>s.style.display=s.dataset.label.startsWith(hintBuffer)?'':'none');const exact=matches.find(el=>el.dataset.rmHintTarget===hintBuffer);if(exact){exact.click();cleanupHints();}}

  function selectorFor(el){
    if(el.id && CSS.escape) return `#${CSS.escape(el.id)}`;
    for(const attr of ['data-testid','data-test','aria-label','name']){
      const value=el.getAttribute?.(attr);
      if(value) return `${el.tagName.toLowerCase()}[${attr}="${CSS.escape ? CSS.escape(value) : value.replace(/"/g,'\\"')}"]`;
    }
    const classes=[...el.classList].filter(Boolean).slice(0,2);
    if(classes.length) return `${el.tagName.toLowerCase()}.${classes.map(c=>CSS.escape?CSS.escape(c):c).join('.')}`;
    const parent=el.parentElement;
    if(!parent) return el.tagName.toLowerCase();
    const peers=[...parent.children].filter(x=>x.tagName===el.tagName);
    const n=peers.indexOf(el)+1;
    return `${el.tagName.toLowerCase()}:nth-of-type(${n})`;
  }

  function startPicker(){
    pickerCleanup?.();
    let last=null;
    const over=e=>{if(last&&last!==e.target)last.style.outline='';last=e.target;last.style.outline='2px solid #39b9ff';last.style.outlineOffset='2px';};
    const click=e=>{e.preventDefault();e.stopPropagation();e.stopImmediatePropagation();const el=e.target;const selector=selectorFor(el);cleanup();chrome.runtime.sendMessage({type:'RM_ELEMENT_PICKED',selector,text:(el.innerText||el.value||el.alt||'').trim().slice(0,120),url:location.href});toast(`Saved target: ${selector}`);};
    const key=e=>{if(e.key==='Escape'){cleanup();toast('Picker cancelled');}};
    const cleanup=()=>{if(last)last.style.outline='';document.removeEventListener('mouseover',over,true);document.removeEventListener('click',click,true);document.removeEventListener('keydown',key,true);pickerCleanup=null;};
    pickerCleanup=cleanup;
    document.addEventListener('mouseover',over,true);document.addEventListener('click',click,true);document.addEventListener('keydown',key,true);toast('Pick an element · Esc cancels');
  }

  document.addEventListener('keydown',e=>{
    if(!enabled||isEditable(e.target)||e.metaKey||e.ctrlKey||e.altKey)return;
    if(hintLayer){if(e.key==='Escape'){cleanupHints();e.preventDefault();return;}if(/^[a-z]$/i.test(e.key)){hintBuffer+=e.key.toLowerCase();updateHints();e.preventDefault();return;}}
    if(e.key==='j'){scrollBy({top:Math.max(80,innerHeight*.18),behavior:'smooth'});e.preventDefault();}
    else if(e.key==='k'){scrollBy({top:-Math.max(80,innerHeight*.18),behavior:'smooth'});e.preventDefault();}
    else if(e.key==='g'){scrollTo({top:0,behavior:'smooth'});e.preventDefault();}
    else if(e.key==='G'){scrollTo({top:document.body.scrollHeight,behavior:'smooth'});e.preventDefault();}
    else if(e.key==='f'){showHints();e.preventDefault();}
    else if(e.key==='Escape')cleanupHints();
  },true);

  chrome.runtime.onMessage.addListener((msg,_sender,sendResponse)=>{
    if(msg?.type==='RM_SET_MODE'){enabled=Boolean(msg.enabled);cleanupHints();if(msg.feedback)toast(enabled?'RICHMACK MODE ON':'RICHMACK MODE OFF');sendResponse({ok:true});}
    if(msg?.type==='RM_EXTRACT'){
      const links=[...new Set([...document.querySelectorAll('a[href]')].map(a=>a.href).filter(Boolean))];
      const images=[...new Set([...document.images].map(i=>i.currentSrc||i.src).filter(Boolean))];
      const videos=[...new Set([...document.querySelectorAll('video[src],video source[src]')].map(v=>v.src).concat(links.filter(h=>/\.(mp4|webm|mov)(\?|#|$)/i.test(h||''))).filter(Boolean))];
      const pdfs=links.filter(h=>/\.pdf(\?|#|$)/i.test(h));
      const files=links.filter(h=>/\.(epub|txt|md|csv|json|zip|docx?|xlsx?|pptx?)(\?|#|$)/i.test(h));
      const mailtos=[...document.querySelectorAll('a[href^="mailto:"]')].map(a=>a.getAttribute('href')||'');
      const text=document.body?.innerText?.slice(0,300000)||'';
      const textEmails=text.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi)||[];
      const emails=[...new Set([...mailtos.map(m=>m.replace(/^mailto:/i,'').split('?')[0].trim().toLowerCase()),...textEmails.map(e=>e.toLowerCase())].filter(Boolean))];
      sendResponse({url:location.href,title:document.title,links,images,videos,pdfs,files,emails,text});
    }
    if(msg?.type==='RM_TEST_SELECTOR'){const el=document.querySelector(msg.selector);sendResponse({ok:Boolean(el),tag:el?.tagName||null,text:(el?.innerText||el?.value||'').slice(0,120)});}
    if(msg?.type==='RM_CLICK_SELECTOR'){const el=document.querySelector(msg.selector);if(!el){sendResponse({ok:false,error:'Selector not found'});return;}el.click();sendResponse({ok:true});}
    if(msg?.type==='RM_START_PICKER'){startPicker();sendResponse({ok:true});}
    return true;
  });
  refreshMode();
})();
