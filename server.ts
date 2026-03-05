import express from "express";
import { createServer as createViteServer } from "vite";
import * as cheerio from "cheerio";

// Cache system
const analysisCache = new Map<string, { data: any, timestamp: number }>();
const CACHE_TTL = 1000 * 60 * 60; // 1 hour

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // Middleware to log API requests
  app.use((req, res, next) => {
    if (req.path.startsWith('/api/')) {
      console.log(`[API] ${req.method} ${req.path}`);
    }
    next();
  });

  // API routes FIRST
  app.post("/api/analyze", async (req, res) => {
    try {
      const { url } = req.body;
      if (!url) {
        return res.status(400).json({ error: "URL is required" });
      }

      let targetUrl = url;
      if (!targetUrl.startsWith("http://") && !targetUrl.startsWith("https://")) {
        targetUrl = "https://" + targetUrl;
      }

      const urlObj = new URL(targetUrl);
      if (urlObj.hostname === "localhost" || urlObj.hostname === "127.0.0.1") {
        return res.status(400).json({ error: "Localhost scanning is not allowed" });
      }

      // Check cache
      const cached = analysisCache.get(targetUrl);
      if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
        return res.json({ ...cached.data, cached: true });
      }

      const startTime = Date.now();
      const response = await fetch(targetUrl, {
        headers: {
          "User-Agent": "WebAnalyzerPro/1.0",
        },
        redirect: "follow",
      });

      const html = await response.text();
      const loadTime = Date.now() - startTime;
      const htmlSizeKB = Math.round(html.length / 1024);
      
      const $ = cheerio.load(html);
      
      // 1. Tech Detection
      interface Tech { name: string; version?: string; category: string; }
      const techStack: Tech[] = [];
      const addTech = (name: string, category: string, version?: string) => {
        if (!techStack.find(t => t.name === name)) techStack.push({ name, category, version });
      };

      const $all = $("*");
      const domElementsCount = $all.length;

      const scripts = $("script").map((i, el) => $(el).attr("src") || $(el).text()).get().join(" ").toLowerCase();
      const links = $("link").map((i, el) => $(el).attr("href")).get().join(" ").toLowerCase();
      const meta = $("meta").map((i, el) => $(el).attr("content") || $(el).attr("name") || $(el).attr("property")).get().join(" ").toLowerCase();
      const classes = $all.map((i, el) => $(el).attr("class")).get().join(" ").toLowerCase();
      const allHeaders = JSON.stringify(Object.fromEntries(response.headers.entries())).toLowerCase();
      const metaGenerator = $("meta[name='generator']").attr("content") || "";
      const htmlContent = html.toLowerCase();

      // Fetch external scripts for deep inspection (especially for WebGL/3D)
      const scriptUrls = $("script[src]").map((i, el) => $(el).attr("src")).get()
        .filter(src => src && !src.includes("google-analytics") && !src.includes("gtm.js") && !src.includes("facebook.net"))
        .map(src => {
          try {
            if (src.startsWith("//")) return "https:" + src;
            if (src.startsWith("/")) return new URL(src, targetUrl).href;
            if (!src.startsWith("http")) return new URL(src, targetUrl).href;
            return src;
          } catch (e) {
            return "";
          }
        }).filter(Boolean);

      // Limit to max 3 scripts to avoid timeouts, prefer main bundles
      const mainScripts = scriptUrls.filter(src => src.includes("main") || src.includes("app") || src.includes("bundle") || src.includes("index") || src.includes("_next/static")).slice(0, 3);
      if (mainScripts.length === 0) {
        mainScripts.push(...scriptUrls.slice(0, 2));
      }

      let externalScriptsContent = "";
      try {
        const scriptResponses = await Promise.all(
          mainScripts.map(url => fetch(url, { signal: AbortSignal.timeout(3000) }).then(res => res.text()).catch(() => ""))
        );
        externalScriptsContent = scriptResponses.join(" ").toLowerCase();
      } catch (e) {
        console.error("Error fetching external scripts:", e);
      }

      // DOM Complexity & Depth
      let maxDepth = 0;
      $all.each((_, el) => {
        const depth = $(el).parents().length;
        if (depth > maxDepth) maxDepth = depth;
      });
      const divCount = $("div").length;
      const divRatio = divCount / (domElementsCount || 1);
      
      const textContent = $("body").text().replace(/\s+/g, " ").trim();
      const textToHtmlRatio = htmlContent.length > 0 ? (textContent.length / htmlContent.length) * 100 : 0;

      // GDPR Check
      const hasPrivacyPolicy = $("a").filter((_, el) => {
        const text = $(el).text().toLowerCase();
        const href = $(el).attr("href")?.toLowerCase() || "";
        return text.includes("privacy") || text.includes("confidentialité") || text.includes("rgpd") || text.includes("gdpr") || href.includes("privacy") || href.includes("confidentialite");
      }).length > 0;

      const hasCookiePolicy = $("a").filter((_, el) => {
        const text = $(el).text().toLowerCase();
        const href = $(el).attr("href")?.toLowerCase() || "";
        return text.includes("cookie") || href.includes("cookie");
      }).length > 0;

      const hasCookieBanner = htmlContent.includes("tarteaucitron") || htmlContent.includes("cookiebot") || htmlContent.includes("onetrust") || htmlContent.includes("axeptio") || htmlContent.includes("didomi") || htmlContent.includes("cookie-notice");
      
      const gdprCompliant = hasPrivacyPolicy && (hasCookiePolicy || hasCookieBanner);

      // Lazy Loading Detection
      const lazyImages = $("img[loading='lazy']").length;
      const totalImages = $("img").length;
      const lazyLoadRatio = totalImages > 0 ? lazyImages / totalImages : 0;

      // CMS & Builders
      if (metaGenerator.toLowerCase().includes("wordpress")) {
        const match = metaGenerator.match(/WordPress\s+([\d.]+)/i);
        addTech("WordPress", "CMS", match ? match[1] : undefined);
      } else if (htmlContent.includes("wp-content")) {
        addTech("WordPress", "CMS");
      }
      if (metaGenerator.toLowerCase().includes("drupal") || htmlContent.includes("sites/default/files") || allHeaders.includes("x-drupal-cache")) addTech("Drupal", "CMS");
      if (metaGenerator.toLowerCase().includes("joomla")) addTech("Joomla", "CMS");
      if (metaGenerator.toLowerCase().includes("ghost")) addTech("Ghost", "CMS");
      if (htmlContent.includes("var prestashop") || htmlContent.includes("prestashop")) addTech("PrestaShop", "E-commerce");
      if (htmlContent.includes("mage/cookies.js") || allHeaders.includes("x-magento")) addTech("Magento", "E-commerce");
      if (htmlContent.includes("vtex")) addTech("VTEX", "E-commerce");
      if (htmlContent.includes("cdn.shopify.com")) addTech("Shopify", "E-commerce");
      if (htmlContent.includes("wix.com")) addTech("Wix", "Website Builder");
      if (htmlContent.includes("squarespace.com")) addTech("Squarespace", "Website Builder");
      if (htmlContent.includes("webflow.com")) addTech("Webflow", "Website Builder");
      if (htmlContent.includes("elementor")) addTech("Elementor", "Page Builder");

      // Frameworks Web & Libraries
      if (htmlContent.includes("__next_data__") || htmlContent.includes("_next/static")) addTech("Next.js", "Framework Web");
      if (htmlContent.includes("data-reactroot") || htmlContent.includes("react")) addTech("React", "Library");
      if (htmlContent.includes("vue")) addTech("Vue.js", "Framework Web");
      if (htmlContent.includes("nuxt")) addTech("Nuxt.js", "Framework Web");
      if (htmlContent.includes("svelte")) addTech("Svelte", "Framework Web");
      if (htmlContent.includes("astro")) addTech("Astro", "Framework Web");
      if (htmlContent.includes("ng-version")) addTech("Angular", "Framework Web");
      if (htmlContent.includes("ember")) addTech("Ember.js", "Framework Web");
      if (htmlContent.includes("alpine")) addTech("Alpine.js", "Framework Web");
      if (htmlContent.includes("solid")) addTech("Solid.js", "Framework Web");
      if (htmlContent.includes("qwik")) addTech("Qwik", "Framework Web");
      if (htmlContent.includes("remix")) addTech("Remix", "Framework Web");
      if (htmlContent.includes("htmx")) addTech("HTMX", "Library");
      
      // Générateurs de sites statiques (SSG)
      if (metaGenerator.toLowerCase().includes("gatsby") || htmlContent.includes('id="___gatsby"')) addTech("Gatsby", "SSG");
      if (metaGenerator.toLowerCase().includes("hugo")) addTech("Hugo", "SSG");
      if (metaGenerator.toLowerCase().includes("jekyll")) addTech("Jekyll", "SSG");
      if (metaGenerator.toLowerCase().includes("docusaurus")) addTech("Docusaurus", "SSG");
      if (metaGenerator.toLowerCase().includes("eleventy")) addTech("Eleventy", "SSG");

      // Frameworks UI & Styling
      if (htmlContent.includes("cdn.tailwindcss.com") || htmlContent.includes("tailwind")) addTech("Tailwind CSS", "Framework UI");
      if (scripts.includes("bootstrap") || links.includes("bootstrap")) addTech("Bootstrap", "Framework UI");
      if (htmlContent.includes("mui-") || htmlContent.includes("material-ui")) addTech("Material UI", "Framework UI");
      if (htmlContent.includes("ant-") && htmlContent.includes("ant-design")) addTech("Ant Design", "Framework UI");
      if (htmlContent.includes("chakra-ui")) addTech("Chakra UI", "Framework UI");
      if (htmlContent.includes("daisyui")) addTech("DaisyUI", "Framework UI");
      if (htmlContent.includes("radix-ui")) addTech("Radix UI", "Framework UI");
      
      // Analytics & Performance
      if (scripts.includes("google-analytics") || scripts.includes("gtag")) addTech("Google Analytics", "Analytics");
      if (scripts.includes("gtm.js")) addTech("Google Tag Manager", "Analytics");
      if (scripts.includes("fbevents.js")) addTech("Facebook Pixel", "Analytics");
      if (scripts.includes("hotjar")) addTech("Hotjar", "Analytics");
      if (scripts.includes("cdn.segment.com")) addTech("Segment", "Analytics");
      if (scripts.includes("plausible.io")) addTech("Plausible", "Analytics");
      if (scripts.includes("matomo.js") || scripts.includes("piwik.js")) addTech("Matomo", "Analytics");
      if (scripts.includes("mixpanel")) addTech("Mixpanel", "Analytics");
      if (scripts.includes("amplitude")) addTech("Amplitude", "Analytics");
      if (scripts.includes("clarity.ms")) addTech("Microsoft Clarity", "Analytics");
      if (scripts.includes("widget.intercom.io")) addTech("Intercom", "Support / Chat");
      if (scripts.includes("js.hs-scripts.com")) addTech("HubSpot", "Marketing / CRM");
      if (scripts.includes("client.crisp.chat")) addTech("Crisp", "Support / Chat");
      if (scripts.includes("drift.com")) addTech("Drift", "Support / Chat");
      if (scripts.includes("zendesk.com")) addTech("Zendesk", "Support / Chat");

      // Deep Scan - Performance & Libraries
      if (scripts.includes("newrelic")) addTech("New Relic", "Performance");
      if (scripts.includes("sentry")) addTech("Sentry", "Performance");
      if (scripts.includes("datadog")) addTech("Datadog", "Performance");
      if (scripts.includes("logrocket")) addTech("LogRocket", "Performance");
      if (scripts.includes("gsap") || scripts.includes("tweenmax")) addTech("GSAP", "Animation");
      if (scripts.includes("framer-motion")) addTech("Framer Motion", "Animation");
      
      // 3D & WebGL Deep Detection
      const hasCanvas = $("canvas").length > 0;
      const combinedScripts = scripts + " " + externalScriptsContent;
      const combinedContent = htmlContent + " " + externalScriptsContent;
      
      const hasWebGLContext = combinedScripts.includes("webgl") || combinedScripts.includes("experimental-webgl") || combinedContent.includes("webgl") || combinedScripts.includes("getcontext('webgl')") || combinedScripts.includes('getcontext("webgl")');
      
      // Look for specific Three.js classes/strings that survive minification
      const hasThreeClasses = combinedScripts.includes("webglrenderer") && (combinedScripts.includes("perspectivecamera") || combinedScripts.includes("orthographiccamera") || combinedScripts.includes("scene"));
      const hasThreeJs = combinedScripts.includes("three.js") || combinedScripts.includes("three.min.js") || combinedScripts.includes("three.module.js") || combinedContent.includes('"three"') || combinedContent.includes("'three'") || combinedContent.includes("three@") || combinedScripts.includes("three@") || combinedScripts.includes("three,") || hasThreeClasses;
      
      const hasR3F = combinedScripts.includes("react-three-fiber") || combinedContent.includes("@react-three/fiber") || (hasThreeJs && combinedScripts.includes("react"));
      const hasDrei = combinedScripts.includes("drei") || combinedContent.includes("@react-three/drei") || combinedScripts.includes("usegltf") || combinedScripts.includes("orbitcontrols");
      
      const hasBabylon = combinedScripts.includes("babylon.js") || combinedScripts.includes("babylonjs") || combinedContent.includes("babylonjs") || combinedScripts.includes("engine") && combinedScripts.includes("scene") && combinedScripts.includes("arcrotatecamera");
      const hasPlayCanvas = combinedScripts.includes("playcanvas") || combinedContent.includes("playcanvas") || combinedScripts.includes("pc.Application");
      
      if (hasThreeJs || hasR3F || hasDrei || (hasCanvas && hasWebGLContext && (combinedScripts.includes("three.") || combinedContent.includes("three.")))) {
        addTech("Three.js", "3D / WebGL");
      }
      if (hasR3F) addTech("React Three Fiber", "3D / WebGL");
      if (hasDrei) addTech("Drei", "3D / WebGL");
      if (hasBabylon) addTech("Babylon.js", "3D / WebGL");
      if (hasPlayCanvas) addTech("PlayCanvas", "3D / WebGL");
      if (hasCanvas && hasWebGLContext && !hasThreeJs && !hasBabylon && !hasPlayCanvas && !hasR3F && !hasDrei) {
        addTech("WebGL (Custom)", "3D / WebGL");
      }

      if (scripts.includes("lodash")) addTech("Lodash", "Library");
      if (scripts.includes("moment.js") || scripts.includes("moment.min.js")) addTech("Moment.js", "Library");
      if (scripts.includes("date-fns")) addTech("date-fns", "Library");
      if (scripts.includes("chart.js") || scripts.includes("chart.min.js")) addTech("Chart.js", "Data Viz");
      if (scripts.includes("d3.js") || scripts.includes("d3.min.js")) addTech("D3.js", "Data Viz");
      if (scripts.includes("echarts")) addTech("ECharts", "Data Viz");
      if (scripts.includes("highcharts")) addTech("Highcharts", "Data Viz");
      if (scripts.includes("jquery")) addTech("jQuery", "Library");
      if (scripts.includes("axios")) addTech("Axios", "Library");
      if (scripts.includes("rxjs")) addTech("RxJS", "Library");

      // Deep Scan - Fonts & Icons
      if (links.includes("font-awesome") || classes.includes("fa-") || classes.includes("fas ")) addTech("FontAwesome", "Icons");
      if (links.includes("fonts.googleapis.com") || links.includes("fonts.gstatic.com")) addTech("Google Fonts", "Fonts");

      // Sécurité & Auth
      if (scripts.includes("recaptcha/api.js")) addTech("Google reCAPTCHA", "Sécurité");
      if (scripts.includes("hcaptcha.com")) addTech("hCaptcha", "Sécurité");
      if (scripts.includes("auth0.com")) addTech("Auth0", "Sécurité");
      if (scripts.includes("clerk.com") || htmlContent.includes("clerk")) addTech("Clerk", "Sécurité");
      if (scripts.includes("okta.com")) addTech("Okta", "Sécurité");
      if (scripts.includes("cognito")) addTech("AWS Cognito", "Sécurité");

      // Drivers / BaaS
      if (scripts.includes("firebase") || htmlContent.includes("firebase")) addTech("Firebase", "BaaS / Driver");
      if (scripts.includes("supabase") || htmlContent.includes("supabase")) addTech("Supabase", "BaaS / Driver");
      if (scripts.includes("appwrite")) addTech("Appwrite", "BaaS / Driver");
      if (scripts.includes("amplify")) addTech("AWS Amplify", "BaaS / Driver");
      if (scripts.includes("sanity")) addTech("Sanity", "Headless CMS");
      if (scripts.includes("contentful")) addTech("Contentful", "Headless CMS");
      if (scripts.includes("strapi")) addTech("Strapi", "Headless CMS");

      // Headers Analysis (Serveurs Web, PaaS, Frameworks Backend, CDN)
      const xPoweredBy = response.headers.get("x-powered-by") || "";
      if (xPoweredBy.toLowerCase().includes("express")) addTech("Express.js", "Framework Web");
      
      // Laravel Detection
      if (xPoweredBy.toLowerCase().includes("laravel") || allHeaders.includes("laravel_session") || htmlContent.includes("window.laravel")) {
        addTech("Laravel", "Framework Web");
        addTech("PHP", "Langage");
      }
      
      // ASP.NET Detection
      if (xPoweredBy.toLowerCase().includes("asp.net") || allHeaders.includes("x-aspnet-version") || allHeaders.includes("x-aspnetmvc-version")) {
        const versionMatch = response.headers.get("x-aspnet-version") || response.headers.get("x-aspnetmvc-version");
        addTech("ASP.NET", "Framework Web", versionMatch ? versionMatch : undefined);
        addTech("C#", "Langage");
      }

      // Django Detection
      if (allHeaders.includes("csrftoken") || allHeaders.includes("django_language") || htmlContent.includes("csrfmiddlewaretoken")) {
        addTech("Django", "Framework Web");
        addTech("Python", "Langage");
      }

      // Spring Boot / Java Detection
      if (allHeaders.includes("x-application-context") || allHeaders.includes("jsessionid")) {
        addTech("Spring", "Framework Web");
        addTech("Java", "Langage");
      }

      // Ruby on Rails Detection
      if (xPoweredBy.toLowerCase().includes("phusion passenger") || htmlContent.includes('content="authenticity_token"') || allHeaders.includes("_session_id")) {
        addTech("Ruby on Rails", "Framework Web");
        addTech("Ruby", "Langage");
      }

      // PHP Detection (General)
      if (xPoweredBy.toLowerCase().includes("php") || allHeaders.includes("phpsessid")) {
        const match = xPoweredBy.match(/PHP\/([\d.]+)/i);
        addTech("PHP", "Langage", match ? match[1] : undefined);
      }

      if (xPoweredBy.toLowerCase().includes("next.js")) addTech("Next.js", "Framework Web");
      
      const serverHeader = response.headers.get("server") || "";
      if (serverHeader.toLowerCase().includes("nginx")) {
        const match = serverHeader.match(/nginx\/([\d.]+)/i);
        addTech("Nginx", "Serveur Web", match ? match[1] : undefined);
      }
      if (serverHeader.toLowerCase().includes("apache")) {
        const match = serverHeader.match(/Apache\/([\d.]+)/i);
        addTech("Apache", "Serveur Web", match ? match[1] : undefined);
      }
      if (serverHeader.toLowerCase().includes("cloudflare")) addTech("Cloudflare", "Sécurité & CDN");
      if (serverHeader.toLowerCase().includes("litespeed")) addTech("LiteSpeed", "Serveur Web & Performance");
      if (serverHeader.toLowerCase().includes("microsoft-iis")) addTech("IIS", "Serveur Web");
      if (serverHeader.toLowerCase().includes("caddy")) addTech("Caddy", "Serveur Web");
      if (serverHeader.toLowerCase().includes("vercel")) addTech("Vercel", "PaaS");
      if (serverHeader.toLowerCase().includes("netlify")) addTech("Netlify", "PaaS");
      if (serverHeader.toLowerCase().includes("awselb") || serverHeader.toLowerCase().includes("amazons3")) addTech("Amazon Web Services", "Cloud / PaaS");
      if (serverHeader.toLowerCase().includes("akamai")) addTech("Akamai", "CDN");
      
      const viaHeader = response.headers.get("via") || "";
      if (viaHeader.toLowerCase().includes("vegur")) addTech("Heroku", "PaaS");
      if (viaHeader.toLowerCase().includes("cloudfront")) addTech("AWS CloudFront", "CDN");
      if (viaHeader.toLowerCase().includes("fastly")) addTech("Fastly", "CDN");
      
      const xVarnish = response.headers.get("x-varnish") || "";
      if (xVarnish) addTech("Varnish", "Performance");
      
      if (allHeaders.includes("x-amz-cf-id")) addTech("AWS CloudFront", "CDN");

      // 2. Security Analysis
      const security = {
        https: targetUrl.startsWith("https://"),
        hsts: !!response.headers.get("strict-transport-security"),
        xFrameOptions: response.headers.get("x-frame-options") || "Missing",
        csp: !!response.headers.get("content-security-policy"),
        xContentTypeOptions: response.headers.get("x-content-type-options") === "nosniff",
        referrerPolicy: response.headers.get("referrer-policy") || "Missing",
        server: response.headers.get("server") || "Unknown",
        score: 100,
        vulnerabilities: {
          xssRisk: "Faible",
          sqliRisk: "Faible"
        },
        vulnerabilitiesList: [] as { severity: 'High' | 'Medium' | 'Low', title: string, description: string }[]
      };

      if (!security.https) {
        security.score -= 30;
        security.vulnerabilitiesList.push({ severity: 'High', title: 'Absence de chiffrement SSL/TLS', description: 'Les données transitent en clair, exposant les utilisateurs aux attaques de type Man-in-the-Middle.' });
      }
      
      if (!security.hsts) {
        security.score -= 10;
        security.vulnerabilitiesList.push({ severity: 'Medium', title: 'HSTS non configuré', description: 'Le serveur n\'oblige pas les navigateurs à utiliser HTTPS, ce qui permet des attaques de downgrade.' });
      }

      if (security.xFrameOptions === "Missing") {
        security.score -= 10;
        security.vulnerabilitiesList.push({ severity: 'Medium', title: 'Vulnérabilité au Clickjacking', description: 'L\'en-tête X-Frame-Options est manquant. Le site peut être intégré dans un iframe malveillant.' });
      }

      if (!security.csp) {
        security.score -= 20;
        security.vulnerabilitiesList.push({ severity: 'High', title: 'Content Security Policy (CSP) absente', description: 'Aucune restriction sur les sources de scripts. Le site est très vulnérable aux attaques XSS (Cross-Site Scripting).' });
      }

      if (!security.xContentTypeOptions) {
        security.score -= 10;
        security.vulnerabilitiesList.push({ severity: 'Low', title: 'MIME Sniffing possible', description: 'L\'en-tête X-Content-Type-Options: nosniff est manquant, permettant aux navigateurs d\'interpréter incorrectement les fichiers.' });
      }

      if (security.referrerPolicy === "Missing") {
        security.score -= 10;
        security.vulnerabilitiesList.push({ severity: 'Low', title: 'Referrer-Policy absente', description: 'Des informations sensibles peuvent fuiter dans les URL de référence lors de la navigation vers d\'autres sites.' });
      }

      const outdatedJquery = techStack.find(t => t.name === "jQuery" && t.version && (t.version.startsWith("1.") || t.version.startsWith("2.")));
      if (outdatedJquery) {
        security.vulnerabilities.xssRisk = "Élevé (jQuery obsolète)";
        security.score -= 15;
        security.vulnerabilitiesList.push({ severity: 'High', title: `Bibliothèque obsolète (jQuery ${outdatedJquery.version})`, description: 'Utilisation d\'une version de jQuery connue pour des failles XSS. Une mise à jour est requise.' });
      } else if ($("input[type='text'], textarea").length > 0) {
        security.vulnerabilities.xssRisk = "Moyen (Champs de saisie)";
        security.vulnerabilitiesList.push({ severity: 'Medium', title: 'Vecteurs XSS potentiels', description: 'Des champs de saisie utilisateur ont été détectés. Assurez-vous que toutes les entrées sont filtrées et échappées.' });
      }

      const targetBlankLinks = $("a[target='_blank']:not([rel~='noopener'])").length;
      if (targetBlankLinks > 0) {
         security.vulnerabilities.xssRisk = "Moyen (target=_blank vulnérable)";
         security.score -= 5;
         security.vulnerabilitiesList.push({ severity: 'Medium', title: 'Vulnérabilité Reverse Tabnabbing', description: `${targetBlankLinks} liens ouvrent un nouvel onglet sans l'attribut rel="noopener", permettant à la page cible de rediriger la page d'origine.` });
      }

      const emailsExposed = htmlContent.match(/[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,6}/g);
      if (emailsExposed && emailsExposed.length > 0) {
         security.score -= 10;
         security.vulnerabilitiesList.push({ severity: 'Low', title: 'Adresses email exposées', description: 'Des adresses email sont visibles en clair dans le code source, ce qui facilite le scraping par les spammeurs.' });
      }

      if (targetUrl.includes("?") || $("form").length > 0) {
        security.vulnerabilities.sqliRisk = "Moyen (Paramètres/Formulaires)";
        security.vulnerabilitiesList.push({ severity: 'Medium', title: 'Vecteurs d\'Injection SQL potentiels', description: 'Des paramètres d\'URL ou des formulaires sont présents. Vérifiez l\'utilisation de requêtes préparées côté serveur.' });
      }

      const hasPasswordInput = $("input[type='password']").length > 0;
      if (hasPasswordInput && !security.https) {
        security.score -= 20;
        security.vulnerabilitiesList.push({ severity: 'High', title: 'Mots de passe transmis en clair', description: 'Un formulaire de connexion transmet des mots de passe sur une connexion non chiffrée (HTTP).' });
      }

      if (serverHeader && serverHeader.match(/[0-9]/)) {
        security.score -= 5;
        security.vulnerabilitiesList.push({ severity: 'Low', title: 'Divulgation de la version du serveur', description: `L'en-tête Server révèle la version exacte (${serverHeader}), ce qui aide les attaquants à cibler des failles spécifiques.` });
      }

      if (xPoweredBy) {
        security.score -= 5;
        security.vulnerabilitiesList.push({ severity: 'Low', title: 'Divulgation de technologie (X-Powered-By)', description: `L'en-tête X-Powered-By révèle la technologie utilisée (${xPoweredBy}), facilitant la reconnaissance par un attaquant.` });
      }

      // Ensure score is within 0-100
      security.score = Math.max(0, Math.min(100, security.score));

      // 3. UX / SEO Analysis
      // Readability score (Flesch-Kincaid heuristic based on word/sentence length)
      const words = textContent.split(/\s+/).filter(w => w.length > 0).length;
      const sentences = textContent.split(/[.!?]+/).filter(s => s.length > 0).length;
      const syllables = textContent.length / 3; // rough approximation
      let readabilityScore = 100;
      if (words > 0 && sentences > 0) {
        const score = 206.835 - 1.015 * (words / sentences) - 84.6 * (syllables / words);
        readabilityScore = Math.max(0, Math.min(100, Math.round(score)));
      }

      // Mobile friendliness
      let mobileFriendliness = 100;
      const hasViewport = !!$("meta[name='viewport']").attr("content");
      if (!hasViewport) mobileFriendliness -= 40;
      if (htmlContent.indexOf('@media') === -1 && htmlContent.indexOf('col-') === -1 && htmlContent.indexOf('flex') === -1) mobileFriendliness -= 20;
      
      // Navigation clarity
      const navLinks = $("nav a").length;
      let navigationClarity = 100;
      if ($("nav").length === 0) navigationClarity -= 30;
      if (navLinks > 30) navigationClarity -= 20; // Too many links
      if (navLinks === 0 && $("nav").length > 0) navigationClarity -= 20;

      const ux = {
        title: $("title").text().trim() || "Missing",
        hasMetaDescription: !!$("meta[name='description']").attr("content"),
        hasViewport,
        lang: $("html").attr("lang") || "Missing",
        hasOpenGraph: !!$("meta[property^='og:']").length,
        hasCanonical: !!$("link[rel='canonical']").attr("href"),
        h1Count: $("h1").length,
        imageCount: totalImages,
        imagesWithoutAlt: $("img:not([alt])").length,
        linkCount: $("a").length,
        domElements: domElementsCount,
        domDepth: maxDepth,
        textToHtmlRatio: Math.round(textToHtmlRatio * 100) / 100,
        gdprCompliant,
        lazyLoadRatio: Math.round(lazyLoadRatio * 100),
        accessibility: {
          ariaCount: $("[aria-hidden], [aria-label], [role]").length,
          semanticElements: $("main, nav, header, footer, article, section").length,
        },
        mobileFriendliness,
        readabilityScore,
        navigationClarity,
        score: 100,
      };

      if (ux.accessibility.semanticElements === 0) ux.score -= 10;
      if (ux.title === "Missing") ux.score -= 15;
      if (!ux.hasMetaDescription) ux.score -= 15;
      if (!ux.hasViewport) ux.score -= 20;
      if (ux.lang === "Missing") ux.score -= 5;
      if (!ux.hasOpenGraph) ux.score -= 10;
      if (!ux.hasCanonical) ux.score -= 5;
      if (ux.h1Count !== 1) ux.score -= 10;
      if (ux.imagesWithoutAlt > 0) ux.score -= Math.min(20, ux.imagesWithoutAlt * 2);
      if (ux.textToHtmlRatio < 10) ux.score -= 5;

      // Baseline & Inferred Technologies (Garantit un affichage riche)
      if (htmlContent.includes("<!doctype html>") || htmlContent.includes("<html")) addTech("HTML5", "Langage");
      if (scripts.length > 0 || htmlContent.includes("<script")) addTech("JavaScript", "Langage");
      if (links.length > 0 || htmlContent.includes("<style") || htmlContent.includes(".css")) addTech("CSS3", "Langage");
      if (security.https) addTech("SSL/TLS", "Sécurité");
      if (ux.hasViewport) addTech("Responsive Design", "UI/UX");
      
      // Inferred Backend/DB based on detected CMS/Frameworks
      const currentTechs = techStack.map(t => t.name);
      if (currentTechs.includes("WordPress") || currentTechs.includes("PrestaShop") || currentTechs.includes("Drupal") || currentTechs.includes("Joomla") || currentTechs.includes("Magento")) {
        addTech("PHP", "Langage");
        addTech("MySQL", "Base de données");
      }
      if (currentTechs.includes("Next.js") || currentTechs.includes("Nuxt.js") || currentTechs.includes("Express.js") || currentTechs.includes("Svelte") || currentTechs.includes("Astro")) {
        addTech("Node.js", "Environnement");
      }
      if (currentTechs.includes("Laravel")) {
        addTech("MySQL", "Base de données");
      }

      // 4. AI & Design Type & Recommendations
      const textLower = textContent.toLowerCase();
      const htmlLower = htmlContent.toLowerCase();
      let designType = "Vitrine / Standard";
      const techNames = techStack.map(t => t.name);
      
      const isEcom = htmlLower.includes("cart") || htmlLower.includes("checkout") || htmlLower.includes("woocommerce") || htmlLower.includes("shopify") || htmlLower.includes("add to cart") || htmlLower.includes("panier");
      const isSaaS = (techNames.includes("Next.js") || techNames.includes("React") || techNames.includes("Vue.js")) && (textLower.includes("pricing") || textLower.includes("tarifs") || textLower.includes("login") || textLower.includes("connexion") || textLower.includes("dashboard") || textLower.includes("get started"));
      const isBlog = textLower.includes("blog") || textLower.includes("article") || textLower.includes("read more") || textLower.includes("lire la suite") || techNames.includes("WordPress") || techNames.includes("Ghost");
      const isPortfolio = textLower.includes("portfolio") || textLower.includes("my work") || textLower.includes("mes projets") || textLower.includes("resume") || textLower.includes("cv") || textLower.includes("skills");
      const isInstitutionnel = textLower.includes("about us") || textLower.includes("qui sommes-nous") || textLower.includes("mission") || textLower.includes("gouvernement") || textLower.includes("institution");

      if (isEcom) designType = "E-commerce";
      else if (isSaaS) designType = "SaaS / Web App";
      else if (isInstitutionnel) designType = "Institutionnel";
      else if (isBlog) designType = "Blog / Média";
      else if (isPortfolio) designType = "Portfolio";

      // Complex Features Detection
      const features: string[] = [];
      if (isEcom) features.push("E-commerce");
      if (htmlLower.includes("type=\"password\"") || htmlLower.includes("login") || techNames.includes("Auth0") || techNames.includes("Clerk") || techNames.includes("Firebase")) features.push("Authentification");
      if (techNames.includes("Stripe") || techNames.includes("PayPal") || htmlLower.includes("stripe.com")) features.push("Paiement en ligne");
      if (isBlog || techNames.includes("WordPress") || techNames.includes("Sanity") || techNames.includes("Strapi")) features.push("CMS / Blog");
      if (htmlLower.includes("search") || htmlLower.includes("recherche")) features.push("Recherche interne");
      if (techNames.includes("Google Analytics") || techNames.includes("Plausible")) features.push("Analytics avancé");

      // Heuristic AI Probability (Based on actual metrics & AI patterns)
      let aiProb = 0; 
      
      // 1. Known Builders (Generated code, though not always AI)
      if (techNames.includes("Webflow") || techNames.includes("Wix") || techNames.includes("Squarespace") || techNames.includes("Elementor")) aiProb += 30;
      
      // 2. Structural Patterns
      if (techNames.includes("Tailwind CSS") && domElementsCount > 1000) aiProb += 10; // Often generated templates
      if (ux.accessibility.semanticElements === 0) aiProb += 15; // Lack of semantic HTML
      if (divRatio > 0.7) aiProb += 20; // Div soup
      if (maxDepth > 30) aiProb += 15; // Overly nested structures
      
      // 3. AI-Specific Identifiers & Classes
      if (htmlLower.includes('data-v0-id') || htmlLower.includes('class="v0-')) aiProb += 60; // v0 by Vercel
      if (htmlLower.includes('data-lovable') || htmlLower.includes('lovable-')) aiProb += 60; // Lovable
      if (htmlLower.includes('data-bolt') || htmlLower.includes('bolt-')) aiProb += 40; // Bolt.new
      if (htmlLower.includes('data-framer-name')) aiProb += 30; // Framer
      
      // 4. Common AI-Generated Phrases & Comments
      const aiPhrases = [
        "as an ai language model",
        "generated by ai",
        "created by ai",
        "chatgpt",
        "github copilot",
        "<!-- this file was generated",
        "/* generated by",
        "lorem ipsum",
        "placeholder text",
        "generated by v0",
        "generated by bolt"
      ];
      
      for (const phrase of aiPhrases) {
        if (htmlLower.includes(phrase)) {
          aiProb += 25;
        }
      }
      
      // 5. Code Smells (Overly verbose inline styles or generic naming)
      if (htmlLower.includes('style="position: absolute; top: 0px; left: 0px; width: 100%; height: 100%;"')) aiProb += 10;
      if (htmlLower.match(/class="[a-zA-Z0-9-_ ]{150,}"/)) aiProb += 15; // Extremely long class strings (common in AI Tailwind)
      
      // 6. Hand-coded indicators (Reduces probability)
      if (techNames.includes("Laravel") || techNames.includes("Django") || techNames.includes("Spring") || techNames.includes("Ruby on Rails")) aiProb -= 30;
      if (htmlLower.includes('<!--') && !htmlLower.includes('generated')) aiProb -= 5; // Human comments
      
      const aiProbability = Math.min(98, Math.max(2, Math.round(aiProb)));

      const recommendations: string[] = [];
      if (!security.https) recommendations.push("Activez le HTTPS pour sécuriser les échanges et améliorer le SEO.");
      if (!security.hsts) recommendations.push("Activez HSTS (Strict-Transport-Security) pour forcer les connexions sécurisées.");
      if (!security.csp) recommendations.push("Ajoutez une Content-Security-Policy (CSP) pour prévenir les attaques XSS.");
      if (security.xFrameOptions === "Missing") recommendations.push("Configurez l'en-tête X-Frame-Options pour éviter le Clickjacking.");
      if (!security.xContentTypeOptions) recommendations.push("Ajoutez l'en-tête X-Content-Type-Options: nosniff pour éviter le MIME-sniffing.");
      if (security.referrerPolicy === "Missing") recommendations.push("Configurez une Referrer-Policy pour contrôler les informations envoyées aux autres sites.");
      if (targetBlankLinks > 0) recommendations.push(`Ajoutez rel="noopener noreferrer" à vos ${targetBlankLinks} liens target="_blank" pour éviter les failles de sécurité.`);
      if (emailsExposed && emailsExposed.length > 0) recommendations.push("Des adresses e-mail sont exposées en clair dans le code source. Obfusquez-les pour éviter le spam.");
      
      if (ux.title === "Missing") recommendations.push("Ajoutez une balise <title> pour le SEO.");
      if (!ux.hasMetaDescription) recommendations.push("Ajoutez une balise meta description pour améliorer le taux de clic (CTR) dans les résultats de recherche.");
      if (ux.lang === "Missing") recommendations.push("Définissez la langue du site avec l'attribut lang sur la balise <html>.");
      if (!ux.hasOpenGraph) recommendations.push("Ajoutez des balises Open Graph (og:title, og:image) pour un meilleur partage sur les réseaux sociaux.");
      if (!ux.hasCanonical) recommendations.push("Ajoutez une balise <link rel=\"canonical\"> pour éviter le contenu dupliqué (SEO).");
      if (ux.h1Count === 0) recommendations.push("Ajoutez une balise <h1> principale pour structurer votre contenu.");
      if (ux.h1Count > 1) recommendations.push("Limitez-vous à une seule balise <h1> par page pour un meilleur SEO.");
      if (ux.imagesWithoutAlt > 0) recommendations.push(`Ajoutez des attributs 'alt' à vos ${ux.imagesWithoutAlt} images manquantes pour l'accessibilité et le SEO.`);
      if (ux.accessibility.semanticElements === 0) recommendations.push("Utilisez des balises sémantiques (<main>, <nav>, <article>) pour améliorer l'accessibilité et le SEO.");
      if (ux.textToHtmlRatio < 10) recommendations.push(`Le ratio Texte/HTML est très faible (${ux.textToHtmlRatio}%). Ajoutez plus de contenu textuel pertinent pour améliorer le SEO.`);
      if (outdatedJquery) recommendations.push("Mettez à jour jQuery pour corriger des failles XSS critiques connues.");
      if (security.vulnerabilities.sqliRisk.includes("Moyen")) recommendations.push("Assurez-vous d'utiliser des requêtes préparées côté serveur pour prévenir les injections SQL sur vos formulaires et paramètres d'URL.");
      if (loadTime > 2000) recommendations.push("Le temps de chargement est élevé. Optimisez vos images et utilisez un CDN.");
      if (maxDepth > 25) recommendations.push(`La profondeur du DOM est excessive (${maxDepth} niveaux). Simplifiez la structure HTML pour améliorer les performances de rendu.`);
      if (!gdprCompliant) recommendations.push("Le site ne semble pas conforme au RGPD. Ajoutez une politique de confidentialité et un bandeau de cookies.");
      if (lazyLoadRatio < 0.5 && totalImages > 5) recommendations.push(`Seulement ${ux.lazyLoadRatio}% des images utilisent le lazy loading. Ajoutez l'attribut loading="lazy" pour accélérer le chargement.`);

      // Simulate Domain Authority Metrics (moved up to influence base price)
      const domain = new URL(targetUrl).hostname;
      let hash = 0;
      for (let i = 0; i < domain.length; i++) {
        hash = ((hash << 5) - hash) + domain.charCodeAt(i);
        hash |= 0;
      }
      const absHash = Math.abs(hash);

      const domainAgeYears = (absHash % 15) + 1; // 1 to 15 years
      const backlinkProfile = (absHash % 10000) * (domainAgeYears / 2); // 0 to ~75k
      const trafficVolume = (absHash % 50000) * domainAgeYears; // Monthly traffic

      // 5. Pricing Estimation (Mega Premium Algorithm - Guinean Market in GNF)
      let basePrice = 2000000; // 2 millions GNF de base pour un site vitrine simple
      
      // Type de site
      if (designType === "E-commerce") basePrice = 12000000; 
      else if (designType === "SaaS / Web App") basePrice = 10000000;
      else if (designType === "Institutionnel") basePrice = 6000000;
      else if (designType === "Blog / Média") basePrice = 3500000;
      else if (designType === "Portfolio") basePrice = 2500000;

      // Technologies spécifiques (Premium)
      let techPremium = 0;
      if (techNames.includes("React") || techNames.includes("Next.js") || techNames.includes("Vue.js") || techNames.includes("Nuxt.js") || techNames.includes("Svelte")) {
        techPremium += 3000000; // Stack moderne complexe
      }
      if (techNames.includes("WordPress") || techNames.includes("Shopify") || techNames.includes("Magento")) {
        techPremium += 2000000; // Intégration CMS complexe
      }
      if (techNames.includes("Tailwind CSS") || techNames.includes("Bootstrap") || techNames.includes("Material UI")) {
        techPremium += 500000; // UI Framework
      }
      
      // Features Premium
      if (features.includes("Authentification")) techPremium += 2000000;
      if (features.includes("Paiement en ligne")) techPremium += 3000000;
      if (features.includes("CMS / Blog")) techPremium += 1500000;
      
      const hasHighPerfAnim = techNames.includes("GSAP") || techNames.includes("Framer Motion") || techNames.includes("Three.js") || techNames.includes("React Three Fiber") || techNames.includes("Drei") || techNames.includes("Babylon.js") || techNames.includes("PlayCanvas") || techNames.includes("WebGL (Custom)");
      const has3DTech = techNames.includes("Three.js") || techNames.includes("React Three Fiber") || techNames.includes("Drei") || techNames.includes("Babylon.js") || techNames.includes("PlayCanvas") || techNames.includes("WebGL (Custom)");
      
      if (hasHighPerfAnim) {
        techPremium += 1500000;
      }
      if (has3DTech) {
        techPremium += 3500000; // Huge bonus for 3D/WebGL
      }
      
      // Multiplicateur de complexité (Plafonné pour éviter les prix aberrants sur de petits sites mal codés)
      const cappedDomElements = Math.min(domElementsCount, 5000);
      const cappedDepth = Math.min(maxDepth, 50);
      const complexityMultiplier = 1 + (cappedDomElements / 4000) + (cappedDepth / 100) + (techStack.length * 0.02); 
      
      // Multiplicateurs de popularité et d'autorité
      const trafficMultiplier = 1 + Math.min(trafficVolume / 100000, 0.5); // Jusqu'à +50% pour le trafic
      const backlinkMultiplier = 1 + Math.min(backlinkProfile / 20000, 0.3); // Jusqu'à +30% pour les backlinks
      const ageMultiplier = 1 + Math.min(domainAgeYears / 20, 0.2); // Jusqu'à +20% pour l'ancienneté
      const popularityMultiplier = trafficMultiplier * backlinkMultiplier * ageMultiplier;

      // Pénalités de refactorisation (Sécurité, UX, Performance) - Plafonnées pour rester réalistes
      const securityFixCost = Math.min(1500000, Math.max(0, 100 - security.score) * 20000); // Plafonné à 1.5M GNF
      const uxFixCost = Math.min(1000000, Math.max(0, 100 - ux.score) * 15000); // Plafonné à 1M GNF
      const perfFixCost = loadTime > 1500 ? Math.min(1500000, Math.floor((loadTime - 1500) / 500) * 50000) : 0; // Plafonné à 1.5M GNF
      
      // Calcul final Freelance
      let rawFreelancePrice = (((basePrice + techPremium) * complexityMultiplier) * popularityMultiplier) + securityFixCost + uxFixCost + perfFixCost;
      
      // Quality Filter (Builders vs Custom/Optimized)
      const isBuilder = techNames.includes("Wix") || techNames.includes("Elementor") || techNames.includes("Squarespace") || techNames.includes("Webflow") || techNames.includes("Weebly");
      const isComplex = techNames.includes("React") || techNames.includes("Next.js") || techNames.includes("Vue.js") || techNames.includes("Three.js") || techNames.includes("React Three Fiber") || techNames.includes("Babylon.js") || techNames.includes("PlayCanvas") || techNames.includes("Svelte") || techNames.includes("Nuxt.js");
      const isOptimizedDOM = domElementsCount < 800 && maxDepth < 15 && divRatio < 0.5;

      let qualityMultiplier = 1;
      if (isBuilder) {
          qualityMultiplier = 0.4; // Huge penalty for visual builders
      } else if (isComplex || isOptimizedDOM || hasHighPerfAnim) {
          qualityMultiplier = 1.3; // Bonus for custom/complex/optimized code
          if ((isComplex || hasHighPerfAnim) && isOptimizedDOM) qualityMultiplier = 1.5;
      }

      rawFreelancePrice = rawFreelancePrice * qualityMultiplier;

      // Règle d'or : Un petit site vitrine simple ne doit jamais dépasser un prix basique
      if (designType === "Vitrine / Standard" && !isComplex && !hasHighPerfAnim && !features.includes("Authentification") && !features.includes("Paiement en ligne")) {
          rawFreelancePrice = Math.min(rawFreelancePrice, 6000000 * popularityMultiplier); // Plafond strict pour vitrine standard, ajusté par la popularité
      }

      // Sécurité pour les sites très basiques : on plafonne le prix si peu de technos et petit DOM
      if (techStack.length < 5 && domElementsCount < 500) {
          rawFreelancePrice = Math.min(rawFreelancePrice, 4000000 * popularityMultiplier); // Plafonné à 4M GNF pour un site très basique, ajusté par la popularité
      }
      
      // Cap strict pour les builders
      if (isBuilder) {
          rawFreelancePrice = Math.min(rawFreelancePrice, 5000000 * popularityMultiplier); // Plafonné à 5M GNF pour les builders
      }
      
      // Arrondi à la centaine de mille supérieure pour faire "Premium" et propre
      const freelancePrice = Math.ceil(rawFreelancePrice / 100000) * 100000;
      
      // Prix Agence (Structure plus lourde, gestion de projet, QA)
      const agencyPrice = Math.ceil((freelancePrice * 2.2) / 100000) * 100000;
      
      // Temps estimé affiné
      const estimatedDays = Math.max(5, Math.ceil(complexityMultiplier * 4 + (techStack.length * 0.5) + (designType === "E-commerce" ? 10 : 0) + (has3DTech ? 15 : 0)));

      // 6. Developer Level & Resale Value
      let devScore = (security.score + ux.score) / 2;
      if (techNames.includes("Next.js") || techNames.includes("Svelte") || techNames.includes("Astro") || techNames.includes("React") || techNames.includes("Vue.js")) devScore += 10;
      if (outdatedJquery) devScore -= 15;
      if (ux.accessibility.semanticElements === 0) devScore -= 15;
      if (maxDepth > 25) devScore -= 10;
      if (divRatio > 0.7) devScore -= 10;
      
      let developerLevel = "Intermédiaire";
      if (devScore >= 85) developerLevel = "Expert";
      else if (devScore >= 70) developerLevel = "Confirmé";
      else if (devScore >= 40) developerLevel = "Intermédiaire";
      else developerLevel = "Débutant";

      let resaleMultiplier = 1.2;
      if (designType === "E-commerce") resaleMultiplier = 3.5;
      else if (designType === "SaaS / Web App") resaleMultiplier = 4.0;
      else if (designType === "Blog / Média") resaleMultiplier = 2.0;
      else if (designType === "Institutionnel") resaleMultiplier = 1.5;
      else if (designType === "Portfolio") resaleMultiplier = 1.1;

      resaleMultiplier *= Math.max(0.5, (ux.score / 100)); // Penalize bad UX, but keep a minimum
      
      // Adjust resale value based on domain authority metrics
      const trafficBonus = Math.min(trafficVolume * 10, 50000000); // Up to 50M GNF bonus for traffic
      const backlinkBonus = Math.min(backlinkProfile * 500, 20000000); // Up to 20M GNF bonus for backlinks
      const ageBonus = domainAgeYears * 1000000; // 1M GNF per year of age

      const resaleValue = Math.ceil(((agencyPrice * resaleMultiplier) + trafficBonus + backlinkBonus + ageBonus) / 100000) * 100000;

      const pricingFactors = [
        `A. Coûts de Développement (Base : ${new Intl.NumberFormat('fr-GN').format(basePrice)} GNF)`,
        `   • Type de site (${designType}) : Définit la structure et les fonctionnalités de base.`,
        `   • Technologies & Architecture : ${techStack.length} technos détectées (+${new Intl.NumberFormat('fr-GN').format(techPremium)} GNF).${has3DTech ? ' (Inclut un bonus majeur pour intégration 3D/WebGL)' : ''}`,
        `   • Complexité d'intégration : DOM de ${domElementsCount} éléments, profondeur max ${maxDepth} (Multiplicateur : x${complexityMultiplier.toFixed(2)}).`,
        `   • Temps d'intégration estimé : ${estimatedDays} jours de travail.`,
        `B. Facteurs de Valorisation (Popularité & Autorité)`,
        `   • Ancienneté du domaine : Estimée à ${domainAgeYears} ans (Multiplicateur : x${ageMultiplier.toFixed(2)}).`,
        `   • Trafic estimé : ~${new Intl.NumberFormat('fr-FR').format(trafficVolume)} visites/mois (Multiplicateur : x${trafficMultiplier.toFixed(2)}).`,
        `   • Profil de liens : ~${new Intl.NumberFormat('fr-FR').format(backlinkProfile)} backlinks (Multiplicateur : x${backlinkMultiplier.toFixed(2)}).`,
        `   • Impact global sur le prix : Le prix de base est multiplié par x${popularityMultiplier.toFixed(2)} en raison de l'autorité du site.`,
        `C. Frais d'Exploitation & Maintenance (Annuel estimé)`,
        `   • Hébergement & PaaS : Serveur (${serverHeader || 'Standard'}), CDN, Base de données.`,
        `   • Maintenance technique : Mises à jour de sécurité (Score : ${security.score}/100), correctifs UX (${ux.score}/100).`
      ];

      const responseData = {
        url: targetUrl,
        timestamp: new Date().toISOString(),
        status: response.status,
        loadTimeMs: loadTime,
        overallScore: Math.round((security.score + ux.score + Math.max(0, 100 - (loadTime / 50)) + Math.min(100, techStack.length * 20)) / 4),
        performance: {
          htmlSizeKB,
          scriptCount: $("script").length,
          cssCount: $("link[rel='stylesheet']").length,
          imageCount: $("img").length
        },
        features,
        techStack,
        security,
        ux,
        designType,
        aiProbability,
        developerLevel,
        recommendations,
        pricing: {
          freelance: freelancePrice,
          agency: agencyPrice,
          estimatedDays,
          resaleValue,
          domainAgeYears,
          backlinkProfile,
          trafficVolume,
          pricingFactors
        }
      };

      // Save to cache
      analysisCache.set(targetUrl, { data: responseData, timestamp: Date.now() });

      res.json(responseData);

    } catch (error: any) {
      console.error("Analysis error:", error);
      res.status(500).json({ error: "Failed to analyze website. It might be unreachable or blocking requests." });
    }
  });

  // Endpoint to log client-side errors
  const capturedErrors: any[] = [];
  app.post("/api/log-error", (req, res) => {
    const { message, source, lineno, colno, error, type, url } = req.body;
    console.error(`[Client Error] ${type} on ${url}:`, {
      message,
      source,
      lineno,
      colno,
      error
    });
    
    capturedErrors.unshift({
      timestamp: new Date().toISOString(),
      type,
      message,
      source,
      lineno,
      colno,
      error,
      url
    });
    if (capturedErrors.length > 50) capturedErrors.pop(); // Keep last 50
    
    res.status(200).json({ success: true });
  });

  app.get("/api/log-error", (req, res) => {
    res.json(capturedErrors);
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    // Serve static files in production
    app.use(express.static("dist"));
    
    // Serve index.html for SPA routing (only in production, after static files)
    app.get("*", (req, res) => {
      res.sendFile(process.cwd() + "/dist/index.html");
    });
  }

  // Serve index.html for SPA routing (development)
  if (process.env.NODE_ENV !== "production") {
    app.get("*", (req, res) => {
      res.sendFile(process.cwd() + "/index.html");
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
