const API='http://127.0.0.1:8765';
let result=null,feed='';
const $=id=>document.getElementById(id);
const out=$('out'), copy=$('copy'), find=$('find'), generate=$('generate'), preview=$('preview');

async function get(){
  const [t]=await chrome.tabs.query({active:true,currentWindow:true});
  await chrome.scripting.executeScript({target:{tabId:t.id},files:['content.js']});
  result=await chrome.tabs.sendMessage(t.id,{type:'RM_FEEDS'});
  $('stats').hidden=false;
  $('type').textContent=(result.pageType||'generic').toUpperCase();
  $('raw').textContent=result.stats?.rawLinks||0;
  $('items').textContent=result.stats?.feedItems||0;
  if(result.feeds?.length){
    feed=result.feeds[0].url;
    out.textContent='Native feed found:\n\n'+result.feeds.map(x=>`${x.title}\n${x.url}`).join('\n\n');
    copy.disabled=false;
  } else {
    const label=result.pageType==='jobs'?'probable job listings':'clean content items';
    out.textContent=`No native feed. Found ${result.items?.length||0} ${label} from ${result.stats?.rawLinks||0} page links.`;
  }
  return t;
}

find.onclick=()=>get().catch(e=>out.textContent=e.message||'Cannot inspect this page.');
copy.onclick=async()=>{if(feed)await navigator.clipboard.writeText(feed);};
preview.onclick=async()=>{
  try{
    await get();
    if(!result.items?.length){out.textContent='No suitable feed items found.';return;}
    out.textContent=result.items.slice(0,20).map((x,i)=>`${i+1}. ${x.title}${x.summary?`\n   ${x.summary}`:''}\n   ${x.url}`).join('\n\n');
  }catch(e){out.textContent=e.message||'Preview failed';}
};
generate.onclick=async()=>{
  try{
    const t=await get();
    if(!result.items?.length){out.textContent='No suitable content items found.';return;}
    const r=await fetch(`${API}/feeds/generate`,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({source_url:t.url,title:t.title||'Richmack Feed',page_type:result.pageType||'generic',items:result.items})});
    const j=await r.json();
    if(!r.ok)throw new Error(j.detail||'Failed');
    feed=j.feed_url;copy.disabled=false;
    out.textContent=`Generated ${j.items} cleaned ${j.page_type} items\n${feed}`;
  }catch(e){out.textContent=e.message||'Backend offline';}
};
