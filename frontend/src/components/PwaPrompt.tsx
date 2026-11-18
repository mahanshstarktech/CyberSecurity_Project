import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Download, Share2, X, Smartphone, PlusSquare } from 'lucide-react';
import { soundEngine } from '../services/soundEngine';

export const PwaPrompt: React.FC = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [isIos, setIsIos] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);

  useEffect(() => {
    // Check if already running as standalone PWA
    const isRunningStandalone = window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone === true;
    setIsStandalone(isRunningStandalone);

    // Detect iOS
    const userAgent = window.navigator.userAgent.toLowerCase();
    const isIosDevice = /iphone|ipad|ipod/.test(userAgent);
    setIsIos(isIosDevice);

    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      if (!isRunningStandalone) {
        setShowPrompt(true);
      }
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);

    // If on iOS and not standalone, show once after delay
    if (isIosDevice && !isRunningStandalone) {
      const shown = localStorage.getItem('pwa_ios_prompt_shown');
      if (!shown) {
        const timer = setTimeout(() => setShowPrompt(true), 3000);
        return () => clearTimeout(timer);
      }
    }

    return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
  }, []);

  const handleInstallClick = async () => {
    soundEngine.playTap();
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const choice = await deferredPrompt.userChoice;
      if (choice.outcome === 'accepted') {
        soundEngine.playSuccess();
        setShowPrompt(false);
      }
      setDeferredPrompt(null);
    }
  };

  const handleDismiss = () => {
    soundEngine.playTap();
    setShowPrompt(false);
    if (isIos) {
      localStorage.setItem('pwa_ios_prompt_shown', 'true');
    }
  };

  if (!showPrompt || isStandalone) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-6 sm:w-96 z-40">
      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 20, scale: 0.96 }}
        className="apple-glass rounded-3xl p-5 border border-white/20 shadow-2xl relative overflow-hidden"
      >
        <button
          onClick={handleDismiss}
          className="absolute top-3 right-3 p-1 rounded-full text-white/40 hover:text-white"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="flex items-start space-x-3.5">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-blue-600 to-cyan-400 text-white flex items-center justify-center shrink-0 shadow-lg shadow-blue-500/30">
            <Smartphone className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-sm font-semibold text-white">Install AegisFIM PWA</h4>
            <p className="text-xs text-white/60 mt-1">
              {isIos
                ? 'Install on your iPhone home screen: tap Share and select "Add to Home Screen".'
                : 'Install AegisFIM for full native offline capabilities and instant launching.'}
            </p>
          </div>
        </div>

        <div className="mt-4 pt-3 border-t border-white/10 flex items-center justify-end space-x-2">
          {isIos ? (
            <div className="flex items-center space-x-1.5 text-xs text-blue-400 font-medium">
              <Share2 className="w-4 h-4" />
              <span>Tap Share</span>
              <PlusSquare className="w-4 h-4 ml-1" />
              <span>Add to Home</span>
            </div>
          ) : (
            <button
              onClick={handleInstallClick}
              className="flex items-center space-x-1.5 px-4 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shadow-md transition-all"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Install App</span>
            </button>
          )}
        </div>
      </motion.div>
    </div>
  );
};

