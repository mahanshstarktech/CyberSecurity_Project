import React from 'react';
import { motion } from 'framer-motion';
import { Tv, X, Shield, Lock, Cpu, Link2, Bug, Flame, CheckCircle2, AlertTriangle } from 'lucide-react';
import { soundEngine } from '../services/soundEngine';
import { SystemStatus, IntegrityVerificationReport, RootkitAuditResult } from '../types/fim';

interface PresentationModeProps {
  isOpen: boolean;
  onClose: () => void;
  status: SystemStatus | null;
  report: IntegrityVerificationReport | null;
  rootkitResult: RootkitAuditResult | null;
}

export const PresentationMode: React.FC<PresentationModeProps> = ({
  isOpen,
  onClose,
  status,
  report,
  rootkitResult
}) => {
  if (!isOpen) return null;

  const isCompromised = report?.status === 'COMPROMISED';
  const threatScore = rootkitResult?.threat_score || 0;

  return (
    <div className="fixed inset-0 z-50 bg-[#050507] text-[#F5F5F7] p-6 lg:p-12 overflow-y-auto flex flex-col justify-between">
      {/* Top Banner */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6 pb-6 border-b border-white/10">
        <div className="flex items-center space-x-4">
          <div className="w-14 h-14 rounded-3xl bg-gradient-to-tr from-blue-600 via-cyan-400 to-indigo-600 flex items-center justify-center shadow-[0_0_40px_rgba(0,119,237,0.5)]">
            <Shield className="w-7 h-7 text-white" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="px-3 py-1 rounded-full text-xs font-mono font-bold bg-blue-500/20 text-blue-400 border border-blue-500/30">
                CYBERSECURITY DEFENSE HUD
              </span>
              <span className="px-3 py-1 rounded-full text-xs font-mono font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                EXP 5: ROOTKITS & INTEGRITY
              </span>
            </div>
            <h1 className="text-3xl lg:text-4xl font-extrabold tracking-tight mt-1 text-white">
              AegisFIM — Autonomous File Integrity Monitoring System
            </h1>
            <p className="text-sm font-mono text-white/60 mt-1">
              Candidate: <span className="text-white font-semibold">Mahansh Gaur</span> • Roll: <span className="text-white font-semibold">32</span> • Reg No: <span className="text-white font-semibold">23ESKCY302</span> • Batch: <span className="text-white font-semibold">CSL-G28</span>
            </p>
          </div>
        </div>

        <button
          onClick={() => {
            soundEngine.playTap();
            onClose();
          }}
          className="flex items-center space-x-2 px-5 py-2.5 rounded-2xl bg-white/10 hover:bg-white/20 text-white text-sm font-semibold transition-all"
        >
          <X className="w-5 h-5" />
          <span>Exit HUD Mode</span>
        </button>
      </div>

      {/* Hero Metrics Dashboard (Designed for 65" TV / Big Screen Display) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 my-8">
        {/* Metric 1 */}
        <div className="apple-glass rounded-3xl p-6 border border-white/10">
          <div className="text-sm font-semibold text-white/50 uppercase tracking-wider">Integrity Posture</div>
          <div className="flex items-baseline space-x-3 mt-3">
            <span className={`text-4xl lg:text-5xl font-extrabold font-mono ${isCompromised ? 'text-red-400' : 'text-emerald-400'}`}>
              {isCompromised ? 'COMPROMISED' : 'SECURE'}
            </span>
          </div>
          <p className="text-xs text-white/50 font-mono mt-3">
            {report?.total_scanned_files || 0} files actively verified against SHA-256 cryptographic baseline.
          </p>
        </div>

        {/* Metric 2 */}
        <div className="apple-glass rounded-3xl p-6 border border-white/10">
          <div className="text-sm font-semibold text-white/50 uppercase tracking-wider">Exp 5 Rootkit Score</div>
          <div className="flex items-baseline space-x-3 mt-3">
            <span className={`text-4xl lg:text-5xl font-extrabold font-mono ${threatScore >= 50 ? 'text-red-400' : threatScore > 0 ? 'text-amber-400' : 'text-cyan-400'}`}>
              {threatScore}
            </span>
            <span className="text-lg text-white/40 font-mono">/ 100</span>
          </div>
          <p className="text-xs text-white/50 font-mono mt-3">
            Cross-view inode heuristics, LD_PRELOAD hooks, SUID privilege escalation detection.
          </p>
        </div>

        {/* Metric 3 */}
        <div className="apple-glass rounded-3xl p-6 border border-white/10">
          <div className="text-sm font-semibold text-white/50 uppercase tracking-wider">Merkle Ledger Chain</div>
          <div className="flex items-baseline space-x-3 mt-3">
            <span className="text-4xl lg:text-5xl font-extrabold font-mono text-blue-400">
              TAMPER-PROOF
            </span>
          </div>
          <p className="text-xs text-white/50 font-mono mt-3">
            Append-only SHA-256 cryptographic hash-linked log vault. Impossible to erase evidence post-exploit.
          </p>
        </div>

        {/* Metric 4 */}
        <div className="apple-glass rounded-3xl p-6 border border-white/10">
          <div className="text-sm font-semibold text-white/50 uppercase tracking-wider">Ransomware Trap Guard</div>
          <div className="flex items-baseline space-x-3 mt-3">
            <span className="text-4xl lg:text-5xl font-extrabold font-mono text-purple-400">
              ARMED
            </span>
          </div>
          <p className="text-xs text-white/50 font-mono mt-3">
            Alphabetical decoy canaries armed with real-time Shannon entropy monitoring ($H \le 8.0$).
          </p>
        </div>
      </div>

      {/* Presentation Defense Guide Highlights for Examiner */}
      <div className="apple-glass rounded-3xl p-8 border border-white/10 mt-2">
        <h3 className="text-xl font-bold text-white mb-4 flex items-center space-x-2">
          <CheckCircle2 className="w-5 h-5 text-blue-400" />
          <span>Examiner Presentation & Defense Talking Points (Mahansh Gaur - Roll 32)</span>
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-xs text-white/70 font-mono">
          <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/5">
            <div className="font-semibold text-white text-sm mb-1 text-blue-300">1. Cryptographic Baseline</div>
            Establishes pre-computation SHA-256 digests over critical system inodes (`/etc`, `/bin`, credentials). Employs Shannon entropy analysis ($H = -\sum p_i \log_2 p_i$) to instantly catch encrypted ransomware blocks.
          </div>

          <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/5">
            <div className="font-semibold text-white text-sm mb-1 text-rose-300">2. Exp 5 Rootkit Evasion Heuristics</div>
            Rootkits spoof userland tools by modifying file timestamps (Timestomping - T1070.006) and injecting shared libraries via LD_PRELOAD. AegisFIM cross-correlates $mtime$ vs kernel $ctime$ to defeat anti-forensics.
          </div>

          <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/5">
            <div className="font-semibold text-white text-sm mb-1 text-cyan-300">3. Merkle Audit Hash Chain</div>
            Traditional Tripwire logs can be deleted by attackers who gain root. AegisFIM logs each event into an append-only SHA-256 Merkle chain. Any retroactive deletion breaks the root hash and sounds alarm.
          </div>
        </div>
      </div>
    </div>
  );
};

