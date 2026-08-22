(() => {
  if (globalThis.__RM_V050_PAGE_TOOLS__) return;
  globalThis.__RM_V050_PAGE_TOOLS__ = true;

  const visible = el => {
    const r = el.getBoundingClientRect();
    const st = getComputedStyle(el);
    return r.width > 2 && r.height > 2 && st.visibility !== 'hidden' && st.display !== 'none';
  };
  const cleanText = s => (s || '').replace(/\s+/g, ' ').trim();
  const unique = xs => [...new Set(xs.filter(Boolean))];
  const abs = raw => { try { return new URL(raw, location.href).href; } catch { return null; } };
  const selectorFor = el => {
    if (el.id) return `#${CSS.escape(el.id)}`;
    const tag = el.tagName.toLowerCase();
    const attrs = ['aria-label','name','title','type'].map(a => el.getAttribute(a) ? `[${a}="${CSS.escape(el.getAttribute(a))}"]` : '').join('');
    if (attrs) return `${tag}${attrs}`;
    const cls = [...el.classList].slice(0,2).map(c => `.${CSS.escape(c)}`).join('');
    if (cls) return `${tag}${cls}`;
    let n=1, p=el; while ((p=p.previousElementSibling)) if (p.tagName===el.tagName) n++;
    return `${tag}:nth-of-type(${n})`;
  };
  const scan = () => {
    const links = unique([...document.querySelectorAll('a[href]')].map(a => abs(a.getAttribute('href'))));
    const images = unique([...document.images].map(i => abs(i.currentSrc || i.src)));
    const emails = unique([
      ...[...document.querySelectorAll('a[href^="mailto:"]')].map(a => a.href.replace(/^mailto:/i,'').split('?')[0]),
      ...(document.body?.innerText || '').match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi) || []
    ].map(x => x.toLowerCase()));
    const pdfs = links.filter(u => /\.pdf(?:$|[?#])/i.test(u));
    const files = links.filter(u => /\.(?:epub|txt|md|csv|json|zip|docx?|xlsx?|pptx?)(?:$|[?#])/i.test(u));
    const video = unique([...document.querySelectorAll('video source[src],video[src],a[href]')].map(el => abs(el.src || el.href)).filter(u => u && /\.(?:mp4|webm|mov|m4v)(?:$|[?#])/i.test(u)));
    const audio = unique([...document.querySelectorAll('audio source[src],audio[src],a[href]')].map(el => abs(el.src || el.href)).filter(u => u && /\.(?:mp3|m4a|ogg|wav|flac)(?:$|[?#])/i.test(u)));
    return {url:location.href,title:document.title,links,images,emails,pdfs,files,video,audio,text:cleanText(document.body?.innerText || '')};
  };
  const detectFeeds = () => {
    const feeds=[...document.querySelectorAll('link[rel="alternate"][type]')]
      .filter(x => /rss|atom|json\+feed/i.test(x.type || ''))
      .map(x => ({title:x.title || x.type,url:abs(x.href),type:x.type}));
    const items=[...document.querySelectorAll('article a[href],main a[href],h1 a[href],h2 a[href],h3 a[href]')]
      .filter(visible).map(a => ({title:cleanText(a.textContent),url:abs(a.href)}))
      .filter(x => x.title.length >= 8 && x.url && x.url.startsWith('http'));
    const seen=new Set();
    return {url:location.href,title:document.title,feeds,items:items.filter(x => !seen.has(x.url) && seen.add(x.url)).slice(0,100)};
  };
  function toast(text){const old=document.getElementById('rm-v050-toast');old?.remove();const el=document.createElement('div');el.id='rm-v050-toast';el.textContent=text;Object.assign(el.style,{position:'fixed',right:'18px',bottom:'18px',zIndex:2147483647,background:'#07111c',color:'#91e6ff',border:'1px solid #2478b3',borderRadius:'8px',padding:'8px 11px',font:'600 12px system-ui',boxShadow:'0 8px 30px #0009'});document.documentElement.appendChild(el);setTimeout(()=>el.remove(),1400);}
  function picker(){
    let active=true,last=null;
    const move=e=>{if(!active)return;if(last)last.style.outline=last.dataset.rmOldOutline||'';last=e.target;last.dataset.rmOldOutline=last.style.outline||'';last.style.outline='2px solid #55d8ff';e.stopPropagation();};
    const click=e=>{if(!active)return;e.preventDefault();e.stopPropagation();active=false;if(last)last.style.outline=last.dataset.rmOldOutline||'';const payload={selector:selectorFor(e.target),text:cleanText(e.target.innerText||e.target.value||e.target.getAttribute('aria-label')||''),url:location.href};chrome.runtime.sendMessage({type:'RM_PICKED',...payload}).catch(()=>{});cleanup();toast(`Saved: ${payload.text || payload.selector}`);};
    const key=e=>{if(e.key==='Escape'){active=false;cleanup();toast('Picker cancelled');}};
    const cleanup=()=>{document.removeEventListener('mousemove',move,true);document.removeEventListener('click',click,true);document.removeEventListener('keydown',key,true);};
    document.addEventListener('mousemove',move,true);document.addEventListener('click',click,true);document.addEventListener('keydown',key,true);toast('Pick an element · Esc cancels');
  }
  function findActions(q){const query=q.toLowerCase().trim();return [...document.querySelectorAll('button,a[href],input[type=button],input[type=submit],[role=button]')].filter(visible).map(el=>({text:cleanText(el.innerText||el.value||el.getAttribute('aria-label')||el.title||''),selector:selectorFor(el),tag:el.tagName.toLowerCase()})).filter(x=>x.text.toLowerCase().includes(query)).slice(0,30);}
  chrome.runtime.onMessage.addListener((m,s,send)=>{
    if(m?.type==='RM_SCAN') send(scan());
    else if(m?.type==='RM_FEEDS') send(detectFeeds());
    else if(m?.type==='RM_PICK'){picker();send({ok:true});}
    else if(m?.type==='RM_FIND') send({matches:findActions(m.query||'')});
    else if(m?.type==='RM_CLICK'){try{const el=document.querySelector(m.selector);if(!el){send({ok:false,error:'not found'});return true;}el.click();send({ok:true});}catch(e){send({ok:false,error:e.message});}}
    return true;
  });
})();
