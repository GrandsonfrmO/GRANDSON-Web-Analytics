import * as cheerio from 'cheerio';

const MAX_HTML_SIZE = 5 * 1024 * 1024; // 5MB
const FETCH_TIMEOUT = 15000; // 15 seconds

export async function analyzeWebsite(url) {
  let targetUrl = url.trim();
  if (!targetUrl.startsWith("http://") && !targetUrl.startsWith("https://")) {
    targetUrl = "https://" + targetUrl;
  }

  // Validate URL format
  try {
    new URL(targetUrl);
  } catch (e) {
    throw new Error("Invalid URL format");
  }

  if (new URL(targetUrl).hostname === "localhost" || new URL(targetUrl).hostname === "127.0.0.1") {
    throw new Error("Localhost scanning is not allowed");
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
    const errorText = await response.text().catch(() => 'Unknown error');
    throw new Error(`Website returned status ${response.status}: ${errorText.substring(0, 100)}`);
  }

  // Check content-type
  const contentType = response.headers.get('content-type') || '';
  if (!contentType.includes('text/html')) {
    throw new Error("URL does not return HTML content");
  }

  // Get HTML with size limit
  let html;
  try {
    html = await response.text();
  } catch (e) {
    throw new Error("Failed to read response body");
  }
  
  if (html.length > MAX_HTML_SIZE) {
    throw new Error(`HTML size exceeds limit (${Math.round(html.length / 1024 / 1024)}MB > 5MB)`);
  }

  if (html.length === 0) {
    throw new Error("Website returned empty HTML");
  }

  const loadTime = Date.now() - startTime;
  const htmlSizeKB = Math.round(html.length / 1024);
  
  let $;
  try {
    $ = cheerio.load(html);
  } catch (e) {
    throw new Error("Failed to parse HTML content");
  }

  // Basic analysis
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
  const scriptCount = $("script").length;
  const cssCount = $("link[rel='stylesheet']").length;

  // Simple security score
  const https = targetUrl.startsWith("https://");
  let securityScore = https ? 70 : 40;
  
  if (!$("meta[name='viewport']").length) securityScore -= 10;
  if (!$("meta[name='description']").length) securityScore -= 10;

  // Simple UX score
  let uxScore = 70;
  if (!hasViewport) uxScore -= 20;
  if (!hasMetaDescription) uxScore -= 10;
  if (h1Count !== 1) uxScore -= 10;

  // Detect some technologies
  const htmlContent = html.toLowerCase();
  if (htmlContent.includes("react")) techStack.push({ name: "React", category: "Library" });
  if (htmlContent.includes("vue")) techStack.push({ name: "Vue.js", category: "Framework" });
  if (htmlContent.includes("angular")) techStack.push({ name: "Angular", category: "Framework" });
  if (htmlContent.includes("next")) techStack.push({ name: "Next.js", category: "Framework" });
  if (htmlContent.includes("tailwind")) techStack.push({ name: "Tailwind CSS", category: "Framework UI" });
  if (htmlContent.includes("bootstrap")) techStack.push({ name: "Bootstrap", category: "Framework UI" });

  // Add basic features
  if ($("form").length > 0) features.push("Formulaires");
  if ($("input[type='search']").length > 0) features.push("Recherche");
  if ($("video").length > 0) features.push("Vidéo");
  if ($("canvas").length > 0) features.push("Canvas/WebGL");

  // Add recommendations
  if (!https) recommendations.push("Activez HTTPS pour sécuriser votre site");
  if (!hasMetaDescription) recommendations.push("Ajoutez une meta description");
  if (!hasViewport) recommendations.push("Ajoutez une meta viewport pour le responsive");
  if (h1Count === 0) recommendations.push("Ajoutez une balise H1");
  if (h1Count > 1) recommendations.push("Limitez-vous à une seule balise H1");

  const responseData = {
    url: targetUrl,
    timestamp: new Date().toISOString(),
    status: response.status,
    loadTimeMs: loadTime,
    overallScore: Math.round((securityScore + uxScore) / 2),
    performance: {
      htmlSizeKB,
      scriptCount,
      cssCount,
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

  return responseData;
}
