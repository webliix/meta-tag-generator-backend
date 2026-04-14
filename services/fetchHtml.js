import axios from 'axios';

const BLOCKED = /localhost|127\.|0\.0\.0\.0|192\.168\.|^10\.|172\.(1[6-9]|2\d|3[01])\./i;

const UA_POOL = [
  // Chrome — most permissive
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  // Mac Chrome
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  // Googlebot — many sites allow crawlers
  'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)',
  // Facebook crawler — often whitelisted for OG tag access
  'facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_uatext.php)',
  // Twitter bot — often whitelisted
  'Twitterbot/1.0',
];

const http = axios.create({
  timeout: 12000,
  maxContentLength: 5 * 1024 * 1024,
  maxRedirects: 6,
  responseType: 'text',
  validateStatus: s => s < 400,
});

const isGoodHtml = (html) =>
  typeof html === 'string' && html.length > 200 && /<html|<body|<head/i.test(html);

// ── Method 1: Direct fetch with a specific user agent ──────────
const directFetch = async (url, uaIdx = 0) => {
  const r = await http.get(url, {
    headers: {
      'User-Agent': UA_POOL[uaIdx],
      Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      'Accept-Language': 'en-US,en;q=0.9',
      'Accept-Encoding': 'gzip, deflate, br',
      'Cache-Control': 'no-cache',
    },
  });
  if (!isGoodHtml(r.data)) throw new Error('Response too small or not HTML');
  return r.data;
};

// ── Method 2: allorigins proxy ─────────────────────────────────
const alloriginsFetch = async (url) => {
  const r = await axios.get(
    `https://api.allorigins.win/get?url=${encodeURIComponent(url)}`,
    { timeout: 12000 }
  );
  const html = r.data?.contents;
  if (!isGoodHtml(html)) throw new Error('allorigins returned bad data');
  return html;
};

// ── Method 3: corsproxy.io ─────────────────────────────────────
const corsproxyFetch = async (url) => {
  const r = await http.get(`https://corsproxy.io/?${encodeURIComponent(url)}`);
  if (!isGoodHtml(r.data)) throw new Error('corsproxy returned bad data');
  return r.data;
};

// ── Method 4: Wayback Machine (latest snapshot) ────────────────
const waybackFetch = async (url) => {
  const info = await axios.get(
    `https://archive.org/wayback/available?url=${encodeURIComponent(url)}`,
    { timeout: 8000 }
  );
  const snap = info.data?.archived_snapshots?.closest;
  if (!snap?.url) throw new Error('No Wayback snapshot found');

  const r = await http.get(snap.url, {
    headers: { 'User-Agent': UA_POOL[0] },
  });
  if (!isGoodHtml(r.data)) throw new Error('Wayback snapshot is empty');
  return r.data;
};

// ── Exported fetch with waterfall fallback ─────────────────────
export const fetchHtml = async (url) => {
  if (!url || !/^https?:\/\//i.test(url)) {
    throw new Error('Invalid URL. Must start with http:// or https://');
  }
  if (BLOCKED.test(url)) {
    throw new Error('Private / internal URLs are not allowed.');
  }

  const methods = [
    ['direct (Chrome UA)',    () => directFetch(url, 0)],
    ['direct (Mac UA)',       () => directFetch(url, 1)],
    ['direct (Googlebot)',    () => directFetch(url, 2)],
    ['direct (Facebookbot)',  () => directFetch(url, 3)],
    ['direct (Twitterbot)',   () => directFetch(url, 4)],
    ['allorigins proxy',      () => alloriginsFetch(url)],
    ['corsproxy.io',          () => corsproxyFetch(url)],
    ['Wayback Machine',       () => waybackFetch(url)],
  ];

  let lastErr;
  for (const [label, fn] of methods) {
    try {
      const html = await fn();
      console.log(`[fetch] ✓ ${label}: ${url}`);
      return html;
    } catch (e) {
      console.log(`[fetch] ✗ ${label}: ${e.message}`);
      lastErr = e;
    }
  }

  // Friendly error mapping
  const s = lastErr?.response?.status;
  if (s === 403) throw new Error('Website is blocking all our requests. Please enter details manually.');
  if (s === 404) throw new Error('Page not found (404). Please check the URL.');
  if (s === 410) throw new Error('Page is gone (410). The URL may be outdated.');
  if (s === 429) throw new Error('Website is rate-limiting requests. Try again in a moment.');
  if (lastErr?.code === 'ENOTFOUND') throw new Error('Domain not found. Please check the URL spelling.');
  if (lastErr?.code === 'ECONNREFUSED') throw new Error('Connection refused. The website may be down.');
  if (['ETIMEDOUT', 'ECONNABORTED', 'ECONNRESET'].includes(lastErr?.code)) {
    throw new Error('All fetch methods timed out. The website is too slow or blocking requests.');
  }

  throw new Error(lastErr?.message || 'Failed to fetch the URL after all fallback methods.');
};