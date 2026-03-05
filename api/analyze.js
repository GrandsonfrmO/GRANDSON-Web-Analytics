const MAX_HTML_SIZE = 5 * 1024 * 1024;
const FETCH_TIMEOUT = 15000;
const analysisCache = new Map();
const CACHE_TTL = 1000 * 60 * 60;
const MAX_CACHE_SIZE = 100;

async function analyzeWebsite(url) {
  let targetUrl = url.trim();
  if (!targetUrl.startsWith('http://') && !targetUrl.startsWith('https://')) {
    targetUrl = 'https://' + targetUrl;
  }

  try {
    new URL(targetUrl);
  } catch (e) {
    throw new Error('Invalid URL format');
  }

  const hostname = new URL(targetUrl).hostname;
  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    throw new Error('Localhost scanning is not allowed');
  }

  const startTime = Date.now();
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT);

  let response;
  try {
    response = await fetch(targetUrl, {
      headers: { 'User-Agent': 'WebAnalyzerPro/1.0' },
      redirect: 'follow',
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timeoutId);
  }

  if (!response.ok) {
    const errorText = await response.text().catch(() => 'Unknown error');
    throw new Error(`Website returned status ${response.status}: ${errorText.substring(0, 100)}`);
  }

  const contentType = response.headers.get('content-type') || '';
  if (!contentType.includes('text/html')) {
    throw new Error('URL does not return HTML content');
  }

  let html;
  try {
    html = await response.text();
  } catch (e) {
    throw new Error('Failed to read response body');
  }

  if (html.length > MAX_HTML_SIZE) {
    throw new Error(`HTML size exceeds limit (${Math.round(html.length / 1024 / 1024)}MB > 5MB)`);
  }

  if (html.length === 0) {
    throw new Error('Website returned empty HTML');
  }

  const loadTime = Date.now() - startTime;
  const htmlSizeKB = Math.round(html.length / 1024);

  const techStack = [];
  const features = [];
  const recommendations = [];

  const titleMatch = html.match(/<title[^>]*>([^<]*)<\/title>/i);
  const title = titleMatch ? titleMatch[1].trim() : 'Missing';
  const hasMetaDescription = /<meta[^>]*name=["']description["'][^>]*>/i.test(html);
  const hasViewport = /<meta[^>]*name=["']viewport["'][^>]*>/i.test(html);
  const langMatch = html.match(/<html[^>]*lang=["']([^"']*)/i);
  const lang = langMatch ? langMatch[1] : 'Missing';
  const h1Count = (html.match(/<h1[^>]*>/gi) || []).length;
  const imageCount = (html.match(/<img[^>]*>/gi) || []).length;
  const linkCount = (html.match(/<a[^>]*>/gi) || []).length;
  const domElements = (html.match(/<[^>]+>/g) || []).length;
  const scriptCount = (html.match(/<script[^>]*>/gi) || []).length;
  const cssCount = (html.match(/<link[^>]*rel=["']stylesheet["'][^>]*>/gi) || []).length;

  const https = targetUrl.startsWith('https://');
  let securityScore = https ? 70 : 40;
  if (!hasViewport) securityScore -= 10;
  if (!hasMetaDescription) securityScore -= 10;

  let uxScore = 70;
  if (!hasViewport) uxScore -= 20;
  if (!hasMetaDescription) uxScore -= 10;
  if (h1Count !== 1) uxScore -= 10;

  const htmlContent = html.toLowerCase();
  if (htmlContent.includes('react')) techStack.push({ name: 'React', category: 'Library' });
  if (htmlContent.includes('vue')) techStack.push({ name: 'Vue.js', category: 'Framework' });
  if (htmlContent.includes('angular')) techStack.push({ name: 'Angular', category: 'Framework' });
  if (htmlContent.includes('next')) techStack.push({ name: 'Next.js', category: 'Framework' });
  if (htmlContent.includes('tailwind')) techStack.push({ name: 'Tailwind CSS', category: 'Framework UI' });
  if (htmlContent.includes('bootstrap')) techStack.push({ name: 'Bootstrap', category: 'Framework UI' });

  if (/<form[^>]*>/i.test(html)) features.push('Formulaires');
  if (/<input[^>]*type=["']search["'][^>]*>/i.test(html)) features.push('Recherche');
  if (/<video[^>]*>/i.test(html)) features.push('Vidéo');
  if (/<canvas[^>]*>/i.test(html)) features.push('Canvas/WebGL');

  if (!https) recommendations.push('Activez HTTPS pour sécuriser votre site');
  if (!hasMetaDescription) recommendations.push('Ajoutez une meta description');
  if (!hasViewport) recommendations.push('Ajoutez une meta viewport pour le responsive');
  if (h1Count === 0) recommendations.push('Ajoutez une balise H1');
  if (h1Count > 1) recommendations.push('Limitez-vous à une seule balise H1');

  return {
    url: targetUrl,
    timestamp: new Date().toISOString(),
    status: response.status,
    loadTimeMs: loadTime,
    overallScore: Math.round((securityScore + uxScore) / 2),
    performance: { htmlSizeKB, scriptCount, cssCount, imageCount },
    features,
    techStack,
    security: { https, score: securityScore, vulnerabilitiesList: [] },
    ux: { title, hasMetaDescription, hasViewport, lang, h1Count, imageCount, linkCount, domElements, score: uxScore },
    designType: 'Unknown',
    aiProbability: 0,
    developerLevel: 'Unknown',
    recommendations,
    pricing: { freelance: 0, agency: 0, estimatedDays: 0, resaleValue: 0, domainAgeYears: 0, backlinkProfile: 0, trafficVolume: 0, pricingFactors: [] },
  };
}

module.exports = async function handler(req, res) {
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
  } catch (error) {
    console.error('Analysis error:', error);
    return res.status(400).json({ error: error.message || 'Failed to analyze website' });
  }
};
