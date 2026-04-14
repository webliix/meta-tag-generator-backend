import express from 'express';
import { fetchHtml } from '../services/fetchHtml.js'
import { parseHtml } from '../services/parseHtml.js'
const router = express.Router();

/**
 * GET /api/fetch?url=https://example.com
 *
 * Fetches and parses a URL, returning all extracted meta data.
 * Does NOT generate tags — that's /api/generate.
 */
router.get('/', async (req, res) => {
  const { url } = req.query;

  if (!url) {
    return res.status(400).json({ error: 'Missing required query parameter: url' });
  }

  let normalized = url.trim();
  if (!/^https?:\/\//i.test(normalized)) {
    normalized = 'https://' + normalized;
  }

  try {
    const html   = await fetchHtml(normalized);
    const parsed = parseHtml(html, normalized);

    return res.json({
      success: true,
      url: normalized,
      data: parsed,
      fetchedAt: new Date().toISOString(),
    });
  } catch (err) {
    console.error('[/api/fetch]', err.message);
    return res.status(422).json({
      error: err.message,
      url: normalized,
    });
  }
});

export default router;