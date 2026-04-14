import axios from 'axios';

// ================================================================
// AI PROVIDER CONFIGURATION
// ----------------------------------------------------------------
// Set in your .env file (see .env.example for all options):
//
//   Groq (default):
//     AI_API_KEY=gsk_...
//     AI_BASE_URL=https://api.groq.com/openai/v1
//     AI_MODEL=llama-3.3-70b-versatile
//
//   OpenAI:
//     AI_API_KEY=sk-...
//     AI_BASE_URL=https://api.openai.com/v1
//     AI_MODEL=gpt-4o-mini
//
//   Together AI / any OpenAI-compatible API:
//     AI_BASE_URL=https://api.together.xyz/v1
//     AI_MODEL=meta-llama/Llama-3-70b-chat-hf
// ================================================================

const getConfig = () => ({
  key:      process.env.AI_API_KEY || process.env.GROQ_API_KEY || '',
  baseUrl:  process.env.AI_BASE_URL || 'https://api.groq.com/openai/v1',
  model:    process.env.AI_MODEL    || 'llama-3.3-70b-versatile',
});

// Groq model fallback chain (ignored for non-Groq providers)
const GROQ_FALLBACKS = [
  'llama-3.3-70b-versatile',
  'llama3-70b-8192',
  'mixtral-8x7b-32768',
  'llama-3.1-8b-instant',
];

const buildPrompt = (d) => {
  const domain = d.url ? (() => { try { return new URL(d.url).hostname.replace('www.', ''); } catch { return ''; } })() : '';
  const origin = d.url ? (() => { try { return new URL(d.url).origin; } catch { return ''; } })() : '';
  const year   = new Date().getFullYear();
  const now    = new Date().toISOString();

  return `You are a world-class SEO strategist. Analyze this webpage data and generate a complete, highly-optimized set of ALL meta tags.

PAGE DATA:
URL: ${d.url || 'Not provided'}
Domain: ${domain}
Page Type: ${d.pageType || 'website'}
Site Name: ${d.siteName || domain || 'Website'}
Language: ${d.lang || 'en'}
H1: ${d.h1 || 'None'}
H2s: ${d.h2s?.join(' | ') || 'None'}
Current Title: ${d.title || 'None'}
Current Description: ${d.description || 'None'}
Keywords: ${d.keywords || 'None'}
Content: ${d.paragraphs || d.bodyText?.slice(0, 1800) || 'None'}

RULES:
- title: 50-60 chars, primary keyword near front, click-worthy
- description: 140-160 chars, value proposition + soft CTA
- keywords: 8-12 LSI keywords, mix short and long-tail
- og:description: 2-3 engaging sentences for social sharing
- twitter:description: punchy, under 200 chars
- JSON-LD: pick the most appropriate @type from: WebPage, Article, Product, LocalBusiness, WebSite, BlogPosting, Organization
- seoScore: honest 0-100 based on existing content signals
- themeColor: infer a suitable brand hex color from content

Respond ONLY with valid JSON, no markdown fences, no extra text:
{
  "basic": {
    "title": "...",
    "description": "...",
    "keywords": "...",
    "robots": "index, follow",
    "canonical": "${d.url || 'https://example.com'}",
    "author": "${d.siteName || domain || 'Author'}",
    "language": "${d.lang || 'en'}",
    "revisitAfter": "7 days",
    "rating": "general",
    "category": "infer from content",
    "copyright": "${d.siteName || domain} ${year}"
  },
  "openGraph": {
    "og:title": "...",
    "og:description": "...",
    "og:url": "${d.url || ''}",
    "og:type": "${d.pageType === 'article' ? 'article' : 'website'}",
    "og:site_name": "${d.siteName || domain}",
    "og:locale": "en_US",
    "og:image": "${origin}/og-image.jpg",
    "og:image:width": "1200",
    "og:image:height": "630",
    "og:image:alt": "descriptive alt text"
  },
  "twitter": {
    "twitter:card": "summary_large_image",
    "twitter:title": "...",
    "twitter:description": "...",
    "twitter:image": "${origin}/twitter-image.jpg",
    "twitter:image:alt": "...",
    "twitter:site": "@${(d.siteName || domain || 'website').replace(/\s+/g, '').toLowerCase()}",
    "twitter:creator": "@${(d.siteName || domain || 'website').replace(/\s+/g, '').toLowerCase()}"
  },
  "technical": {
    "viewport": "width=device-width, initial-scale=1.0",
    "charset": "UTF-8",
    "httpEquiv": "IE=edge",
    "themeColor": "#infer hex",
    "colorScheme": "light dark",
    "appleWebApp": "yes",
    "appleStatusBar": "default",
    "appleTitle": "short title ≤30 chars",
    "formatDetection": "telephone=no",
    "mobileWebApp": "yes",
    "msTileColor": "#infer hex",
    "referrer": "origin-when-cross-origin"
  },
  "jsonLd": {
    "@context": "https://schema.org",
    "@type": "WebPage",
    "name": "...",
    "description": "...",
    "url": "${d.url || ''}",
    "inLanguage": "${d.lang || 'en'}",
    "dateModified": "${now}",
    "publisher": {
      "@type": "Organization",
      "name": "${d.siteName || domain}",
      "url": "${origin || d.url || ''}",
      "logo": { "@type": "ImageObject", "url": "${origin}/logo.png" }
    }
  },
  "improvements": [
    "Specific, actionable tip 1",
    "Specific, actionable tip 2",
    "Specific, actionable tip 3",
    "Specific, actionable tip 4",
    "Specific, actionable tip 5"
  ],
  "seoScore": 72
}`;
};

export const generateWithAI = async (pageData) => {
  const { key, baseUrl, model } = getConfig();
  if (!key) throw new Error('AI_API_KEY is not set. Add it to your .env file.');

  const prompt   = buildPrompt(pageData);
  const isGroq   = baseUrl.includes('groq.com');
  const models   = isGroq
    ? [model, ...GROQ_FALLBACKS.filter(m => m !== model)]
    : [model];

  let lastError;

  for (const m of models) {
    try {
      const res = await axios.post(
        `${baseUrl}/chat/completions`,
        { model: m, messages: [{ role: 'user', content: prompt }], temperature: 0.25, max_tokens: 2500 },
        { headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' }, timeout: 35000 }
      );

      const raw   = res.data?.choices?.[0]?.message?.content || '';
      const clean = raw.replace(/```json|```/g, '').trim();
      const match = clean.match(/\{[\s\S]*\}/);
      if (!match) throw new SyntaxError('No JSON object found in response');

      const parsed = JSON.parse(match[0]);
      parsed._model = m;
      return parsed;
    } catch (err) {
      lastError = err;
      if (err.response?.status === 401) throw new Error('Invalid AI API key. Check AI_API_KEY in .env');
      if (err.response?.status === 429 || err instanceof SyntaxError) continue;
      throw err;
    }
  }

  throw lastError || new Error('All AI models failed');
};