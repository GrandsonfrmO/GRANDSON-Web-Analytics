// API de comparaison de deux sites web
// Importe directement la fonction d'analyse depuis analyze.js
import analyzeHandler from './analyze.js';

// Fonction helper pour simuler une requête/réponse et extraire les données
async function getAnalysisData(url) {
  return new Promise((resolve, reject) => {
    const mockReq = {
      method: 'POST',
      body: { url }
    };

    const mockRes = {
      statusCode: 200,
      headers: {},
      data: null,
      setHeader(key, value) {
        this.headers[key] = value;
        return this;
      },
      status(code) {
        this.statusCode = code;
        return this;
      },
      json(data) {
        this.data = data;
        if (this.statusCode === 200) {
          resolve(data);
        } else {
          reject(new Error(data.error || 'Analysis failed'));
        }
        return this;
      }
    };

    analyzeHandler(mockReq, mockRes).catch(reject);
  });
}

export default async function handler(req, res) {
  res.setHeader('Content-Type', 'application/json');

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { url1, url2 } = req.body;

    if (!url1 || !url2) {
      return res.status(400).json({ error: 'Two URLs are required' });
    }

    if (typeof url1 !== 'string' || typeof url2 !== 'string') {
      return res.status(400).json({ error: 'URLs must be strings' });
    }

    // Analyser les deux sites en parallèle
    const [result1, result2] = await Promise.all([
      getAnalysisData(url1),
      getAnalysisData(url2)
    ]);

    // Calculer les différences et comparaisons
    const comparison = {
      site1: {
        url: result1.url,
        name: new URL(result1.url).hostname,
        data: result1
      },
      site2: {
        url: result2.url,
        name: new URL(result2.url).hostname,
        data: result2
      },
      comparison: {
        // Scores
        scores: {
          overall: {
            site1: result1.overallScore,
            site2: result2.overallScore,
            winner: result1.overallScore > result2.overallScore ? 'site1' : result1.overallScore < result2.overallScore ? 'site2' : 'tie',
            difference: Math.abs(result1.overallScore - result2.overallScore)
          },
          security: {
            site1: result1.security.score,
            site2: result2.security.score,
            winner: result1.security.score > result2.security.score ? 'site1' : result1.security.score < result2.security.score ? 'site2' : 'tie',
            difference: Math.abs(result1.security.score - result2.security.score)
          },
          ux: {
            site1: result1.ux.score,
            site2: result2.ux.score,
            winner: result1.ux.score > result2.ux.score ? 'site1' : result1.ux.score < result2.ux.score ? 'site2' : 'tie',
            difference: Math.abs(result1.ux.score - result2.ux.score)
          },
          performance: {
            site1: result1.performance.performanceScore || 0,
            site2: result2.performance.performanceScore || 0,
            winner: (result1.performance.performanceScore || 0) > (result2.performance.performanceScore || 0) ? 'site1' : 
                    (result1.performance.performanceScore || 0) < (result2.performance.performanceScore || 0) ? 'site2' : 'tie',
            difference: Math.abs((result1.performance.performanceScore || 0) - (result2.performance.performanceScore || 0))
          }
        },

        // Technologies
        technologies: {
          site1Only: result1.techStack.filter(t1 => 
            !result2.techStack.some(t2 => t2.name === t1.name)
          ),
          site2Only: result2.techStack.filter(t2 => 
            !result1.techStack.some(t1 => t1.name === t2.name)
          ),
          common: result1.techStack.filter(t1 => 
            result2.techStack.some(t2 => t2.name === t1.name)
          ),
          site1Count: result1.techStack.length,
          site2Count: result2.techStack.length
        },

        // Performance
        performance: {
          loadTime: {
            site1: result1.loadTimeMs,
            site2: result2.loadTimeMs,
            winner: result1.loadTimeMs < result2.loadTimeMs ? 'site1' : result1.loadTimeMs > result2.loadTimeMs ? 'site2' : 'tie',
            difference: Math.abs(result1.loadTimeMs - result2.loadTimeMs)
          },
          htmlSize: {
            site1: result1.performance.htmlSizeKB,
            site2: result2.performance.htmlSizeKB,
            winner: result1.performance.htmlSizeKB < result2.performance.htmlSizeKB ? 'site1' : 
                    result1.performance.htmlSizeKB > result2.performance.htmlSizeKB ? 'site2' : 'tie',
            difference: Math.abs(result1.performance.htmlSizeKB - result2.performance.htmlSizeKB)
          },
          scripts: {
            site1: result1.performance.scriptCount,
            site2: result2.performance.scriptCount,
            difference: Math.abs(result1.performance.scriptCount - result2.performance.scriptCount)
          },
          images: {
            site1: result1.performance.imageCount,
            site2: result2.performance.imageCount,
            difference: Math.abs(result1.performance.imageCount - result2.performance.imageCount)
          }
        },

        // Sécurité
        security: {
          site1: {
            https: result1.security.https,
            hsts: result1.security.hsts,
            csp: result1.security.csp,
            vulnerabilities: result1.security.vulnerabilitiesList?.length || 0
          },
          site2: {
            https: result2.security.https,
            hsts: result2.security.hsts,
            csp: result2.security.csp,
            vulnerabilities: result2.security.vulnerabilitiesList?.length || 0
          }
        },

        // Développeur
        developer: {
          site1: {
            level: result1.developerLevel,
            score: result1.developerScore
          },
          site2: {
            level: result2.developerLevel,
            score: result2.developerScore
          },
          winner: result1.developerScore > result2.developerScore ? 'site1' : 
                  result1.developerScore < result2.developerScore ? 'site2' : 'tie'
        },

        // IA Probability
        ai: {
          site1: result1.aiProbability,
          site2: result2.aiProbability,
          moreLikelyAI: result1.aiProbability > result2.aiProbability ? 'site1' : 
                        result1.aiProbability < result2.aiProbability ? 'site2' : 'tie'
        },

        // Prix
        pricing: {
          site1: {
            freelance: result1.pricing.freelance,
            agency: result1.pricing.agency,
            days: result1.pricing.estimatedDays
          },
          site2: {
            freelance: result2.pricing.freelance,
            agency: result2.pricing.agency,
            days: result2.pricing.estimatedDays
          },
          difference: {
            freelance: Math.abs(result1.pricing.freelance - result2.pricing.freelance),
            agency: Math.abs(result1.pricing.agency - result2.pricing.agency),
            days: Math.abs(result1.pricing.estimatedDays - result2.pricing.estimatedDays)
          }
        },

        // Features
        features: {
          site1Only: result1.features.filter(f1 => !result2.features.includes(f1)),
          site2Only: result2.features.filter(f2 => !result1.features.includes(f2)),
          common: result1.features.filter(f1 => result2.features.includes(f1))
        },

        // Recommandations
        recommendations: {
          site1Critical: result1.recommendations.filter(r => r.priority === 'critical').length,
          site2Critical: result2.recommendations.filter(r => r.priority === 'critical').length,
          site1High: result1.recommendations.filter(r => r.priority === 'high').length,
          site2High: result2.recommendations.filter(r => r.priority === 'high').length,
          site1Total: result1.recommendations.length,
          site2Total: result2.recommendations.length
        },

        // Résumé
        summary: {
          winner: determineOverallWinner(result1, result2),
          strengths: {
            site1: getStrengths(result1),
            site2: getStrengths(result2)
          },
          weaknesses: {
            site1: getWeaknesses(result1),
            site2: getWeaknesses(result2)
          }
        }
      }
    };

    return res.status(200).json(comparison);

  } catch (error) {
    console.error('Comparison error:', error);
    return res.status(400).json({ 
      error: error.message || 'Failed to compare websites' 
    });
  }
}

