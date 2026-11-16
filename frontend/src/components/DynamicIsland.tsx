import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ShieldCheck, AlertTriangle, ShieldAlert, Cpu, Bell, X, CheckCircle2 } from 'lucide-react';
import { soundEngine } from '../services/soundEngine';

export interface DynamicIslandEvent {
  id: string;
  type: 'INFO' | 'WARN' | 'DANGER' | 'SUCCESS';
  title: string;
  subtitle: string;
  actionText?: string;
  onAction?: () => void;
}

interface DynamicIslandProps {
  activeEvent: DynamicIslandEvent | null;
  onDismiss: () => void;
}

export const DynamicIsland: React.FC<DynamicIslandProps> = ({ activeEvent, onDismiss }) => {
  const [isExpanded, setIsExpanded] = useState(false);

  useEffect(() => {
    if (activeEvent) {
      setIsExpanded(true);
      if (activeEvent.type === 'DANGER') {
        soundEngine.playCritical();
      } else if (activeEvent.type === 'WARN') {
        soundEngine.playWarning();
      } else if (activeEvent.type === 'SUCCESS') {
        soundEngine.playSuccess();
      }
      const timer = setTimeout(() => {
        setIsExpanded(false);
      }, 7000);
      return () => clearTimeout(timer);
    }
  }, [activeEvent]);

  return (
    <div className="fixed top-3 left-1/2 -translate-x-1/2 z-50 pointer-events-auto">
      <motion.div
        layout
        transition={{ type: 'spring', stiffness: 450, damping: 30 }}
        onClick={() => setIsExpanded(!isExpanded)}
        className={`bg-black/85 backdrop-blur-3xl text-white border border-white/15 rounded-full cursor-pointer shadow-2xl transition-colors ${
          activeEvent?.type === 'DANGER'
            ? 'shadow-[0_0_35px_rgba(255,69,58,0.45)] border-red-500/40'
            : activeEvent?.type === 'WARN'
            ? 'shadow-[0_0_30px_rgba(255,159,10,0.35)] border-amber-500/40'
            : 'shadow-[0_0_25px_rgba(0,113,227,0.3)]'
        }`}
        style={{
          minWidth: isExpanded ? '380px' : '220px',
          maxWidth: '92vw'
        }}
      >
        <AnimatePresence mode="wait">
          {!isExpanded ? (
            /* Idle Pill State */
            <motion.div
              key="compact"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="flex items-center justify-between px-4 py-2 text-xs font-medium"
            >
              <div className="flex items-center space-x-2">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </span>
                <span className="tracking-wide text-white/90">AegisFIM Sentinel</span>
              </div>
              <div className="flex items-center space-x-1.5 text-white/60 text-[11px] font-mono">
                <ShieldCheck className="w-3.5 h-3.5 text-blue-400" />
                <span>SHA-256</span>
              </div>
            </motion.div>
          ) : (
            /* Expanded Island State */
            <motion.div
              key="expanded"
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              className="p-4"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center space-x-3">
                  <div
                    className={`w-9 h-9 rounded-2xl flex items-center justify-center shrink-0 ${
                      activeEvent?.type === 'DANGER'
                        ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                        : activeEvent?.type === 'WARN'
                        ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                        : 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                    }`}
                  >
                    {activeEvent?.type === 'DANGER' ? (
                      <ShieldAlert className="w-5 h-5" />
                    ) : activeEvent?.type === 'WARN' ? (
                      <AlertTriangle className="w-5 h-5" />
                    ) : (
                      <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                    )}
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold tracking-tight text-white">
                      {activeEvent?.title || 'System Monitored & Secure'}
                    </h4>
                    <p className="text-xs text-white/70 line-clamp-2 mt-0.5 font-mono">
                      {activeEvent?.subtitle || 'Zero unauthorized drift detected in baseline.'}
                    </p>
                  </div>
                </div>

                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsExpanded(false);
                    onDismiss();
                  }}
                  className="text-white/40 hover:text-white/80 p-1 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {activeEvent?.actionText && (
                <div className="mt-3 pt-2 border-t border-white/10 flex justify-end">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      activeEvent.onAction?.();
                      setIsExpanded(false);
                    }}
                    className="px-3 py-1 bg-white/15 hover:bg-white/25 text-white text-xs font-semibold rounded-lg transition-all"
                  >
                    {activeEvent.actionText}
                  </button>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
};
