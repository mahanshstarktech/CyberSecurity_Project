import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { RootkitAuditResult } from '../types/fim';
import { Bug, ShieldAlert, CheckCircle2, AlertTriangle, Terminal, Cpu, Search, RefreshCw } from 'lucide-react';
import { soundEngine } from '../services/soundEngine';

interface RootkitInspectorProps {
  auditResult: RootkitAuditResult | null;
  onRunAudit: () => Promise<RootkitAuditResult>;
}

export const RootkitInspector: React.FC<RootkitInspectorProps> = ({ auditResult, onRunAudit }) => {
  const [isRunning, setIsRunning] = useState(false);

  const handleAudit = async () => {
    soundEngine.playTap();
    setIsRunning(true);
    try {
      const res = await onRunAudit();
      if (res.threat_score >= 50) {
        soundEngine.playCritical();
      } else if (res.threat_score > 0) {
        soundEngine.playWarning();
      } else {
        soundEngine.playSuccess();
      }
    } finally {
      setIsRunning(false);
    }
  };

  const threatScore = auditResult?.threat_score || 0;

  return (
    <div className="apple-glass-card rounded-3xl p-6 border border-white/10 shadow-2xl relative">
      {/* Background glow */}
      <div className="absolute top-0 right-0 w-80 h-80 bg-rose-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-6 border-b border-white/10">
        <div>
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 rounded-xl bg-rose-500/20 text-rose-400 flex items-center justify-center border border-rose-500/30">
              <Bug className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-white tracking-tight">
                Exp 5: Deep Rootkit & Kernel-Level Integrity
              </h3>
            </div>
          </div>
          <p className="text-xs text-white/60 mt-1 font-mono">
            Cross-view evasion heuristics • Dynamic linker hooks • Timestomp detection
          </p>
        </div>

        <button
          onClick={handleAudit}
          disabled={isRunning}
          className="flex items-center space-x-2 px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold shadow-lg shadow-rose-500/25 transition-all active:scale-95"
        >
          <Search className="w-4 h-4" />
          <span>{isRunning ? 'Auditing Inodes...' : 'Scan Rootkit Vectors'}</span>
        </button>
      </div>

      {/* Threat Index Gauge & Status */}
      <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Threat Score Card */}
        <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/10">
          <div className="text-xs font-medium text-white/60">Rootkit Threat Index</div>
          <div className="flex items-baseline space-x-2 mt-2">
            <span
              className={`text-3xl font-extrabold font-mono ${
                threatScore >= 50
                  ? 'text-red-400'
                  : threatScore > 0
                  ? 'text-amber-400'
                  : 'text-emerald-400'
              }`}
            >
              {threatScore}
            </span>
            <span className="text-xs text-white/40 font-mono">/ 100</span>
          </div>
          <div className="w-full bg-white/10 h-1.5 rounded-full overflow-hidden mt-3">
            <div
              className={`h-full transition-all duration-500 ${
                threatScore >= 50
                  ? 'bg-red-500'
                  : threatScore > 0
                  ? 'bg-amber-500'
                  : 'bg-emerald-500'
              }`}
              style={{ width: `${threatScore}%` }}
            />
          </div>
        </div>

        {/* Status Card */}
        <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/10">
          <div className="text-xs font-medium text-white/60">System Posture</div>
          <div className="mt-2 flex items-center space-x-2">
            {threatScore === 0 ? (
              <>
                <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                <span className="text-sm font-semibold text-emerald-400">Pristine & Intact</span>
              </>
            ) : threatScore < 50 ? (
              <>
                <AlertTriangle className="w-5 h-5 text-amber-400" />
                <span className="text-sm font-semibold text-amber-400">Suspicious Anomalies</span>
              </>
            ) : (
              <>
                <ShieldAlert className="w-5 h-5 text-red-400" />
                <span className="text-sm font-semibold text-red-400">Rootkit Vector Active</span>
              </>
            )}
          </div>
          <p className="text-[11px] text-white/40 mt-2 font-mono">
            {auditResult?.threats_count || 0} active anomaly indicators discovered
          </p>
        </div>

        {/* MITRE ATT&CK Matrix Card */}
        <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/10">
          <div className="text-xs font-medium text-white/60">MITRE ATT&CK Coverage</div>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {auditResult?.mitre_coverage?.map((m) => (
              <span
                key={m.id}
                className="px-2 py-0.5 rounded-md text-[10px] font-mono font-semibold bg-white/10 text-white/80 border border-white/10"
                title={m.name}
              >
                {m.id}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Discovered Rootkit Findings */}
      <div className="mt-6">
        <h4 className="text-xs font-semibold text-white/80 uppercase tracking-wider mb-3">
          Forensic Inspection Findings ({auditResult?.findings?.length || 0})
        </h4>

        {auditResult?.findings && auditResult.findings.length > 0 ? (
          <div className="space-y-2.5 max-h-[300px] overflow-y-auto pr-1">
            {auditResult.findings.map((f, i) => (
              <div
                key={i}
                className="p-3.5 rounded-2xl bg-red-950/20 border border-red-500/30 flex items-start space-x-3 text-xs"
              >
                <ShieldAlert className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-red-300 font-mono">{f.type}</span>
                    <span className="text-[10px] text-white/40 font-mono">
                      {f.mitre_technique || 'MITRE T1014'}
                    </span>
                  </div>
                  <p className="text-white/70 mt-1 font-mono">{f.detail}</p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-6 rounded-2xl bg-white/[0.02] border border-dashed border-white/10 text-center text-xs text-white/50">
            No active rootkit vectors or LD_PRELOAD hooks detected in current audit scan.
          </div>
        )}
      </div>
    </div>
  );
};