// Déterminer le gagnant global
function determineOverallWinner(result1, result2) {
  let site1Points = 0;
  let site2Points = 0;

  // Score global
  if (result1.overallScore > result2.overallScore) site1Points++;
  else if (result2.overallScore > result1.overallScore) site2Points++;

  // Sécurité
  if (result1.security.score > result2.security.score) site1Points++;
  else if (result2.security.score > result1.security.score) site2Points++;

  // Performance
  if (result1.loadTimeMs < result2.loadTimeMs) site1Points++;
  else if (result2.loadTimeMs < result1.loadTimeMs) site2Points++;

  // UX
  if (result1.ux.score > result2.ux.score) site1Points++;
  else if (result2.ux.score > result1.ux.score) site2Points++;

  // Développeur
  if (result1.developerScore > result2.developerScore) site1Points++;
  else if (result2.developerScore > result1.developerScore) site2Points++;

  if (site1Points > site2Points) return 'site1';
  if (site2Points > site1Points) return 'site2';
  return 'tie';
}

// Identifier les forces d'un site
function getStrengths(result) {
  const strengths = [];
  
  if (result.security.score >= 80) strengths.push('Excellente sécurité');
  if (result.ux.score >= 80) strengths.push('UX/SEO optimal');
  if (result.loadTimeMs < 1000) strengths.push('Très rapide');
  if (result.developerScore >= 70) strengths.push('Code de qualité');
  if (result.techStack.length >= 8) strengths.push('Stack technique riche');
  if (result.aiProbability < 30) strengths.push('Développement humain');
  if (result.performance.performanceScore >= 80) strengths.push('Performance excellente');
  
  return strengths;
}

// Identifier les faiblesses d'un site
function getWeaknesses(result) {
  const weaknesses = [];
  
  if (!result.security.https) weaknesses.push('Pas de HTTPS');
  if (result.security.score < 50) weaknesses.push('Sécurité faible');
  if (result.ux.score < 50) weaknesses.push('UX/SEO à améliorer');
  if (result.loadTimeMs > 3000) weaknesses.push('Temps de chargement lent');
  if (result.developerScore < 40) weaknesses.push('Qualité de code faible');
  if (result.aiProbability > 70) weaknesses.push('Probablement généré par IA');
  if (result.recommendations.filter(r => r.priority === 'critical').length > 0) {
    weaknesses.push('Problèmes critiques détectés');
  }
  
  return weaknesses;
}
