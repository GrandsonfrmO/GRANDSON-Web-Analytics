import React, { useState, useEffect } from 'react';
import { X, Shield } from 'lucide-react';

export function CookieConsent() {
  const [showBanner, setShowBanner] = useState(false);

  useEffect(() => {
    const consent = localStorage.getItem('cookieConsent');
    if (!consent) {
      setShowBanner(true);
    }
  }, []);

  const acceptCookies = () => {
    localStorage.setItem('cookieConsent', 'accepted');
    setShowBanner(false);
  };

  const rejectCookies = () => {
    localStorage.setItem('cookieConsent', 'rejected');
    setShowBanner(false);
  };

  if (!showBanner) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-[100] bg-white border-t border-slate-200 shadow-2xl animate-slide-up">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
          {/* Icon */}
          <div className="flex-shrink-0">
            <div className="w-10 h-10 sm:w-12 sm:h-12 bg-blue-100 rounded-full flex items-center justify-center">
              <Shield className="w-5 h-5 sm:w-6 sm:h-6 text-blue-600" />
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <h3 className="text-sm sm:text-base font-bold text-slate-900 mb-1">
              Respect de votre vie privée
            </h3>
            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
              Nous utilisons des cookies essentiels pour le fonctionnement du site et l'analyse des performances. 
              Aucune donnée personnelle n'est collectée ou partagée avec des tiers. 
              En continuant, vous acceptez notre utilisation des cookies.
            </p>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2 sm:gap-3 w-full sm:w-auto">
            <button
              onClick={rejectCookies}
              className="flex-1 sm:flex-none px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
            >
              Refuser
            </button>
            <button
              onClick={acceptCookies}
              className="flex-1 sm:flex-none px-6 py-2 text-sm font-bold text-white bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 rounded-lg shadow-md hover:shadow-lg transition-all"
            >
              Accepter
            </button>
          </div>

          {/* Close button (desktop only) */}
          <button
            onClick={rejectCookies}
            className="hidden sm:block absolute top-4 right-4 text-slate-400 hover:text-slate-600 transition-colors"
            aria-label="Fermer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
}
