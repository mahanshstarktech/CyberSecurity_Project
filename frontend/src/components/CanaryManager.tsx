import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { CanaryItem, CanaryIncident } from '../types/fim';
import { Shield, Flame, AlertOctagon, CheckCircle2, Plus, RefreshCw, Lock } from 'lucide-react';
import { soundEngine } from '../services/soundEngine';

interface CanaryManagerProps {
  canaries: CanaryItem[];
  incidents: CanaryIncident[];
  onDeploy: () => Promise<CanaryItem[]>;
  onCheck: () => Promise<any>;
}

export const CanaryManager: React.FC<CanaryManagerProps> = ({
  canaries,
  incidents,
  onDeploy,
  onCheck
}) => {
  const [isDeploying, setIsDeploying] = useState(false);

  const handleDeploy = async () => {
    soundEngine.playTap();
    setIsDeploying(true);
    try {
      await onDeploy();
      soundEngine.playSuccess();
    } finally {
      setIsDeploying(false);
    }
  };

  const hasAlert = incidents.length > 0;

  return (
    <div className="apple-glass-card rounded-3xl p-6 border border-white/10 shadow-2xl relative">
      <div className="absolute top-0 right-0 w-80 h-80 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-6 border-b border-white/10">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 rounded-xl bg-cyan-500/20 text-cyan-400 flex items-center justify-center border border-cyan-500/30">
            <Flame className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-white tracking-tight">
              Ransomware Canary Traps & Entropy Guard
            </h3>
            <p className="text-xs text-white/60 font-mono">
              Deceptive honey files • Shannon entropy burst containment (T1486)
            </p>
          </div>
        </div>

        <button
          onClick={handleDeploy}
          disabled={isDeploying}
          className="flex items-center space-x-2 px-4 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold shadow-lg shadow-cyan-500/25 transition-all active:scale-95"
        >
          <Plus className="w-4 h-4" />
          <span>{isDeploying ? 'Deploying Traps...' : 'Deploy Canary Honeypots'}</span>
        </button>
      </div>

      {/* Ransomware Incidents Alert */}
      {hasAlert && (
        <div className="my-4 p-4 rounded-2xl bg-red-950/40 border border-red-500/40 text-red-300">
          <div className="flex items-start space-x-3">
            <AlertOctagon className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
            <div>
              <h4 className="font-semibold text-sm">CRITICAL: Canary Trap Triggered!</h4>
              <p className="text-xs mt-0.5 opacity-90 font-mono">
                An unauthorized process attempted to alter or encrypt a decoy canary file.
              </p>
            </div>
          </div>

          <div className="mt-3 space-y-2">
            {incidents.map((inc, i) => (
              <div key={i} className="p-3 rounded-xl bg-black/40 border border-red-500/20 text-xs font-mono">
                <div className="flex items-center justify-between text-red-400 font-semibold">
                  <span>{inc.event}</span>
                  <span>Entropy: {inc.current_entropy || 'N/A'}/8.0</span>
                </div>
                <div className="text-white/80 mt-1">{inc.detail}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Deployed Canary Traps List */}
      <div className="mt-6">
        <h4 className="text-xs font-semibold text-white/80 uppercase tracking-wider mb-3">
          Active Decoy Canary Traps ({canaries.length})
        </h4>

        {canaries.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {canaries.map((c) => (
              <div
                key={c.filename}
                className="p-4 rounded-2xl bg-white/[0.03] border border-white/10 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-white/90 truncate mr-2 font-mono">
                      {c.filename}
                    </span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                      ARMED
                    </span>
                  </div>
                  <p className="text-xs text-white/60 mt-1">{c.description}</p>
                </div>

                <div className="mt-3 pt-2 border-t border-white/5 text-[11px] font-mono text-white/40 truncate">
                  SHA-256: {c.sha256.slice(0, 16)}...
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-6 rounded-2xl bg-white/[0.02] border border-dashed border-white/10 text-center text-xs text-white/50">
            No honey canaries currently deployed. Click 'Deploy Canary Honeypots' to place traps.
          </div>
        )}
      </div>
    </div>
  );
};
