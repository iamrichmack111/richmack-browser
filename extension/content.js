(() => {
  if (globalThis.__RICHMACK_CONTENT_LOADED__) return;
  globalThis.__RICHMACK_CONTENT_LOADED__ = true;
  let enabled = false;
  let hintLayer = null;

  const isEditable = (el) => el && (el.matches?.('input, textarea, select, [contenteditable="true"]'));

  async function refreshMode() {
    const data = await chrome.storage.local.get("richmackMode");
    enabled = Boolean(data.richmackMode);
  }

  function cleanupHints() {
    hintLayer?.remove();
    hintLayer = null;
  }

  function showHints() {
    cleanupHints();
    const candidates = [...document.querySelectorAll('a[href],button,input[type="button"],input[type="submit"],[role="button"]')]
      .filter((el) => {
        const r = el.getBoundingClientRect();
        return r.width > 3 && r.height > 3 && r.bottom > 0 && r.right > 0 && r.top < innerHeight && r.left < innerWidth;
      })
      .slice(0, 80);
    hintLayer = document.createElement('div');
    hintLayer.id = 'richmack-hints';
    Object.assign(hintLayer.style, { position:'fixed', inset:'0', zIndex:'2147483647', pointerEvents:'none' });
    candidates.forEach((el, i) => {
      const r = el.getBoundingClientRect();
      const badge = document.createElement('span');
      badge.textContent = String(i + 1);
      badge.dataset.rmHint = String(i + 1);
      Object.assign(badge.style, {
        position:'fixed', left:`${Math.max(0,r.left)}px`, top:`${Math.max(0,r.top)}px`,
        background:'#00a7ff', color:'#04111c', font:'700 11px monospace', padding:'2px 5px',
        border:'1px solid #7de1ff', borderRadius:'4px', boxShadow:'0 0 10px #00a7ff88'
      });
      hintLayer.appendChild(badge);
      el.dataset.rmHintTarget = String(i + 1);
    });
    document.documentElement.appendChild(hintLayer);
  }

  document.addEventListener('keydown', (e) => {
    if (!enabled || isEditable(e.target) || e.metaKey || e.ctrlKey || e.altKey) return;
    if (e.key === 'j') { scrollBy({ top: Math.max(80, innerHeight * .18), behavior: 'smooth' }); e.preventDefault(); }
    else if (e.key === 'k') { scrollBy({ top: -Math.max(80, innerHeight * .18), behavior: 'smooth' }); e.preventDefault(); }
    else if (e.key === 'g') { scrollTo({ top: 0, behavior: 'smooth' }); e.preventDefault(); }
    else if (e.key === 'G') { scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' }); e.preventDefault(); }
    else if (e.key === 'f') { showHints(); e.preventDefault(); }
    else if (e.key === 'Escape') cleanupHints();
  }, true);

  chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
    if (msg?.type === 'RM_SET_MODE') { enabled = Boolean(msg.enabled); cleanupHints(); sendResponse({ ok:true }); }
    if (msg?.type === 'RM_EXTRACT') {
      const links = [...new Set([...document.querySelectorAll('a[href]')].map(a => a.href).filter(Boolean))];
      const images = [...new Set([...document.images].map(i => i.currentSrc || i.src).filter(Boolean))];
      const videos = [...new Set([
        ...[...document.querySelectorAll('video[src],video source[src]')].map(v => v.src),
        ...[...document.querySelectorAll('a[href]')].map(a => a.href).filter(h => /\.(mp4|webm|mov)(\?|$)/i.test(h || ''))
      ].filter(Boolean))];
      const pdfs = links.filter(h => /\.pdf(\?|#|$)/i.test(h));
      const files = links.filter(h => /\.(epub|txt|md|csv|json|zip)(\?|#|$)/i.test(h));
      const text = document.body?.innerText?.slice(0, 300000) || '';
      sendResponse({ url: location.href, title: document.title, links, images, videos, pdfs, files, text });
    }
    if (msg?.type === 'RM_TEST_SELECTOR') {
      const el = document.querySelector(msg.selector);
      sendResponse({ ok:Boolean(el), tag:el?.tagName || null, text:(el?.innerText || el?.value || '').slice(0,120) });
    }
    if (msg?.type === 'RM_CLICK_SELECTOR') {
      const el = document.querySelector(msg.selector);
      if (!el) { sendResponse({ ok:false, error:'Selector not found' }); return; }
      el.click(); sendResponse({ ok:true });
    }
    return true;
  });

  refreshMode();
})();
