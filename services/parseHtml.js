import * as cheerio from 'cheerio';

export const parseHtml = (html, url = '') => {
  const $ = cheerio.load(html);

  // Remove noise elements
  $('script, style, noscript, svg, iframe, nav, footer, header, aside').remove();

  const get = (selector, attr = null) => {
    const el = $(selector).first();
    return attr ? (el.attr(attr)?.trim() || '') : el.text().trim();
  };

  const getMeta = (name, attr = 'name') =>
    $(`meta[${attr}="${name}"]`).attr('content')?.trim() || '';

  const existing = {
    // Basic
    title:        get('title').slice(0, 300),
    description:  getMeta('description'),
    keywords:     getMeta('keywords'),
    author:       getMeta('author'),
    robots:       getMeta('robots'),
    themeColor:   getMeta('theme-color'),
    colorScheme:  getMeta('color-scheme'),
    rating:       getMeta('rating'),
    revisitAfter: getMeta('revisit-after'),
    language:     getMeta('language') || $('html').attr('lang') || 'en',
    copyright:    getMeta('copyright'),
    canonical:    $('link[rel="canonical"]').attr('href')?.trim() || url,
    favicon:      $('link[rel="icon"], link[rel="shortcut icon"]').first().attr('href') || '',

    // Open Graph
    ogTitle:       getMeta('og:title', 'property'),
    ogDescription: getMeta('og:description', 'property'),
    ogImage:       getMeta('og:image', 'property'),
    ogType:        getMeta('og:type', 'property'),
    ogSiteName:    getMeta('og:site_name', 'property'),
    ogLocale:      getMeta('og:locale', 'property'),
    ogUrl:         getMeta('og:url', 'property') || url,
    ogVideo:       getMeta('og:video', 'property'),

    // Twitter
    twitterCard:        getMeta('twitter:card'),
    twitterTitle:       getMeta('twitter:title'),
    twitterDescription: getMeta('twitter:description'),
    twitterImage:       getMeta('twitter:image'),
    twitterSite:        getMeta('twitter:site'),
    twitterCreator:     getMeta('twitter:creator'),

    // Verification
    googleVerification: getMeta('google-site-verification'),
    bingVerification:   getMeta('msvalidate.01'),
    yandexVerification: getMeta('yandex-verification'),

    // Content
    h1: get('h1').slice(0, 200),
    h2s: $('h2').map((_, el) => $(el).text().trim()).get().slice(0, 10),
    h3s: $('h3').map((_, el) => $(el).text().trim()).get().slice(0, 5),
    bodyText: $('body').text().replace(/\s+/g, ' ').trim().slice(0, 5000),
    paragraphs: $('p')
      .map((_, el) => $(el).text().trim())
      .get()
      .filter(t => t.length > 50)
      .slice(0, 8)
      .join(' ')
      .slice(0, 2000),
  };

  // Infer page type from content signals
  let pageType = existing.ogType || 'website';
  const body = existing.bodyText.toLowerCase();
  if (body.includes('shop') || body.includes('cart') || body.includes('add to cart')) pageType = 'product';
  else if (body.includes('blog') || body.includes(' article') || body.includes('posted on')) pageType = 'article';
  else if (body.includes('news') || body.includes('breaking')) pageType = 'article';

  // Derive site name
  let siteName = existing.ogSiteName;
  if (!siteName && url) {
    try { siteName = new URL(url).hostname.replace('www.', ''); } catch {}
  }

  return { ...existing, pageType, siteName };
};