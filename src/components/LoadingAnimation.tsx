import React from 'react';
import { Globe, Zap, Shield, BarChart3 } from 'lucide-react';
import { motion } from 'motion/react';

interface LoadingAnimationProps {
  stage?: 'fetching' | 'analyzing' | 'processing' | 'complete';
}

const stages = [
  { id: 'fetching', label: 'Récupération du site', icon: Globe, color: 'text-blue-500' },
  { id: 'analyzing', label: 'Analyse technologique', icon: Zap, color: 'text-amber-500' },
  { id: 'processing', label: 'Évaluation sécurité', icon: Shield, color: 'text-emerald-500' },
  { id: 'complete', label: 'Génération du rapport', icon: BarChart3, color: 'text-violet-500' },
];

export function LoadingAnimation({ stage = 'fetching' }: LoadingAnimationProps) {
  const currentStageIndex = stages.findIndex(s => s.id === stage);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="w-full max-w-2xl mx-auto p-8 bg-white rounded-3xl border border-slate-200 shadow-sm space-y-8"
    >
      {/* Main Loading Spinner */}
      <div className="flex flex-col items-center gap-6">
        <div className="relative w-24 h-24">
          {/* Outer rotating ring */}
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}
            className="absolute inset-0 border-4 border-transparent border-t-amber-500 border-r-amber-500 rounded-full"
          />
          
          {/* Middle pulsing ring */}
          <motion.div
            animate={{ scale: [1, 1.2, 1] }}
            transition={{ duration: 2, repeat: Infinity }}
            className="absolute inset-2 border-2 border-slate-200 rounded-full"
          />
          
          {/* Center icon */}
          <div className="absolute inset-0 flex items-center justify-center">
            <motion.div
              animate={{ scale: [1, 1.1, 1] }}
              transition={{ duration: 1.5, repeat: Infinity }}
            >
              <Globe className="w-10 h-10 text-slate-700" />
            </motion.div>
          </div>
        </div>

        <div className="text-center">
          <h3 className="text-xl font-bold text-slate-900 mb-2">Analyse en cours...</h3>
          <p className="text-slate-500 text-sm">Nous scannons les technologies, la sécurité et les performances du site.</p>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="space-y-3">
        <div className="flex justify-between items-center">
          <span className="text-xs font-semibold text-slate-600">Progression</span>
          <span className="text-xs font-bold text-amber-600">{Math.round(((currentStageIndex + 1) / stages.length) * 100)}%</span>
        </div>
        <motion.div
          className="w-full h-2 bg-slate-100 rounded-full overflow-hidden"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          <motion.div
            className="h-full bg-gradient-to-r from-amber-400 to-orange-500 rounded-full"
            initial={{ width: '0%' }}
            animate={{ width: `${((currentStageIndex + 1) / stages.length) * 100}%` }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
          />
        </motion.div>
      </div>

      {/* Stage Indicators */}
      <div className="space-y-3">
        {stages.map((s, idx) => {
          const Icon = s.icon;
          const isActive = idx === currentStageIndex;
          const isCompleted = idx < currentStageIndex;

          return (
            <motion.div
              key={s.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: idx * 0.1 }}
              className={`flex items-center gap-4 p-4 rounded-2xl border transition-all ${
                isActive
                  ? 'bg-amber-50 border-amber-200 shadow-sm'
                  : isCompleted
                  ? 'bg-emerald-50 border-emerald-200'
                  : 'bg-slate-50 border-slate-200'
              }`}
            >
              <div className={`relative w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                isActive
                  ? `${s.color} bg-white`
                  : isCompleted
                  ? 'bg-emerald-500 text-white'
                  : 'bg-slate-200 text-slate-400'
              }`}>
                {isActive ? (
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
                  >
                    <Icon className="w-4 h-4" />
                  </motion.div>
                ) : isCompleted ? (
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                ) : (
                  <Icon className="w-4 h-4" />
                )}
              </div>
              <div className="flex-1">
                <p className={`text-sm font-semibold ${
                  isActive
                    ? 'text-amber-900'
                    : isCompleted
                    ? 'text-emerald-900'
                    : 'text-slate-600'
                }`}>
                  {s.label}
                </p>
              </div>
              {isActive && (
                <motion.div
                  animate={{ opacity: [0.5, 1, 0.5] }}
                  transition={{ duration: 1.5, repeat: Infinity }}
                  className="w-2 h-2 rounded-full bg-amber-500"
                />
              )}
            </motion.div>
          );
        })}
      </div>

      {/* Animated dots */}
      <div className="flex justify-center gap-2">
        {[0, 1, 2].map((i) => (
          <motion.div
            key={i}
            animate={{ y: [0, -8, 0] }}
            transition={{ duration: 0.6, repeat: Infinity, delay: i * 0.1 }}
            className="w-2 h-2 rounded-full bg-amber-400"
          />
        ))}
      </div>
    </motion.div>
  );
}
