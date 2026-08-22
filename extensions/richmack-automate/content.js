(() => {
  if (globalThis.__RM_AUTOMATE_V054__) return;
  globalThis.__RM_AUTOMATE_V054__ = true;

  let recording=false;
  let listeners=false;
  const clean=s=>(s||'').replace(/\s+/g,' ').trim();
  const visible=el=>{const r=el.getBoundingClientRect(),st=getComputedStyle(el);return r.width>2&&r.height>2&&st.visibility!=='hidden'&&st.display!=='none';};
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
  const semantic={selector:null,text:null,role:null,tag:null};
  const describe=el=>({selector:selectorFor(el),text:labelFor(el).slice(0,160),role:el.getAttribute('role')||'',tag:el.tagName.toLowerCase()});
  const emit=step=>chrome.runtime.sendMessage({type:'RM_RECORD_EVENT',step}).catch(()=>{});

  function clickCapture(e){
    if(!recording || !e.isTrusted) return;
    const el=e.target.closest('button,a[href],input[type=button],input[type=submit],[role=button]');
    if(!el||!visible(el)) return;
    const d=describe(el);
    const text=d.text.toLowerCase();
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
      // selector fallback by semantic text
      if(step.text){
        const candidates=[...document.querySelectorAll('button,a[href],input,[role=button]')].filter(visible);
        el=candidates.find(x=>labelFor(x)===step.text)||candidates.find(x=>labelFor(x).includes(step.text));
        if(el) return el;
      }
      await new Promise(r=>setTimeout(r,250));
    }
    throw new Error(`Timed out: ${step.text||step.selector}`);
  }
  async function runSteps(steps){
    for(let i=0;i<steps.length;i++){
      const step=steps[i];
      if(step.action==='secret') return {ok:false,stopped:true,index:i,reason:'Secret/password field requires manual entry'};
      if(step.confirm) return {ok:false,stopped:true,index:i,reason:`Confirmation required before: ${step.text||'final action'}`};
      const el=await waitFor(step);
      el.scrollIntoView({block:'center',behavior:'instant'});
      if(step.action==='click'){el.click();await new Promise(r=>setTimeout(r,800));}
      else if(step.action==='fill'){
        el.focus(); el.value=step.value??''; el.dispatchEvent(new Event('input',{bubbles:true})); el.dispatchEvent(new Event('change',{bubbles:true}));
      } else if(step.action==='check'){
        if(el.checked!==step.checked) el.click();
      }
    }
    return {ok:true};
  }
  function findActions(q){const query=(q||'').toLowerCase().trim();return [...document.querySelectorAll('button,a[href],input[type=button],input[type=submit],[role=button]')].filter(visible).map(describe).filter(x=>x.text.toLowerCase().includes(query)).slice(0,50);}

  chrome.runtime.onMessage.addListener((m,s,send)=>{
    (async()=>{
      if(m?.type==='RM_RECORD_START'){recording=true;attach();return send({ok:true});}
      if(m?.type==='RM_RECORD_STOP'){recording=false;detach();return send({ok:true});}
      if(m?.type==='RM_FIND') return send({matches:findActions(m.query||'')});
      if(m?.type==='RM_CLICK'){
        const el=await waitFor({selector:m.selector,text:m.text}); el.click(); return send({ok:true});
      }
      if(m?.type==='RM_RUN_WORKFLOW') return send(await runSteps(m.steps||[]));
      send({ok:true});
    })().catch(e=>send({ok:false,error:e.message}));
    return true;
  });
})();
