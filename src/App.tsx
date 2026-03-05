import React, { useState } from 'react';
import { 
  Search, Loader2, Globe, Shield, Layout, DollarSign, 
  Code2, AlertTriangle, CheckCircle2, Bot, Lightbulb, 
  ChevronRight, Activity, Zap, Layers, BarChart2,
  Box, Server, Palette, FileCode, Cpu, LayoutTemplate, Info, History, Clock,
  Type, Image as ImageIcon, Link as LinkIcon, Bug, Award, TrendingUp, Gauge
} from 'lucide-react';
import { Analytics } from '@vercel/analytics/react';
import { cn } from './utils';
import { motion } from 'motion/react';
import { LoadingAnimation } from './components/LoadingAnimation';
import { ResultsGrid } from './components/ResultsGrid';
import { InfiniteScroll } from './components/InfiniteScroll';
import { Tabs } from './components/Tabs';
import {
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  LineChart,
  Line,
  AreaChart,
  Area,
  CartesianGrid,
  Cell
} from 'recharts';

interface AnalysisResult {
  url: string;
  timestamp: string;
  status: number;
  loadTimeMs: number;
  performance: {
    htmlSizeKB: number;
    scriptCount: number;
    cssCount: number;
    imageCount: number;
  };
  features: string[];
  techStack: { name: string; version?: string; category: string }[];
  security: {
    https: boolean;
    hsts: boolean;
    xFrameOptions: string;
    csp: boolean;
    xContentTypeOptions: boolean;
    referrerPolicy: string;
    server: string;
    score: number;
    vulnerabilities: {
      xssRisk: string;
      sqliRisk: string;
    };
    vulnerabilitiesList: {
      severity: 'High' | 'Medium' | 'Low';
      title: string;
      description: string;
    }[];
  };
  ux: {
    title: string;
    hasMetaDescription: boolean;
    hasViewport: boolean;
    lang: string;
    hasOpenGraph: boolean;
    hasCanonical: boolean;
    h1Count: number;
    imageCount: number;
    imagesWithoutAlt: number;
    linkCount: number;
    domElements: number;
    domDepth: number;
    textToHtmlRatio: number;
    gdprCompliant: boolean;
    lazyLoadRatio: number;
    accessibility: {
      ariaCount: number;
      semanticElements: number;
    };
    mobileFriendliness: number;
    readabilityScore: number;
    navigationClarity: number;
    score: number;
  };
  designType: string;
  aiProbability: number;
  developerLevel: string;
  recommendations: string[];
  overallScore: number;
  pricing: {
    freelance: number;
    agency: number;
    estimatedDays: number;
    resaleValue: number;
    domainAgeYears: number;
    backlinkProfile: number;
    trafficVolume: number;
    pricingFactors: string[];
  };
}

const CustomRadarTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="bg-slate-800 p-3 rounded-xl border border-slate-700 shadow-xl max-w-[200px] text-white">
        <p className="font-bold text-slate-100 text-sm mb-1">{data.subject}</p>
        <p className="text-amber-400 font-black text-lg mb-2">{Math.round(data.A)}<span className="text-xs text-slate-400 font-medium">/100</span></p>
        <p className="text-xs text-slate-300 leading-relaxed">{data.description}</p>
      </div>
    );
  }
  return null;
};

