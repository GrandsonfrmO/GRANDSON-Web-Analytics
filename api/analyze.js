import * as cheerio from 'cheerio';

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
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
      redirect: 'follow',
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timeoutId);
  }

  if (!response.ok) {
    throw new Error(`Website returned status ${response.status}`);
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

  let $;
  try {
    $ = cheerio.load(html);
  } catch (e) {
    throw new Error('Failed to parse HTML content');
  }

  // === ANALYSE AVANCÉE DES TECHNOLOGIES ===
  const techStack = [];
  const htmlLower = html.toLowerCase();
  
  // Frameworks JS
  if (htmlLower.includes('react') || $('script[src*="react"]').length || $('[data-reactroot], [data-reactid]').length) {
    techStack.push({ name: 'React', category: 'Framework JS' });
  }
  if (htmlLower.includes('vue') || $('script[src*="vue"]').length || $('[data-v-]').length) {
    techStack.push({ name: 'Vue.js', category: 'Framework JS' });
  }
  if (htmlLower.includes('angular') || $('script[src*="angular"]').length || $('[ng-app], [ng-controller]').length) {
    techStack.push({ name: 'Angular', category: 'Framework JS' });
  }
  if (htmlLower.includes('next') || $('script[src*="next"]').length || $('script[src*="_next"]').length) {
    techStack.push({ name: 'Next.js', category: 'Framework' });
  }
  if (htmlLower.includes('nuxt') || $('script[src*="nuxt"]').length) {
    techStack.push({ name: 'Nuxt.js', category: 'Framework' });
  }
  if (htmlLower.includes('svelte') || $('script[src*="svelte"]').length) {
    techStack.push({ name: 'Svelte', category: 'Framework JS' });
  }
  if (htmlLower.includes('jquery') || $('script[src*="jquery"]').length) {
    techStack.push({ name: 'jQuery', category: 'Library' });
  }
  
  // CSS Frameworks
  if (htmlLower.includes('tailwind') || $('link[href*="tailwind"]').length || $('[class*="tw-"]').length) {
    techStack.push({ name: 'Tailwind CSS', category: 'CSS Framework' });
  }
  if (htmlLower.includes('bootstrap') || $('link[href*="bootstrap"]').length || $('[class*="col-"], [class*="btn-"]').length) {
    techStack.push({ name: 'Bootstrap', category: 'CSS Framework' });
  }
  if (htmlLower.includes('bulma') || $('link[href*="bulma"]').length) {
    techStack.push({ name: 'Bulma', category: 'CSS Framework' });
  }
  if (htmlLower.includes('foundation') || $('link[href*="foundation"]').length) {
    techStack.push({ name: 'Foundation', category: 'CSS Framework' });
  }
  if (htmlLower.includes('materialize') || $('link[href*="materialize"]').length) {
    techStack.push({ name: 'Materialize', category: 'CSS Framework' });
  }
  
  // CMS & Platforms
  if (htmlLower.includes('wp-content') || htmlLower.includes('wordpress') || htmlLower.includes('wp-includes')) {
    techStack.push({ name: 'WordPress', category: 'CMS' });
  }
  if (htmlLower.includes('shopify') || htmlLower.includes('cdn.shopify')) {
    techStack.push({ name: 'Shopify', category: 'E-commerce' });
  }
  if (htmlLower.includes('wix') || htmlLower.includes('wixstatic')) {
    techStack.push({ name: 'Wix', category: 'Website Builder' });
  }
  if (htmlLower.includes('squarespace') || htmlLower.includes('sqsp')) {
    techStack.push({ name: 'Squarespace', category: 'Website Builder' });
  }
  if (htmlLower.includes('webflow') || htmlLower.includes('webflow.io')) {
    techStack.push({ name: 'Webflow', category: 'Website Builder' });
  }
  if (htmlLower.includes('drupal')) {
    techStack.push({ name: 'Drupal', category: 'CMS' });
  }
  if (htmlLower.includes('joomla')) {
    techStack.push({ name: 'Joomla', category: 'CMS' });
  }
  
  // Analytics & Marketing
  if (htmlLower.includes('google-analytics') || htmlLower.includes('gtag') || htmlLower.includes('ga.js')) {
    techStack.push({ name: 'Google Analytics', category: 'Analytics' });
  }
  if (htmlLower.includes('gtm') || htmlLower.includes('googletagmanager')) {
    techStack.push({ name: 'Google Tag Manager', category: 'Tag Manager' });
  }
  if ((htmlLower.includes('facebook') || htmlLower.includes('fbq')) && htmlLower.includes('pixel')) {
    techStack.push({ name: 'Facebook Pixel', category: 'Marketing' });
  }
  if (htmlLower.includes('hotjar')) {
    techStack.push({ name: 'Hotjar', category: 'Analytics' });
  }
  if (htmlLower.includes('mixpanel')) {
    techStack.push({ name: 'Mixpanel', category: 'Analytics' });
  }
  
  // Fonts & Icons
  if (htmlLower.includes('font-awesome') || $('link[href*="font-awesome"]').length) {
    techStack.push({ name: 'Font Awesome', category: 'Icons' });
  }
  if (htmlLower.includes('google') && htmlLower.includes('fonts')) {
    techStack.push({ name: 'Google Fonts', category: 'Fonts' });
  }
  
  // CDN & Hosting
  if (htmlLower.includes('cloudflare')) {
    techStack.push({ name: 'Cloudflare', category: 'CDN' });
  }
  if (htmlLower.includes('amazonaws') || htmlLower.includes('aws')) {
    techStack.push({ name: 'AWS', category: 'Hosting' });
  }
  if (htmlLower.includes('vercel')) {
    techStack.push({ name: 'Vercel', category: 'Hosting' });
  }
  if (htmlLower.includes('netlify')) {
    techStack.push({ name: 'Netlify', category: 'Hosting' });
  }

  // === ANALYSE DE SÉCURITÉ AVANCÉE ===
  const https = targetUrl.startsWith('https://');
  const securityHeaders = {
    strictTransportSecurity: response.headers.get('strict-transport-security'),
    contentSecurityPolicy: response.headers.get('content-security-policy'),
    xFrameOptions: response.headers.get('x-frame-options'),
    xContentTypeOptions: response.headers.get('x-content-type-options'),
    referrerPolicy: response.headers.get('referrer-policy'),
  };

  const vulnerabilities = [];
  let securityScore = https ? 80 : 30;
  
  if (!https) vulnerabilities.push({ severity: 'critical', issue: 'Pas de HTTPS', impact: 'Données non chiffrées' });
  if (!securityHeaders.strictTransportSecurity && https) {
    vulnerabilities.push({ severity: 'medium', issue: 'HSTS manquant', impact: 'Vulnérable aux attaques downgrade' });
    securityScore -= 10;
  }
  if (!securityHeaders.contentSecurityPolicy) {
    vulnerabilities.push({ severity: 'medium', issue: 'CSP manquant', impact: 'Vulnérable aux attaques XSS' });
    securityScore -= 10;
  }
  if (!securityHeaders.xFrameOptions) {
    vulnerabilities.push({ severity: 'low', issue: 'X-Frame-Options manquant', impact: 'Vulnérable au clickjacking' });
    securityScore -= 5;
  }

  // === ANALYSE UX/SEO APPROFONDIE ===
  const title = $('title').text().trim();
  const metaDescription = $('meta[name="description"]').attr('content') || '';
  const hasViewport = !!$('meta[name="viewport"]').attr('content');
  const lang = $('html').attr('lang') || '';
  const h1Count = $('h1').length;
  const h1Text = $('h1').first().text().trim();
  const imageCount = $('img').length;
  const imagesWithAlt = $('img[alt]').length;
  const imagesWithoutAlt = imageCount - imagesWithAlt;
  const linkCount = $('a').length;
  const externalLinks = $('a[href^="http"]').length;
  const internalLinks = linkCount - externalLinks;
  const domElements = $('*').length;
  const scriptCount = $('script').length;
  const cssCount = $('link[rel="stylesheet"]').length;
  const inlineStyles = $('[style]').length;

  // Accessibilité
  const ariaLabels = $('[aria-label], [aria-labelledby], [aria-describedby]').length;
  const roleAttributes = $('[role]').length;
  const semanticElements = $('header, nav, main, article, section, aside, footer').length;
  const formLabels = $('label').length;
  const formInputs = $('input, textarea, select').length;

  let uxScore = 100;
  const uxIssues = [];

  if (!title || title.length < 10) {
    uxScore -= 15;
    uxIssues.push('Titre manquant ou trop court');
  } else if (title.length > 60) {
    uxScore -= 5;
    uxIssues.push('Titre trop long (>60 caractères)');
  }

  if (!metaDescription || metaDescription.length < 50) {
    uxScore -= 15;
    uxIssues.push('Meta description manquante ou trop courte');
  } else if (metaDescription.length > 160) {
    uxScore -= 5;
    uxIssues.push('Meta description trop longue (>160 caractères)');
  }

  if (!hasViewport) {
    uxScore -= 20;
    uxIssues.push('Meta viewport manquant - site non responsive');
  }

  if (!lang) {
    uxScore -= 10;
    uxIssues.push('Attribut lang manquant sur <html>');
  }

  if (h1Count === 0) {
    uxScore -= 15;
    uxIssues.push('Aucune balise H1 trouvée');
  } else if (h1Count > 1) {
    uxScore -= 10;
    uxIssues.push(`${h1Count} balises H1 trouvées (recommandé: 1)`);
  }

  if (imagesWithoutAlt > 0) {
    uxScore -= Math.min(15, imagesWithoutAlt * 2);
    uxIssues.push(`${imagesWithoutAlt} images sans attribut alt`);
  }

  if (semanticElements < 3) {
    uxScore -= 10;
    uxIssues.push('Peu d\'éléments sémantiques HTML5');
  }

  if (inlineStyles > 10) {
    uxScore -= 5;
    uxIssues.push('Trop de styles inline (mauvaise pratique)');
  }

  uxScore = Math.max(0, uxScore);

  // === DÉTECTION DU NIVEAU DE DÉVELOPPEUR ===
  let devLevel = 'Débutant';
  let devScore = 0;

  if (techStack.length >= 3) devScore += 20;
  if (semanticElements >= 5) devScore += 15;
  if (ariaLabels > 0 || roleAttributes > 0) devScore += 15;
  if (securityHeaders.contentSecurityPolicy) devScore += 15;
  if (uxScore >= 80) devScore += 20;
  if (inlineStyles < 5) devScore += 10;
  if (scriptCount > 0 && scriptCount < 20) devScore += 5;

  if (devScore >= 70) devLevel = 'Expert';
  else if (devScore >= 50) devLevel = 'Avancé';
  else if (devScore >= 30) devLevel = 'Intermédiaire';

  // === ESTIMATION DE PRIX RÉALISTE ===
  let complexityScore = 0;
  
  // Complexité basée sur le contenu
  complexityScore += Math.min(30, domElements / 100);
  complexityScore += Math.min(20, scriptCount * 2);
  complexityScore += techStack.length * 5;
  complexityScore += linkCount > 50 ? 15 : linkCount > 20 ? 10 : 5;
  complexityScore += imageCount > 30 ? 15 : imageCount > 10 ? 10 : 5;
  
  const hasEcommerce = htmlLower.includes('cart') || htmlLower.includes('panier') || htmlLower.includes('checkout');
  const hasAuth = htmlLower.includes('login') || htmlLower.includes('signin') || htmlLower.includes('connexion');
  const hasForm = $('form').length > 0;
  
  if (hasEcommerce) complexityScore += 30;
  if (hasAuth) complexityScore += 20;
  if (hasForm) complexityScore += 10;

  const estimatedDays = Math.ceil(complexityScore / 10);
  const freelancePriceEUR = estimatedDays * 400; // 400€/jour freelance
  const agencyPriceEUR = estimatedDays * 800; // 800€/jour agence
  
  // Conversion en Francs Guinéens (1 EUR = ~11,000 GNF)
  const EUR_TO_GNF = 11000;
  const freelancePriceGNF = Math.round(freelancePriceEUR * EUR_TO_GNF);
  const agencyPriceGNF = Math.round(agencyPriceEUR * EUR_TO_GNF);

  const pricingFactors = [];
  if (hasEcommerce) pricingFactors.push('E-commerce (+30%)');
  if (hasAuth) pricingFactors.push('Authentification (+20%)');
  if (techStack.length >= 5) pricingFactors.push('Stack technique avancé (+15%)');
  if (domElements > 1000) pricingFactors.push('Site complexe (+20%)');

  // === FEATURES DÉTECTÉES ===
  const features = [];
  if ($('form').length > 0) features.push('Formulaires');
  if ($('input[type="search"]').length > 0) features.push('Recherche');
  if ($('video').length > 0) features.push('Vidéo');
  if ($('audio').length > 0) features.push('Audio');
  if ($('canvas').length > 0) features.push('Canvas/WebGL');
  if ($('iframe').length > 0) features.push('iFrames');
  if (htmlLower.includes('map') || htmlLower.includes('google.maps')) features.push('Carte interactive');
  if (hasAuth) features.push('Authentification');
  if (hasEcommerce) features.push('E-commerce');
  if ($('[data-aos], [data-animate]').length > 0) features.push('Animations');

  // === RECOMMANDATIONS INTELLIGENTES ===
  const recommendations = [];
  if (!https) recommendations.push({ priority: 'critical', text: 'Activez HTTPS immédiatement', impact: 'Sécurité' });
  if (!hasViewport) recommendations.push({ priority: 'high', text: 'Ajoutez une meta viewport', impact: 'Mobile' });
  if (!metaDescription) recommendations.push({ priority: 'high', text: 'Ajoutez une meta description', impact: 'SEO' });
  if (h1Count === 0) recommendations.push({ priority: 'high', text: 'Ajoutez une balise H1', impact: 'SEO' });
  if (h1Count > 1) recommendations.push({ priority: 'medium', text: 'Limitez-vous à une seule H1', impact: 'SEO' });
  if (imagesWithoutAlt > 0) recommendations.push({ priority: 'medium', text: `Ajoutez des attributs alt aux ${imagesWithoutAlt} images`, impact: 'Accessibilité' });
  if (!securityHeaders.contentSecurityPolicy) recommendations.push({ priority: 'medium', text: 'Ajoutez un Content-Security-Policy', impact: 'Sécurité' });
  if (semanticElements < 3) recommendations.push({ priority: 'low', text: 'Utilisez plus d\'éléments sémantiques HTML5', impact: 'SEO' });
  if (inlineStyles > 10) recommendations.push({ priority: 'low', text: 'Réduisez les styles inline', impact: 'Performance' });
  if (scriptCount > 15) recommendations.push({ priority: 'medium', text: 'Optimisez le nombre de scripts', impact: 'Performance' });

  // === SCORE GLOBAL ===
  const overallScore = Math.round((securityScore * 0.3) + (uxScore * 0.5) + (devScore * 0.2));

  return {
    url: targetUrl,
    timestamp: new Date().toISOString(),
    status: response.status,
    loadTimeMs: loadTime,
    overallScore,
    performance: {
      htmlSizeKB,
      scriptCount,
      cssCount,
      imageCount,
      domElements,
      inlineStyles,
      loadTime: loadTime < 1000 ? 'Excellent' : loadTime < 3000 ? 'Bon' : 'À améliorer'
    },
    features,
    techStack,
    security: {
      https,
      score: securityScore,
      headers: securityHeaders,
      vulnerabilitiesList: vulnerabilities
    },
    ux: {
      title,
      titleLength: title.length,
      metaDescription,
      metaDescriptionLength: metaDescription.length,
      hasMetaDescription: !!metaDescription,
      hasViewport,
      lang,
      h1Count,
      h1Text,
      imageCount,
      imagesWithAlt,
      imagesWithoutAlt,
      linkCount,
      internalLinks,
      externalLinks,
      domElements,
      score: uxScore,
      issues: uxIssues,
      accessibility: {
        ariaCount: ariaLabels,
        roleCount: roleAttributes,
        semanticElements,
        formLabels,
        formInputs,
        score: Math.round((ariaLabels + roleAttributes + semanticElements) / 3 * 10)
      },
      mobileFriendliness: hasViewport ? 100 : 0
    },
    designType: techStack.some(t => t.name.includes('WordPress')) ? 'CMS' : 
                techStack.some(t => t.name.includes('Wix') || t.name.includes('Squarespace')) ? 'Website Builder' :
                techStack.length >= 3 ? 'Custom' : 'Simple',
    aiProbability: 0,
    developerLevel: devLevel,
    developerScore: devScore,
    recommendations,
    pricing: {
      freelance: freelancePriceGNF,
      freelanceEUR: freelancePriceEUR,
      agency: agencyPriceGNF,
      agencyEUR: agencyPriceEUR,
      estimatedDays,
      complexityScore: Math.round(complexityScore),
      resaleValue: Math.round(freelancePriceGNF * 0.7),
      currency: 'GNF',
      domainAgeYears: 0,
      backlinkProfile: 0,
      trafficVolume: 0,
      pricingFactors
    },
  };
}

export default async function handler(req, res) {
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
}
