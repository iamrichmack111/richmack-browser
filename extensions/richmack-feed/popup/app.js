const API='http://127.0.0.1:8765';
let result=null,feed='';
const $=id=>document.getElementById(id);
const out=$('out'), copy=$('copy'), find=$('find'), generate=$('generate'), reader=$('reader'), rawfeed=$('rawfeed');

async function saveSnapshot(){
  if(!result)return;
  await chrome.storage.local.set({rmFeedSnapshot:{...result,feedUrl:feed,detectedAt:Date.now()}});
  reader.disabled=!result.items?.length;
}
async function get(){
  const [t]=await chrome.tabs.query({active:true,currentWindow:true});
  if(!t?.id)throw new Error('No active tab.');
  await chrome.scripting.executeScript({target:{tabId:t.id},files:['content.js']});
  result=await chrome.tabs.sendMessage(t.id,{type:'RM_FEEDS'});
  $('stats').hidden=false;
  $('type').textContent=(result.pageType||'generic').toUpperCase();
  $('raw').textContent=result.stats?.rawLinks||0;
  $('items').textContent=result.stats?.feedItems||0;
  if(result.feeds?.length){
    feed=result.feeds[0].url;
    out.textContent='Native feed found. You can copy/open it, or inspect page items in the reader.';
    copy.disabled=false; rawfeed.disabled=false;
  } else {
    const label=result.pageType==='jobs'?'unique probable jobs':'clean content items';
    out.textContent=`Found ${result.items?.length||0} ${label} from ${result.stats?.rawLinks||0} page links.`;
  }
  await saveSnapshot();
  return t;
}
async function generateFrom(items){
  const t=await get();
  const useItems=items||result.items||[];
  if(!useItems.length)throw new Error('No suitable content items found.');
  const r=await fetch(`${API}/feeds/generate`,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({source_url:t.url,title:t.title||'Richmack Feed',page_type:result.pageType||'generic',items:useItems})});
  const j=await r.json(); if(!r.ok)throw new Error(j.detail||'Failed');
  feed=j.feed_url; copy.disabled=false; rawfeed.disabled=false;
  out.textContent=`Generated ${j.items} cleaned ${j.page_type} items.\n${feed}`;
  await saveSnapshot();
}
find.onclick=()=>get().catch(e=>out.textContent=e.message||'Cannot inspect this page.');
copy.onclick=async()=>{if(feed)await navigator.clipboard.writeText(feed);};
reader.onclick=async()=>{await saveSnapshot(); await chrome.tabs.create({url:chrome.runtime.getURL('reader/index.html')});};
rawfeed.onclick=async()=>{if(feed)await chrome.tabs.create({url:feed});};
generate.onclick=()=>generateFrom().catch(e=>out.textContent=e.message||'Backend offline');
