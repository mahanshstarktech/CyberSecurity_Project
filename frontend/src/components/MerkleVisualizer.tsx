import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MerkleBlock, MerkleVerification } from '../types/fim';
import { Link2, ShieldCheck, AlertOctagon, CheckCircle2, RefreshCw, KeyRound, Copy, Check } from 'lucide-react';
import { soundEngine } from '../services/soundEngine';

interface MerkleVisualizerProps {
  blocks: MerkleBlock[];
  onVerify: () => Promise<MerkleVerification>;
  onRefresh: () => void;
}

export const MerkleVisualizer: React.FC<MerkleVisualizerProps> = ({ blocks, onVerify, onRefresh }) => {
  const [verification, setVerification] = useState<MerkleVerification | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const [copiedHash, setCopiedHash] = useState<string | null>(null);
  const [tamperedIndex, setTamperedIndex] = useState<number | null>(null);

  const handleVerify = async () => {
    soundEngine.playTap();
    setIsVerifying(true);
    try {
      const res = await onVerify();
      setVerification(res);
      if (res.valid) {
        soundEngine.playSuccess();
      } else {
        soundEngine.playCritical();
      }
    } finally {
      setIsVerifying(false);
    }
  };

  const handleCopy = (hash: string) => {
    navigator.clipboard.writeText(hash);
    setCopiedHash(hash);
    soundEngine.playTap();
    setTimeout(() => setCopiedHash(null), 2000);
  };

  const simulateTampering = (idx: number) => {
    soundEngine.playWarning();
    setTamperedIndex(idx);
    setVerification({
      valid: false,
      status: 'CRYPTOGRAPHIC_TAMPER_DETECTED',
      compromised_block_index: idx,
      detail: `Tamper Alert! Block #${idx} payload was modified by an unauthorized process with root privileges. Computed SHA-256 does not match recorded block hash!`
    });
  };

  return (
    <div className="apple-glass-card rounded-3xl p-6 border border-white/10 shadow-2xl relative overflow-hidden">
      {/* Background Glow */}
      <div className="absolute top-0 right-0 w-80 h-80 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-6 border-b border-white/10">
        <div>
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-xl bg-blue-500/20 text-blue-400 flex items-center justify-center border border-blue-500/30">
              <Link2 className="w-4 h-4" />
            </div>
            <h3 className="text-lg font-semibold text-white tracking-tight">
              Cryptographic Merkle Hash Chain & Log Vault
            </h3>
          </div>
          <p className="text-xs text-white/60 mt-1 font-mono">
            Append-only tamper-evident blockchain ledger • NIST CSF PR.DS-11 & DE.CM-01
          </p>
        </div>

        <div className="flex items-center space-x-2.5">
          <button
            onClick={onRefresh}
            className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-white/70 hover:text-white border border-white/10 transition-all"
            title="Refresh Ledger"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          <button
            onClick={handleVerify}
            disabled={isVerifying}
            className="flex items-center space-x-2 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shadow-lg shadow-blue-500/25 transition-all active:scale-95"
          >
            <ShieldCheck className="w-4 h-4" />
            <span>{isVerifying ? 'Verifying Math...' : 'Verify Cryptographic Proof'}</span>
          </button>
        </div>
      </div>

      {/* Verification Banner */}
      <AnimatePresence>
        {verification && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className={`my-4 p-4 rounded-2xl border ${
              verification.valid
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                : 'bg-red-500/10 border-red-500/30 text-red-300'
            }`}
          >
            <div className="flex items-start space-x-3">
              {verification.valid ? (
                <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
              ) : (
                <AlertOctagon className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
              )}
              <div className="flex-1 text-xs">
                <div className="font-semibold text-sm">
                  {verification.valid ? 'Cryptographic Integrity Intact' : 'CRITICAL: Log Tampering Detected!'}
                </div>
                <div className="mt-0.5 opacity-90 font-mono">{verification.detail}</div>
                {verification.latest_block_hash && (
                  <div className="mt-2 text-[11px] text-white/60 font-mono break-all">
                    Tip Merkle Root: {verification.latest_block_hash}
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Merkle Chain Blocks Sequence */}
      <div className="mt-6 space-y-3 max-h-[460px] overflow-y-auto pr-2">
        {blocks.map((b) => {
          const isTampered = tamperedIndex === b.index;
          return (
            <motion.div
              key={b.index}
              layout
              className={`p-4 rounded-2xl border transition-all ${
                isTampered
                  ? 'bg-red-950/40 border-red-500/50 shadow-[0_0_20px_rgba(255,69,58,0.2)]'
                  : 'bg-white/[0.03] hover:bg-white/[0.06] border-white/10'
              }`}
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center space-x-3">
                  <span className="px-2 py-0.5 rounded-md bg-white/10 font-mono text-[11px] font-semibold text-blue-400">
                    Block #{b.index}
                  </span>
                  <span className="text-xs font-semibold text-white/90">
                    {b.event_type}
                  </span>
                  <span className="text-[11px] text-white/40 font-mono">
                    {new Date(b.timestamp * 1000).toLocaleTimeString()}
                  </span>
                </div>

                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => simulateTampering(b.index)}
                    className="text-[10px] text-white/40 hover:text-red-400 px-2 py-0.5 rounded bg-white/5 hover:bg-red-500/10 transition-colors"
                    title="Simulate attacker modifying this block in storage"
                  >
                    Simulate Tamper
                  </button>
                </div>
              </div>

              {/* Block Hash & Prev Hash Links */}
              <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-2 text-[11px] font-mono">
                <div className="p-2 rounded-xl bg-black/40 border border-white/5 flex items-center justify-between">
                  <div className="truncate mr-2">
                    <span className="text-white/40">Prev Hash: </span>
                    <span className="text-white/70">{b.prev_hash.slice(0, 16)}...</span>
                  </div>
                  <KeyRound className="w-3.5 h-3.5 text-white/30 shrink-0" />
                </div>

                <div className="p-2 rounded-xl bg-black/40 border border-white/5 flex items-center justify-between">
                  <div className="truncate mr-2">
                    <span className="text-blue-400/70">SHA-256: </span>
                    <span className="text-white/90">{b.block_hash.slice(0, 18)}...</span>
                  </div>
                  <button
                    onClick={() => handleCopy(b.block_hash)}
                    className="text-white/40 hover:text-white"
                  >
                    {copiedHash === b.block_hash ? (
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                    ) : (
                      <Copy className="w-3.5 h-3.5" />
                    )}
                  </button>
                </div>
              </div>

              {/* Payload Preview */}
              {b.payload && Object.keys(b.payload).length > 0 && (
                <div className="mt-2 text-[11px] text-white/50 font-mono truncate">
                  Payload: {JSON.stringify(b.payload)}
                </div>
              )}
            </motion.div>
          );
        })}
      </div>
    </div>
  );
};
