import React, { useState } from 'react';
import { Search, Loader2, TrendingUp, TrendingDown, Minus, Trophy, AlertTriangle, Shield, Zap, Code2, Award, Target, CheckCircle2, XCircle, Clock, Gauge, Bot, DollarSign, Layers } from 'lucide-react';
import { cn } from '../utils';
import { motion } from 'motion/react';
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
  CartesianGrid,
  Cell,
  Legend
} from 'recharts';

interface CompareResult {
  site1: any;
  site2: any;
  comparison: any;
}

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5 } }
};

export function CompareMode() {
  const [url1, setUrl1] = useState('');
  const [url2, setUrl2] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<CompareResult | null>(null);

  const handleCompare = async () => {
    if (!url1.trim() || !url2.trim()) {
      setError('Veuillez entrer deux URLs');
      return;
    }

    setLoading(true);
    setError('');
    setResult(null);

    try {
      const response = await fetch('/api/compare', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url1: url1.trim(), url2: url2.trim() })
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Erreur lors de la comparaison');
      }

      const data = await response.json();
      setResult(data);
    } catch (err: any) {
      setError(err.message || 'Erreur lors de la comparaison');
    } finally {
      setLoading(false);
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return "text-emerald-500";
    if (score >= 50) return "text-amber-500";
    return "text-red-500";
  };

  const getScoreBgColor = (score: number) => {
    if (score >= 80) return "bg-emerald-50 border-emerald-200";
    if (score >= 50) return "bg-amber-50 border-amber-200";
    return "bg-red-50 border-red-200";
  };

  const radarData = React.useMemo(() => {
    if (!result) return [];
    return [
      { 
        subject: 'Sécurité', 
        site1: result.comparison.scores.security.site1,
        site2: result.comparison.scores.security.site2,
        fullMark: 100 
      },
      { 
        subject: 'UX/SEO', 
        site1: result.comparison.scores.ux.site1,
        site2: result.comparison.scores.ux.site2,
        fullMark: 100 
      },
      { 
        subject: 'Performance', 
        site1: result.comparison.scores.performance.site1,
        site2: result.comparison.scores.performance.site2,
        fullMark: 100 
      },
      { 
        subject: 'Global', 
        site1: result.comparison.scores.overall.site1,
        site2: result.comparison.scores.overall.site2,
        fullMark: 100 
      }
    ];
  }, [result]);

  const barData = React.useMemo(() => {
    if (!result) return [];
    return [
      {
        name: 'Sécurité',
        [result.site1.name]: result.comparison.scores.security.site1,
        [result.site2.name]: result.comparison.scores.security.site2
      },
      {
        name: 'UX',
        [result.site1.name]: result.comparison.scores.ux.site1,
        [result.site2.name]: result.comparison.scores.ux.site2
      },
      {
        name: 'Perf',
        [result.site1.name]: result.comparison.scores.performance.site1,
        [result.site2.name]: result.comparison.scores.performance.site2
      },
      {
        name: 'Global',
        [result.site1.name]: result.comparison.scores.overall.site1,
        [result.site2.name]: result.comparison.scores.overall.site2
      }
    ];
  }, [result]);

  return (
    <div className="space-y-6 sm:space-y-8">
      {/* Formulaire de comparaison - Gradient Design */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative bg-white/70 backdrop-blur-xl rounded-[2.5rem] shadow-sm border border-slate-200/60 p-6 sm:p-10 overflow-hidden"
      >
        <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-bl from-purple-50 via-blue-50/30 to-transparent rounded-full -mr-20 -mt-20 opacity-70 pointer-events-none"></div>
        
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-3 bg-gradient-to-br from-purple-500 to-blue-600 rounded-2xl shadow-lg">
              <Target className="w-6 h-6 text-white" />
            </div>
            <h2 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight">Comparer deux sites</h2>
          </div>
          
          <div className="grid md:grid-cols-2 gap-4 mb-6">
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2 uppercase tracking-wider">Site 1</label>
              <input
                type="text"
                value={url1}
                onChange={(e) => setUrl1(e.target.value)}
                placeholder="example.com"
                className="w-full px-5 py-4 border-2 border-slate-200/80 rounded-2xl focus:ring-4 focus:ring-purple-500/20 focus:border-purple-500 transition-all outline-none font-medium bg-white shadow-sm"
              />
            </div>
            
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2 uppercase tracking-wider">Site 2</label>
              <input
                type="text"
                value={url2}
                onChange={(e) => setUrl2(e.target.value)}
                placeholder="competitor.com"
                className="w-full px-5 py-4 border-2 border-slate-200/80 rounded-2xl focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 transition-all outline-none font-medium bg-white shadow-sm"
              />
            </div>
          </div>

          <button
            onClick={handleCompare}
            disabled={loading}
            className="w-full bg-gradient-to-r from-purple-600 via-blue-600 to-purple-600 bg-size-200 bg-pos-0 hover:bg-pos-100 text-white py-4 px-6 rounded-2xl font-bold shadow-lg shadow-purple-500/30 hover:shadow-xl hover:shadow-purple-500/40 hover:-translate-y-0.5 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Comparaison en cours...
              </>
            ) : (
              <>
                <Search className="w-5 h-5" />
                Comparer les sites
              </>
            )}
          </button>

          {error && (
            <motion.div 
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-4 p-4 bg-red-50 border-2 border-red-200 rounded-2xl flex items-start gap-3"
            >
              <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
              <p className="text-red-700 font-semibold">{error}</p>
            </motion.div>
          )}
        </div>
      </motion.div>

      {/* Résultats de comparaison */}
      {result && (
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
          {/* Gagnant global - Hero Card */}
          <motion.div 
            variants={itemVariants}
            className="relative bg-gradient-to-br from-amber-50 via-orange-50 to-yellow-50 rounded-[2.5rem] shadow-lg border-2 border-amber-200/60 p-8 sm:p-12 overflow-hidden"
          >
            <div className="absolute top-0 left-0 w-64 h-64 bg-gradient-to-br from-yellow-200/40 to-transparent rounded-full -ml-20 -mt-20 blur-3xl"></div>
            <div className="absolute bottom-0 right-0 w-64 h-64 bg-gradient-to-tl from-orange-200/40 to-transparent rounded-full -mr-20 -mb-20 blur-3xl"></div>
            
            <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-6">
              <div className="flex items-center gap-4">
                <div className="p-4 bg-gradient-to-br from-amber-400 to-orange-500 rounded-3xl shadow-xl">
                  <Trophy className="w-10 h-10 text-white" />
                </div>
                <div>
                  <p className="text-sm font-bold text-amber-700 uppercase tracking-wider mb-1">Gagnant Global</p>
                  <h3 className="text-4xl sm:text-5xl font-black text-slate-900 tracking-tight">
                    {result.comparison.summary.winner === 'site1' ? result.site1.name :
                     result.comparison.summary.winner === 'site2' ? result.site2.name :
                     'Égalité'}
                  </h3>
                </div>
              </div>
              
              <div className="flex gap-4">
                <div className={cn("px-6 py-3 rounded-2xl border-2 shadow-sm", 
                  result.comparison.summary.winner === 'site1' ? "bg-emerald-50 border-emerald-300" : "bg-slate-50 border-slate-200"
                )}>
                  <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Site 1</p>
                  <p className="text-2xl font-black text-slate-900">{result.comparison.scores.overall.site1}</p>
                </div>
                <div className={cn("px-6 py-3 rounded-2xl border-2 shadow-sm",
                  result.comparison.summary.winner === 'site2' ? "bg-emerald-50 border-emerald-300" : "bg-slate-50 border-slate-200"
                )}>
                  <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Site 2</p>
                  <p className="text-2xl font-black text-slate-900">{result.comparison.scores.overall.site2}</p>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Bento Grid - Scores & Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Radar Chart */}
            <motion.div 
              variants={itemVariants}
              className="bg-white rounded-[2rem] p-6 sm:p-8 border border-slate-200/60 shadow-sm hover:shadow-lg transition-all"
            >
              <div className="flex items-center gap-3 mb-6">
                <div className="p-3 bg-indigo-50 rounded-2xl border border-indigo-100">
                  <Gauge className="w-5 h-5 text-indigo-600" />
                </div>
                <h3 className="text-xl font-bold text-slate-900">Comparaison Radar</h3>
              </div>
              
              <ResponsiveContainer width="100%" height={300}>
                <RadarChart data={radarData}>
                  <PolarGrid stroke="#e2e8f0" />
                  <PolarAngleAxis dataKey="subject" stroke="#64748b" style={{ fontSize: '12px', fontWeight: 'bold' }} />
                  <PolarRadiusAxis stroke="#94a3b8" />
                  <Radar name={result.site1.name} dataKey="site1" stroke="#8b5cf6" fill="#8b5cf6" fillOpacity={0.5} />
                  <Radar name={result.site2.name} dataKey="site2" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.5} />
                  <Legend />
                  <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '12px', color: '#fff' }} />
                </RadarChart>
              </ResponsiveContainer>
            </motion.div>

            {/* Bar Chart */}
            <motion.div 
              variants={itemVariants}
              className="bg-white rounded-[2rem] p-6 sm:p-8 border border-slate-200/60 shadow-sm hover:shadow-lg transition-all"
            >
              <div className="flex items-center gap-3 mb-6">
                <div className="p-3 bg-amber-50 rounded-2xl border border-amber-100">
                  <BarChart className="w-5 h-5 text-amber-600" />
                </div>
                <h3 className="text-xl font-bold text-slate-900">Scores Détaillés</h3>
              </div>
              
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={barData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="name" stroke="#64748b" style={{ fontSize: '12px', fontWeight: 'bold' }} />
                  <YAxis stroke="#94a3b8" />
                  <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '12px', color: '#fff' }} />
                  <Legend />
                  <Bar dataKey={result.site1.name} fill="#8b5cf6" radius={[8, 8, 0, 0]} />
                  <Bar dataKey={result.site2.name} fill="#3b82f6" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </motion.div>
          </div>

          {/* Score Cards Grid */}
          <motion.div 
            variants={itemVariants}
            className="grid grid-cols-2 md:grid-cols-4 gap-4"
          >
            {Object.entries(result.comparison.scores).map(([key, value]: [string, any]) => (
              <div key={key} className="bg-white rounded-2xl p-5 border border-slate-200/60 shadow-sm hover:shadow-md transition-all">
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">{key}</p>
                <div className="flex items-center justify-between mb-2">
                  <span className={cn("text-2xl font-black", getScoreColor(value.site1))}>{value.site1}</span>
                  {value.winner === 'site1' && <Trophy className="w-4 h-4 text-amber-500" />}
                </div>
                <div className="flex items-center justify-between">
                  <span className={cn("text-2xl font-black", getScoreColor(value.site2))}>{value.site2}</span>
                  {value.winner === 'site2' && <Trophy className="w-4 h-4 text-amber-500" />}
                </div>
              </div>
            ))}
          </motion.div>

          {/* Technologies Comparison */}
          <motion.div 
            variants={itemVariants}
            className="bg-white rounded-[2rem] p-6 sm:p-8 border border-slate-200/60 shadow-sm hover:shadow-lg transition-all"
          >
            <div className="flex items-center gap-3 mb-6">
              <div className="p-3 bg-blue-50 rounded-2xl border border-blue-100">
                <Code2 className="w-5 h-5 text-blue-600" />
              </div>
              <h3 className="text-xl font-bold text-slate-900">Technologies</h3>
            </div>
            
            <div className="grid md:grid-cols-3 gap-6">
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-3 h-3 rounded-full bg-purple-500"></div>
                  <h4 className="font-bold text-purple-600 uppercase text-xs tracking-wider">Uniquement {result.site1.name}</h4>
                </div>
                <div className="space-y-2">
                  {result.comparison.technologies.site1Only.length > 0 ? (
                    result.comparison.technologies.site1Only.map((tech: any, i: number) => (
                      <div key={i} className="px-3 py-2 bg-purple-50 border border-purple-100 rounded-xl text-sm font-semibold text-slate-700">
                        {tech.name}
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-slate-400 italic">Aucune technologie unique</p>
                  )}
                </div>
              </div>
              
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-3 h-3 rounded-full bg-emerald-500"></div>
                  <h4 className="font-bold text-emerald-600 uppercase text-xs tracking-wider">En commun</h4>
                </div>
                <div className="space-y-2">
                  {result.comparison.technologies.common.length > 0 ? (
                    result.comparison.technologies.common.map((tech: any, i: number) => (
                      <div key={i} className="px-3 py-2 bg-emerald-50 border border-emerald-100 rounded-xl text-sm font-semibold text-slate-700">
                        {tech.name}
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-slate-400 italic">Aucune technologie commune</p>
                  )}
                </div>
              </div>
              
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                  <h4 className="font-bold text-blue-600 uppercase text-xs tracking-wider">Uniquement {result.site2.name}</h4>
                </div>
                <div className="space-y-2">
                  {result.comparison.technologies.site2Only.length > 0 ? (
                    result.comparison.technologies.site2Only.map((tech: any, i: number) => (
                      <div key={i} className="px-3 py-2 bg-blue-50 border border-blue-100 rounded-xl text-sm font-semibold text-slate-700">
                        {tech.name}
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-slate-400 italic">Aucune technologie unique</p>
                  )}
                </div>
              </div>
            </div>
          </motion.div>

          {/* Performance Metrics */}
          <motion.div 
            variants={itemVariants}
            className="bg-white rounded-[2rem] p-6 sm:p-8 border border-slate-200/60 shadow-sm hover:shadow-lg transition-all"
          >
            <div className="flex items-center gap-3 mb-6">
              <div className="p-3 bg-amber-50 rounded-2xl border border-amber-100">
                <Zap className="w-5 h-5 text-amber-600" />
              </div>
              <h3 className="text-xl font-bold text-slate-900">Performance</h3>
            </div>
            
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                <div className="flex items-center gap-2 mb-2">
                  <Clock className="w-4 h-4 text-slate-400" />
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Temps de chargement</p>
                </div>
                <p className={cn("text-xl font-black mb-1", 
                  result.comparison.performance.loadTime.winner === 'site1' ? "text-emerald-600" : "text-slate-700"
                )}>{result.comparison.performance.loadTime.site1}ms</p>
                <p className={cn("text-xl font-black",
                  result.comparison.performance.loadTime.winner === 'site2' ? "text-emerald-600" : "text-slate-700"
                )}>{result.comparison.performance.loadTime.site2}ms</p>
              </div>
              
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Poids HTML</p>
                <p className={cn("text-xl font-black mb-1",
                  result.comparison.performance.htmlSize.winner === 'site1' ? "text-emerald-600" : "text-slate-700"
                )}>{result.comparison.performance.htmlSize.site1}KB</p>
                <p className={cn("text-xl font-black",
                  result.comparison.performance.htmlSize.winner === 'site2' ? "text-emerald-600" : "text-slate-700"
                )}>{result.comparison.performance.htmlSize.site2}KB</p>
              </div>
              
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Scripts JS</p>
                <p className="text-xl font-black text-slate-700 mb-1">{result.comparison.performance.scripts.site1}</p>
                <p className="text-xl font-black text-slate-700">{result.comparison.performance.scripts.site2}</p>
              </div>
              
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Images</p>
                <p className="text-xl font-black text-slate-700 mb-1">{result.comparison.performance.images.site1}</p>
                <p className="text-xl font-black text-slate-700">{result.comparison.performance.images.site2}</p>
              </div>
            </div>
          </motion.div>

          {/* Security & Developer Level */}
          <div className="grid md:grid-cols-2 gap-6">
            {/* Security */}
            <motion.div 
              variants={itemVariants}
              className="bg-white rounded-[2rem] p-6 sm:p-8 border border-slate-200/60 shadow-sm hover:shadow-lg transition-all"
            >
              <div className="flex items-center gap-3 mb-6">
                <div className="p-3 bg-emerald-50 rounded-2xl border border-emerald-100">
                  <Shield className="w-5 h-5 text-emerald-600" />
                </div>
                <h3 className="text-xl font-bold text-slate-900">Sécurité</h3>
              </div>
              
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className={cn("p-4 rounded-2xl border-2", getScoreBgColor(result.comparison.scores.security.site1))}>
                    <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">{result.site1.name}</p>
                    <p className={cn("text-3xl font-black", getScoreColor(result.comparison.scores.security.site1))}>
                      {result.comparison.scores.security.site1}
                    </p>
                  </div>
                  <div className={cn("p-4 rounded-2xl border-2", getScoreBgColor(result.comparison.scores.security.site2))}>
                    <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">{result.site2.name}</p>
                    <p className={cn("text-3xl font-black", getScoreColor(result.comparison.scores.security.site2))}>
                      {result.comparison.scores.security.site2}
                    </p>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl">
                    <span className="text-sm font-semibold text-slate-700">HTTPS</span>
                    <div className="flex gap-3">
                      {result.comparison.security.site1.https ? 
                        <CheckCircle2 className="w-5 h-5 text-emerald-500" /> : 
                        <XCircle className="w-5 h-5 text-red-500" />
                      }
                      {result.comparison.security.site2.https ? 
                        <CheckCircle2 className="w-5 h-5 text-emerald-500" /> : 
                        <XCircle className="w-5 h-5 text-red-500" />
                      }
                    </div>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl">
                    <span className="text-sm font-semibold text-slate-700">HSTS</span>
                    <div className="flex gap-3">
                      {result.comparison.security.site1.hsts ? 
                        <CheckCircle2 className="w-5 h-5 text-emerald-500" /> : 
                        <XCircle className="w-5 h-5 text-red-500" />
                      }
                      {result.comparison.security.site2.hsts ? 
                        <CheckCircle2 className="w-5 h-5 text-emerald-500" /> : 
                        <XCircle className="w-5 h-5 text-red-500" />
                      }
                    </div>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl">
                    <span className="text-sm font-semibold text-slate-700">CSP</span>
                    <div className="flex gap-3">
                      {result.comparison.security.site1.csp ? 
                        <CheckCircle2 className="w-5 h-5 text-emerald-500" /> : 
                        <XCircle className="w-5 h-5 text-red-500" />
                      }
                      {result.comparison.security.site2.csp ? 
                        <CheckCircle2 className="w-5 h-5 text-emerald-500" /> : 
                        <XCircle className="w-5 h-5 text-red-500" />
                      }
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>

            {/* Developer Level & AI */}
            <motion.div 
              variants={itemVariants}
              className="bg-white rounded-[2rem] p-6 sm:p-8 border border-slate-200/60 shadow-sm hover:shadow-lg transition-all"
            >
              <div className="flex items-center gap-3 mb-6">
                <div className="p-3 bg-violet-50 rounded-2xl border border-violet-100">
                  <Award className="w-5 h-5 text-violet-600" />
                </div>
                <h3 className="text-xl font-bold text-slate-900">Développeur & IA</h3>
              </div>
              
              <div className="space-y-6">
                <div>
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Niveau Développeur</p>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-4 bg-gradient-to-br from-violet-50 to-purple-50 rounded-2xl border border-violet-200">
                      <p className="text-xs font-bold text-violet-600 mb-1">{result.site1.name}</p>
                      <p className="text-2xl font-black text-slate-900">{result.comparison.developer.site1.level}</p>
                      <p className="text-sm font-bold text-slate-600 mt-1">{result.comparison.developer.site1.score} pts</p>
                    </div>
                    <div className="p-4 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl border border-blue-200">
                      <p className="text-xs font-bold text-blue-600 mb-1">{result.site2.name}</p>
                      <p className="text-2xl font-black text-slate-900">{result.comparison.developer.site2.level}</p>
                      <p className="text-sm font-bold text-slate-600 mt-1">{result.comparison.developer.site2.score} pts</p>
                    </div>
                  </div>
                </div>
                
                <div>
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Probabilité IA</p>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 flex flex-col items-center">
                      <Bot className="w-6 h-6 text-violet-500 mb-2" />
                      <p className="text-3xl font-black text-slate-900">{result.comparison.ai.site1}%</p>
                    </div>
                    <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 flex flex-col items-center">
                      <Bot className="w-6 h-6 text-violet-500 mb-2" />
                      <p className="text-3xl font-black text-slate-900">{result.comparison.ai.site2}%</p>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>

          {/* Pricing Comparison */}
          <motion.div 
            variants={itemVariants}
            className="bg-gradient-to-br from-green-50 via-emerald-50 to-teal-50 rounded-[2rem] p-6 sm:p-8 border border-emerald-200/60 shadow-sm"
          >
            <div className="flex items-center gap-3 mb-6">
              <div className="p-3 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-2xl shadow-lg">
                <DollarSign className="w-5 h-5 text-white" />
              </div>
              <h3 className="text-xl font-bold text-slate-900">Estimation Tarifaire</h3>
            </div>
            
            <div className="grid md:grid-cols-3 gap-4">
              <div className="bg-white/80 backdrop-blur-sm p-5 rounded-2xl border border-emerald-200 shadow-sm">
                <p className="text-xs font-bold text-emerald-700 uppercase tracking-wider mb-3">Freelance</p>
                <p className="text-2xl font-black text-slate-900 mb-1">{result.comparison.pricing.site1.freelance.toLocaleString()} GNF</p>
                <p className="text-2xl font-black text-slate-900">{result.comparison.pricing.site2.freelance.toLocaleString()} GNF</p>
                <p className="text-xs text-slate-500 mt-2 font-semibold">Diff: {result.comparison.pricing.difference.freelance.toLocaleString()} GNF</p>
              </div>
              
              <div className="bg-white/80 backdrop-blur-sm p-5 rounded-2xl border border-emerald-200 shadow-sm">
                <p className="text-xs font-bold text-emerald-700 uppercase tracking-wider mb-3">Agence</p>
                <p className="text-2xl font-black text-slate-900 mb-1">{result.comparison.pricing.site1.agency.toLocaleString()} GNF</p>
                <p className="text-2xl font-black text-slate-900">{result.comparison.pricing.site2.agency.toLocaleString()} GNF</p>
                <p className="text-xs text-slate-500 mt-2 font-semibold">Diff: {result.comparison.pricing.difference.agency.toLocaleString()} GNF</p>
              </div>
              
              <div className="bg-white/80 backdrop-blur-sm p-5 rounded-2xl border border-emerald-200 shadow-sm">
                <p className="text-xs font-bold text-emerald-700 uppercase tracking-wider mb-3">Jours Estimés</p>
                <p className="text-2xl font-black text-slate-900 mb-1">{result.comparison.pricing.site1.days} jours</p>
                <p className="text-2xl font-black text-slate-900">{result.comparison.pricing.site2.days} jours</p>
                <p className="text-xs text-slate-500 mt-2 font-semibold">Diff: {result.comparison.pricing.difference.days} jours</p>
              </div>
            </div>
          </motion.div>

          {/* Forces et Faiblesses */}
          <div className="grid md:grid-cols-2 gap-6">
            {/* Site 1 */}
            <motion.div 
              variants={itemVariants}
              className="bg-white rounded-[2rem] p-6 sm:p-8 border border-slate-200/60 shadow-sm hover:shadow-lg transition-all"
            >
              <div className="flex items-center gap-3 mb-6">
                <div className="w-3 h-3 rounded-full bg-purple-500"></div>
                <h3 className="text-xl font-bold text-slate-900">{result.site1.name}</h3>
              </div>
              
              <div className="space-y-6">
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                    <h4 className="font-bold text-emerald-600 uppercase text-xs tracking-wider">Forces</h4>
                  </div>
                  <ul className="space-y-2">
                    {result.comparison.summary.strengths.site1.length > 0 ? (
                      result.comparison.summary.strengths.site1.map((s: string, i: number) => (
                        <li key={i} className="flex items-start gap-2 text-sm text-slate-700 font-medium">
                          <span className="text-emerald-500 font-bold">✓</span>
                          <span>{s}</span>
                        </li>
                      ))
                    ) : (
                      <p className="text-sm text-slate-400 italic">Aucune force identifiée</p>
                    )}
                  </ul>
                </div>
                
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <XCircle className="w-5 h-5 text-red-500" />
                    <h4 className="font-bold text-red-600 uppercase text-xs tracking-wider">Faiblesses</h4>
                  </div>
                  <ul className="space-y-2">
                    {result.comparison.summary.weaknesses.site1.length > 0 ? (
                      result.comparison.summary.weaknesses.site1.map((w: string, i: number) => (
                        <li key={i} className="flex items-start gap-2 text-sm text-slate-700 font-medium">
                          <span className="text-red-500 font-bold">✗</span>
                          <span>{w}</span>
                        </li>
                      ))
                    ) : (
                      <p className="text-sm text-slate-400 italic">Aucune faiblesse identifiée</p>
                    )}
                  </ul>
                </div>
              </div>
            </motion.div>

            {/* Site 2 */}
            <motion.div 
              variants={itemVariants}
              className="bg-white rounded-[2rem] p-6 sm:p-8 border border-slate-200/60 shadow-sm hover:shadow-lg transition-all"
            >
              <div className="flex items-center gap-3 mb-6">
                <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                <h3 className="text-xl font-bold text-slate-900">{result.site2.name}</h3>
              </div>
              
              <div className="space-y-6">
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                    <h4 className="font-bold text-emerald-600 uppercase text-xs tracking-wider">Forces</h4>
                  </div>
                  <ul className="space-y-2">
                    {result.comparison.summary.strengths.site2.length > 0 ? (
                      result.comparison.summary.strengths.site2.map((s: string, i: number) => (
                        <li key={i} className="flex items-start gap-2 text-sm text-slate-700 font-medium">
                          <span className="text-emerald-500 font-bold">✓</span>
                          <span>{s}</span>
                        </li>
                      ))
                    ) : (
                      <p className="text-sm text-slate-400 italic">Aucune force identifiée</p>
                    )}
                  </ul>
                </div>
                
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <XCircle className="w-5 h-5 text-red-500" />
                    <h4 className="font-bold text-red-600 uppercase text-xs tracking-wider">Faiblesses</h4>
                  </div>
                  <ul className="space-y-2">
                    {result.comparison.summary.weaknesses.site2.length > 0 ? (
                      result.comparison.summary.weaknesses.site2.map((w: string, i: number) => (
                        <li key={i} className="flex items-start gap-2 text-sm text-slate-700 font-medium">
                          <span className="text-red-500 font-bold">✗</span>
                          <span>{w}</span>
                        </li>
                      ))
                    ) : (
                      <p className="text-sm text-slate-400 italic">Aucune faiblesse identifiée</p>
                    )}
                  </ul>
                </div>
              </div>
            </motion.div>
          </div>
        </motion.div>
      )}
    </div>
  );
}
