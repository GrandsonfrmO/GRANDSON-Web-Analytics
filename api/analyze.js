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

  // === DÉCLARATION DE TOUTES LES VARIABLES UTILISÉES DANS L'ANALYSE ===
  // Ceci évite les erreurs "Cannot access before initialization"
  
  const https = targetUrl.startsWith('https://');
  const securityHeaders = {
    strictTransportSecurity: response.headers.get('strict-transport-security'),
    contentSecurityPolicy: response.headers.get('content-security-policy'),
    xFrameOptions: response.headers.get('x-frame-options') || 'Not Set',
    xContentTypeOptions: response.headers.get('x-content-type-options'),
    referrerPolicy: response.headers.get('referrer-policy') || 'Not Set',
    server: response.headers.get('server') || 'Unknown',
  };

  const htmlLower = html.toLowerCase();
  const hasEcommerce = htmlLower.includes('cart') || htmlLower.includes('panier') || htmlLower.includes('checkout');
  const hasAuth = htmlLower.includes('login') || htmlLower.includes('signin') || htmlLower.includes('connexion');
  
  // Compteurs d'éléments
  const imageCount = $('img').length;
  const scriptCount = $('script').length;
  const cssCount = $('link[rel="stylesheet"]').length;
  const domElements = $('*').length;
  const semanticElements = $('header, nav, main, article, section, aside, footer').length;
  const ariaLabels = $('[aria-label], [aria-labelledby], [aria-describedby]').length;
  const roleAttributes = $('[role]').length;
  const inlineStyles = $('[style]').length;
  
  // Calcul de la profondeur DOM
  let maxDepth = 0;
  $('*').each((i, el) => {
    let depth = 0;
    let current = el;
    while (current.parent) {
      depth++;
      current = current.parent;
      if (depth > 100) break;
    }
    if (depth > maxDepth) maxDepth = depth;
  });
  
  // Images avec lazy loading
  const lazyLoadImages = $('img[loading="lazy"]').length;

  // === NOUVELLES ANALYSES AVANCÉES ===
  
  // 1. ANALYSE DE PERFORMANCE AVANCÉE
  const blockingScripts = $('script:not([async]):not([defer])').length;
  const blockingCSS = $('link[rel="stylesheet"]:not([media="print"])').length;
  const contentEncoding = response.headers.get('content-encoding') || 'none';
  const hasCompression = contentEncoding.includes('gzip') || contentEncoding.includes('br');
  
  // Analyse des images
  let totalImageSize = 0;
  let largeImages = 0;
  const imageSources = [];
  $('img').each((i, el) => {
    const src = $(el).attr('src') || '';
    if (src) imageSources.push(src);
  });
  
  // 2. ANALYSE SEO APPROFONDIE
  const metaRobots = $('meta[name="robots"]').attr('content') || 'index, follow';
  const hasCanonical = !!$('link[rel="canonical"]').length;
  const canonicalUrl = $('link[rel="canonical"]').attr('href') || '';
  const structuredData = $('script[type="application/ld+json"]').length;
  const hasAmpVersion = !!$('link[rel="amphtml"]').length;
  
  // 3. SÉCURITÉ RENFORCÉE
  const mixedContent = https && (html.includes('http://') || html.includes("src='http://") || html.includes('src="http://'));
  const hasSubresourceIntegrity = $('script[integrity], link[integrity]').length > 0;
  const cookieInfo = response.headers.get('set-cookie') || '';
  const hasSecureCookies = cookieInfo.includes('Secure') && cookieInfo.includes('HttpOnly');
  
  // 4. ACCESSIBILITÉ AMÉLIORÉE
  const linksWithoutText = $('a:not(:has(*))').filter((i, el) => !$(el).text().trim()).length;
  const buttonsCount = $('button, input[type="button"], input[type="submit"]').length;
  const headings = {
    h1: $('h1').length,
    h2: $('h2').length,
    h3: $('h3').length,
    h4: $('h4').length,
    h5: $('h5').length,
    h6: $('h6').length
  };
  
  // Vérification de la hiérarchie des titres
  let headingHierarchyValid = true;
  if (headings.h1 > 1) headingHierarchyValid = false;
  if (headings.h3 > 0 && headings.h2 === 0) headingHierarchyValid = false;
  if (headings.h4 > 0 && headings.h3 === 0) headingHierarchyValid = false;
  
  // 5. ANALYSE DE CONTENU
  const detectedLang = $('html').attr('lang') || $('meta[http-equiv="content-language"]').attr('content') || 'unknown';
  const textContent = $('body').text().replace(/\s+/g, ' ').trim();
  const wordCount = textContent.split(/\s+/).filter(w => w.length > 0).length;
  const dateElements = $('time, [datetime], .date, .published').length;
  
  // 6. ANALYSE MOBILE
  const viewportContent = $('meta[name="viewport"]').attr('content') || '';
  const hasResponsiveViewport = viewportContent.includes('width=device-width');
  const hasMediaQueries = html.includes('@media') || $('link[media]').length > 0;
  const touchIcons = $('link[rel="apple-touch-icon"], link[rel="icon"]').length;
  
  // 7. ANALYSE DE CONVERSION
  const ctaButtons = $('button, a').filter((i, el) => {
    const text = $(el).text().toLowerCase();
    return text.includes('buy') || text.includes('acheter') || text.includes('subscribe') || 
           text.includes('sign up') || text.includes('get started') || text.includes('contact') ||
           text.includes('commencer') || text.includes('essai') || text.includes('demo');
  }).length;
  
  const forms = $('form').length;
  const formInputs = $('input, textarea, select').length;
  const requiredFields = $('input[required], textarea[required], select[required]').length;
  const popups = $('[class*="modal"], [class*="popup"], [class*="overlay"]').length;
  
  // 8. RESSOURCES EXTERNES
  const externalScripts = $('script[src]').filter((i, el) => {
    const src = $(el).attr('src') || '';
    return src.startsWith('http') && !src.includes(hostname);
  }).length;
  
  const externalCSS = $('link[rel="stylesheet"][href]').filter((i, el) => {
    const href = $(el).attr('href') || '';
    return href.startsWith('http') && !href.includes(hostname);
  }).length;

  // === ANALYSE EXHAUSTIVE DES TECHNOLOGIES (DÉTECTION STRICTE) ===
  const techStack = [];
  const detectedTechs = new Set();
  
  const addTech = (name, category) => {
    if (!detectedTechs.has(name)) {
      techStack.push({ name, category });
      detectedTechs.add(name);
    }
  };

  // === 1. LANGAGES DE BASE ===
  addTech('HTML5', 'Langage');
  if ($('style').length > 0 || $('link[rel="stylesheet"]').length > 0) {
    addTech('CSS3', 'Langage');
  }
  if ($('script').length > 0) {
    addTech('JavaScript', 'Langage');
  }

  // === 2. FRAMEWORKS JS (détection stricte) ===
  if ($('script[src*="react"]').length > 0 || $('[data-reactroot], [data-reactid]').length > 0 || html.includes('__NEXT_DATA__')) {
    addTech('React', 'Framework JS');
  }
  if ($('script[src*="vue"]').length > 0 || $('[data-v-]').length > 0 || html.includes('Vue.config')) {
    addTech('Vue.js', 'Framework JS');
  }
  if ($('script[src*="angular"]').length > 0 || $('[ng-app], [ng-controller], [ng-version]').length > 0) {
    addTech('Angular', 'Framework JS');
  }
  if ($('script[src*="_next"]').length > 0 || html.includes('__NEXT_DATA__')) {
    addTech('Next.js', 'Framework');
  }
  if ($('script[src*="nuxt"]').length > 0 || html.includes('__NUXT__')) {
    addTech('Nuxt.js', 'Framework');
  }
  if ($('script[src*="svelte"]').length > 0) {
    addTech('Svelte', 'Framework JS');
  }
  if ($('script[src*="jquery"]').length > 0 || (typeof window !== 'undefined' && html.includes('jQuery'))) {
    addTech('jQuery', 'Library');
  }
  if ($('script[src*="lodash"]').length > 0 || html.includes('lodash.min')) {
    addTech('Lodash', 'Library');
  }
  if ($('script[src*="axios"]').length > 0) {
    addTech('Axios', 'Library');
  }
  if ($('script[src*="gsap"]').length > 0 || html.includes('gsap.min')) {
    addTech('GSAP', 'Animation');
  }
  if ($('script[src*="three"]').length > 0 || html.includes('three.min')) {
    addTech('Three.js', '3D Graphics');
  }
  if ($('script[src*="d3"]').length > 0 || html.includes('d3.min')) {
    addTech('D3.js', 'Data Visualization');
  }
  if ($('script[src*="chart"]').length > 0 || html.includes('chart.min')) {
    addTech('Chart.js', 'Charts');
  }
  
  // === 3. CSS FRAMEWORKS (détection stricte) ===
  if ($('link[href*="tailwind"]').length > 0 || html.includes('tailwindcss')) {
    addTech('Tailwind CSS', 'CSS Framework');
  }
  if ($('link[href*="bootstrap"]').length > 0 || html.includes('bootstrap.min')) {
    addTech('Bootstrap', 'CSS Framework');
  }
  if ($('link[href*="bulma"]').length > 0) {
    addTech('Bulma', 'CSS Framework');
  }
  if ($('link[href*="foundation"]').length > 0) {
    addTech('Foundation', 'CSS Framework');
  }
  if ($('link[href*="materialize"]').length > 0) {
    addTech('Materialize', 'CSS Framework');
  }
  
  // === 4. CMS & PLATFORMS (détection stricte) ===
  if (html.includes('wp-content') || html.includes('wp-includes')) {
    addTech('WordPress', 'CMS');
  }
  if (html.includes('cdn.shopify.com') || html.includes('myshopify.com')) {
    addTech('Shopify', 'E-commerce');
  }
  if (html.includes('wixstatic.com') || html.includes('parastorage.com')) {
    addTech('Wix', 'Website Builder');
  }
  if (html.includes('squarespace.com') || html.includes('sqsp.com')) {
    addTech('Squarespace', 'Website Builder');
  }
  if (html.includes('webflow.io') || html.includes('webflow.com')) {
    addTech('Webflow', 'Website Builder');
  }
  if (html.includes('/sites/all/') || html.includes('Drupal.settings')) {
    addTech('Drupal', 'CMS');
  }
  if (html.includes('/components/com_') || html.includes('Joomla!')) {
    addTech('Joomla', 'CMS');
  }
  if (html.includes('Mage.Cookies') || html.includes('magento')) {
    addTech('Magento', 'E-commerce');
  }
  if (html.includes('prestashop') || html.includes('ps_version')) {
    addTech('PrestaShop', 'E-commerce');
  }
  if (html.includes('woocommerce') || html.includes('wc-ajax')) {
    addTech('WooCommerce', 'E-commerce');
  }
  
  // === 5. ANALYTICS (détection stricte) ===
  if ($('script[src*="google-analytics"]').length > 0 || html.includes('gtag(') || html.includes('ga(')) {
    addTech('Google Analytics', 'Analytics');
  }
  if ($('script[src*="googletagmanager"]').length > 0 || html.includes('GTM-')) {
    addTech('Google Tag Manager', 'Tag Manager');
  }
  if (html.includes('fbq(') && html.includes('facebook')) {
    addTech('Facebook Pixel', 'Marketing');
  }
  if ($('script[src*="hotjar"]').length > 0) {
    addTech('Hotjar', 'Analytics');
  }
  if ($('script[src*="mixpanel"]').length > 0) {
    addTech('Mixpanel', 'Analytics');
  }
  
  // === 6. FONTS & ICONS (détection stricte) ===
  if ($('link[href*="font-awesome"]').length > 0 || $('link[href*="fontawesome"]').length > 0) {
    addTech('Font Awesome', 'Icons');
  }
  if ($('link[href*="fonts.googleapis.com"]').length > 0) {
    addTech('Google Fonts', 'Fonts');
  }
  if ($('link[href*="use.typekit"]').length > 0) {
    addTech('Adobe Fonts', 'Fonts');
  }
  
  // === 7. CDN & HOSTING (détection stricte via headers et URLs) ===
  if (html.includes('cloudflare') || securityHeaders.server.toLowerCase().includes('cloudflare')) {
    addTech('Cloudflare', 'CDN');
  }
  if (html.includes('amazonaws.com')) {
    addTech('AWS', 'Hosting');
  }
  if (html.includes('vercel.app') || html.includes('vercel-analytics')) {
    addTech('Vercel', 'Hosting');
  }
  if (html.includes('netlify.app') || html.includes('netlify.com')) {
    addTech('Netlify', 'Hosting');
  }
  if (targetUrl.includes('github.io')) {
    addTech('GitHub Pages', 'Hosting');
  }
  
  // === 8. PAYMENT (détection stricte) ===
  if ($('script[src*="stripe"]').length > 0 || html.includes('stripe.com')) {
    addTech('Stripe', 'Payment');
  }
  if ($('script[src*="paypal"]').length > 0 || html.includes('paypal.com')) {
    addTech('PayPal', 'Payment');
  }
  
  // === 9. COMMUNICATION (détection stricte) ===
  if ($('script[src*="intercom"]').length > 0) {
    addTech('Intercom', 'Chat');
  }
  if ($('script[src*="zendesk"]').length > 0) {
    addTech('Zendesk', 'Support');
  }
  if ($('script[src*="tawk.to"]').length > 0) {
    addTech('Tawk.to', 'Chat');
  }
  
  // === 10. MEDIA (détection stricte) ===
  if ($('iframe[src*="youtube.com"], iframe[src*="youtu.be"]').length > 0) {
    addTech('YouTube', 'Video');
  }
  if ($('iframe[src*="vimeo.com"]').length > 0) {
    addTech('Vimeo', 'Video');
  }
  
  // === 11. MAPS (détection stricte) ===
  if ($('script[src*="maps.googleapis.com"]').length > 0 || $('script[src*="maps.google.com"]').length > 0) {
    addTech('Google Maps', 'Maps');
  }
  if ($('script[src*="mapbox"]').length > 0) {
    addTech('Mapbox', 'Maps');
  }
  
  // === 12. SEO & PERFORMANCE (détection stricte) ===
  if ($('script[type="application/ld+json"]').length > 0) {
    addTech('Schema.org', 'SEO');
  }
  if ($('img[loading="lazy"]').length > 0) {
    addTech('Lazy Loading', 'Performance');
  }
  if (https) {
    addTech('HTTPS/SSL', 'Security');
  }
  if ($('meta[name="viewport"]').length > 0) {
    addTech('Responsive Design', 'Mobile');
  }
  if ($('link[rel="manifest"]').length > 0) {
    addTech('PWA', 'Mobile');
  }

  // Si moins de 10 technologies, ajouter des technologies basées sur le contenu réel
  if (techStack.length < 10) {
    if ($('form').length > 0) addTech('HTML Forms', 'Feature');
    if ($('video').length > 0) addTech('HTML5 Video', 'Media');
    if ($('audio').length > 0) addTech('HTML5 Audio', 'Media');
    if ($('canvas').length > 0) addTech('HTML5 Canvas', 'Graphics');
    if ($('svg').length > 0) addTech('SVG', 'Graphics');
  }

  // Limiter à 20 technologies max
  const finalTechStack = techStack.slice(0, 20);


  // === ANALYSE DE SÉCURITÉ AVANCÉE ===
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
  const lang = $('html').attr('lang') || '';
  const h1Count = $('h1').length;
  const h1Text = $('h1').first().text().trim();
  const imagesWithAlt = $('img[alt]').length;
  const imagesWithoutAlt = imageCount - imagesWithAlt;
  const linkCount = $('a').length;
  const externalLinks = $('a[href^="http"]').length;
  const internalLinks = linkCount - externalLinks;

  // Ratio texte/HTML (limité entre 0 et 100) - utilise textContent déjà déclaré
  const textLength = textContent.length;
  const htmlLength = html.length;
  const textToHtmlRatio = htmlLength > 0 ? Math.min(100, Math.round((textLength / htmlLength) * 100)) : 0;

  // GDPR
  const gdprCompliant = htmlLower.includes('cookie') && (htmlLower.includes('consent') || htmlLower.includes('accepter'));

  // Accessibilité - formLabels (formInputs déjà déclaré)
  const formLabels = $('label').length;

  // Lisibilité (basé sur la longueur des paragraphes et le contenu)
  let readabilityScore = 50; // Score de base moyen
  const paragraphs = $('p');
  let totalWords = 0;
  paragraphs.each((i, el) => {
    const text = $(el).text();
    totalWords += text.split(/\s+/).filter(word => word.length > 0).length;
  });
  const avgWordsPerParagraph = paragraphs.length > 0 ? totalWords / paragraphs.length : 0;
  
  if (paragraphs.length === 0) {
    readabilityScore = 30; // Pas de paragraphes
  } else if (avgWordsPerParagraph >= 20 && avgWordsPerParagraph <= 100) {
    readabilityScore = 90; // Longueur optimale
  } else if (avgWordsPerParagraph > 100 && avgWordsPerParagraph <= 200) {
    readabilityScore = 70; // Un peu long mais acceptable
  } else if (avgWordsPerParagraph > 200) {
    readabilityScore = 50; // Trop long
  } else if (avgWordsPerParagraph > 0 && avgWordsPerParagraph < 20) {
    readabilityScore = 60; // Trop court
  }

  // Clarté de navigation (score entre 0 et 100)
  const navElements = $('nav').length;
  const menuItems = $('nav a, nav li').length;
  let navigationClarity = 30; // Score de base faible
  if (navElements >= 1 && menuItems >= 3 && menuItems <= 15) {
    navigationClarity = 90; // Navigation optimale
  } else if (navElements >= 1 && menuItems > 0) {
    navigationClarity = 70; // Navigation présente mais non optimale
  } else if (navElements >= 1) {
    navigationClarity = 50; // Navigation vide
  }

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

  // 1. STACK TECHNIQUE (20 points max)
  const modernFrameworks = techStack.filter(t => 
    ['React', 'Vue.js', 'Angular', 'Next.js', 'Nuxt.js', 'Svelte'].includes(t.name)
  );
  
  if (techStack.length >= 10 && modernFrameworks.length > 0) {
    devScore += 20;
    devIndicators.push('Stack technique très avancé');
  } else if (techStack.length >= 7) {
    devScore += 15;
    devIndicators.push('Stack technique riche');
  } else if (techStack.length >= 5) {
    devScore += 10;
  } else if (techStack.length >= 3) {
    devScore += 5;
  }

  // 2. FRAMEWORKS MODERNES (15 points)
  if (modernFrameworks.length >= 2) {
    devScore += 15;
    devIndicators.push('Maîtrise de plusieurs frameworks modernes');
  } else if (modernFrameworks.length === 1) {
    devScore += 10;
    devIndicators.push('Framework JS moderne');
  }

  // 3. QUALITÉ DU CODE HTML (25 points max)
  // Sémantique HTML5
  if (semanticElements >= 10) {
    devScore += 15;
    devIndicators.push('Excellente sémantique HTML5');
  } else if (semanticElements >= 7) {
    devScore += 12;
  } else if (semanticElements >= 4) {
    devScore += 8;
  } else if (semanticElements >= 2) {
    devScore += 4;
  }

  // Propreté du CSS
  if (inlineStyles === 0) {
    devScore += 10;
    devIndicators.push('Code CSS parfaitement organisé');
  } else if (inlineStyles < 3) {
    devScore += 8;
    devIndicators.push('Code CSS propre');
  } else if (inlineStyles < 10) {
    devScore += 4;
  }

  // 4. ACCESSIBILITÉ (20 points max) - Signe d'un dev professionnel
  const accessibilityScore = ariaLabels + roleAttributes + (formLabels > 0 ? 5 : 0);
  
  if (accessibilityScore >= 15 && imagesWithoutAlt === 0) {
    devScore += 20;
    devIndicators.push('Accessibilité WCAG AA/AAA');
  } else if (accessibilityScore >= 10) {
    devScore += 15;
    devIndicators.push('Accessibilité excellente');
  } else if (accessibilityScore >= 5) {
    devScore += 10;
  } else if (accessibilityScore >= 2) {
    devScore += 5;
  }

  // 5. SÉCURITÉ (20 points max) - Signe d'un dev expérimenté
  let securityPoints = 0;
  if (https) securityPoints += 8;
  if (securityHeaders.strictTransportSecurity) securityPoints += 4;
  if (securityHeaders.contentSecurityPolicy) securityPoints += 4;
  if (securityHeaders.xFrameOptions !== 'Not Set') securityPoints += 2;
  if (!mixedContent && https) securityPoints += 2;
  
  devScore += securityPoints;
  if (securityPoints >= 18) {
    devIndicators.push('Sécurité de niveau production');
  } else if (securityPoints >= 12) {
    devIndicators.push('Bonne sécurité');
  }

  // 6. SEO & PERFORMANCE (20 points max)
  let seoPoints = 0;
  if (uxScore >= 90) seoPoints += 10;
  else if (uxScore >= 75) seoPoints += 7;
  else if (uxScore >= 60) seoPoints += 5;
  else if (uxScore >= 40) seoPoints += 2;
  
  if (structuredData > 0) seoPoints += 5;
  if (hasCanonical && hasOpenGraph) seoPoints += 5;
  
  devScore += seoPoints;
  if (seoPoints >= 15) {
    devIndicators.push('SEO/UX expert');
  }

  // 7. OPTIMISATIONS AVANCÉES (15 points) - Signe d'expertise
  let optimizationPoints = 0;
  if (lazyLoadImages > imageCount * 0.5 && imageCount > 0) optimizationPoints += 5;
  if (hasCompression) optimizationPoints += 3;
  if (blockingScripts < 3) optimizationPoints += 3;
  if (hasSubresourceIntegrity) optimizationPoints += 2;
  if (hasMediaQueries) optimizationPoints += 2;
  
  devScore += optimizationPoints;
  if (optimizationPoints >= 10) {
    devIndicators.push('Optimisations de niveau expert');
  } else if (optimizationPoints >= 5) {
    devIndicators.push('Bonnes optimisations');
  }

  // 8. ARCHITECTURE & ORGANISATION (10 points)
  if (scriptCount >= 3 && scriptCount <= 15 && cssCount >= 1 && cssCount <= 5) {
    devScore += 10;
    devIndicators.push('Architecture bien organisée');
  } else if (scriptCount > 0 && scriptCount <= 20 && cssCount > 0 && cssCount <= 8) {
    devScore += 6;
  } else if (scriptCount > 0 && cssCount > 0) {
    devScore += 3;
  }

  // 9. BONNES PRATIQUES AVANCÉES (bonus)
  if (headingHierarchyValid && h1Count === 1) {
    devScore += 5;
    devIndicators.push('Hiérarchie de titres parfaite');
  }
  
  if (hasResponsiveViewport && hasMediaQueries && touchIcons > 0) {
    devScore += 5;
    devIndicators.push('Mobile-first bien implémenté');
  }

  // PÉNALITÉS (signes de mauvaises pratiques)
  if (inlineStyles > 30) {
    devScore -= 15;
    devIndicators.push('⚠ Trop de styles inline');
  } else if (inlineStyles > 20) {
    devScore -= 10;
  }
  
  if (imagesWithoutAlt > imageCount * 0.5 && imageCount > 0) {
    devScore -= 15;
    devIndicators.push('⚠ Accessibilité des images négligée');
  } else if (imagesWithoutAlt > imageCount * 0.3 && imageCount > 0) {
    devScore -= 10;
  }
  
  if (maxDepth > 20) {
    devScore -= 10;
    devIndicators.push('⚠ DOM trop profond');
  } else if (maxDepth > 15) {
    devScore -= 5;
  }
  
  if (scriptCount > 30) {
    devScore -= 10;
    devIndicators.push('⚠ Trop de scripts');
  }
  
  if (!https) {
    devScore -= 20;
    devIndicators.push('⚠ Pas de HTTPS (critique)');
  }

  devScore = Math.max(0, Math.min(100, devScore));

  // DÉTERMINATION DU NIVEAU (seuils ajustés)
  if (devScore >= 85) {
    devLevel = 'Expert Senior';
    devIndicators.push('🏆 Niveau professionnel confirmé');
  } else if (devScore >= 70) {
    devLevel = 'Expert';
    devIndicators.push('✨ Très bon niveau technique');
  } else if (devScore >= 55) {
    devLevel = 'Avancé';
  } else if (devScore >= 35) {
    devLevel = 'Intermédiaire';
  } else if (devScore >= 20) {
    devLevel = 'Junior';
  } else {
    devLevel = 'Débutant';
  }

  // === DÉTECTION AVANCÉE PROBABILITÉ IA (par une IA qui connaît ses patterns) ===
  let aiProbability = 0;
  const aiIndicators = [];
  const aiSignals = {
    placeholder: 0,
    structure: 0,
    naming: 0,
    content: 0,
    code: 0
  };

  // 1. DÉTECTION DE CONTENU PLACEHOLDER/GÉNÉRIQUE (très fort indicateur)
  const aiPlaceholders = [
    'lorem ipsum', 'dolor sit amet', 'consectetur adipiscing',
    'placeholder', 'sample text', 'demo content', 'example text',
    'your company name', 'your business', 'company name here',
    'insert text here', 'add content here', 'your content here',
    'click here', 'learn more', 'read more', 'get started',
    'welcome to our website', 'this is a sample',
    '[your', '[company', '[insert', '[add'
  ];
  
  let placeholderCount = 0;
  aiPlaceholders.forEach(phrase => {
    const regex = new RegExp(phrase.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
    const matches = (textContent.match(regex) || []).length;
    if (matches > 0) {
      placeholderCount += matches;
      aiSignals.placeholder += matches * 5;
    }
  });
  
  if (placeholderCount > 0) {
    aiIndicators.push(`${placeholderCount} placeholder(s) IA détecté(s)`);
  }

  // 2. PATTERNS DE STRUCTURE IA (grilles parfaites, sections identiques)
  const sections = $('section').length;
  const articles = $('article').length;
  const divs = $('div[class*="grid"], div[class*="flex"]').length;
  
  // Structure trop symétrique (IA aime la perfection)
  if (sections > 4 && sections === articles) {
    aiSignals.structure += 15;
    aiIndicators.push('Structure parfaitement symétrique (pattern IA)');
  }
  
  // Grilles répétitives (3, 4, 6 colonnes = patterns IA classiques)
  const gridPatterns = $('[class*="grid-cols-3"], [class*="grid-cols-4"], [class*="grid-cols-6"]').length;
  if (gridPatterns > 3) {
    aiSignals.structure += 10;
    aiIndicators.push('Grilles répétitives (layout IA)');
  }

  // 3. NOMMAGE GÉNÉRIQUE (IA utilise des noms prévisibles)
  const aiNamingPatterns = [
    'section-1', 'section-2', 'section-3',
    'container-1', 'container-2',
    'card-1', 'card-2', 'card-3',
    'feature-1', 'feature-2', 'feature-3',
    'item-1', 'item-2', 'item-3',
    'component', 'wrapper', 'block'
  ];
  
  let genericNaming = 0;
  aiNamingPatterns.forEach(pattern => {
    if (html.includes(`id="${pattern}"`) || html.includes(`class="${pattern}"`)) {
      genericNaming++;
      aiSignals.naming += 3;
    }
  });
  
  if (genericNaming > 5) {
    aiIndicators.push(`${genericNaming} noms génériques (pattern IA)`);
  }

  // 4. CONTENU RÉPÉTITIF (IA répète souvent les mêmes phrases)
  const paragraphTexts = [];
  $('p').each((i, el) => {
    const text = $(el).text().trim();
    if (text.length > 20) paragraphTexts.push(text);
  });
  
  const uniqueTexts = new Set(paragraphTexts);
  if (paragraphTexts.length > 5 && uniqueTexts.size < paragraphTexts.length * 0.7) {
    aiSignals.content += 20;
    aiIndicators.push('Contenu très répétitif (génération IA)');
  }

  // 5. LONGUEUR DE TEXTE UNIFORME (IA génère souvent des textes de longueur similaire)
  const textLengths = [];
  $('p').each((i, el) => {
    const len = $(el).text().trim().length;
    if (len > 20) textLengths.push(len);
  });
  
  if (textLengths.length > 5) {
    const avgLength = textLengths.reduce((a, b) => a + b, 0) / textLengths.length;
    const variance = textLengths.reduce((sum, len) => sum + Math.pow(len - avgLength, 2), 0) / textLengths.length;
    const stdDev = Math.sqrt(variance);
    
    // Faible variance = textes trop uniformes = IA
    if (stdDev < avgLength * 0.3) {
      aiSignals.content += 15;
      aiIndicators.push('Longueur de texte trop uniforme (IA)');
    }
  }

  // 6. BUILDERS IA ET NO-CODE (détection stricte)
  const aiBuilders = [
    { name: 'Framer', pattern: 'framer.com' },
    { name: 'Webflow', pattern: 'webflow.io' },
    { name: 'Wix ADI', pattern: 'wix.com/website/builder' },
    { name: 'Dora AI', pattern: 'dora.run' },
    { name: 'Bookmark AiDA', pattern: 'bookmark.com' },
    { name: '10Web', pattern: '10web.io' },
    { name: 'Hostinger AI', pattern: 'hostinger' }
  ];
  
  aiBuilders.forEach(builder => {
    if (html.includes(builder.pattern)) {
      aiSignals.code += 25;
      aiIndicators.push(`Builder IA: ${builder.name}`);
    }
  });

  // 7. COMMENTAIRES IA (très révélateur)
  const aiComments = [
    'Generated by', 'Created with AI', 'Auto-generated',
    'AI-powered', 'Built with AI', 'ChatGPT', 'Claude',
    'Copilot', 'Generated with', 'Automatically created'
  ];
  
  aiComments.forEach(comment => {
    if (html.includes(comment)) {
      aiSignals.code += 30;
      aiIndicators.push(`Commentaire IA: "${comment}"`);
    }
  });

  // 8. CLASSES CSS AUTO-GÉNÉRÉES (pattern IA)
  const autoClasses = $('[class*="auto-"], [class*="generated-"], [class*="ai-"], [class*="component-"]').length;
  if (autoClasses > 10) {
    aiSignals.code += 15;
    aiIndicators.push(`${autoClasses} classes auto-générées`);
  }

  // 9. IMAGES STOCK (IA utilise souvent des placeholders)
  const aiImageSources = [
    'placeholder.com', 'via.placeholder', 'placehold',
    'unsplash.com', 'pexels.com', 'pixabay.com',
    'picsum.photos', 'lorempixel', 'dummyimage',
    'placeholder.svg', 'image-placeholder'
  ];
  
  let aiImageCount = 0;
  $('img').each((i, el) => {
    const src = $(el).attr('src') || '';
    const alt = $(el).attr('alt') || '';
    aiImageSources.forEach(source => {
      if (src.toLowerCase().includes(source)) {
        aiImageCount++;
      }
    });
    // Alt text générique (IA pattern)
    if (alt.toLowerCase().includes('image') || alt.toLowerCase().includes('photo') || alt.toLowerCase().includes('picture')) {
      aiImageCount += 0.5;
    }
  });
  
  if (aiImageCount > imageCount * 0.5 && imageCount > 0) {
    aiSignals.content += 20;
    aiIndicators.push('Majorité d\'images placeholder/stock');
  }

  // 10. MÉTADONNÉES GÉNÉRIQUES (IA oublie souvent de personnaliser)
  const titleLower = $('title').text().toLowerCase();
  const metaDescAI = $('meta[name="description"]').attr('content') || '';
  
  const genericTitles = ['untitled', 'new site', 'website', 'home page', 'my site', 'welcome'];
  const genericDescs = ['description', 'site description', 'website description'];
  
  if (genericTitles.some(t => titleLower.includes(t))) {
    aiSignals.content += 15;
    aiIndicators.push('Titre générique non personnalisé');
  }
  
  if (genericDescs.some(d => metaDescAI.toLowerCase().includes(d)) || metaDescAI.length < 20) {
    aiSignals.content += 10;
    aiIndicators.push('Meta description générique');
  }

  // 11. RATIO CODE/CONTENU (IA génère souvent beaucoup de markup pour peu de contenu)
  if (textLength < 500 && domElements > 100) {
    aiSignals.content += 15;
    aiIndicators.push('Beaucoup de code pour peu de contenu (IA)');
  }

  // 12. INLINE STYLES EXCESSIFS (certains builders IA)
  if (inlineStyles > 50) {
    aiSignals.code += 10;
    aiIndicators.push('Styles inline excessifs (builder IA)');
  }

  // CALCUL FINAL DE LA PROBABILITÉ IA
  aiProbability = Math.min(100, 
    aiSignals.placeholder + 
    aiSignals.structure + 
    aiSignals.naming + 
    aiSignals.content + 
    aiSignals.code
  );

  // RÉDUCTIONS pour signes de développement humain
  if (devScore >= 80) {
    aiProbability = Math.max(0, aiProbability - 30);
    aiIndicators.push('✓ Code de qualité expert (humain)');
  } else if (devScore >= 60) {
    aiProbability = Math.max(0, aiProbability - 20);
  }
  
  if (techStack.length >= 8 && modernFrameworks.length > 0) {
    aiProbability = Math.max(0, aiProbability - 15);
    aiIndicators.push('✓ Stack technique avancé (humain)');
  }

  if (hasAuth || hasEcommerce) {
    aiProbability = Math.max(0, aiProbability - 25);
    aiIndicators.push('✓ Fonctionnalités complexes (humain)');
  }

  // Contenu unique et varié
  if (uniqueTexts.size === paragraphTexts.length && paragraphTexts.length > 5) {
    aiProbability = Math.max(0, aiProbability - 15);
    aiIndicators.push('✓ Contenu unique et varié (humain)');
  }

  // Personnalisation avancée
  if (title.length > 10 && !genericTitles.some(t => title.toLowerCase().includes(t)) && metaDescription.length > 100) {
    aiProbability = Math.max(0, aiProbability - 10);
    aiIndicators.push('✓ Métadonnées personnalisées (humain)');
  }

  aiProbability = Math.min(100, Math.max(0, Math.round(aiProbability)));

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
  
  // Calcul basé sur la complexité réelle du site
  complexityScore += Math.min(30, Math.floor(domElements / 100)); // Max 30 points pour DOM
  complexityScore += Math.min(20, scriptCount * 2); // Max 20 points pour scripts
  complexityScore += Math.min(25, techStack.length * 5); // Max 25 points pour stack
  complexityScore += linkCount > 50 ? 15 : linkCount > 20 ? 10 : 5;
  complexityScore += imageCount > 30 ? 15 : imageCount > 10 ? 10 : 5;
  
  const hasForm = $('form').length > 0;
  
  if (hasEcommerce) complexityScore += 30;
  if (hasAuth) complexityScore += 20;
  if (hasForm) complexityScore += 10;

  // Limiter le score de complexité à un maximum raisonnable
  complexityScore = Math.min(150, complexityScore);

  // Estimation réaliste des jours (minimum 3 jours, maximum 60 jours)
  const estimatedDays = Math.max(3, Math.min(60, Math.ceil(complexityScore / 10)));
  const freelancePriceEUR = estimatedDays * 400;
  const agencyPriceEUR = estimatedDays * 800;
  
  const EUR_TO_GNF = 11000;
  const freelancePriceGNF = Math.round(freelancePriceEUR * EUR_TO_GNF);
  const agencyPriceGNF = Math.round(agencyPriceEUR * EUR_TO_GNF);

  const pricingFactors = [];
  if (hasEcommerce) pricingFactors.push('E-commerce (+30 pts)');
  if (hasAuth) pricingFactors.push('Authentification (+20 pts)');
  if (techStack.length >= 5) pricingFactors.push('Stack technique avancé (+25 pts)');
  if (domElements > 1000) pricingFactors.push('Site complexe (+30 pts)');

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

  // === RECOMMANDATIONS INTELLIGENTES AMÉLIORÉES ===
  const recommendations = [];
  
  // Sécurité critique
  if (!https) recommendations.push({ priority: 'critical', text: 'Activez HTTPS immédiatement', impact: 'Sécurité' });
  if (mixedContent) recommendations.push({ priority: 'critical', text: 'Corrigez le contenu mixte (HTTP dans HTTPS)', impact: 'Sécurité' });
  
  // SEO prioritaire
  if (!hasViewport) recommendations.push({ priority: 'high', text: 'Ajoutez une meta viewport', impact: 'Mobile' });
  if (!metaDescription) recommendations.push({ priority: 'high', text: 'Ajoutez une meta description', impact: 'SEO' });
  if (h1Count === 0) recommendations.push({ priority: 'high', text: 'Ajoutez une balise H1', impact: 'SEO' });
  if (h1Count > 1) recommendations.push({ priority: 'medium', text: 'Limitez-vous à une seule H1', impact: 'SEO' });
  if (!hasCanonical) recommendations.push({ priority: 'medium', text: 'Ajoutez une URL canonique', impact: 'SEO' });
  if (structuredData === 0) recommendations.push({ priority: 'medium', text: 'Ajoutez des données structurées (Schema.org)', impact: 'SEO' });
  
  // Accessibilité
  if (imagesWithoutAlt > 0) recommendations.push({ priority: 'medium', text: `Ajoutez des attributs alt aux ${imagesWithoutAlt} images`, impact: 'Accessibilité' });
  if (linksWithoutText > 0) recommendations.push({ priority: 'medium', text: `${linksWithoutText} liens sans texte détectés`, impact: 'Accessibilité' });
  if (!headingHierarchyValid) recommendations.push({ priority: 'medium', text: 'Corrigez la hiérarchie des titres (H1→H2→H3)', impact: 'Accessibilité' });
  
  // Sécurité
  if (!securityHeaders.contentSecurityPolicy) recommendations.push({ priority: 'medium', text: 'Ajoutez un Content-Security-Policy', impact: 'Sécurité' });
  if (!hasSubresourceIntegrity && externalScripts > 0) recommendations.push({ priority: 'medium', text: 'Ajoutez SRI pour les scripts externes', impact: 'Sécurité' });
  if (!hasSecureCookies && cookieInfo) recommendations.push({ priority: 'medium', text: 'Sécurisez vos cookies (Secure, HttpOnly)', impact: 'Sécurité' });
  
  // Performance
  if (blockingScripts > 5) recommendations.push({ priority: 'medium', text: `${blockingScripts} scripts bloquants détectés - utilisez async/defer`, impact: 'Performance' });
  if (!hasCompression) recommendations.push({ priority: 'medium', text: 'Activez la compression Gzip/Brotli', impact: 'Performance' });
  if (lazyLoadImages === 0 && imageCount > 5) recommendations.push({ priority: 'medium', text: 'Activez le lazy loading pour les images', impact: 'Performance' });
  if (inlineStyles > 10) recommendations.push({ priority: 'low', text: 'Réduisez les styles inline', impact: 'Performance' });
  if (scriptCount > 15) recommendations.push({ priority: 'medium', text: 'Optimisez le nombre de scripts', impact: 'Performance' });
  
  // UX/Design
  if (semanticElements < 3) recommendations.push({ priority: 'low', text: 'Utilisez plus d\'éléments sémantiques HTML5', impact: 'SEO' });
  if (!hasOpenGraph) recommendations.push({ priority: 'low', text: 'Ajoutez des balises Open Graph', impact: 'Réseaux sociaux' });
  if (!hasMediaQueries && hasViewport) recommendations.push({ priority: 'low', text: 'Ajoutez des media queries pour le responsive', impact: 'Mobile' });
  if (ctaButtons === 0 && forms === 0) recommendations.push({ priority: 'low', text: 'Ajoutez des appels à l\'action (CTA)', impact: 'Conversion' });

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
      loadTime: loadTime < 1000 ? 'Excellent' : loadTime < 3000 ? 'Bon' : 'À améliorer',
      // Nouvelles métriques de performance
      blockingScripts,
      blockingCSS,
      hasCompression,
      compressionType: contentEncoding,
      externalScripts,
      externalCSS,
      performanceScore: Math.round(
        (loadTime < 1000 ? 30 : loadTime < 3000 ? 20 : 10) +
        (hasCompression ? 20 : 0) +
        (blockingScripts < 3 ? 20 : blockingScripts < 5 ? 10 : 0) +
        (lazyLoadImages > imageCount * 0.5 ? 20 : lazyLoadImages > 0 ? 10 : 0) +
        (inlineStyles < 5 ? 10 : inlineStyles < 10 ? 5 : 0)
      )
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
      vulnerabilitiesList,
      // Nouvelles métriques de sécurité
      mixedContent,
      hasSubresourceIntegrity,
      hasSecureCookies,
      securityGrade: securityScore >= 90 ? 'A' : securityScore >= 80 ? 'B' : securityScore >= 70 ? 'C' : securityScore >= 60 ? 'D' : 'F'
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
        score: Math.min(100, Math.round(((ariaLabels * 2) + (roleAttributes * 2) + (semanticElements * 3)) / 2))
      },
      mobileFriendliness: hasViewport ? 100 : 0,
      readabilityScore,
      navigationClarity
    },
    // === NOUVELLES SECTIONS D'ANALYSE ===
    seo: {
      score: uxScore, // Réutilisation du score UX pour SEO
      metaRobots,
      hasCanonical,
      canonicalUrl,
      structuredData,
      hasAmpVersion,
      wordCount,
      contentQuality: wordCount > 500 ? 'Bon' : wordCount > 200 ? 'Moyen' : 'Faible',
      headingsStructure: headings,
      headingHierarchyValid,
      internalLinks: internalLinks,
      externalLinks: externalLinks,
      grade: uxScore >= 90 ? 'A+' : uxScore >= 80 ? 'A' : uxScore >= 70 ? 'B' : uxScore >= 60 ? 'C' : 'D'
    },
    accessibility: {
      score: Math.min(100, Math.round(((ariaLabels * 2) + (roleAttributes * 2) + (semanticElements * 3)) / 2)),
      ariaCount: ariaLabels,
      roleCount: roleAttributes,
      semanticElements,
      formLabels,
      formInputs,
      linksWithoutText,
      buttonsCount,
      headingHierarchyValid,
      imagesWithoutAlt,
      wcagLevel: ariaLabels > 5 && semanticElements > 5 && imagesWithoutAlt === 0 ? 'AA' : ariaLabels > 0 ? 'A' : 'Non conforme'
    },
    mobile: {
      hasViewport: hasViewport,
      hasResponsiveViewport,
      hasMediaQueries,
      touchIcons,
      mobileScore: Math.round(
        (hasResponsiveViewport ? 40 : hasViewport ? 20 : 0) +
        (hasMediaQueries ? 30 : 0) +
        (touchIcons > 0 ? 15 : 0) +
        (lazyLoadImages > 0 ? 15 : 0)
      ),
      mobileFriendly: hasResponsiveViewport && hasMediaQueries
    },
    content: {
      language: detectedLang,
      wordCount,
      textLength,
      hasDateElements: dateElements > 0,
      contentFreshness: dateElements > 0 ? 'Récent' : 'Inconnu',
      textToHtmlRatio,
      readabilityScore
    },
    conversion: {
      ctaButtons,
      forms,
      formInputs,
      requiredFields,
      popups,
      conversionOptimized: ctaButtons > 0 && forms > 0,
      conversionScore: Math.round(
        (ctaButtons > 0 ? 30 : 0) +
        (forms > 0 ? 30 : 0) +
        (requiredFields > 0 ? 20 : 0) +
        (popups > 0 ? 10 : 0) +
        (hasAuth || hasEcommerce ? 10 : 0)
      )
    },
    designType: techStack.some(t => t.name === 'WordPress') ? 'CMS' : 
                techStack.some(t => ['Wix', 'Squarespace', 'Webflow'].includes(t.name)) ? 'Website Builder' :
                techStack.some(t => ['Shopify', 'WooCommerce', 'Magento', 'PrestaShop'].includes(t.name)) ? 'E-commerce' :
                techStack.some(t => ['React', 'Vue.js', 'Angular', 'Next.js', 'Nuxt.js', 'Svelte'].includes(t.name)) ? 'Application Web' :
                techStack.length >= 5 ? 'Custom' : 'Simple',
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
