import express from 'express';
import { generateWithAI } from '../services/ai.js'
import { fallbackMeta } from '../services/fallback.js'

const router = express.Router();

/**
 * POST /api/generate
 *
 * Body (all optional except at least one of url/title/bodyText):
 * {
 *   url?:          string  — URL to fetch if existingData not supplied
 *   title?:        string  — override detected title
 *   description?:  string  — override detected description
 *   keywords?:     string  — override detected keywords
 *   bodyText?:     string  — extra content context
 *   pageType?:     string  — website | article | product | ...
 *   siteName?:     string
 *   useAI?:        boolean — default true; false = heuristic only
 *   existingData?: object  — pass the /api/fetch result to skip re-fetching
 * }
 */
router.post('/', async (req, res) => {
  const {
    url, title, description, keywords, bodyText,
    pageType, siteName,
    useAI = true,
    existingData,   // pre-fetched data from /api/fetch
  } = req.body;

  if (!url && !title && !bodyText) {
    return res.status(400).json({ error: 'Provide at least a URL, title, or body text.' });
  }

  // Start with whatever the user provided
  let pageData = {
    url:         url || '',
    title:       title || existingData?.title || '',
    description: description || existingData?.description || '',
    keywords:    keywords || existingData?.keywords || '',
    bodyText:    bodyText || existingData?.bodyText || '',
    pageType:    pageType || existingData?.pageType || 'website',
    siteName:    siteName || existingData?.siteName || '',
    h1:          existingData?.h1 || '',
    h2s:         existingData?.h2s || [],
    paragraphs:  existingData?.paragraphs || '',
    lang:        existingData?.language || existingData?.lang || 'en',
  };

  // If URL given and no pre-fetched data, fetch now
  if (url && !existingData) {
    try {
      const html   = await fetchHtml(url);
      const parsed = parseHtml(html, url);
      pageData = {
        url,
        title:       title || parsed.title,
        description: description || parsed.description,
        keywords:    keywords || parsed.keywords,
        bodyText:    bodyText || parsed.bodyText,
        pageType:    pageType || parsed.pageType,
        siteName:    siteName || parsed.siteName,
        h1:          parsed.h1,
        h2s:         parsed.h2s,
        paragraphs:  parsed.paragraphs,
        lang:        parsed.language || parsed.lang || 'en',
      };
    } catch (fetchErr) {
      console.warn('[/api/generate] fetch failed:', fetchErr.message);
      if (!title && !bodyText) {
        return res.status(422).json({ error: fetchErr.message });
      }
      // Fall through with user-supplied data
    }
  }

  let result;
  let aiUsed = false;

  if (useAI) {
    try {
      result = await generateWithAI(pageData);
      aiUsed = true;
    } catch (aiErr) {
      console.warn('[/api/generate] AI failed, using fallback:', aiErr.message);
      result = fallbackMeta(pageData);
    }
  } else {
    result = fallbackMeta(pageData);
  }

  result._source = aiUsed ? 'ai' : 'fallback';
  result._model  = result._model || (aiUsed ? 'ai' : 'heuristic');

  return res.json(result);
});

export default router;