export default function App() {
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [history, setHistory] = useState<AnalysisResult[]>([]);
  const [showAutocomplete, setShowAutocomplete] = useState(false);

  const [clientErrors, setClientErrors] = useState<any[]>([]);
  const searchContainerRef = React.useRef<HTMLDivElement>(null);

  const fetchClientErrors = async () => {
    try {
      const res = await fetch('/api/log-error');
      if (res.ok) {
        const data = await res.json();
        setClientErrors(data);
      }
    } catch (e) {
      console.error("Failed to fetch client errors", e);
    }
  };

  React.useEffect(() => {
    const saved = localStorage.getItem('webAnalyzerHistory');
    if (saved) {
      try { setHistory(JSON.parse(saved)); } catch (e) {}
    }
    fetchClientErrors();
  }, []);

  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(event.target as Node)) {
        setShowAutocomplete(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const uniqueHistoryUrls = React.useMemo(() => {
    return (Array.from(new Set(history.map(h => h.url))) as string[])
      .filter(hUrl => hUrl.toLowerCase().includes(url.toLowerCase()) && hUrl !== url)
      .slice(0, 5);
  }, [history, url]);

  const historyData = React.useMemo(() => {
    if (!result) return [];
    return history.filter(h => h.url === result.url).reverse();
  }, [history, result]);

  const radarData = React.useMemo(() => {
    if (!result) return { data: [], best: null, worst: null };
    const data = [
      { subject: 'Sécurité', A: result.security.score, fullMark: 100, description: 'Protection contre les vulnérabilités et configurations serveurs.' },
      { subject: 'UX/SEO', A: result.ux.score, fullMark: 100, description: 'Qualité de l\'expérience utilisateur et optimisation pour les moteurs de recherche.' },
      { subject: 'Perf', A: Math.max(0, 100 - (result.loadTimeMs / 50)), fullMark: 100, description: 'Vitesse de chargement et réactivité globale du site.' },
      { subject: 'Tech', A: Math.min(100, result.techStack.length * 20), fullMark: 100, description: 'Modernité et richesse des technologies utilisées.' },
    ];
    
    const best = data.reduce((max, p) => p.A > max.A ? p : max, data[0]);
    const worst = data.reduce((min, p) => p.A < min.A ? p : min, data[0]);
    
    return { data, best, worst };
  }, [result]);

  const domData = React.useMemo(() => {
    if (!result) return [];
    return [{ name: 'DOM', value: result.ux.domElements }];
  }, [result]);

  const handleAnalyze = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url) return;

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      let targetUrl = url;
      if (!targetUrl.startsWith('http://') && !targetUrl.startsWith('https://')) {
        targetUrl = 'https://' + targetUrl;
      }
      new URL(targetUrl);
    } catch (e) {
      setError("L'URL saisie est invalide. Veuillez vérifier le format (ex: example.com).");
      setLoading(false);
      return;
    }

    try {
      const response = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to analyze website');
      }

      setResult(data);
      
      const newHistory = [data, ...history.filter(h => h.url !== data.url || new Date(data.timestamp).getTime() - new Date(h.timestamp).getTime() > 60000)].slice(0, 20);
      setHistory(newHistory);
      localStorage.setItem('webAnalyzerHistory', JSON.stringify(newHistory));

    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-900 font-sans selection:bg-amber-200 selection:text-amber-900">
      {/* Background Pattern */}
      <div className="fixed inset-0 z-0 pointer-events-none opacity-[0.03]" style={{ backgroundImage: 'radial-gradient(#0f172a 1px, transparent 1px)', backgroundSize: '32px 32px' }}></div>
      
      {/* Header */}
      <header className="bg-white/70 backdrop-blur-xl border-b border-slate-200/60 sticky top-0 z-50 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 sm:h-20 flex items-center justify-between">
          <div className="flex items-center gap-3 sm:gap-4">
            {/* Logo */}
            <a href="/" className="flex items-center gap-2 sm:gap-3 group">
              <div className="relative flex items-center justify-center h-10 sm:h-12 w-auto transition-transform group-hover:scale-105">
                {/* We use an img tag for the uploaded logo. If it fails to load, we show a fallback. */}
                <img 
                  src="/logo.png" 
                  alt="Grandson Logo" 
                  className="h-full w-auto object-contain drop-shadow-sm"
                  onError={(e) => {
                    e.currentTarget.style.display = 'none';
                    const fallback = document.getElementById('logo-fallback');
                    if (fallback) fallback.classList.remove('hidden');
                    const textFallback = document.getElementById('logo-text-fallback');
                    if (textFallback) textFallback.classList.remove('hidden');
                  }}
                />
                <div id="logo-fallback" className="hidden flex items-center justify-center p-2 bg-gradient-to-br from-slate-800 to-slate-900 rounded-xl shadow-lg">
                  <Globe className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                </div>
              </div>
              <div className="flex flex-col">
                <h1 id="logo-text-fallback" className="hidden text-lg sm:text-xl font-black tracking-tight text-slate-900 leading-none">
                  GRANDSON
                </h1>
                <span className="text-[10px] sm:text-xs font-semibold text-slate-500 tracking-widest uppercase mt-0.5">
                  Web Analytics
                </span>
              </div>
            </a>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2 sm:gap-4">
            <button className="bg-slate-900 hover:bg-slate-800 text-white text-sm font-medium px-4 py-2 sm:px-5 sm:py-2.5 rounded-xl shadow-sm transition-all hover:shadow-md hover:-translate-y-0.5 active:translate-y-0 flex items-center gap-2">
              Version bêta
            </button>
          </div>
        </div>
      </header>

      <main className={cn(
        "relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 transition-all duration-500 pb-24 md:pb-12",
        (!result && !loading) ? "py-12 sm:py-20 lg:py-32" : "py-6 sm:py-8"
      )}>
        {/* Search Section */}
        <div id="search" className={cn(
          "w-full mx-auto transition-all duration-500",
          (!result && !loading) ? "max-w-4xl text-center" : "max-w-3xl text-center mb-8 sm:mb-12"
        )}>
          <h2 className={cn(
            "font-black tracking-tighter text-slate-900 transition-all duration-500",
            (!result && !loading) ? "text-5xl sm:text-6xl lg:text-7xl mb-4 sm:mb-6" : "text-3xl sm:text-5xl mb-3 sm:mb-4"
          )}>
            Analysez l'ADN de <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-500 to-orange-600">votre site web</span>
          </h2>
          <p className={cn(
            "text-slate-600 transition-all duration-500 font-medium",
            (!result && !loading) ? "text-lg sm:text-2xl mb-10 sm:mb-14 max-w-2xl mx-auto leading-relaxed" : "text-base sm:text-lg mb-6 sm:mb-8"
          )}>
            Audit technologique, sécurité avancée, UX et estimation financière ultra-précise.
          </p>

          <form onSubmit={handleAnalyze} className={cn(
            "relative mx-auto transition-all duration-500",
            (!result && !loading) ? "max-w-3xl" : "max-w-2xl"
          )}>
            <div ref={searchContainerRef} className="relative flex items-center group">
              <div className="absolute inset-0 bg-gradient-to-r from-amber-400 to-orange-500 rounded-3xl blur-xl opacity-20 group-hover:opacity-40 group-focus-within:opacity-60 group-focus-within:scale-105 group-focus-within:blur-2xl transition-all duration-500"></div>
              <Search className={cn(
                "absolute text-slate-400 transition-all duration-500 z-10 group-focus-within:text-amber-600",
                (!result && !loading) ? "left-5 sm:left-6 w-6 h-6 sm:w-7 sm:h-7" : "left-4 sm:left-5 w-5 h-5 sm:w-6 sm:h-6"
              )} />
              <input
                type="text"
                value={url}
                onChange={(e) => {
                  setUrl(e.target.value);
                  setShowAutocomplete(true);
                }}
                onFocus={() => setShowAutocomplete(true)}
                placeholder="https://votre-site.com"
                className={cn(
                  "relative w-full rounded-3xl border-2 border-slate-200/80 bg-white shadow-sm focus:border-amber-500 focus:ring-4 focus:ring-amber-500/20 focus:-translate-y-0.5 transition-all duration-300 outline-none z-10 font-medium",
                  (!result && !loading) ? "pl-14 sm:pl-16 pr-36 sm:pr-48 py-5 sm:py-6 text-lg sm:text-xl" : "pl-12 sm:pl-14 pr-32 sm:pr-40 py-4 sm:py-5 text-base sm:text-lg"
                )}
                required
              />
              <button
                type="submit"
                disabled={loading}
                className={cn(
                  "absolute right-2 sm:right-2.5 top-2 sm:top-2.5 bottom-2 sm:bottom-2.5 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-2xl transition-all duration-300 disabled:opacity-50 flex items-center gap-1.5 sm:gap-2 z-10 shadow-lg shadow-slate-900/20",
                  (!result && !loading) ? "px-6 sm:px-8 text-base sm:text-lg" : "px-4 sm:px-6 text-sm sm:text-base"
                )}
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 sm:w-5 sm:h-5 animate-spin text-amber-400" />
                    <span className="hidden sm:inline">Analyse...</span>
                  </>
                ) : (
                  <>
                    <span className="hidden sm:inline">Scanner</span>
                    <Zap className="w-4 h-4 text-amber-400" />
                  </>
                )}
              </button>

              {/* Autocomplete Dropdown */}
              {showAutocomplete && uniqueHistoryUrls.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-xl border border-slate-200 shadow-xl overflow-hidden z-50">
                  <div className="px-4 py-2 bg-slate-50 border-b border-slate-100 text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                    <History className="w-3 h-3" /> Recherches récentes
                  </div>
                  <ul>
                    {uniqueHistoryUrls.map((historyUrl, idx) => (
                      <li key={idx}>
                        <button
                          type="button"
                          className="w-full text-left px-4 py-3 hover:bg-slate-50 text-slate-700 font-medium transition-colors flex items-center gap-3 border-b border-slate-50 last:border-0"
                          onClick={() => {
                            setUrl(historyUrl);
                            setShowAutocomplete(false);
                          }}
                        >
                          <Globe className="w-4 h-4 text-slate-400" />
                          {historyUrl}
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
            {error && (
              <motion.div 
                initial={{ opacity: 0, y: -10 }} 
                animate={{ opacity: 1, y: 0 }}
                className="mt-4 p-4 bg-red-50 text-red-700 rounded-xl flex items-center gap-2 text-left relative z-10"
              >
                <AlertTriangle className="w-5 h-5 shrink-0" />
                <p>{error}</p>
              </motion.div>
            )}
          </form>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="w-full max-w-2xl mx-auto mt-12">
            <LoadingAnimation stage="analyzing" />
          </div>
        )}

        {/* Results Dashboard - Bento Grid */}
        {result && !loading && (
          <motion.div 
            initial="hidden"
            animate="show"
            variants={{
              hidden: { opacity: 0 },
              show: {
                opacity: 1,
                transition: { staggerChildren: 0.1 }
              }
            }}
            className="space-y-6 sm:space-y-8"
          >
            {/* Overall Score Header */}
            <motion.div 
              variants={{ show: { transition: { staggerChildren: 0.1 } } }}
              className="bg-white rounded-[2.5rem] p-8 sm:p-10 border border-slate-200/60 shadow-sm hover:shadow-lg transition-shadow duration-500 flex flex-col md:flex-row items-center justify-between gap-8 relative overflow-hidden"
            >
              <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-bl from-indigo-50 via-amber-50/30 to-transparent rounded-full -mr-20 -mt-20 opacity-70 pointer-events-none"></div>
              
              <div className="flex flex-col sm:flex-row items-center sm:items-start gap-8 z-10 w-full md:w-auto text-center sm:text-left">
                <div className="relative shrink-0">
                  <CircularProgress 
                    value={result.overallScore} 
                    label="Score Global" 
                    color={getScoreColor(result.overallScore)} 
                    size={140} 
                    strokeWidth={10} 
                  />
                  <div className="absolute -bottom-2 -right-2 bg-white p-3 rounded-full shadow-md border border-slate-100">
                    <Award className={cn("w-6 h-6", getScoreColor(result.overallScore))} />
                  </div>
                </div>
                
                <div className="flex flex-col items-center sm:items-start mt-2">
                  <h2 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight mb-4 break-all line-clamp-2">
                    {result.url.replace(/^https?:\/\//, '')}
                  </h2>
                  <div className="flex flex-wrap items-center justify-center sm:justify-start gap-3">
                    <span className={cn(
                      "px-4 py-1.5 rounded-full text-sm font-bold border shadow-sm",
                      result.overallScore >= 80 ? "bg-emerald-50 text-emerald-700 border-emerald-200" :
                      result.overallScore >= 50 ? "bg-amber-50 text-amber-700 border-amber-200" :
                      "bg-red-50 text-red-700 border-red-200"
                    )}>
                      {result.overallScore >= 80 ? "Excellent" : result.overallScore >= 50 ? "Moyen" : "Critique"}
                    </span>
                    <span className="text-sm text-slate-600 font-semibold flex items-center gap-2 bg-slate-50 px-4 py-1.5 rounded-full border border-slate-200/60 shadow-sm">
                      <Activity className="w-4 h-4 text-slate-400" />
                      Statut {result.status}
                    </span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 w-full md:w-auto z-10">
                <div className="bg-white p-5 rounded-3xl border border-slate-200/60 shadow-sm flex flex-col items-center justify-center text-center hover:bg-slate-50 transition-colors">
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Temps de réponse</span>
                  <span className="text-2xl font-black text-slate-800 tracking-tight">{result.loadTimeMs}<span className="text-sm text-slate-500 font-bold ml-1">ms</span></span>
                </div>
                <div className="bg-white p-5 rounded-3xl border border-slate-200/60 shadow-sm flex flex-col items-center justify-center text-center hover:bg-slate-50 transition-colors">
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Poids Total</span>
                  <span className="text-2xl font-black text-slate-800 tracking-tight">{result.performance.htmlSizeKB} <span className="text-sm text-slate-500 font-bold ml-1">KB</span></span>
                </div>
              </div>
            </motion.div>

            {/* Quick Stats Row (Removed since we moved them to the header) */}
            
            {/* Main Bento Grid */}
            <motion.div 
              variants={{ show: { transition: { staggerChildren: 0.1 } } }} 
              id="details" 
              className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6"
            >
              
              {/* Technology Card */}
              <BentoCard title="Technologies & Infrastructure" icon={<Code2 className="w-5 h-5 text-blue-500" />}>
                <div className="flex flex-col gap-3 mt-2 max-h-[280px] overflow-y-auto pr-2 custom-scrollbar">
                  {result.techStack.length > 0 ? (
                    result.techStack.map((tech, idx) => (
                      <div 
                        key={idx} 
                        className="flex items-center justify-between p-3.5 bg-slate-50/80 rounded-2xl border border-slate-100/80 transition-all hover:bg-white hover:border-slate-200 hover:shadow-sm group"
                      >
                        <div className="flex items-center gap-3.5">
                          <div className="p-2.5 bg-white rounded-xl border border-slate-200/60 text-slate-600 shadow-sm transition-colors group-hover:scale-105">
                            <TechIcon category={tech.category} name={tech.name} />
                          </div>
                          <div className="flex flex-col">
                            <span className={cn(
                              "text-[10px] font-bold uppercase tracking-wider mb-0.5",
                              tech.category.includes("Framework Web") || tech.category.includes("Library") || tech.category.includes("UI") ? "text-blue-500" :
                              tech.category.includes("Serveur Web") || tech.category.includes("PaaS") || tech.category.includes("Base de données") || tech.category.includes("Environnement") ? "text-purple-500" :
                              "text-slate-400"
                            )}>
                              {tech.category}
                            </span>
                            <span className="font-bold text-slate-800 tracking-tight transition-colors">{tech.name}</span>
                          </div>
                        </div>
                        {tech.version && (
                          <span className="px-2 py-1 bg-indigo-50 text-indigo-700 text-xs font-bold rounded-lg border border-indigo-100/50">
                            v{tech.version}
                          </span>
                        )}
                      </div>
                    ))
                  ) : (
                    <span className="text-slate-500 text-sm italic">Aucune technologie spécifique détectée.</span>
                  )}
                </div>
              </BentoCard>

              {/* Performance & Features Card */}
              <BentoCard title="Performance & Fonctionnalités" icon={<Zap className="w-5 h-5 text-amber-500" />}>
                <div className="flex flex-col gap-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-slate-50/80 p-4 rounded-2xl border border-slate-100/80 flex flex-col items-center justify-center text-center hover:bg-slate-50 transition-colors">
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Poids HTML</p>
                      <p className="text-2xl font-black text-slate-800 tracking-tight">{result.performance.htmlSizeKB} <span className="text-xs text-slate-500 font-bold">KB</span></p>
                    </div>
                    <div className="bg-slate-50/80 p-4 rounded-2xl border border-slate-100/80 flex flex-col items-center justify-center text-center hover:bg-slate-50 transition-colors">
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Requêtes JS</p>
                      <p className="text-2xl font-black text-slate-800 tracking-tight">{result.performance.scriptCount}</p>
                    </div>
                    <div className="bg-slate-50/80 p-4 rounded-2xl border border-slate-100/80 flex flex-col items-center justify-center text-center hover:bg-slate-50 transition-colors">
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Requêtes CSS</p>
                      <p className="text-2xl font-black text-slate-800 tracking-tight">{result.performance.cssCount}</p>
                    </div>
                    <div className="bg-slate-50/80 p-4 rounded-2xl border border-slate-100/80 flex flex-col items-center justify-center text-center hover:bg-slate-50 transition-colors">
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Images</p>
                      <p className="text-2xl font-black text-slate-800 tracking-tight">{result.performance.imageCount}</p>
                    </div>
                    <div className="bg-slate-50/80 p-4 rounded-2xl border border-slate-100/80 col-span-2 hover:bg-slate-50 transition-colors">
                      <div className="flex justify-between items-center mb-2">
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Lazy Loading Images</p>
                        <span className="text-sm font-black text-slate-700">{result.ux.lazyLoadRatio}%</span>
                      </div>
                      <div className="w-full h-2 bg-slate-200/60 rounded-full overflow-hidden">
                        <div className={cn("h-full rounded-full transition-all duration-1000", result.ux.lazyLoadRatio >= 80 ? "bg-emerald-500" : result.ux.lazyLoadRatio >= 40 ? "bg-amber-500" : "bg-red-500")} style={{ width: `${result.ux.lazyLoadRatio}%` }}></div>
                      </div>
                    </div>
                  </div>
                  
                  {result.features.length > 0 && (
                    <div className="mt-2 pt-4 border-t border-slate-100">
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-3">Fonctionnalités Détectées</p>
                      <div className="flex flex-wrap gap-2">
                        {result.features.map((feature, idx) => (
                          <span key={idx} className="px-3 py-1.5 bg-indigo-50/80 text-indigo-700 border border-indigo-100/50 rounded-lg text-[11px] font-bold tracking-wide">
                            {feature}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </BentoCard>

              {/* Security Card */}
              <BentoCard title="Sécurité" icon={<Shield className="w-5 h-5 text-emerald-500" />}>
                <div className="flex justify-center mb-8">
                  <CircularProgress 
                    value={result.security.score} 
                    label="Score" 
                    color={result.security.score >= 80 ? "text-emerald-500" : result.security.score >= 50 ? "text-amber-500" : "text-red-500"} 
                  />
                </div>
                <div className="space-y-1.5">
                  <CheckListItem label="HTTPS Actif" passed={result.security.https} />
                  <CheckListItem label="HSTS Configuré" passed={result.security.hsts} />
                  <CheckListItem label="Content Security Policy" passed={result.security.csp} />
                  <CheckListItem label="X-Content-Type-Options" passed={result.security.xContentTypeOptions} />
                  <CheckListItem label="Referrer-Policy" passed={result.security.referrerPolicy !== "Missing"} />
                  <CheckListItem label="Conformité RGPD (Base)" passed={result.ux.gdprCompliant} />
                </div>
                {result.security.vulnerabilitiesList && result.security.vulnerabilitiesList.length > 0 ? (
                  <div className="mt-8 pt-6 border-t border-slate-100 space-y-4">
                    <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5 mb-2">
                      <Shield className="w-3.5 h-3.5" /> Vulnérabilités & Actions Requises ({result.security.vulnerabilitiesList.length})
                    </h4>
                    <div className="space-y-3">
                      {result.security.vulnerabilitiesList.map((vuln, idx) => (
                        <div key={idx} className="flex flex-col p-4 bg-slate-50/80 rounded-2xl border border-slate-100/80 hover:bg-slate-50 transition-colors">
                          <div className="flex justify-between items-center mb-1.5">
                            <span className="text-sm text-slate-700 font-bold">{vuln.title}</span>
                            <span className={cn("text-[10px] font-black px-2 py-0.5 rounded-md border uppercase tracking-wider", 
                              vuln.severity === 'Low' ? "bg-emerald-50 text-emerald-600 border-emerald-100/50" : 
                              vuln.severity === 'Medium' ? "bg-amber-50 text-amber-600 border-amber-100/50" : 
                              "bg-red-50 text-red-600 border-red-100/50"
                            )}>
                              {vuln.severity === 'Low' ? 'Faible' : vuln.severity === 'Medium' ? 'Moyen' : 'Élevé'}
                            </span>
                          </div>
                          <span className="text-xs text-slate-500 font-medium leading-relaxed">
                            {vuln.description}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="mt-8 pt-6 border-t border-slate-100">
                    <div className="bg-emerald-50/50 border border-emerald-100/50 rounded-2xl p-5 flex items-center gap-3">
                      <div className="p-2 bg-emerald-100 text-emerald-600 rounded-full">
                        <CheckCircle2 className="w-5 h-5" />
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-emerald-700">Excellente posture de sécurité</h4>
                        <p className="text-xs text-emerald-600/80 mt-0.5">Aucune vulnérabilité majeure n'a été détectée lors de l'analyse.</p>
                      </div>
                    </div>
                  </div>
                )}
                <div className="mt-6 pt-6 border-t border-slate-100">
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5 mb-4">
                    <Info className="w-3.5 h-3.5" /> Importance des En-têtes
                  </h4>
                  <div className="text-xs text-slate-500 space-y-3 leading-relaxed bg-slate-50/50 p-5 rounded-2xl border border-slate-100/50">
                    <p><strong className="text-slate-700">HTTPS & HSTS:</strong> Chiffrent les données. Sans eux, les mots de passe et données sensibles peuvent être interceptés.</p>
                    <p><strong className="text-slate-700">CSP:</strong> Prévient les attaques XSS (injections de scripts malveillants) en restreignant les sources de contenu.</p>
                    <p><strong className="text-slate-700">X-Frame-Options:</strong> Empêche le Clickjacking (intégration de votre site dans un iframe malveillant à votre insu).</p>
                  </div>
                </div>
              </BentoCard>

              {/* UX & SEO Card */}
              <BentoCard title="UX & SEO" icon={<Layout className="w-5 h-5 text-purple-500" />}>
                <div className="flex justify-center mb-6">
                  <CircularProgress 
                    value={result.ux.score} 
                    label="Score" 
                    color={result.ux.score >= 80 ? "text-purple-500" : result.ux.score >= 50 ? "text-amber-500" : "text-red-500"} 
                  />
                </div>
                <div className="space-y-1">
                  <CheckListItem label="Balise Title" passed={result.ux.title !== "Missing"} />
                  <CheckListItem label="Meta Description" passed={result.ux.hasMetaDescription} />
                  <CheckListItem label="Viewport Mobile" passed={result.ux.hasViewport} />
                  <CheckListItem label="Langue Définie" passed={result.ux.lang !== "Missing"} />
                  <CheckListItem label="Open Graph (Réseaux)" passed={result.ux.hasOpenGraph} />
                  <CheckListItem label="URL Canonique" passed={result.ux.hasCanonical} />
                </div>
                <div className="mt-6 pt-5 border-t border-slate-100">
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Accessibilité & Contenu</h4>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-slate-50/80 p-3 rounded-xl border border-slate-100/80 hover:bg-slate-50 transition-colors">
                      <span className="block text-[10px] text-slate-500 uppercase tracking-wider mb-1">Balises Sémantiques</span>
                      <span className="text-lg font-black text-slate-800">{result.ux.accessibility.semanticElements}</span>
                    </div>
                    <div className="bg-slate-50/80 p-3 rounded-xl border border-slate-100/80 hover:bg-slate-50 transition-colors">
                      <span className="block text-[10px] text-slate-500 uppercase tracking-wider mb-1">Attributs ARIA</span>
                      <span className="text-lg font-black text-slate-800">{result.ux.accessibility.ariaCount}</span>
                    </div>
                    <div className="bg-slate-50/80 p-3 rounded-xl border border-slate-100/80 col-span-2 hover:bg-slate-50 transition-colors flex justify-between items-center">
                      <span className="text-[10px] text-slate-500 uppercase tracking-wider">Ratio Texte/HTML</span>
                      <span className={cn("text-sm font-black px-2 py-0.5 rounded-md border", result.ux.textToHtmlRatio >= 10 ? "bg-emerald-50 text-emerald-600 border-emerald-100/50" : "bg-amber-50 text-amber-600 border-amber-100/50")}>
                        {result.ux.textToHtmlRatio}%
                      </span>
                    </div>
                  </div>
                </div>
                <div className="mt-6 pt-5 border-t border-slate-100">
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Expérience Utilisateur (UX)</h4>
                  <div className="space-y-2">
                    <div className="flex justify-between items-center p-2.5 bg-slate-50/80 rounded-xl border border-slate-100/80 hover:bg-slate-50 transition-colors">
                      <span className="text-xs font-semibold text-slate-700">Mobile-Friendly</span>
                      <span className={cn("text-xs font-black px-2 py-0.5 rounded-md border", result.ux.mobileFriendliness >= 80 ? "bg-emerald-50 text-emerald-600 border-emerald-100/50" : result.ux.mobileFriendliness >= 50 ? "bg-amber-50 text-amber-600 border-amber-100/50" : "bg-red-50 text-red-600 border-red-100/50")}>
                        {result.ux.mobileFriendliness}/100
                      </span>
                    </div>
                    <div className="flex justify-between items-center p-2.5 bg-slate-50/80 rounded-xl border border-slate-100/80 hover:bg-slate-50 transition-colors">
                      <span className="text-xs font-semibold text-slate-700">Lisibilité (Flesch)</span>
                      <span className={cn("text-xs font-black px-2 py-0.5 rounded-md border", result.ux.readabilityScore >= 60 ? "bg-emerald-50 text-emerald-600 border-emerald-100/50" : result.ux.readabilityScore >= 40 ? "bg-amber-50 text-amber-600 border-amber-100/50" : "bg-red-50 text-red-600 border-red-100/50")}>
                        {result.ux.readabilityScore}/100
                      </span>
                    </div>
                    <div className="flex justify-between items-center p-2.5 bg-slate-50/80 rounded-xl border border-slate-100/80 hover:bg-slate-50 transition-colors">
                      <span className="text-xs font-semibold text-slate-700">Clarté Navigation</span>
                      <span className={cn("text-xs font-black px-2 py-0.5 rounded-md border", result.ux.navigationClarity >= 80 ? "bg-emerald-50 text-emerald-600 border-emerald-100/50" : result.ux.navigationClarity >= 50 ? "bg-amber-50 text-amber-600 border-amber-100/50" : "bg-red-50 text-red-600 border-red-100/50")}>
                        {result.ux.navigationClarity}/100
                      </span>
                    </div>
                  </div>
                </div>
                <div className="mt-6 pt-5 border-t border-slate-100">
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Design Détecté</h4>
                  <p className="font-bold text-slate-800 bg-slate-50/80 p-3 rounded-xl border border-slate-100/80">{result.designType}</p>
                </div>
                <div className="mt-6 pt-5 border-t border-slate-100 space-y-3">
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5 mb-4">
                    <Lightbulb className="w-3.5 h-3.5 text-amber-500" /> Conseils UX & SEO
                  </h4>
                  <div className="space-y-3 text-xs text-slate-600">
                    <div className="flex items-start gap-3 bg-slate-50/80 p-3 rounded-xl border border-slate-100/80 hover:bg-slate-50 transition-colors">
                      <Type className={cn("w-4 h-4 shrink-0 mt-0.5", result.ux.h1Count === 1 ? "text-emerald-500" : "text-amber-500")} />
                      <span className="leading-relaxed">
                        {result.ux.h1Count === 0 ? "Aucun H1 détecté. Ajoutez un H1 principal pour le SEO." :
                         result.ux.h1Count === 1 ? "Structure H1 optimale (1 seul H1 détecté)." :
                         `${result.ux.h1Count} balises H1 détectées. Privilégiez un seul H1 par page.`}
                      </span>
                    </div>
                    <div className="flex items-start gap-3 bg-slate-50/80 p-3 rounded-xl border border-slate-100/80 hover:bg-slate-50 transition-colors">
                      <ImageIcon className={cn("w-4 h-4 shrink-0 mt-0.5", result.ux.imagesWithoutAlt === 0 && result.ux.imageCount > 0 ? "text-emerald-500" : result.ux.imageCount === 0 ? "text-slate-400" : "text-amber-500")} />
                      <span className="leading-relaxed">
                        {result.ux.imageCount === 0 ? "Aucune image détectée sur la page." :
                         result.ux.imagesWithoutAlt === 0 ? "Toutes les images ont un attribut 'alt' (Excellent pour l'accessibilité)." :
                         `${result.ux.imagesWithoutAlt} image(s) sur ${result.ux.imageCount} manquent d'attribut 'alt'.`}
                      </span>
                    </div>
                    <div className="flex items-start gap-3 bg-slate-50/80 p-3 rounded-xl border border-slate-100/80 hover:bg-slate-50 transition-colors">
                      <LinkIcon className={cn("w-4 h-4 shrink-0 mt-0.5", result.ux.linkCount > 0 && result.ux.linkCount <= 200 ? "text-emerald-500" : result.ux.linkCount === 0 ? "text-red-500" : "text-amber-500")} />
                      <span className="leading-relaxed">
                        {result.ux.linkCount === 0 ? "Aucun lien détecté. Ajoutez des liens pour le maillage interne." :
                         result.ux.linkCount > 200 ? `${result.ux.linkCount} liens détectés. Attention à ne pas diluer le "jus SEO".` :
                         `${result.ux.linkCount} liens détectés (Volume raisonnable).`}
                      </span>
                    </div>
                  </div>
                </div>
              </BentoCard>

              {/* DOM Complexity Card */}
              <BentoCard title="Complexité du DOM" icon={<Layers className="w-5 h-5 text-pink-500" />}>
                <div className="flex flex-col justify-between h-full">
                  <div>
                    <div className="flex justify-between items-end mb-2">
                      <div className="flex items-end gap-2">
                        <span className={cn("text-4xl font-black tracking-tighter leading-none", result.ux.domElements > 3000 ? "text-red-500" : result.ux.domElements > 1500 ? "text-amber-500" : "text-emerald-500")}>
                          {result.ux.domElements}
                        </span>
                        <span className="text-slate-400 font-medium mb-1">éléments</span>
                      </div>
                      <div className="text-right">
                        <span className="text-lg font-bold text-slate-700">{result.ux.domDepth}</span>
                        <span className="text-xs text-slate-400 font-medium ml-1">niveaux max</span>
                      </div>
                    </div>
                    <p className="text-sm text-slate-500 mb-4">
                      {result.ux.domElements < 800 ? "Très léger et rapide." : result.ux.domElements < 1500 ? "Taille optimale." : result.ux.domElements < 3000 ? "Légèrement lourd." : "Trop complexe, impacte les performances."}
                      {result.ux.domDepth > 25 && " Profondeur excessive."}
                    </p>
                  </div>
                  <div className="h-20 w-full mt-auto min-w-0">
                    <ResponsiveContainer width="99%" height="100%">
                      <BarChart layout="vertical" data={domData} margin={{ top: 0, right: 0, bottom: 0, left: 0 }}>
                        <XAxis type="number" domain={[0, Math.max(3000, result.ux.domElements)]} hide />
                        <YAxis type="category" dataKey="name" hide />
                        <Tooltip 
                          cursor={{fill: 'transparent'}}
                          contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                        />
                        <Bar dataKey="value" radius={[0, 8, 8, 0]} barSize={24} background={{ fill: '#f1f5f9', radius: 8 }}>
                          {
                            domData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.value > 3000 ? '#ef4444' : entry.value > 1500 ? '#f59e0b' : '#22c55e'} />
                            ))
                          }
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                    <div className="flex justify-between text-[10px] font-bold text-slate-400 uppercase tracking-wider mt-2">
                      <span>0</span>
                      <span>1500 (Max rec.)</span>
                      <span>3000+</span>
                    </div>
                  </div>
                </div>
              </BentoCard>

              {/* Radar Chart Card */}
              <BentoCard title="Aperçu Global" icon={<BarChart2 className="w-5 h-5 text-amber-500" />}>
                <div className="h-48 w-full -ml-2 min-w-0">
                  <ResponsiveContainer width="99%" height="100%">
                    <RadarChart cx="50%" cy="50%" outerRadius="70%" data={radarData.data}>
                      <PolarGrid stroke="#f1f5f9" />
                      <PolarAngleAxis dataKey="subject" tick={{ fill: '#64748b', fontSize: 11, fontWeight: 600 }} />
                      <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
                      <Tooltip content={<CustomRadarTooltip />} />
                      <Radar name="Score" dataKey="A" stroke="#f59e0b" strokeWidth={2} fill="#f59e0b" fillOpacity={0.3} />
                    </RadarChart>
                  </ResponsiveContainer>
                </div>
                <div className="mt-4 flex flex-col sm:flex-row justify-between text-xs border-t border-slate-100 pt-4 gap-3">
                  <div className="flex flex-col bg-emerald-50/50 p-2.5 rounded-xl border border-emerald-100/50 flex-1">
                    <span className="text-emerald-600 font-bold uppercase tracking-wider text-[10px] mb-0.5">Point fort</span>
                    <span className="text-emerald-900 font-black">{radarData.best?.subject} <span className="text-emerald-600/70 font-bold">({radarData.best?.A}/100)</span></span>
                  </div>
                  <div className="flex flex-col sm:text-right bg-red-50/50 p-2.5 rounded-xl border border-red-100/50 flex-1">
                    <span className="text-red-600 font-bold uppercase tracking-wider text-[10px] mb-0.5">Point faible</span>
                    <span className="text-red-900 font-black">{radarData.worst?.subject} <span className="text-red-600/70 font-bold">({radarData.worst?.A}/100)</span></span>
                  </div>
                </div>
              </BentoCard>

              {/* Speed Test & Lighthouse Card */}
              <BentoCard title="Test de Vitesse & Performance" icon={<Zap className="w-5 h-5 text-amber-500" />} className="md:col-span-2 lg:col-span-3">
                
                {/* Core Speed Metrics */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
                  <div className="flex flex-col items-center justify-center p-6 bg-slate-50/80 rounded-2xl border border-slate-100/80 hover:bg-slate-50 transition-colors">
                     <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-2">Temps de chargement</p>
                     <p className={cn("text-4xl font-black tracking-tight", result.loadTimeMs < 1000 ? "text-emerald-500" : result.loadTimeMs < 2500 ? "text-amber-500" : "text-red-500")}>
                       {(result.loadTimeMs / 1000).toFixed(2)}s
                     </p>
                  </div>
                  <div className="flex flex-col items-center justify-center p-6 bg-slate-50/80 rounded-2xl border border-slate-100/80 hover:bg-slate-50 transition-colors">
                     <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-2">Poids de la page</p>
                     <p className="text-3xl font-black text-slate-700 tracking-tight">{result.performance.htmlSizeKB} <span className="text-sm text-slate-500 font-bold">KB</span></p>
                  </div>
                  <div className="flex flex-col items-center justify-center p-6 bg-slate-50/80 rounded-2xl border border-slate-100/80 hover:bg-slate-50 transition-colors">
                     <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-2">Requêtes Totales</p>
                     <p className="text-3xl font-black text-slate-700 tracking-tight">{result.performance.scriptCount + result.performance.cssCount + result.performance.imageCount}</p>
                  </div>
                </div>


              </BentoCard>

              {/* Pricing & AI Card (Spans 2 columns on large screens) */}
              <BentoCard 
                title="Évaluation Financière & Technique" 
                icon={<DollarSign className="w-5 h-5 text-emerald-500" />} 
                className="md:col-span-2 lg:col-span-3"
              >
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-full items-stretch">
                  
                  {/* Coût de Développement */}
                  <div className="flex flex-col justify-between bg-slate-50/80 p-6 rounded-3xl border border-slate-100/80 hover:bg-slate-50 transition-colors">
                    <div>
                      <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-5 flex items-center gap-2">
                        <Code2 className="w-4 h-4" /> Coût de Développement
                      </h4>
                      <div className="space-y-5">
                        <div>
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Freelance Estimé</p>
                          <div className="flex items-baseline gap-1.5">
                            <span className="text-3xl font-black text-slate-800 tracking-tight">{new Intl.NumberFormat('fr-GN').format(result.pricing.freelance)}</span>
                            <span className="text-xs font-bold text-slate-500">GNF</span>
                          </div>
                        </div>
                        <div className="h-px bg-slate-200/60 w-full" />
                        <div>
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Agence Estimé</p>
                          <div className="flex items-baseline gap-1.5">
                            <span className="text-3xl font-black text-slate-700 tracking-tight">{new Intl.NumberFormat('fr-GN').format(result.pricing.agency)}</span>
                            <span className="text-xs font-bold text-slate-500">GNF</span>
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center justify-center gap-2 text-xs font-medium text-slate-500 bg-white p-3.5 rounded-xl border border-slate-100 mt-6 shadow-sm">
                      <Clock className="w-4 h-4 text-slate-400" />
                      Temps estimé : <span className="text-slate-900 font-bold">{result.pricing.estimatedDays} jours</span>
                    </div>
                  </div>

                  {/* Valeur de Revente & Métriques */}
                  <div className="flex flex-col justify-between bg-gradient-to-br from-emerald-50 to-teal-50 p-6 rounded-3xl border border-emerald-100 relative overflow-hidden group hover:shadow-md transition-all duration-300">
                    <div className="absolute -right-8 -top-8 w-32 h-32 bg-emerald-500/10 rounded-full blur-2xl group-hover:bg-emerald-500/20 transition-colors"></div>
                    <div>
                      <h4 className="text-xs font-bold text-emerald-600 uppercase tracking-wider mb-2 flex items-center gap-2 relative z-10">
                        <DollarSign className="w-4 h-4" /> Valeur de Revente Estimée
                      </h4>
                      <div className="flex items-baseline gap-1 relative z-10 mb-4">
                        <span className="text-4xl sm:text-5xl font-black text-emerald-700 tracking-tight">{new Intl.NumberFormat('fr-GN').format(result.pricing.resaleValue)}</span>
                        <span className="text-sm font-bold text-emerald-600/70">GNF</span>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-3 gap-2 relative z-10 bg-white/60 backdrop-blur-sm p-3 rounded-2xl border border-emerald-100/50">
                      <div className="flex flex-col items-center text-center">
                        <span className="text-[10px] font-bold text-emerald-600/70 uppercase">Âge</span>
                        <span className="text-sm font-black text-emerald-800">{result.pricing.domainAgeYears} ans</span>
                      </div>
                      <div className="flex flex-col items-center text-center border-x border-emerald-100/50">
                        <span className="text-[10px] font-bold text-emerald-600/70 uppercase">Trafic/m</span>
                        <span className="text-sm font-black text-emerald-800">{new Intl.NumberFormat('fr-FR', { notation: "compact" }).format(result.pricing.trafficVolume)}</span>
                      </div>
                      <div className="flex flex-col items-center text-center">
                        <span className="text-[10px] font-bold text-emerald-600/70 uppercase">Backlinks</span>
                        <span className="text-sm font-black text-emerald-800">{new Intl.NumberFormat('fr-FR', { notation: "compact" }).format(result.pricing.backlinkProfile)}</span>
                      </div>
                    </div>
                  </div>

                  {/* Niveau Dev & IA */}
                  <div className="flex flex-col gap-4">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-6 bg-slate-50/80 rounded-3xl border border-slate-100/80 flex-1 hover:bg-slate-50 transition-colors gap-4 sm:gap-0">
                      <div className="flex flex-col gap-1">
                        <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Niveau du Développeur</span>
                        <span className="text-xs text-slate-500 font-medium">Qualité du code & architecture</span>
                      </div>
                      <span className={cn(
                        "px-4 py-1.5 text-sm font-black rounded-full border shadow-sm",
                        result.developerLevel === "Expert" ? "bg-purple-100 text-purple-700 border-purple-200" :
                        result.developerLevel === "Confirmé" ? "bg-blue-100 text-blue-700 border-blue-200" :
                        result.developerLevel === "Intermédiaire" ? "bg-amber-100 text-amber-700 border-amber-200" :
                        "bg-red-100 text-red-700 border-red-200"
                      )}>
                        {result.developerLevel}
                      </span>
                    </div>
                    
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-6 bg-slate-50/50 rounded-3xl border border-slate-100/80 flex-1 hover:bg-slate-50 transition-colors gap-4 sm:gap-0">
                      <div className="flex flex-col gap-1 sm:max-w-[150px]">
                        <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Probabilité IA</span>
                        <span className="text-xs text-slate-500 font-medium">Code ou contenu généré</span>
                      </div>
                      <div className="self-center sm:self-auto">
                        <AIGauge probability={result.aiProbability} />
                      </div>
                    </div>
                  </div>

                </div>
                
                {/* Facteurs de prix */}
                <div className="mt-6 pt-5 border-t border-slate-100">
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                    <Activity className="w-4 h-4 text-slate-400" /> Facteurs de Valorisation & Démonstration du Prix
                  </h4>
                  <ul className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {result.pricing.pricingFactors.map((factor, idx) => (
                      <li key={idx} className="text-xs text-slate-600 flex items-start gap-2.5 bg-slate-50/80 p-3 rounded-xl border border-slate-100/80 hover:bg-slate-50 transition-colors">
                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 mt-1.5 shrink-0 shadow-sm" />
                        <span className="leading-relaxed font-medium">{factor}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </BentoCard>

              {/* History Chart Card */}
              {historyData.length > 1 && (
                <BentoCard id="history" title="Historique d'Évolution" icon={<History className="w-5 h-5 text-blue-500" />} className="md:col-span-2 lg:col-span-3">
                  <div className="h-48 w-full min-w-0">
                    <ResponsiveContainer width="99%" height="100%">
                      <AreaChart data={historyData} margin={{ top: 5, right: 5, bottom: 5, left: -20 }}>
                        <defs>
                          <linearGradient id="colorSecurity" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                            <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                          </linearGradient>
                          <linearGradient id="colorUx" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3}/>
                            <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0}/>
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                        <XAxis 
                          dataKey="timestamp" 
                          tickFormatter={(val) => new Date(val).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' })}
                          tick={{ fill: '#94a3b8', fontSize: 10 }}
                          axisLine={false}
                          tickLine={false}
                        />
                        <YAxis domain={[0, 100]} tick={{ fill: '#94a3b8', fontSize: 10 }} axisLine={false} tickLine={false} />
                        <Tooltip 
                          content={({ active, payload, label }) => {
                            if (active && payload && payload.length) {
                              return (
                                <div className="bg-white p-3 rounded-xl border border-slate-100 shadow-lg text-sm">
                                  <p className="font-bold text-slate-800 mb-1">{new Date(label).toLocaleString('fr-FR')}</p>
                                  <p className="text-xs text-slate-500 mb-2 truncate max-w-[200px]">{payload[0].payload.url}</p>
                                  {payload.map((entry: any, index: number) => (
                                    <div key={index} className="flex items-center gap-2">
                                      <div className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }} />
                                      <span className="text-slate-600">{entry.name}:</span>
                                      <span className="font-bold text-slate-900">{entry.value}/100</span>
                                    </div>
                                  ))}
                                </div>
                              );
                            }
                            return null;
                          }}
                        />
                        <Area type="monotone" dataKey="security.score" name="Sécurité" stroke="#10b981" strokeWidth={2} fillOpacity={1} fill="url(#colorSecurity)" activeDot={{ r: 5 }} />
                        <Area type="monotone" dataKey="ux.score" name="UX/SEO" stroke="#8b5cf6" strokeWidth={2} fillOpacity={1} fill="url(#colorUx)" activeDot={{ r: 5 }} />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </BentoCard>
              )}

              {/* Recommendations Card (Full Width) */}
              <BentoCard 
                title="Recommandations d'Amélioration" 
                icon={<Lightbulb className="w-5 h-5 text-amber-500" />} 
                className="md:col-span-2 lg:col-span-3"
              >
                {result.recommendations.length > 0 ? (
                  <ResultsGrid
                    items={result.recommendations}
                    itemsPerPage={6}
                    renderItem={(rec, idx) => (
                      <div className="flex items-start gap-3 bg-amber-50/30 p-5 rounded-3xl border border-amber-100/50 transition-all hover:bg-amber-50/80 hover:shadow-sm group h-full">
                        <div className="bg-amber-100/50 p-1.5 rounded-full shrink-0 mt-0.5 group-hover:scale-110 transition-transform">
                          <ChevronRight className="w-4 h-4 text-amber-600" />
                        </div>
                        <span className="text-sm text-slate-700 font-medium leading-relaxed">{rec}</span>
                      </div>
                    )}
                    emptyMessage="Aucune recommandation"
                  />
                ) : (
                  <div className="flex items-center gap-4 text-emerald-700 bg-emerald-50/50 p-6 rounded-3xl border border-emerald-100/50 mt-2">
                    <div className="bg-emerald-100/50 p-2 rounded-full shrink-0">
                      <CheckCircle2 className="w-6 h-6 text-emerald-600" />
                    </div>
                    <p className="font-semibold text-emerald-800">Excellent ! Aucune recommandation critique pour ce site. Tous les voyants sont au vert.</p>
                  </div>
                )}
              </BentoCard>

              {/* Full History Section with Infinite Scroll */}
              {history.length > 0 && (
                <BentoCard 
                  title="Historique Complet des Analyses" 
                  icon={<History className="w-5 h-5 text-blue-500" />} 
                  className="md:col-span-2 lg:col-span-3"
                  id="full-history"
                >
                  <InfiniteScroll
                    items={history}
                    itemsPerPage={5}
                    renderItem={(item, idx) => (
                      <motion.div
                        whileHover={{ scale: 1.02 }}
                        className="p-4 bg-slate-50/50 border border-slate-200/60 rounded-2xl hover:bg-slate-50 hover:shadow-md transition-all cursor-pointer group"
                        onClick={() => {
                          setUrl(item.url);
                          window.scrollTo({ top: 0, behavior: 'smooth' });
                        }}
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold text-slate-900 truncate group-hover:text-amber-600 transition-colors">
                              {item.url.replace(/^https?:\/\//, '')}
                            </p>
                            <p className="text-xs text-slate-500 mt-1 flex items-center gap-2">
                              <Clock className="w-3 h-3" />
                              {new Date(item.timestamp).toLocaleString('fr-FR')}
                            </p>
                          </div>
                          <div className="flex items-center gap-3 flex-shrink-0">
                            <div className="text-right">
                              <p className="text-2xl font-black text-slate-900">{item.overallScore}</p>
                              <p className="text-[10px] font-bold text-slate-400 uppercase">Score</p>
                            </div>
                            <div className={cn(
                              "w-12 h-12 rounded-full flex items-center justify-center font-bold text-white",
                              item.overallScore >= 80 ? "bg-emerald-500" :
                              item.overallScore >= 50 ? "bg-amber-500" :
                              "bg-red-500"
                            )}>
                              {item.overallScore >= 80 ? "✓" : item.overallScore >= 50 ? "!" : "✕"}
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    )}
                    emptyMessage="Aucun historique"
                  />
                </BentoCard>
              )}

            </motion.div>

            {/* JS Errors Section */}
            {clientErrors.length > 0 && (
              <motion.div variants={{ show: { transition: { staggerChildren: 0.1 } } }} className="mt-8">
                <BentoCard title="Erreurs JavaScript Capturées" icon={<Bug className="w-5 h-5 text-red-500" />} className="border-red-100">
                  <div className="space-y-3 max-h-64 overflow-y-auto custom-scrollbar pr-2">
                    {clientErrors.map((err, i) => (
                      <div key={i} className="p-4 bg-red-50/80 border border-red-100/80 rounded-2xl text-xs font-mono hover:bg-red-50 transition-colors">
                        <div className="flex justify-between items-center text-red-800 mb-2">
                          <strong className="px-2 py-1 bg-red-100/50 rounded-md text-[10px] uppercase tracking-wider">{err.type}</strong>
                          <span className="text-red-400 font-medium">{new Date(err.timestamp).toLocaleTimeString()}</span>
                        </div>
                        <p className="text-red-600 mb-2 font-semibold text-sm leading-relaxed">{err.message}</p>
                        {(err.source || err.url) && (
                          <div className="flex items-start gap-2 text-slate-500 bg-white/50 p-2 rounded-xl border border-red-100/30 mt-2">
                            <Code2 className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                            <p className="truncate">
                              {err.source || err.url} {err.lineno ? <span className="font-bold text-slate-700 ml-1">(Ligne: {err.lineno})</span> : ''}
                            </p>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </BentoCard>
              </motion.div>
            )}
          </motion.div>
        )}
      </main>

      {/* Bottom Navigation (Mobile Only) */}
      <div className="fixed bottom-0 left-0 right-0 bg-white/90 backdrop-blur-lg border-t border-slate-200 z-50 md:hidden pb-[env(safe-area-inset-bottom)]">
        <div className="flex items-center justify-around h-16 px-2">
          <button onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })} className="flex flex-col items-center justify-center w-full h-full text-slate-500 hover:text-amber-600 active:text-amber-600 transition-colors">
            <Search className="w-5 h-5 mb-1" />
            <span className="text-[10px] font-medium">Scanner</span>
          </button>
          <button onClick={() => document.getElementById('overview')?.scrollIntoView({ behavior: 'smooth' })} className="flex flex-col items-center justify-center w-full h-full text-slate-500 hover:text-amber-600 active:text-amber-600 transition-colors">
            <BarChart2 className="w-5 h-5 mb-1" />
            <span className="text-[10px] font-medium">Aperçu</span>
          </button>
          <button onClick={() => document.getElementById('details')?.scrollIntoView({ behavior: 'smooth' })} className="flex flex-col items-center justify-center w-full h-full text-slate-500 hover:text-amber-600 active:text-amber-600 transition-colors">
            <Layers className="w-5 h-5 mb-1" />
            <span className="text-[10px] font-medium">Détails</span>
          </button>
          <button onClick={() => document.getElementById('history')?.scrollIntoView({ behavior: 'smooth' })} className="flex flex-col items-center justify-center w-full h-full text-slate-500 hover:text-amber-600 active:text-amber-600 transition-colors">
            <History className="w-5 h-5 mb-1" />
            <span className="text-[10px] font-medium">Historique</span>
          </button>
        </div>
      </div>
      <Analytics />
    </div>
  );
}

// --- HELPER COMPONENTS ---

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 300, damping: 24 } }
};

function StatCard({ icon, label, value }: { icon: React.ReactNode, label: string, value: string | number }) {
  return (
    <motion.div variants={itemVariants} className="bg-white p-5 rounded-3xl border border-slate-200/60 shadow-sm hover:shadow-md transition-all duration-300 flex items-center gap-4 group">
      <div className="p-3.5 bg-slate-50 text-slate-600 rounded-2xl group-hover:bg-indigo-50 group-hover:text-indigo-600 transition-colors">
        {icon}
      </div>
      <div className="overflow-hidden">
        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">{label}</p>
        <p className="text-xl font-black text-slate-900 truncate tracking-tight">{value}</p>
      </div>
    </motion.div>
  );
}

function BentoCard({ title, icon, children, className, id }: { title: string, icon: React.ReactNode, children: React.ReactNode, className?: string, id?: string }) {
  return (
    <motion.div variants={itemVariants} id={id} className={cn("bg-white p-6 sm:p-8 rounded-[2rem] border border-slate-200/60 shadow-sm hover:shadow-lg transition-all duration-500 flex flex-col group", className)}>
      <div className="flex items-center gap-3.5 mb-6">
        <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100 group-hover:bg-indigo-50/50 group-hover:border-indigo-100/50 transition-colors shadow-sm">
          {icon}
        </div>
        <h3 className="text-xl font-bold text-slate-900 tracking-tight">{title}</h3>
      </div>
      <div className="flex-1">
        {children}
      </div>
    </motion.div>
  );
}

function CheckListItem({ label, passed }: { label: string; passed: boolean }) {
  return (
    <div className="flex items-center justify-between py-2.5 px-3 rounded-xl hover:bg-slate-50/80 transition-colors group">
      <span className="text-sm font-semibold text-slate-700 group-hover:text-slate-900 transition-colors">{label}</span>
      {passed ? (
        <div className="flex items-center justify-center w-7 h-7 rounded-full bg-emerald-50 border border-emerald-100/50 text-emerald-500 shadow-sm">
          <CheckCircle2 className="w-4 h-4" />
        </div>
      ) : (
        <div className="flex items-center justify-center w-7 h-7 rounded-full bg-amber-50 border border-amber-100/50 text-amber-500 shadow-sm">
          <AlertTriangle className="w-4 h-4" />
        </div>
      )}
    </div>
  );
}

function CircularProgress({ value, label, color, description, size = 120, strokeWidth = 10 }: { value: number, label: string, color: string, description?: string, size?: number, strokeWidth?: number }) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (value / 100) * circumference;
  return (
    <div className="relative flex flex-col items-center justify-center shrink-0 group" style={{ width: size, height: size }}>
      <svg className="transform -rotate-90 w-full h-full">
        <circle cx={size/2} cy={size/2} r={radius} stroke="currentColor" strokeWidth={strokeWidth} fill="transparent" className="text-slate-100" />
        <motion.circle
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset }}
          transition={{ duration: 1.5, ease: "easeOut" }}
          cx={size/2} cy={size/2} r={radius} stroke="currentColor" strokeWidth={strokeWidth} fill="transparent"
          strokeDasharray={circumference}
          className={color}
          strokeLinecap="round"
        />
      </svg>
      <div className="absolute flex flex-col items-center justify-center w-full px-2 text-center">
        <span className="text-3xl font-black text-slate-800">{value}</span>
        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider truncate w-full">{label}</span>
      </div>
      
      {description && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2 -translate-y-full w-48 p-3 bg-slate-800 text-white text-xs rounded-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50 shadow-xl pointer-events-none">
          <div className="font-bold mb-1 text-slate-100">{label}</div>
          <div className="text-slate-300 leading-relaxed">{description}</div>
          <div className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-3 h-3 bg-slate-800 rotate-45"></div>
        </div>
      )}
    </div>
  );
}

function AIGauge({ probability }: { probability: number }) {
  return (
    <div className="relative w-28 h-28">
      <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
        <path
          className="text-slate-100"
          strokeWidth="3"
          stroke="currentColor"
          fill="none"
          d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
        />
        <path
          className="text-violet-500 transition-all duration-1000 ease-out"
          strokeDasharray={`${probability}, 100`}
          strokeWidth="3"
          strokeLinecap="round"
          stroke="currentColor"
          fill="none"
          d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <Bot className="w-6 h-6 text-violet-600 mb-1" />
        <span className="text-2xl font-black text-slate-900">{probability}%</span>
      </div>
    </div>
  );
}

export function getScoreColor(score: number) {
  if (score >= 80) return "text-emerald-500";
  if (score >= 50) return "text-amber-500";
  return "text-red-500";
}

const techSlugs: Record<string, string> = {
  "wordpress": "wordpress/21759b",
  "shopify": "shopify/95BF47",
  "wix": "wix/000000",
  "squarespace": "squarespace/000000",
  "webflow": "webflow/4353FF",
  "elementor": "elementor/92003B",
  "next.js": "nextdotjs/000000",
  "react": "react/61DAFB",
  "vue.js": "vuedotjs/4FC08D",
  "nuxt.js": "nuxtdotjs/00C58E",
  "svelte": "svelte/FF3E00",
  "astro": "astro/BC52EE",
  "angular": "angular/DD0031",
  "ember.js": "emberdotjs/E04E39",
  "alpine.js": "alpinedotjs/8BC0D0",
  "solid.js": "soliddotjs/2C4F7C",
  "qwik": "qwik/18B6F6",
  "remix": "remix/000000",
  "htmx": "htmx/336699",
  "tailwind css": "tailwindcss/06B6D4",
  "bootstrap": "bootstrap/7952B3",
  "google analytics": "googleanalytics/E37400",
  "google tag manager": "googletagmanager/246FDB",
  "hotjar": "hotjar/FD3839",
  "mixpanel": "mixpanel/7856FF",
  "amplitude": "amplitude/2451F5",
  "microsoft clarity": "microsoft/00A4EF",
  "intercom": "intercom/000000",
  "hubspot": "hubspot/FF7A59",
  "crisp": "crisp/1972F5",
  "drift": "drift/000000",
  "zendesk": "zendesk/03363D",
  "jquery": "jquery/0769AD",
  "express.js": "express/000000",
  "nginx": "nginx/009639",
  "cloudflare": "cloudflare/F38020",
  "apache": "apache/D22128",
  "vercel": "vercel/000000",
  "netlify": "netlify/00C7B7",
  "heroku": "heroku/430098",
  "gatsby": "gatsby/663399",
  "hugo": "hugo/FF4088",
  "jekyll": "jekyll/CC0000",
  "php": "php/777BB4",
  "laravel": "laravel/FF2D20",
  "django": "django/092E20",
  "ruby on rails": "rubyonrails/CC0000",
  "spring": "spring/6DB33F",
  "firebase": "firebase/FFCA28",
  "supabase": "supabase/3ECF8E",
  "appwrite": "appwrite/F02E65",
  "aws amplify": "awsamplify/FF9900",
  "sanity": "sanity/F03E2F",
  "contentful": "contentful/2478CC",
  "strapi": "strapi/2E7EEA",
  "sentry": "sentry/362D59",
  "new relic": "newrelic/1CE783",
  "datadog": "datadog/632CA6",
  "logrocket": "logrocket/7642CB",
  "gsap": "greensock/88CE02",
  "framer motion": "framer/0055FF",
  "three.js": "threedotjs/000000",
  "lodash": "lodash/3492FF",
  "moment.js": "momentdotjs/5A8F79",
  "chart.js": "chartdotjs/FF6384",
  "d3.js": "d3dotjs/F9A03C",
  "echarts": "apacheecharts/AA344D",
  "highcharts": "highcharts/000000",
  "axios": "axios/5A29E4",
  "rxjs": "reactivex/B7178C",
  "material ui": "mui/007FFF",
  "ant design": "antdesign/0170FE",
  "auth0": "auth0/EB5424",
  "clerk": "clerk/6C47FF",
  "okta": "okta/007DC1",
  "aws cognito": "amazonwebservices/232F3E",
  "google recaptcha": "google/4285F4",
  "hcaptcha": "hcaptcha/85EA2D",
  "litespeed": "litespeed/000000",
  "caddy": "caddy/00A2E8",
  "docusaurus": "docusaurus/3ECA84",
  "eleventy": "11ty/222222",
  "chakra ui": "chakraui/319795",
  "radix ui": "radixui/161618",
  "daisyui": "daisyui/5A0EF8",
  "iis": "microsoftiis/0078D7",
  "html5": "html5/E34F26",
  "css3": "css3/1572B6",
  "javascript": "javascript/F7DF1E",
  "mysql": "mysql/4479A1",
  "node.js": "nodedotjs/339939",
  "python": "python/3776AB",
  "java": "openjdk/FFFFFF",
  "ruby": "ruby/CC342D",
  "ssl/tls": "letsencrypt/003A70",
  "responsive design": "css3/1572B6"
};

function TechIcon({ category, name }: { category: string, name: string }) {
  const slug = techSlugs[name.toLowerCase()];
  
  if (slug) {
    return <img src={`https://cdn.simpleicons.org/${slug}`} alt={name} className="w-5 h-5 object-contain" />;
  }

  const cat = category.toLowerCase();
  const n = name.toLowerCase();
  
  if (n.includes('react') || n.includes('vue') || n.includes('next') || n.includes('nuxt')) return <Box className="w-5 h-5" />;
  if (cat.includes('cms')) return <LayoutTemplate className="w-5 h-5" />;
  if (cat.includes('styling') || n.includes('tailwind') || n.includes('bootstrap')) return <Palette className="w-5 h-5" />;
  if (cat.includes('server') || cat.includes('backend') || n.includes('express') || n.includes('nginx') || n.includes('apache')) return <Server className="w-5 h-5" />;
  if (cat.includes('library') || n.includes('jquery')) return <FileCode className="w-5 h-5" />;
  if (cat.includes('cdn') || n.includes('cloudflare')) return <Globe className="w-5 h-5" />;
  
  return <Cpu className="w-5 h-5" />;
}
