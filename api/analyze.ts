import { VercelRequest, VercelResponse } from '@vercel/node';
import * as cheerio from 'cheerio';

// Cache system with size limit
const analysisCache = new Map<string, { data: any, timestamp: number }>();
const CACHE_TTL = 1000 * 60 * 60; // 1 hour
const MAX_CACHE_SIZE = 100;
const MAX_HTML_SIZE = 5 * 1024 * 1024; // 5MB
const FETCH_TIMEOUT = 15000; // 15 seconds

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Validate request body
    if (!req.body || typeof req.body !== 'object') {
      return res.status(400).json({ error: "Invalid request body" });
    }

    const { url } = req.body;
    if (!url || typeof url !== 'string') {
      return res.status(400).json({ error: "URL is required and must be a string" });
    }

    let targetUrl = url.trim();
    if (!targetUrl.startsWith("http://") && !targetUrl.startsWith("https://")) {
      targetUrl = "https://" + targetUrl;
    }

    // Validate URL format
    let urlObj;
    try {
      urlObj = new URL(targetUrl);
    } catch (e) {
      return res.status(400).json({ error: "Invalid URL format" });
    }

    if (urlObj.hostname === "localhost" || urlObj.hostname === "127.0.0.1") {
      return res.status(400).json({ error: "Localhost scanning is not allowed" });
    }

    // Check cache
    const cached = analysisCache.get(targetUrl);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      return res.json({ ...cached.data, cached: true });
    }

    const startTime = Date.now();
    
    // Fetch with timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT);
    
    let response;
    try {
      response = await fetch(targetUrl, {
        headers: {
          "User-Agent": "WebAnalyzerPro/1.0",
        },
        redirect: "follow",
        signal: controller.signal,
      });
    } finally {
      clearTimeout(timeoutId);
    }

    // Validate HTTP status
    if (!response.ok) {
      return res.status(400).json({ error: `Website returned status ${response.status}` });
    }

    // Check content-type
    const contentType = response.headers.get('content-type') || '';
    if (!contentType.includes('text/html')) {
      return res.status(400).json({ error: "URL does not return HTML content" });
    }

    // Get HTML with size limit
    const html = await response.text();
    if (html.length > MAX_HTML_SIZE) {
      return res.status(400).json({ error: `HTML size exceeds limit (${Math.round(html.length / 1024 / 1024)}MB > 5MB)` });
    }

    if (html.length === 0) {
      return res.status(400).json({ error: "Website returned empty HTML" });
    }

    const loadTime = Date.now() - startTime;
    const htmlSizeKB = Math.round(html.length / 1024);
    
    let $;
    try {
      $ = cheerio.load(html);
    } catch (e) {
      return res.status(400).json({ error: "Failed to parse HTML content" });
    }

    // Basic analysis (simplified for serverless)
    const techStack = [];
    const features = [];
    const recommendations = [];
    
    const title = $("title").text().trim() || "Missing";
    const hasMetaDescription = !!$("meta[name='description']").attr("content");
    const hasViewport = !!$("meta[name='viewport']").attr("content");
    const lang = $("html").attr("lang") || "Missing";
    const h1Count = $("h1").length;
    const imageCount = $("img").length;
    const linkCount = $("a").length;
    const domElements = $("*").length;

    // Simple security score
    const https = targetUrl.startsWith("https://");
    let securityScore = https ? 70 : 40;

    // Simple UX score
    let uxScore = 70;
    if (!hasViewport) uxScore -= 20;
    if (!hasMetaDescription) uxScore -= 10;

    const responseData = {
      url: targetUrl,
      timestamp: new Date().toISOString(),
      status: response.status,
      loadTimeMs: loadTime,
      overallScore: Math.round((securityScore + uxScore) / 2),
      performance: {
        htmlSizeKB,
        scriptCount: $("script").length,
        cssCount: $("link[rel='stylesheet']").length,
        imageCount
      },
      features,
      techStack,
      security: {
        https,
        score: securityScore,
        vulnerabilitiesList: []
      },
      ux: {
        title,
        hasMetaDescription,
        hasViewport,
        lang,
        h1Count,
        imageCount,
        linkCount,
        domElements,
        score: uxScore
      },
      designType: "Unknown",
      aiProbability: 0,
      developerLevel: "Unknown",
      recommendations,
      pricing: {
        freelance: 0,
        agency: 0,
        estimatedDays: 0,
        resaleValue: 0,
        domainAgeYears: 0,
        backlinkProfile: 0,
        trafficVolume: 0,
        pricingFactors: []
      }
    };

    // Save to cache with size limit
    if (analysisCache.size >= MAX_CACHE_SIZE) {
      const firstKey = analysisCache.keys().next().value;
      if (firstKey) analysisCache.delete(firstKey);
    }
    analysisCache.set(targetUrl, { data: responseData, timestamp: Date.now() });

    res.json(responseData);

  } catch (error: any) {
    console.error("Analysis error:", error);
    res.status(500).json({ error: "Failed to analyze website. It might be unreachable or blocking requests." });
  }
}
