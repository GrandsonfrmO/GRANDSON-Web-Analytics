// NOUVELLE ANALYSE DE SÉCURITÉ AMÉLIORÉE - À intégrer dans api/analyze.js

  // === ANALYSE DE SÉCURITÉ ULTRA-AVANCÉE V2 ===
  const vulnerabilities = [];
  const vulnerabilitiesList = [];
  
  // Catégories de tests de sécurité avec scoring détaillé
  const securityTests = {
    transport: { score: 0, max: 25, tests: [], passed: 0, failed: 0 },
    headers: { score: 0, max: 30, tests: [], passed: 0, failed: 0 },
    content: { score: 0, max: 20, tests: [], passed: 0, failed: 0 },
    cookies: { score: 0, max: 10, tests: [], passed: 0, failed: 0 },
    vulnerabilities: { score: 0, max: 15, tests: [], passed: 0, failed: 0 }
  };
  
  // ========== 1. SÉCURITÉ DU TRANSPORT (25 points) ==========
  
  // 1.1 HTTPS/TLS (15 points)
  if (!https) {
    vulnerabilities.push({ severity: 'critical', issue: 'Pas de HTTPS', impact: 'Données non chiffrées' });
    vulnerabilitiesList.push({ 
      severity: 'High', 
      title: 'HTTPS non activé', 
      description: 'Le site n\'utilise pas HTTPS. Toutes les données transitent en clair et peuvent être interceptées par des attaquants (attaque Man-in-the-Middle).',
      cve: 'CWE-319',
      risk: 'Critique',
      remediation: 'Obtenez un certificat SSL/TLS gratuit via Let\'s Encrypt'
    });
    securityTests.transport.tests.push({ name: 'HTTPS', passed: false, points: 0, max: 15 });
    securityTests.transport.failed++;
  } else {
    securityTests.transport.score += 15;
    securityTests.transport.tests.push({ name: 'HTTPS', passed: true, points: 15, max: 15 });
    securityTests.transport.passed++;
  }
  
  // 1.2 HSTS (10 points)
  if (!securityHeaders.strictTransportSecurity && https) {
    vulnerabilities.push({ severity: 'high', issue: 'HSTS manquant', impact: 'Vulnérable aux attaques downgrade' });
    vulnerabilitiesList.push({ 
      severity: 'Medium', 
      title: 'HSTS manquant', 
      description: 'Le header Strict-Transport-Security n\'est pas configuré. Le site est vulnérable aux attaques de rétrogradation SSL stripping.',
      cve: 'CWE-523',
      risk: 'Moyen',
      remediation: 'Ajoutez: Strict-Transport-Security: max-age=63072000; includeSubDomains; preload'
    });
    securityTests.transport.tests.push({ name: 'HSTS', passed: false, points: 0, max: 10 });
    securityTests.transport.failed++;
  } else if (securityHeaders.strictTransportSecurity && https) {
    const hstsValue = securityHeaders.strictTransportSecurity.toLowerCase();
    const maxAge = hstsValue.match(/max-age=(\d+)/);
    const includeSubDomains = hstsValue.includes('includesubdomains');
    const preload = hstsValue.includes('preload');
    
    let hstsPoints = 5;
    if (maxAge && parseInt(maxAge[1]) >= 31536000) hstsPoints += 2;
    else {
      vulnerabilitiesList.push({ 
        severity: 'Low', 
        title: 'HSTS avec durée courte', 
        description: `HSTS configuré avec max-age=${maxAge ? maxAge[1] : '0'}s. Recommandé: 63072000s (2 ans)`
      });
    }
    if (includeSubDomains) hstsPoints += 2;
    if (preload) hstsPoints += 1;
    
    securityTests.transport.score += hstsPoints;
    securityTests.transport.tests.push({ name: 'HSTS', passed: true, points: hstsPoints, max: 10 });
    securityTests.transport.passed++;
  }
  
  // ... (reste du code de sécurité - voir SECURITY_IMPROVEMENTS.md pour le code complet)
