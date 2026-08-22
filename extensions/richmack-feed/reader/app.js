const API='http://127.0.0.1:8765';
const $=id=>document.getElementById(id);
let snap=null, shown=[], feed='';
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const hay=j=>[j.title,j.company,j.location,j.salary,j.summary].filter(Boolean).join(' ').toLowerCase();
function filter(){
  if(!snap)return;
  const q=$('q').value.trim().toLowerCase();
  shown=(snap.items||[]).filter(j=>(!q||hay(j).includes(q))&&(!$('easy').checked||j.easyApply)&&(!$('remote').checked||j.remote)&&(!$('salary').checked||!!j.salary));
  render();
}
function render(){
  $('total').textContent=(snap?.items||[]).length; $('showing').textContent=shown.length;
  $('cards').innerHTML=shown.length?shown.map((j,i)=>`<article class="card">
    <div class="title">${esc(j.title)}</div>
    <div class="meta">${j.company?`<span>${esc(j.company)}</span>`:''}${j.location?`<span>${esc(j.location)}</span>`:''}${j.salary?`<span class="pill pay">${esc(j.salary)}</span>`:''}${j.remote?'<span class="pill good">Remote</span>':''}${j.easyApply?'<span class="pill good">Easy Apply</span>':''}</div>
    ${j.summary&&!j.company&&!j.location?`<div class="meta">${esc(j.summary)}</div>`:''}
    <div class="card-actions"><a href="${esc(j.url)}" target="_blank" rel="noreferrer">Open</a><button data-copy="${i}">Copy link</button></div>
  </article>`).join(''):'<div class="empty">No items match these filters.</div>';
  document.querySelectorAll('[data-copy]').forEach(b=>b.addEventListener('click',()=>navigator.clipboard.writeText(shown[Number(b.dataset.copy)].url)));
}
async function generate(){
  if(!shown.length){$('status').textContent='No shown items to export.';return;}
  $('status').textContent='Generating local RSS…';
  const r=await fetch(`${API}/feeds/generate`,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({source_url:snap.url,title:snap.title||'Richmack Feed',page_type:snap.pageType||'generic',items:shown})});
  const j=await r.json(); if(!r.ok)throw new Error(j.detail||'Generate failed');
  feed=j.feed_url; $('copy').disabled=false; $('raw').disabled=false; $('status').textContent=`Generated ${j.items} items: ${feed}`;
  await chrome.storage.local.set({rmFeedSnapshot:{...snap,feedUrl:feed}});
}
(async()=>{
  const data=await chrome.storage.local.get('rmFeedSnapshot'); snap=data.rmFeedSnapshot;
  if(!snap){$('cards').innerHTML='<div class="empty">No feed snapshot. Open the Feed toolbar icon on a page first.</div>';return;}
  feed=snap.feedUrl||''; $('source').textContent=snap.title||snap.url||'Current page';
  if(feed){$('copy').disabled=false;$('raw').disabled=false;}
  shown=snap.items||[]; render();
  ['q','easy','remote','salary'].forEach(id=>$(id).addEventListener(id==='q'?'input':'change',filter));
  $('reset').onclick=()=>{$('q').value='';$('easy').checked=$('remote').checked=$('salary').checked=false;filter();};
  $('generate').onclick=()=>generate().catch(e=>$('status').textContent=e.message||'Backend offline');
  $('copy').onclick=()=>feed&&navigator.clipboard.writeText(feed);
  $('raw').onclick=()=>feed&&chrome.tabs.create({url:feed});
})();
