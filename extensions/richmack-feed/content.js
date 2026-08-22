(() => {
  if (globalThis.__RM_V052_FEED_TOOLS__) return;
  globalThis.__RM_V052_FEED_TOOLS__ = true;

  const cleanText = s => (s || '').replace(/\s+/g, ' ').trim();
  const abs = raw => { try { return new URL(raw, location.href).href; } catch { return null; } };
  const visible = el => {
    const r = el.getBoundingClientRect();
    const st = getComputedStyle(el);
    return r.width > 2 && r.height > 2 && st.visibility !== 'hidden' && st.display !== 'none';
  };
  const uniqBy = (xs, keyFn) => {
    const seen = new Set();
    return xs.filter(x => { const k = keyFn(x); if (!k || seen.has(k)) return false; seen.add(k); return true; });
  };

  function nativeFeeds() {
    return [...document.querySelectorAll('link[rel="alternate"][type]')]
      .filter(x => /rss|atom|json\+feed/i.test(x.type || ''))
      .map(x => ({ title: x.title || x.type, url: abs(x.href), type: x.type }))
      .filter(x => x.url);
  }

  function inferIndeedSummary(anchor) {
    const card = anchor.closest('[data-jk], .job_seen_beacon, .cardOutline, .resultContent, [class*="job_seen"], [class*="jobCard"]');
    if (!card) return '';
    const company = cleanText(
      card.querySelector('[data-testid="company-name"], .companyName, [class*="companyName"]')?.textContent || ''
    );
    const locationText = cleanText(
      card.querySelector('[data-testid="text-location"], .companyLocation, [class*="companyLocation"]')?.textContent || ''
    );
    const salary = cleanText(
      card.querySelector('[data-testid="attribute_snippet_testid"], .salary-snippet-container, [class*="salary"]')?.textContent || ''
    );
    return [company, locationText, salary].filter(Boolean).join(' — ');
  }

  function indeedJobs() {
    const anchors = [...document.querySelectorAll('a[href]')].filter(visible);
    const jobs = [];
    for (const a of anchors) {
      let u;
      try { u = new URL(a.href, location.href); } catch { continue; }
      let jk = u.searchParams.get('jk');
      if (!jk) {
        const card = a.closest('[data-jk]');
        jk = card?.getAttribute('data-jk') || '';
      }
      if (!/^[a-z0-9]{8,32}$/i.test(jk || '')) continue;

      const text = cleanText(a.textContent || a.getAttribute('aria-label') || a.title || '');
      const looksLikeJobTitle = text.length >= 3 && text.length <= 240 && !/^(view|apply|save|easy apply|sponsored|new)$/i.test(text);
      if (!looksLikeJobTitle) continue;

      jobs.push({
        title: text,
        url: `https://www.indeed.com/viewjob?jk=${encodeURIComponent(jk)}`,
        id: `indeed:${jk}`,
        summary: inferIndeedSummary(a),
        category: 'job'
      });
    }
    return uniqBy(jobs, x => x.id).slice(0, 100);
  }

  function genericItems() {
    const candidates = [...document.querySelectorAll('article a[href],main a[href],h1 a[href],h2 a[href],h3 a[href]')]
      .filter(visible)
      .map(a => ({
        title: cleanText(a.textContent),
        url: abs(a.href),
        id: abs(a.href),
        summary: '',
        category: 'page'
      }))
      .filter(x => x.title.length >= 8 && x.url && /^https?:/i.test(x.url));
    return uniqBy(candidates, x => x.url).slice(0, 100);
  }

  function detectPageType() {
    const host = location.hostname.replace(/^www\./, '').toLowerCase();
    if (host === 'indeed.com' || host.endsWith('.indeed.com')) return 'jobs';
    if (/github\.com$/.test(host) && /\/releases(?:\/|$)/.test(location.pathname)) return 'releases';
    return 'generic';
  }

  function detectFeeds() {
    const feeds = nativeFeeds();
    const pageType = detectPageType();
    let items = [];
    if (pageType === 'jobs') items = indeedJobs();
    if (!items.length) items = genericItems();
    return {
      url: location.href,
      title: document.title,
      feeds,
      pageType,
      items,
      stats: { rawLinks: document.querySelectorAll('a[href]').length, feedItems: items.length }
    };
  }

  chrome.runtime.onMessage.addListener((m, _s, send) => {
    if (m?.type === 'RM_FEEDS') send(detectFeeds());
    return true;
  });
})();
