(() => {
  if (globalThis.__RM_V053_FEED_TOOLS__) return;
  globalThis.__RM_V053_FEED_TOOLS__ = true;

  const cleanText = s => (s || '').replace(/\s+/g, ' ').trim();
  const abs = raw => { try { return new URL(raw, location.href).href; } catch { return null; } };
  const visible = el => {
    const r = el.getBoundingClientRect();
    const st = getComputedStyle(el);
    return r.width > 2 && r.height > 2 && st.visibility !== 'hidden' && st.display !== 'none';
  };
  const norm = s => cleanText(s).toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
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

  function indeedCard(anchor) {
    return anchor.closest('[data-jk], .job_seen_beacon, .cardOutline, .resultContent, [class*="job_seen"], [class*="jobCard"]');
  }

  function inferIndeedFields(anchor) {
    const card = indeedCard(anchor);
    if (!card) return {company:'',location:'',salary:'',easyApply:false,remote:false,cardText:''};
    const company = cleanText(card.querySelector('[data-testid="company-name"], .companyName, [class*="companyName"]')?.textContent || '');
    const locationText = cleanText(card.querySelector('[data-testid="text-location"], .companyLocation, [class*="companyLocation"]')?.textContent || '');
    const cardText = cleanText(card.innerText || card.textContent || '');
    const salaryNode = card.querySelector('[data-testid="attribute_snippet_testid"], .salary-snippet-container, [class*="salary"]');
    let salary = cleanText(salaryNode?.textContent || '');
    if (!salary) {
      const m = cardText.match(/\$[\d,.]+(?:\s*[-–]\s*\$[\d,.]+)?\s*(?:an?\s+hour|per\s+hour|a\s+year|per\s+year|annually|yearly)?/i);
      salary = m ? cleanText(m[0]) : '';
    }
    const easyApply = /\beasily apply\b|\beasy apply\b/i.test(cardText);
    const remote = /\bremote\b|work from home/i.test(cardText);
    return {company, location: locationText, salary, easyApply, remote, cardText};
  }

  function semanticJobKey(j) {
    const title = norm(j.title);
    const company = norm(j.company);
    const loc = norm(j.location);
    return company || loc ? `${title}|${company}|${loc}` : '';
  }

  function indeedJobs() {
    const anchors = [...document.querySelectorAll('a[href]')].filter(visible);
    const byId = [];
    for (const a of anchors) {
      let u;
      try { u = new URL(a.href, location.href); } catch { continue; }
      let jk = u.searchParams.get('jk');
      if (!jk) jk = indeedCard(a)?.getAttribute('data-jk') || '';
      if (!/^[a-z0-9]{8,32}$/i.test(jk || '')) continue;

      const text = cleanText(a.textContent || a.getAttribute('aria-label') || a.title || '');
      const bad = /^(view|apply|apply now|save|easy apply|easily apply|sponsored|new|view similar jobs.*)$/i;
      if (text.length < 3 || text.length > 240 || bad.test(text)) continue;

      const f = inferIndeedFields(a);
      const summary = [f.company, f.location, f.salary].filter(Boolean).join(' — ');
      byId.push({
        title: text,
        url: `https://www.indeed.com/viewjob?jk=${encodeURIComponent(jk)}`,
        id: `indeed:${jk}`,
        jobKey: jk,
        company: f.company,
        location: f.location,
        salary: f.salary,
        easyApply: f.easyApply,
        remote: f.remote,
        summary,
        category: 'job'
      });
    }

    const stable = uniqBy(byId, x => x.id);
    const semanticSeen = new Set();
    return stable.filter(j => {
      const k = semanticJobKey(j);
      if (!k) return true;
      if (semanticSeen.has(k)) return false;
      semanticSeen.add(k);
      return true;
    }).slice(0, 100);
  }

  function genericItems() {
    const candidates = [...document.querySelectorAll('article a[href],main a[href],h1 a[href],h2 a[href],h3 a[href]')]
      .filter(visible)
      .map(a => ({
        title: cleanText(a.textContent),
        url: abs(a.href),
        id: abs(a.href),
        company:'',location:'',salary:'',easyApply:false,remote:false,
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
