(() => {
  if (globalThis.__RM_AUTOMATE_V055__) return;
  globalThis.__RM_AUTOMATE_V055__ = true;

  let recording=false;
  let listeners=false;
  let bulkAbort=false;
  const clean=s=>(s||'').replace(/\s+/g,' ').trim();
  const visible=el=>{const r=el.getBoundingClientRect(),st=getComputedStyle(el);return r.width>2&&r.height>2&&st.visibility!=='hidden'&&st.display!=='none'&&!el.disabled;};
  const selectorFor=el=>{
    if(el.id) return `#${CSS.escape(el.id)}`;
    const test=el.getAttribute('data-testid'); if(test) return `[data-testid="${CSS.escape(test)}"]`;
    const aria=el.getAttribute('aria-label'); if(aria) return `${el.tagName.toLowerCase()}[aria-label="${CSS.escape(aria)}"]`;
    const name=el.getAttribute('name'); if(name) return `${el.tagName.toLowerCase()}[name="${CSS.escape(name)}"]`;
    const tag=el.tagName.toLowerCase();
    const classes=[...el.classList].filter(c=>!/active|selected|hover|focus/i.test(c)).slice(0,2).map(c=>`.${CSS.escape(c)}`).join('');
    if(classes) return `${tag}${classes}`;
    let n=1,p=el; while((p=p.previousElementSibling)) if(p.tagName===el.tagName)n++;
    return `${tag}:nth-of-type(${n})`;
  };
  const labelFor=el=>clean(el.innerText||el.value||el.getAttribute('aria-label')||el.getAttribute('title')||el.getAttribute('name')||'');
  const describe=el=>({selector:selectorFor(el),text:labelFor(el).slice(0,160),role:el.getAttribute('role')||'',tag:el.tagName.toLowerCase()});
  const controls=()=>[...document.querySelectorAll('button,a[href],input[type=button],input[type=submit],[role=button]')].filter(visible);
  const emit=step=>chrome.runtime.sendMessage({type:'RM_RECORD_EVENT',step}).catch(()=>{});
  const sleep=ms=>new Promise(r=>setTimeout(r,ms));

  function clickCapture(e){
    if(!recording || !e.isTrusted) return;
    const el=e.target.closest('button,a[href],input[type=button],input[type=submit],[role=button]');
    if(!el||!visible(el)) return;
    const d=describe(el);
    const finalAction=/submit|place order|purchase|buy now|send|post|confirm application/i.test(d.text) || (el.type==='submit' && !/next|continue|review/i.test(d.text));
    emit({action:'click',...d,confirm:finalAction,url:location.href});
  }
  function changeCapture(e){
    if(!recording || !e.isTrusted) return;
    const el=e.target;
    if(!(el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement || el instanceof HTMLSelectElement)) return;
    if(el.type==='password') { emit({action:'secret',selector:selectorFor(el),text:labelFor(el),url:location.href}); return; }
    if(['checkbox','radio'].includes(el.type)) emit({action:'check',selector:selectorFor(el),checked:el.checked,text:labelFor(el),url:location.href});
    else emit({action:'fill',selector:selectorFor(el),value:el.value,text:labelFor(el),url:location.href});
  }
  function attach(){if(listeners)return;listeners=true;document.addEventListener('click',clickCapture,true);document.addEventListener('change',changeCapture,true);}
  function detach(){if(!listeners)return;listeners=false;document.removeEventListener('click',clickCapture,true);document.removeEventListener('change',changeCapture,true);}

  async function waitFor(step,timeout=10000){
    const start=Date.now();
    while(Date.now()-start<timeout){
      let el=null; try{el=document.querySelector(step.selector);}catch{}
      if(el&&visible(el)) return el;
      if(step.text){
        const c=controls();
        el=c.find(x=>labelFor(x)===step.text)||c.find(x=>labelFor(x).includes(step.text));
        if(el) return el;
      }
      await sleep(250);
    }
    throw new Error(`Timed out: ${step.text||step.selector}`);
  }
  function dispatchClick(el){
    el.scrollIntoView({block:'center',behavior:'instant'});
    try{el.dispatchEvent(new PointerEvent('pointerdown',{bubbles:true,pointerType:'mouse'}));}catch{}
    el.dispatchEvent(new MouseEvent('mousedown',{bubbles:true,view:window}));
    try{el.dispatchEvent(new PointerEvent('pointerup',{bubbles:true,pointerType:'mouse'}));}catch{}
    el.dispatchEvent(new MouseEvent('mouseup',{bubbles:true,view:window}));
    el.click();
  }
  async function runSteps(steps){
    for(let i=0;i<steps.length;i++){
      const step=steps[i];
      if(step.action==='secret') return {ok:false,stopped:true,index:i,reason:'Secret/password field requires manual entry'};
      if(step.confirm) return {ok:false,stopped:true,index:i,reason:`Confirmation required before: ${step.text||'final action'}`};
      const el=await waitFor(step);
      if(step.action==='click'){dispatchClick(el);await sleep(800);}
      else if(step.action==='fill'){
        el.focus(); el.value=step.value??''; el.dispatchEvent(new Event('input',{bubbles:true})); el.dispatchEvent(new Event('change',{bubbles:true}));
      } else if(step.action==='check'){
        if(el.checked!==step.checked) dispatchClick(el);
      }
    }
    return {ok:true};
  }

  function normalizeLabel(s){return clean(s).toLowerCase();}
  function matchesQuery(el,query,exact=true){
    const t=normalizeLabel(labelFor(el));
    const q=normalizeLabel(query);
    if(!q) return false;
    if(exact) return t===q;
    return t.includes(q);
  }
  function contextFor(el){
    let p=el.parentElement;
    for(let i=0;i<3&&p;i++,p=p.parentElement){
      const t=clean(p.innerText||'');
      if(t && t.length>labelFor(el).length && t.length<240) return t.slice(0,180);
    }
    return '';
  }
  function findActions(q,exact=true){
    return controls().filter(el=>matchesQuery(el,q,exact)).slice(0,100).map((el,i)=>({...describe(el),context:contextFor(el),ordinal:i+1}));
  }

  async function runBulk({query,limit=10,delay=2500,exact=true}){
    bulkAbort=false;
    limit=Math.max(1,Math.min(Number(limit)||10,25));
    delay=Math.max(1000,Math.min(Number(delay)||2500,10000));
    let clicked=0;
    const log=[];
    while(clicked<limit && !bulkAbort){
      const candidates=controls().filter(el=>matchesQuery(el,query,exact));
      if(!candidates.length) break;
      const el=candidates[0];
      const before=describe(el);
      const ctx=contextFor(el);
      dispatchClick(el);
      clicked++;
      log.push({text:before.text,context:ctx});
      await sleep(delay);
    }
    return {ok:true,clicked,stopped:bulkAbort,remaining:controls().filter(el=>matchesQuery(el,query,exact)).length,log};
  }

  chrome.runtime.onMessage.addListener((m,s,send)=>{
    (async()=>{
      if(m?.type==='RM_RECORD_START'){recording=true;attach();return send({ok:true});}
      if(m?.type==='RM_RECORD_STOP'){recording=false;detach();return send({ok:true});}
      if(m?.type==='RM_FIND') return send({matches:findActions(m.query||'',m.exact!==false)});
      if(m?.type==='RM_CLICK'){
        const el=await waitFor({selector:m.selector,text:m.text}); dispatchClick(el); return send({ok:true});
      }
      if(m?.type==='RM_RUN_WORKFLOW') return send(await runSteps(m.steps||[]));
      if(m?.type==='RM_BULK_RUN') return send(await runBulk(m));
      if(m?.type==='RM_BULK_STOP'){bulkAbort=true;return send({ok:true});}
      send({ok:true});
    })().catch(e=>send({ok:false,error:e.message}));
    return true;
  });
})();
