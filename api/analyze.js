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

  // Déclarer https tôt pour l'utiliser dans la détection des technologies
  const https = targetUrl.startsWith('https://');

  // === ANALYSE EXHAUSTIVE DES TECHNOLOGIES ===
  const techStack = [];
  const htmlLower = html.toLowerCase();
  const detectedTechs = new Set(); // Pour éviter les doublons
  
  // Helper pour ajouter une tech
  const addTech = (name, category) => {
    if (!detectedTechs.has(name)) {
      techStack.push({ name, category });
      detectedTechs.add(name);
    }
  };

  // === 1. LANGAGES DE BASE (toujours présents) ===
  addTech('HTML5', 'Langage');
  if ($('style').length > 0 || $('link[rel="stylesheet"]').length > 0) {
    addTech('CSS3', 'Langage');
  }
  if ($('script').length > 0) {
    addTech('JavaScript', 'Langage');
  }

  // === 2. FRAMEWORKS & LIBRARIES JS ===
  if (htmlLower.includes('react') || $('script[src*="react"]').length || $('[data-reactroot], [data-reactid]').length) {
    addTech('React', 'Framework JS');
  }
  if (htmlLower.includes('vue') || $('script[src*="vue"]').length || $('[data-v-]').length) {
    addTech('Vue.js', 'Framework JS');
  }
  if (htmlLower.includes('angular') || $('script[src*="angular"]').length || $('[ng-app], [ng-controller]').length) {
    addTech('Angular', 'Framework JS');
  }
  if (htmlLower.includes('next') || $('script[src*="next"]').length || $('script[src*="_next"]').length) {
    addTech('Next.js', 'Framework');
  }
  if (htmlLower.includes('nuxt') || $('script[src*="nuxt"]').length) {
    addTech('Nuxt.js', 'Framework');
  }
  if (htmlLower.includes('svelte') || $('script[src*="svelte"]').length) {
    addTech('Svelte', 'Framework JS');
  }
  if (htmlLower.includes('jquery') || $('script[src*="jquery"]').length) {
    addTech('jQuery', 'Library');
  }
  if (htmlLower.includes('lodash') || $('script[src*="lodash"]').length) {
    addTech('Lodash', 'Library');
  }
  if (htmlLower.includes('axios') || $('script[src*="axios"]').length) {
    addTech('Axios', 'Library');
  }
  if (htmlLower.includes('gsap') || $('script[src*="gsap"]').length) {
    addTech('GSAP', 'Animation');
  }
  if (htmlLower.includes('three.js') || htmlLower.includes('threejs') || $('script[src*="three"]').length) {
    addTech('Three.js', '3D Graphics');
  }
  if (htmlLower.includes('d3.js') || htmlLower.includes('d3js') || $('script[src*="d3"]').length) {
    addTech('D3.js', 'Data Visualization');
  }
  if (htmlLower.includes('chart.js') || $('script[src*="chart"]').length) {
    addTech('Chart.js', 'Charts');
  }
  
  // === 3. CSS FRAMEWORKS ===
  if (htmlLower.includes('tailwind') || $('link[href*="tailwind"]').length || $('[class*="tw-"]').length) {
    addTech('Tailwind CSS', 'CSS Framework');
  }
  if (htmlLower.includes('bootstrap') || $('link[href*="bootstrap"]').length || $('[class*="col-"], [class*="btn-"]').length) {
    addTech('Bootstrap', 'CSS Framework');
  }
  if (htmlLower.includes('bulma') || $('link[href*="bulma"]').length) {
    addTech('Bulma', 'CSS Framework');
  }
  if (htmlLower.includes('foundation') || $('link[href*="foundation"]').length) {
    addTech('Foundation', 'CSS Framework');
  }
  if (htmlLower.includes('materialize') || $('link[href*="materialize"]').length) {
    addTech('Materialize', 'CSS Framework');
  }
  if (htmlLower.includes('semantic-ui') || $('link[href*="semantic"]').length) {
    addTech('Semantic UI', 'CSS Framework');
  }
  if (htmlLower.includes('uikit') || $('link[href*="uikit"]').length) {
    addTech('UIkit', 'CSS Framework');
  }
  
  // === 4. CMS & PLATFORMS ===
  if (htmlLower.includes('wp-content') || htmlLower.includes('wordpress') || htmlLower.includes('wp-includes')) {
    addTech('WordPress', 'CMS');
  }
  if (htmlLower.includes('shopify') || htmlLower.includes('cdn.shopify')) {
    addTech('Shopify', 'E-commerce');
  }
  if (htmlLower.includes('wix') || htmlLower.includes('wixstatic')) {
    addTech('Wix', 'Website Builder');
  }
  if (htmlLower.includes('squarespace') || htmlLower.includes('sqsp')) {
    addTech('Squarespace', 'Website Builder');
  }
  if (htmlLower.includes('webflow') || htmlLower.includes('webflow.io')) {
    addTech('Webflow', 'Website Builder');
  }
  if (htmlLower.includes('drupal')) {
    addTech('Drupal', 'CMS');
  }
  if (htmlLower.includes('joomla')) {
    addTech('Joomla', 'CMS');
  }
  if (htmlLower.includes('magento')) {
    addTech('Magento', 'E-commerce');
  }
  if (htmlLower.includes('prestashop')) {
    addTech('PrestaShop', 'E-commerce');
  }
  if (htmlLower.includes('woocommerce')) {
    addTech('WooCommerce', 'E-commerce');
  }
  
  // === 5. ANALYTICS & MARKETING ===
  if (htmlLower.includes('google-analytics') || htmlLower.includes('gtag') || htmlLower.includes('ga.js')) {
    addTech('Google Analytics', 'Analytics');
  }
  if (htmlLower.includes('gtm') || htmlLower.includes('googletagmanager')) {
    addTech('Google Tag Manager', 'Tag Manager');
  }
  if ((htmlLower.includes('facebook') || htmlLower.includes('fbq')) && htmlLower.includes('pixel')) {
    addTech('Facebook Pixel', 'Marketing');
  }
  if (htmlLower.includes('hotjar')) {
    addTech('Hotjar', 'Analytics');
  }
  if (htmlLower.includes('mixpanel')) {
    addTech('Mixpanel', 'Analytics');
  }
  if (htmlLower.includes('segment')) {
    addTech('Segment', 'Analytics');
  }
  if (htmlLower.includes('amplitude')) {
    addTech('Amplitude', 'Analytics');
  }
  if (htmlLower.includes('matomo') || htmlLower.includes('piwik')) {
    addTech('Matomo', 'Analytics');
  }
  
  // === 6. FONTS & ICONS ===
  if (htmlLower.includes('font-awesome') || $('link[href*="font-awesome"]').length) {
    addTech('Font Awesome', 'Icons');
  }
  if (htmlLower.includes('google') && htmlLower.includes('fonts')) {
    addTech('Google Fonts', 'Fonts');
  }
  if (htmlLower.includes('typekit') || htmlLower.includes('adobe fonts')) {
    addTech('Adobe Fonts', 'Fonts');
  }
  if (htmlLower.includes('material-icons') || htmlLower.includes('material icons')) {
    addTech('Material Icons', 'Icons');
  }
  if (htmlLower.includes('ionicons')) {
    addTech('Ionicons', 'Icons');
  }
  if (htmlLower.includes('feather')) {
    addTech('Feather Icons', 'Icons');
  }
  
  // === 7. CDN & HOSTING ===
  if (htmlLower.includes('cloudflare')) {
    addTech('Cloudflare', 'CDN');
  }
  if (htmlLower.includes('amazonaws') || htmlLower.includes('aws')) {
    addTech('AWS', 'Hosting');
  }
  if (htmlLower.includes('vercel')) {
    addTech('Vercel', 'Hosting');
  }
  if (htmlLower.includes('netlify')) {
    addTech('Netlify', 'Hosting');
  }
  if (htmlLower.includes('github.io') || htmlLower.includes('github pages')) {
    addTech('GitHub Pages', 'Hosting');
  }
  if (htmlLower.includes('heroku')) {
    addTech('Heroku', 'Hosting');
  }
  if (htmlLower.includes('digitalocean')) {
    addTech('DigitalOcean', 'Hosting');
  }
  
  // === 8. PAYMENT & SERVICES ===
  if (htmlLower.includes('stripe')) {
    addTech('Stripe', 'Payment');
  }
  if (htmlLower.includes('paypal')) {
    addTech('PayPal', 'Payment');
  }
  if (htmlLower.includes('square')) {
    addTech('Square', 'Payment');
  }
  
  // === 9. COMMUNICATION ===
  if (htmlLower.includes('intercom')) {
    addTech('Intercom', 'Chat');
  }
  if (htmlLower.includes('zendesk')) {
    addTech('Zendesk', 'Support');
  }
  if (htmlLower.includes('drift')) {
    addTech('Drift', 'Chat');
  }
  if (htmlLower.includes('tawk.to') || htmlLower.includes('tawk')) {
    addTech('Tawk.to', 'Chat');
  }
  if (htmlLower.includes('crisp')) {
    addTech('Crisp', 'Chat');
  }
  
  // === 10. MEDIA & CONTENT ===
  if (htmlLower.includes('youtube') || $('iframe[src*="youtube"]').length) {
    addTech('YouTube', 'Video');
  }
  if (htmlLower.includes('vimeo') || $('iframe[src*="vimeo"]').length) {
    addTech('Vimeo', 'Video');
  }
  if (htmlLower.includes('soundcloud')) {
    addTech('SoundCloud', 'Audio');
  }
  if (htmlLower.includes('spotify')) {
    addTech('Spotify', 'Audio');
  }
  
  // === 11. MAPS ===
  if (htmlLower.includes('google') && htmlLower.includes('maps')) {
    addTech('Google Maps', 'Maps');
  }
  if (htmlLower.includes('mapbox')) {
    addTech('Mapbox', 'Maps');
  }
  if (htmlLower.includes('leaflet')) {
    addTech('Leaflet', 'Maps');
  }
  
  // === 12. SOCIAL MEDIA ===
  if (htmlLower.includes('twitter') || htmlLower.includes('x.com')) {
    addTech('Twitter/X', 'Social');
  }
  if (htmlLower.includes('instagram')) {
    addTech('Instagram', 'Social');
  }
  if (htmlLower.includes('linkedin')) {
    addTech('LinkedIn', 'Social');
  }
  
  // === 13. SEO & PERFORMANCE ===
  if (htmlLower.includes('schema.org') || $('script[type="application/ld+json"]').length) {
    addTech('Schema.org', 'SEO');
  }
  if ($('link[rel="preload"]').length > 0) {
    addTech('Resource Preloading', 'Performance');
  }
  if ($('img[loading="lazy"]').length > 0) {
    addTech('Lazy Loading', 'Performance');
  }
  if ($('link[rel="dns-prefetch"]').length > 0 || $('link[rel="preconnect"]').length > 0) {
    addTech('DNS Prefetch', 'Performance');
  }
  
  // === 14. SECURITY ===
  if (https) {
    addTech('HTTPS/SSL', 'Security');
  }
  if (securityHeaders.contentSecurityPolicy) {
    addTech('Content Security Policy', 'Security');
  }
  
  // === 15. RESPONSIVE & MOBILE ===
  if ($('meta[name="viewport"]').length > 0) {
    addTech('Responsive Design', 'Mobile');
  }
  if ($('link[rel="manifest"]').length > 0) {
    addTech('PWA Manifest', 'Mobile');
  }
  if ($('meta[name="apple-mobile-web-app-capable"]').length > 0) {
    addTech('iOS Web App', 'Mobile');
  }

  // Si moins de 10 technologies, ajouter des technologies génériques basées sur le contenu
  if (techStack.length < 10) {
    if ($('form').length > 0) addTech('HTML Forms', 'Feature');
    if ($('video').length > 0) addTech('HTML5 Video', 'Media');
    if ($('audio').length > 0) addTech('HTML5 Audio', 'Media');
    if ($('canvas').length > 0) addTech('HTML5 Canvas', 'Graphics');
    if ($('svg').length > 0) addTech('SVG Graphics', 'Graphics');
    if ($('[data-aos], [data-animate], [class*="animate"]').length > 0) addTech('CSS Animations', 'Animation');
    if ($('picture').length > 0 || $('source').length > 0) addTech('Responsive Images', 'Performance');
    if (htmlLower.includes('cookie') || htmlLower.includes('gdpr')) addTech('Cookie Consent', 'Compliance');
    if ($('meta[property^="og:"]').length > 0) addTech('Open Graph Protocol', 'SEO');
    if ($('link[rel="canonical"]').length > 0) addTech('Canonical URLs', 'SEO');
  }

  // Limiter à 20 technologies max
  const finalTechStack = techStack.slice(0, 20);


  // === ANALYSE DE SÉCURITÉ AVANCÉE ===
  const securityHeaders = {
    strictTransportSecurity: response.headers.get('strict-transport-security'),
    contentSecurityPolicy: response.headers.get('content-security-policy'),
    xFrameOptions: response.headers.get('x-frame-options') || 'Not Set',
    xContentTypeOptions: response.headers.get('x-content-type-options'),
    referrerPolicy: response.headers.get('referrer-policy') || 'Not Set',
    server: response.headers.get('server') || 'Unknown',
  };

  const vulnerabilities = [];
  const vulnerabilitiesList = [];
  let securityScore = https ? 80 : 30;
  
  if (!https) {
    vulnerabilities.push({ severity: 'critical', issue: 'Pas de HTTPS', impact: 'Données non chiffrées' });
    vulnerabilitiesList.push({ severity: 'High', title: 'HTTPS non activé', description: 'Le site n\'utilise pas HTTPS, les données ne sont pas chiffrées' });
  }
  if (!securityHeaders.strictTransportSecurity && https) {
    vulnerabilities.push({ severity: 'medium', issue: 'HSTS manquant', impact: 'Vulnérable aux attaques downgrade' });
    vulnerabilitiesList.push({ severity: 'Medium', title: 'HSTS manquant', description: 'Le header Strict-Transport-Security n\'est pas configuré' });
    securityScore -= 10;
  }
  if (!securityHeaders.contentSecurityPolicy) {
    vulnerabilities.push({ severity: 'medium', issue: 'CSP manquant', impact: 'Vulnérable aux attaques XSS' });
    vulnerabilitiesList.push({ severity: 'Medium', title: 'CSP manquant', description: 'Pas de Content-Security-Policy configuré' });
    securityScore -= 10;
  }
  if (!securityHeaders.xFrameOptions || securityHeaders.xFrameOptions === 'Not Set') {
    vulnerabilities.push({ severity: 'low', issue: 'X-Frame-Options manquant', impact: 'Vulnérable au clickjacking' });
    vulnerabilitiesList.push({ severity: 'Low', title: 'X-Frame-Options manquant', description: 'Le site peut être intégré dans une iframe' });
    securityScore -= 5;
  }

  // === ANALYSE UX/SEO APPROFONDIE ===
  const title = $('title').text().trim();
  const metaDescription = $('meta[name="description"]').attr('content') || '';
  const hasViewport = !!$('meta[name="viewport"]').attr('content');
  const hasOpenGraph = !!$('meta[property^="og:"]').length;
  const hasCanonical = !!$('link[rel="canonical"]').length;
  const lang = $('html').attr('lang') || '';
  const h1Count = $('h1').length;
  const h1Text = $('h1').first().text().trim();
  const imageCount = $('img').length;
  const imagesWithAlt = $('img[alt]').length;
  const imagesWithoutAlt = imageCount - imagesWithAlt;
  const lazyLoadImages = $('img[loading="lazy"]').length;
  const linkCount = $('a').length;
  const externalLinks = $('a[href^="http"]').length;
  const internalLinks = linkCount - externalLinks;
  const domElements = $('*').length;
  const scriptCount = $('script').length;
  const cssCount = $('link[rel="stylesheet"]').length;
  const inlineStyles = $('[style]').length;

  // Calcul de la profondeur DOM
  let maxDepth = 0;
  $('*').each((i, el) => {
    let depth = 0;
    let current = el;
    while (current.parent) {
      depth++;
      current = current.parent;
      if (depth > 100) break; // Sécurité
    }
    if (depth > maxDepth) maxDepth = depth;
  });

  // Ratio texte/HTML
  const textContent = $('body').text().replace(/\s+/g, ' ').trim();
  const textLength = textContent.length;
  const htmlLength = html.length;
  const textToHtmlRatio = Math.round((textLength / htmlLength) * 100);

  // GDPR
  const gdprCompliant = htmlLower.includes('cookie') && (htmlLower.includes('consent') || htmlLower.includes('accepter'));

  // Accessibilité
  const ariaLabels = $('[aria-label], [aria-labelledby], [aria-describedby]').length;
  const roleAttributes = $('[role]').length;
  const semanticElements = $('header, nav, main, article, section, aside, footer').length;
  const formLabels = $('label').length;
  const formInputs = $('input, textarea, select').length;

  // Lisibilité (basé sur la longueur des paragraphes)
  let readabilityScore = 70;
  const paragraphs = $('p');
  let totalWords = 0;
  paragraphs.each((i, el) => {
    const text = $(el).text();
    totalWords += text.split(/\s+/).length;
  });
  const avgWordsPerParagraph = paragraphs.length > 0 ? totalWords / paragraphs.length : 0;
  if (avgWordsPerParagraph > 50 && avgWordsPerParagraph < 150) readabilityScore = 90;
  else if (avgWordsPerParagraph > 150) readabilityScore = 60;

  // Clarté de navigation
  const navElements = $('nav').length;
  const menuItems = $('nav a, nav li').length;
  let navigationClarity = 50;
  if (navElements >= 1 && menuItems >= 3 && menuItems <= 10) navigationClarity = 90;
  else if (navElements >= 1) navigationClarity = 70;

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

  if (!hasOpenGraph) {
    uxScore -= 5;
    uxIssues.push('Balises Open Graph manquantes');
  }

  uxScore = Math.max(0, uxScore);

  // === DÉTECTION AVANCÉE DU NIVEAU DE DÉVELOPPEUR ===
  let devLevel = 'Débutant';
  let devScore = 0;
  const devIndicators = [];

  // Critères techniques avancés (40 points max)
  if (techStack.length >= 5) {
    devScore += 15;
    devIndicators.push('Stack technique riche');
  } else if (techStack.length >= 3) {
    devScore += 10;
  } else if (techStack.length >= 1) {
    devScore += 5;
  }

  // Frameworks modernes (15 points)
  const modernFrameworks = techStack.filter(t => 
    ['React', 'Vue.js', 'Angular', 'Next.js', 'Nuxt.js', 'Svelte'].includes(t.name)
  );
  if (modernFrameworks.length > 0) {
    devScore += 15;
    devIndicators.push('Framework JS moderne');
  }

  // Qualité du code HTML (25 points max)
  if (semanticElements >= 7) {
    devScore += 15;
    devIndicators.push('Excellente sémantique HTML5');
  } else if (semanticElements >= 4) {
    devScore += 10;
  } else if (semanticElements >= 2) {
    devScore += 5;
  }

  if (inlineStyles < 3) {
    devScore += 10;
    devIndicators.push('Code CSS propre');
  } else if (inlineStyles < 10) {
    devScore += 5;
  }

  // Accessibilité (20 points max)
  const accessibilityScore = ariaLabels + roleAttributes + (formLabels > 0 ? 5 : 0);
  if (accessibilityScore >= 10) {
    devScore += 20;
    devIndicators.push('Accessibilité excellente');
  } else if (accessibilityScore >= 5) {
    devScore += 10;
  } else if (accessibilityScore >= 2) {
    devScore += 5;
  }

  // Sécurité (20 points max)
  if (https && securityHeaders.contentSecurityPolicy && securityHeaders.strictTransportSecurity) {
    devScore += 20;
    devIndicators.push('Sécurité optimale');
  } else if (https && (securityHeaders.contentSecurityPolicy || securityHeaders.strictTransportSecurity)) {
    devScore += 15;
  } else if (https) {
    devScore += 10;
  }

  // SEO & Performance (20 points max)
  if (uxScore >= 90) {
    devScore += 20;
    devIndicators.push('SEO/UX excellent');
  } else if (uxScore >= 75) {
    devScore += 15;
  } else if (uxScore >= 60) {
    devScore += 10;
  } else if (uxScore >= 40) {
    devScore += 5;
  }

  // Optimisations avancées (10 points)
  if (lazyLoadImages > 0 && hasCanonical && hasOpenGraph) {
    devScore += 10;
    devIndicators.push('Optimisations avancées');
  } else if (lazyLoadImages > 0 || hasCanonical || hasOpenGraph) {
    devScore += 5;
  }

  // Architecture (10 points)
  if (scriptCount >= 3 && scriptCount <= 15 && cssCount >= 1 && cssCount <= 5) {
    devScore += 10;
    devIndicators.push('Architecture équilibrée');
  } else if (scriptCount > 0 && cssCount > 0) {
    devScore += 5;
  }

  // Pénalités
  if (inlineStyles > 20) devScore -= 10;
  if (imagesWithoutAlt > imageCount * 0.5 && imageCount > 0) devScore -= 10;
  if (maxDepth > 15) devScore -= 5;

  devScore = Math.max(0, Math.min(100, devScore));

  // Détermination du niveau avec seuils réalistes
  if (devScore >= 80) {
    devLevel = 'Expert';
  } else if (devScore >= 60) {
    devLevel = 'Avancé';
  } else if (devScore >= 40) {
    devLevel = 'Intermédiaire';
  } else if (devScore >= 20) {
    devLevel = 'Junior';
  } else {
    devLevel = 'Débutant';
  }

  // === DÉTECTION PROBABILITÉ IA ===
  let aiProbability = 0;
  const aiIndicators = [];

  // Patterns typiques de sites générés par IA
  const genericPhrases = [
    'lorem ipsum', 'placeholder', 'example', 'sample text', 'demo content',
    'your company', 'your business', 'insert text here', 'add content'
  ];
  
  let genericCount = 0;
  genericPhrases.forEach(phrase => {
    if (htmlLower.includes(phrase)) {
      genericCount++;
      aiProbability += 10;
    }
  });
  
  if (genericCount > 0) {
    aiIndicators.push(`${genericCount} texte(s) générique(s) détecté(s)`);
  }

  // Structure trop parfaite/répétitive (signe d'IA)
  const sections = $('section').length;
  const articles = $('article').length;
  if (sections > 5 && sections === articles) {
    aiProbability += 15;
    aiIndicators.push('Structure très répétitive');
  }

  // Utilisation de builders IA connus
  const aiBuilders = ['framer', 'dora', 'webflow', 'wix adi', 'bookmark'];
  aiBuilders.forEach(builder => {
    if (htmlLower.includes(builder)) {
      aiProbability += 20;
      aiIndicators.push(`Builder IA détecté: ${builder}`);
    }
  });

  // Classes CSS génériques/automatiques
  const autoGeneratedClasses = $('[class*="auto-"], [class*="generated-"], [class*="ai-"]').length;
  if (autoGeneratedClasses > 10) {
    aiProbability += 15;
    aiIndicators.push('Classes CSS auto-générées');
  }

  // Commentaires IA typiques
  if (html.includes('Generated by') || html.includes('Created with AI') || html.includes('Auto-generated')) {
    aiProbability += 25;
    aiIndicators.push('Commentaires IA détectés');
  }

  // Images stock/placeholder
  const stockImagePatterns = ['placeholder', 'unsplash', 'pexels', 'pixabay', 'lorem.space'];
  let stockImageCount = 0;
  $('img').each((i, el) => {
    const src = $(el).attr('src') || '';
    stockImagePatterns.forEach(pattern => {
      if (src.toLowerCase().includes(pattern)) {
        stockImageCount++;
      }
    });
  });
  
  if (stockImageCount > imageCount * 0.7 && imageCount > 0) {
    aiProbability += 20;
    aiIndicators.push('Majorité d\'images stock');
  } else if (stockImageCount > imageCount * 0.4 && imageCount > 0) {
    aiProbability += 10;
  }

  // Texte trop court ou trop générique
  if (textLength < 500 && domElements > 50) {
    aiProbability += 10;
    aiIndicators.push('Peu de contenu réel');
  }

  // Métadonnées génériques
  if (title.toLowerCase().includes('untitled') || title.toLowerCase().includes('new site') || 
      metaDescription.toLowerCase().includes('description') || metaDescription.length < 20) {
    aiProbability += 15;
    aiIndicators.push('Métadonnées non personnalisées');
  }

  // Réduction si signes de développement humain
  if (devScore >= 70) {
    aiProbability = Math.max(0, aiProbability - 20);
    aiIndicators.push('Code de qualité professionnelle');
  }
  
  if (techStack.length >= 5 && modernFrameworks.length > 0) {
    aiProbability = Math.max(0, aiProbability - 15);
  }

  if (hasAuth || hasEcommerce) {
    aiProbability = Math.max(0, aiProbability - 20);
    aiIndicators.push('Fonctionnalités complexes');
  }

  aiProbability = Math.min(100, Math.max(0, aiProbability));

  // === ESTIMATION DE PRIX RÉALISTE ===
  let complexityScore = 0;
  
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
  const freelancePriceEUR = estimatedDays * 400;
  const agencyPriceEUR = estimatedDays * 800;
  
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
  if (hasOpenGraph) features.push('Open Graph');
  if (hasCanonical) features.push('URL Canonique');

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
  if (!hasOpenGraph) recommendations.push({ priority: 'low', text: 'Ajoutez des balises Open Graph', impact: 'Réseaux sociaux' });
  if (!hasCanonical) recommendations.push({ priority: 'low', text: 'Ajoutez une URL canonique', impact: 'SEO' });
  if (lazyLoadImages === 0 && imageCount > 5) recommendations.push({ priority: 'medium', text: 'Activez le lazy loading pour les images', impact: 'Performance' });

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
    techStack: finalTechStack,
    security: {
      https,
      hsts: !!securityHeaders.strictTransportSecurity,
      xFrameOptions: securityHeaders.xFrameOptions,
      csp: !!securityHeaders.contentSecurityPolicy,
      xContentTypeOptions: !!securityHeaders.xContentTypeOptions,
      referrerPolicy: securityHeaders.referrerPolicy,
      server: securityHeaders.server,
      score: securityScore,
      vulnerabilities: {
        xssRisk: securityHeaders.contentSecurityPolicy ? 'Low' : 'Medium',
        sqliRisk: 'Unknown'
      },
      vulnerabilitiesList
    },
    ux: {
      title,
      titleLength: title.length,
      metaDescription,
      metaDescriptionLength: metaDescription.length,
      hasMetaDescription: !!metaDescription,
      hasViewport,
      hasOpenGraph,
      hasCanonical,
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
      domDepth: maxDepth,
      textToHtmlRatio,
      gdprCompliant,
      lazyLoadRatio: imageCount > 0 ? Math.round((lazyLoadImages / imageCount) * 100) : 0,
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
      mobileFriendliness: hasViewport ? 100 : 0,
      readabilityScore,
      navigationClarity
    },
    designType: techStack.some(t => t.name.includes('WordPress')) ? 'CMS' : 
                techStack.some(t => t.name.includes('Wix') || t.name.includes('Squarespace')) ? 'Website Builder' :
                techStack.length >= 3 ? 'Custom' : 'Simple',
    aiProbability,
    aiIndicators,
    developerLevel: devLevel,
    developerScore: devScore,
    developerIndicators: devIndicators,
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
