import { Router } from 'express';
import axios from 'axios';
import { asyncHandler } from '../utils/async-handler';
import { resolveOllamaUrl } from '../utils/ollama-url';
import logger from '../utils/logger';

const router = Router();

/**
 * Proxy to Ollama's /api/tags endpoint to list locally installed models.
 */
router.get('/models', asyncHandler(async (req, res) => {
  let url = req.query.url as string;

  if (!url) {
    return res.status(400).json({ success: false, error: { message: 'Ollama URL is required' } });
  }

  url = url.trim();
  if (url.endsWith('/')) {
    url = url.slice(0, -1);
  }

  const targetUrl = resolveOllamaUrl(url);

  try {
    const response = await axios.get(`${targetUrl}/api/tags`, {
      timeout: 10000,
      headers: { Accept: 'application/json' }
    });

    const models = (response.data?.models || []).map((m: any) => ({
      name: m.name || m.model,
      model: m.model || m.name,
      size: m.size,
      modified_at: m.modified_at,
      digest: m.digest
    }));

    return res.json({ success: true, models });
  } catch (error: any) {
    const status = error.response?.status || 502;
    const message =
      error.response?.data?.error ||
      error.message ||
      'Failed to connect to Ollama';
    logger.error('[Ollama] Failed to list models:', { url: targetUrl, error: message });
    return res.status(status).json({ success: false, error: { message } });
  }
}));

export default router;
