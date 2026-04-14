/**
 * Generates reasonable meta tags using heuristics — no AI required.
 * Used when AI is unavailable, key is missing, or as a fast fallback.
 */
export const fallbackMeta = (d) => {
  const domain = d.url ? (() => { try { return new URL(d.url).hostname.replace('www.', ''); } catch { return ''; } })() : '';
  const origin = d.url ? (() => { try { return new URL(d.url).origin; } catch { return ''; } })() : '';

  const rawTitle = d.title || d.h1 || d.siteName || domain || 'Website';
  const seoTitle = rawTitle.length <= 60 ? rawTitle : rawTitle.slice(0, 57) + '…';

  const rawDesc = d.description || d.paragraphs || (d.bodyText ? d.bodyText.slice(0, 200) : '');
  const seoDesc = rawDesc.length >= 130 && rawDesc.length <= 160
    ? rawDesc
    : rawDesc.length > 160
      ? rawDesc.slice(0, 157) + '…'
      : rawDesc.length > 0
        ? rawDesc.padEnd(rawDesc.length, '') + (rawDesc.length < 130 ? ` Visit ${domain} for details.` : '')
        : `Visit ${domain} for more information and resources.`;

  const kws = d.keywords || [
    ...seoTitle.toLowerCase().split(/\s+/),
    ...(d.h2s || []).join(' ').toLowerCase().split(/\s+/),
  ]
    .filter(w => w.length > 3)
    .filter((v, i, a) => a.indexOf(v) === i)
    .slice(0, 10)
    .join(', ');

  const now  = new Date().toISOString();
  const year = new Date().getFullYear();

  return {
    basic: {
      title:        seoTitle,
      description:  seoDesc.slice(0, 160),
      keywords:     kws,
      robots:       'index, follow',
      canonical:    d.url || '',
      author:       d.siteName || domain,
      language:     d.lang || 'en',
      revisitAfter: '7 days',
      rating:       'general',
      category:     d.pageType || 'website',
      copyright:    `${d.siteName || domain} ${year}`,
    },
    openGraph: {
      'og:title':        seoTitle,
      'og:description':  seoDesc.slice(0, 200),
      'og:url':          d.url || '',
      'og:type':         d.pageType === 'article' ? 'article' : 'website',
      'og:site_name':    d.siteName || domain,
      'og:locale':       'en_US',
      'og:image':        origin ? `${origin}/og-image.jpg` : '',
      'og:image:width':  '1200',
      'og:image:height': '630',
      'og:image:alt':    `${seoTitle} preview image`,
    },
    twitter: {
      'twitter:card':        'summary_large_image',
      'twitter:title':       seoTitle.slice(0, 70),
      'twitter:description': seoDesc.slice(0, 200),
      'twitter:image':       origin ? `${origin}/twitter-image.jpg` : '',
      'twitter:image:alt':   seoTitle,
      'twitter:site':        `@${(d.siteName || domain || 'website').replace(/\s+/g, '').toLowerCase()}`,
      'twitter:creator':     `@${(d.siteName || domain || 'website').replace(/\s+/g, '').toLowerCase()}`,
    },
    technical: {
      viewport:       'width=device-width, initial-scale=1.0',
      charset:        'UTF-8',
      httpEquiv:      'IE=edge',
      themeColor:     '#3b82f6',
      colorScheme:    'light dark',
      appleWebApp:    'yes',
      appleStatusBar: 'default',
      appleTitle:     seoTitle.slice(0, 30),
      formatDetection:'telephone=no',
      mobileWebApp:   'yes',
      msTileColor:    '#3b82f6',
      referrer:       'origin-when-cross-origin',
    },
    jsonLd: {
      '@context':  'https://schema.org',
      '@type':     'WebPage',
      name:        seoTitle,
      description: seoDesc.slice(0, 300),
      url:         d.url || '',
      inLanguage:  d.lang || 'en',
      dateModified: now,
      publisher: {
        '@type': 'Organization',
        name:    d.siteName || domain || 'Website',
        url:     origin || d.url || '',
        logo: {
          '@type': 'ImageObject',
          url:     origin ? `${origin}/logo.png` : '',
        },
      },
    },
    improvements: [
      'Write a unique title tag between 50–60 characters with your primary keyword near the start.',
      'Craft a compelling meta description (140–160 chars) with a clear call-to-action.',
      'Create an OG image (1200×630 px) to dramatically improve social sharing CTR.',
      'Add JSON-LD structured data to become eligible for Google rich results.',
      'Submit your sitemap to Google Search Console and Bing Webmaster Tools.',
    ],
    seoScore: 42,
    _source: 'fallback',
  };
};