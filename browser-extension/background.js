const BOARD_HOSTS = [
  { key: 'pracuj', host: 'www.pracuj.pl' },
  { key: 'linkedin', host: 'www.linkedin.com', pathPrefix: '/jobs/' },
  { key: 'olx', host: 'www.olx.pl' },
  { key: 'indeed', host: 'pl.indeed.com' },
  { key: 'rocketjobs', host: 'rocketjobs.pl' },
  { key: 'justjoinit', host: 'justjoin.it' }
];

function sourceKeyFromUrl(value) {
  if (!value) return null;
  try {
    const url = new URL(value);
    const match = BOARD_HOSTS.find(item => url.hostname === item.host && (!item.pathPrefix || url.pathname.startsWith(item.pathPrefix)));
    return match?.key ?? null;
  } catch {
    return null;
  }
}

async function collectOpenJobTabs() {
  const tabs = await chrome.tabs.query({});
  const relevant = tabs.filter(tab => typeof tab.id === 'number' && sourceKeyFromUrl(tab.url));
  const pages = [];

  for (const tab of relevant) {
    const sourceKey = sourceKeyFromUrl(tab.url);
    if (!sourceKey || typeof tab.id !== 'number') continue;
    try {
      const executions = await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: extractVisibleJobsFromPage,
        args: [sourceKey]
      });
      const result = executions[0]?.result;
      if (result && Array.isArray(result.items)) pages.push(result);
    } catch (error) {
      pages.push({
        sourceKey,
        pageUrl: tab.url ?? '',
        pageTitle: tab.title ?? '',
        items: [],
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }

  return {
    pages,
    tabCount: relevant.length,
    itemCount: pages.reduce((sum, page) => sum + (Array.isArray(page.items) ? page.items.length : 0), 0)
  };
}

function extractVisibleJobsFromPage(sourceKey) {
  const MAX_ITEMS = 60;
  const MAX_TEXT = 50000;

  function cleanText(value) {
    return String(value ?? '').replace(/\s+/g, ' ').trim();
  }

  function textFromHtml(value) {
    const holder = document.createElement('div');
    holder.innerHTML = String(value ?? '');
    return cleanText(holder.textContent ?? '');
  }

  function addressText(value) {
    const addresses = Array.isArray(value) ? value : [value];
    const parts = [];
    for (const entry of addresses) {
      if (!entry || typeof entry !== 'object') continue;
      const address = entry.address && typeof entry.address === 'object' ? entry.address : entry;
      for (const key of ['streetAddress', 'addressLocality', 'addressRegion', 'postalCode', 'addressCountry']) {
        const text = cleanText(address[key]);
        if (text) parts.push(text);
      }
    }
    return [...new Set(parts)].join(', ');
  }

  function identifierValue(value) {
    if (typeof value === 'string' || typeof value === 'number') return String(value);
    if (value && typeof value === 'object') {
      const candidate = value.value ?? value.name ?? value['@id'];
      if (typeof candidate === 'string' || typeof candidate === 'number') return String(candidate);
    }
    return null;
  }

  function flattenLd(value, output = []) {
    if (Array.isArray(value)) {
      for (const item of value) flattenLd(item, output);
      return output;
    }
    if (!value || typeof value !== 'object') return output;
    output.push(value);
    if (Array.isArray(value['@graph'])) flattenLd(value['@graph'], output);
    return output;
  }

  function isJobPosting(value) {
    const type = value?.['@type'];
    if (typeof type === 'string') return type.toLowerCase() === 'jobposting';
    return Array.isArray(type) && type.some(item => String(item).toLowerCase() === 'jobposting');
  }

  function structuredItem(job) {
    const title = cleanText(job.title ?? job.name);
    const organization = job.hiringOrganization && typeof job.hiringOrganization === 'object' ? job.hiringOrganization : null;
    const company = cleanText(organization?.name);
    const locationText = addressText(job.jobLocation);
    const employmentType = Array.isArray(job.employmentType) ? job.employmentType.join(', ') : cleanText(job.employmentType);
    const description = textFromHtml(job.description ?? job.responsibilities ?? job.qualifications);
    const rawText = [title, company ? `Firma: ${company}` : '', locationText ? `Lokalizacja: ${locationText}` : '', employmentType ? `Rodzaj zatrudnienia: ${employmentType}` : '', description]
      .filter(Boolean).join('\n').slice(0, MAX_TEXT);
    if (rawText.length < 20) return null;
    let sourceUrl = location.href;
    if (typeof job.url === 'string') {
      try { sourceUrl = new URL(job.url, location.href).toString(); } catch { /* keep page URL */ }
    }
    return {
      rawText,
      sourceUrl,
      externalId: identifierValue(job.identifier),
      publishedAt: typeof job.datePosted === 'string' ? job.datePosted : null
    };
  }

  function linkLooksLikeJob(href) {
    const patterns = {
      pracuj: ['/praca/'],
      linkedin: ['/jobs/view/'],
      olx: ['/d/oferta/'],
      indeed: ['/viewjob', '/rc/clk'],
      rocketjobs: ['/offers/', '/job-offers/'],
      justjoinit: ['/job-offers/']
    };
    return (patterns[sourceKey] ?? []).some(pattern => href.includes(pattern));
  }

  const items = [];
  for (const script of document.querySelectorAll('script[type="application/ld+json"]')) {
    try {
      const parsed = JSON.parse(script.textContent ?? 'null');
      for (const node of flattenLd(parsed)) {
        if (!isJobPosting(node)) continue;
        const item = structuredItem(node);
        if (item) items.push(item);
      }
    } catch {
      // A single malformed JSON-LD block must not stop extraction from the visible page.
    }
  }

  if (items.length < MAX_ITEMS) {
    for (const anchor of document.querySelectorAll('a[href]')) {
      if (items.length >= MAX_ITEMS) break;
      if (!(anchor instanceof HTMLAnchorElement) || anchor.getClientRects().length === 0) continue;
      let absolute;
      try { absolute = new URL(anchor.href, location.href).toString(); } catch { continue; }
      if (!linkLooksLikeJob(absolute)) continue;
      const container = anchor.closest('article, li, [data-testid*="job" i], [class*="job" i], [class*="offer" i]') ?? anchor.parentElement;
      const rawText = cleanText(container?.textContent ?? anchor.textContent).slice(0, MAX_TEXT);
      if (rawText.length < 20) continue;
      items.push({ rawText, sourceUrl: absolute, externalId: null, publishedAt: null });
    }
  }

  const seen = new Set();
  const unique = [];
  for (const item of items) {
    const key = item.sourceUrl || item.externalId || item.rawText.slice(0, 300);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    unique.push(item);
    if (unique.length >= MAX_ITEMS) break;
  }

  return {
    sourceKey,
    pageUrl: location.href,
    pageTitle: document.title,
    items: unique
  };
}

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (!message || message.type !== 'COLLECT_OPEN_JOB_TABS') return false;
  collectOpenJobTabs()
    .then(payload => sendResponse({ ok: true, payload }))
    .catch(error => sendResponse({ ok: false, error: error instanceof Error ? error.message : String(error) }));
  return true;
});
