import React, { useState } from 'react';
import { Search, Loader2, TrendingUp, TrendingDown, Minus, Trophy, AlertTriangle } from 'lucide-react';
import { cn } from '../utils';

interface CompareResult {
  site1: any;
  site2: any;
  comparison: any;
}

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

  const getWinnerIcon = (winner: string) => {
    if (winner === 'site1') return <TrendingUp className="w-5 h-5 text-green-500" />;
    if (winner === 'site2') return <TrendingDown className="w-5 h-5 text-red-500" />;
    return <Minus className="w-5 h-5 text-gray-400" />;
  };

  const getWinnerBadge = (winner: string, site: 'site1' | 'site2') => {
    if (winner === site) {
      return <Trophy className="w-4 h-4 text-yellow-500" />;
    }
    return null;
  };

  return (
    <div className="space-y-6">
      {/* Formulaire de comparaison */}
      <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100">
        <h2 className="text-2xl font-bold mb-6 text-gray-900">Comparer deux sites</h2>
        
        <div className="grid md:grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Site 1</label>
            <input
              type="text"
              value={url1}
              onChange={(e) => setUrl1(e.target.value)}
              placeholder="example.com"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Site 2</label>
            <input
              type="text"
              value={url2}
              onChange={(e) => setUrl2(e.target.value)}
              placeholder="competitor.com"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>

        <button
          onClick={handleCompare}
          disabled={loading}
          className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white py-3 px-6 rounded-lg font-semibold hover:from-blue-700 hover:to-purple-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {loading ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              Comparaison en cours...
            </>
          ) : (
            <>
              <Search className="w-5 h-5" />
              Comparer
            </>
          )}
        </button>

        {error && (
          <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
            <p className="text-red-700">{error}</p>
          </div>
        )}
      </div>

      {/* Résultats de comparaison */}
      {result && (
        <div className="space-y-6">
          {/* Gagnant global */}
          <div className="bg-gradient-to-r from-yellow-50 to-orange-50 rounded-xl shadow-lg p-6 border border-yellow-200">
            <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
              <Trophy className="w-6 h-6 text-yellow-600" />
              Gagnant Global
            </h3>
            <p className="text-2xl font-bold text-gray-900">
              {result.comparison.summary.winner === 'site1' ? result.site1.name :
               result.comparison.summary.winner === 'site2' ? result.site2.name :
               'Égalité'}
            </p>
          </div>

          {/* Scores */}
          <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100">
            <h3 className="text-xl font-bold mb-4">Scores</h3>
            <div className="space-y-4">
              {Object.entries(result.comparison.scores).map(([key, value]: [string, any]) => (
                <div key={key} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <span className="font-medium capitalize">{key}</span>
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                      {getWinnerBadge(value.winner, 'site1')}
                      <span className={cn(
                        "font-bold",
                        value.winner === 'site1' ? 'text-green-600' : 'text-gray-600'
                      )}>
                        {value.site1}
                      </span>
                    </div>
                    <span className="text-gray-400">vs</span>
                    <div className="flex items-center gap-2">
                      {getWinnerBadge(value.winner, 'site2')}
                      <span className={cn(
                        "font-bold",
                        value.winner === 'site2' ? 'text-green-600' : 'text-gray-600'
                      )}>
                        {value.site2}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Technologies */}
          <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100">
            <h3 className="text-xl font-bold mb-4">Technologies</h3>
            <div className="grid md:grid-cols-3 gap-4">
              <div>
                <h4 className="font-semibold text-blue-600 mb-2">Uniquement {result.site1.name}</h4>
                <div className="space-y-1">
                  {result.comparison.technologies.site1Only.map((tech: any, i: number) => (
                    <div key={i} className="text-sm text-gray-700">{tech.name}</div>
                  ))}
                </div>
              </div>
              <div>
                <h4 className="font-semibold text-green-600 mb-2">En commun</h4>
                <div className="space-y-1">
                  {result.comparison.technologies.common.map((tech: any, i: number) => (
                    <div key={i} className="text-sm text-gray-700">{tech.name}</div>
                  ))}
                </div>
              </div>
              <div>
                <h4 className="font-semibold text-purple-600 mb-2">Uniquement {result.site2.name}</h4>
                <div className="space-y-1">
                  {result.comparison.technologies.site2Only.map((tech: any, i: number) => (
                    <div key={i} className="text-sm text-gray-700">{tech.name}</div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Forces et Faiblesses */}
          <div className="grid md:grid-cols-2 gap-6">
            <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100">
              <h3 className="text-xl font-bold mb-4">{result.site1.name}</h3>
              <div className="space-y-4">
                <div>
                  <h4 className="font-semibold text-green-600 mb-2">Forces</h4>
                  <ul className="space-y-1">
                    {result.comparison.summary.strengths.site1.map((s: string, i: number) => (
                      <li key={i} className="text-sm text-gray-700">✓ {s}</li>
                    ))}
                  </ul>
                </div>
                <div>
                  <h4 className="font-semibold text-red-600 mb-2">Faiblesses</h4>
                  <ul className="space-y-1">
                    {result.comparison.summary.weaknesses.site1.map((w: string, i: number) => (
                      <li key={i} className="text-sm text-gray-700">✗ {w}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100">
              <h3 className="text-xl font-bold mb-4">{result.site2.name}</h3>
              <div className="space-y-4">
                <div>
                  <h4 className="font-semibold text-green-600 mb-2">Forces</h4>
                  <ul className="space-y-1">
                    {result.comparison.summary.strengths.site2.map((s: string, i: number) => (
                      <li key={i} className="text-sm text-gray-700">✓ {s}</li>
                    ))}
                  </ul>
                </div>
                <div>
                  <h4 className="font-semibold text-red-600 mb-2">Faiblesses</h4>
                  <ul className="space-y-1">
                    {result.comparison.summary.weaknesses.site2.map((w: string, i: number) => (
                      <li key={i} className="text-sm text-gray-700">✗ {w}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
