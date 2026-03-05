import type { VercelRequest, VercelResponse } from '@vercel/node';
import { analyzeWebsite } from '../lib/analyzer';

const analysisCache = new Map<string, { data: any; timestamp: number }>();
const CACHE_TTL = 1000 * 60 * 60;
const MAX_CACHE_SIZE = 100;

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Content-Type', 'application/json');

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    if (!req.body || typeof req.body !== 'object') {
      return res.status(400).json({ error: 'Invalid request body' });
    }

    const { url } = req.body;
    if (!url || typeof url !== 'string') {
      return res.status(400).json({ error: 'URL is required and must be a string' });
    }

    let targetUrl = url.trim();
    if (!targetUrl.startsWith('http://') && !targetUrl.startsWith('https://')) {
      targetUrl = 'https://' + targetUrl;
    }

    const cached = analysisCache.get(targetUrl);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      return res.status(200).json({ ...cached.data, cached: true });
    }

    const responseData = await analyzeWebsite(targetUrl);

    if (analysisCache.size >= MAX_CACHE_SIZE) {
      const firstKey = analysisCache.keys().next().value;
      if (firstKey) analysisCache.delete(firstKey);
    }
    analysisCache.set(targetUrl, { data: responseData, timestamp: Date.now() });

    return res.status(200).json(responseData);
  } catch (error: any) {
    console.error('Analysis error:', error);
    return res.status(400).json({ error: error.message || 'Failed to analyze website' });
  }
}
