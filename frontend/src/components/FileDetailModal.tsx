import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { FileMetadata } from '../types/fim';
import { X, ShieldAlert, Lock, CheckCircle2, Copy, Check, Terminal, Clock, ShieldCheck } from 'lucide-react';
import { soundEngine } from '../services/soundEngine';

interface FileDetailModalProps {
  file: FileMetadata | null;
  onClose: () => void;
  onQuarantine: (path: string) => Promise<void>;
}

export const FileDetailModal: React.FC<FileDetailModalProps> = ({ file, onClose, onQuarantine }) => {
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [isQuarantining, setIsQuarantining] = useState(false);

  if (!file) return null;

  const copyToClipboard = (key: string, val: string) => {
    navigator.clipboard.writeText(val);
    setCopiedKey(key);
    soundEngine.playTap();
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const handleQuarantine = async () => {
    soundEngine.playWarning();
    setIsQuarantining(true);
    try {
      await onQuarantine(file.rel_path);
      onClose();
    } finally {
      setIsQuarantining(false);
    }
  };

  const entropyPercent = Math.min(100, (file.entropy / 8.0) * 100);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xl">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 15 }}
        transition={{ type: 'spring', stiffness: 400, damping: 28 }}
        className="apple-glass rounded-3xl p-6 max-w-xl w-full border border-white/15 shadow-2xl relative overflow-hidden"
      >
        {/* Top Header */}
        <div className="flex items-start justify-between pb-4 border-b border-white/10">
          <div>
            <div className="flex items-center space-x-2">
              <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-semibold bg-blue-500/20 text-blue-400 border border-blue-500/30">
                FORENSIC INODE ANALYSIS
              </span>
              {file.timestomp_suspect && (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-semibold bg-amber-500/20 text-amber-400 border border-amber-500/30">
                  TIMESTOMP DETECTED
                </span>
              )}
            </div>
            <h3 className="text-xl font-bold text-white mt-1.5 break-all">
              {file.rel_path}
            </h3>
            <p className="text-xs text-white/50 font-mono mt-0.5">{file.abs_path}</p>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-full bg-white/5 hover:bg-white/15 text-white/60 hover:text-white transition-all"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Forensic Attributes */}
        <div className="mt-5 space-y-4 max-h-[60vh] overflow-y-auto pr-1">
          {/* Shannon Entropy Meter */}
          <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/10">
            <div className="flex items-center justify-between text-xs font-medium">
              <span className="text-white/70">Shannon Entropy Rating</span>
              <span className="font-mono text-white/90">{file.entropy} / 8.0</span>
            </div>
            <div className="w-full bg-white/10 h-2 rounded-full overflow-hidden mt-2">
              <div
                className={`h-full transition-all duration-500 ${
                  file.entropy > 7.2
                    ? 'bg-purple-500'
                    : file.entropy > 5.5
                    ? 'bg-blue-500'
                    : 'bg-emerald-500'
                }`}
                style={{ width: `${entropyPercent}%` }}
              />
            </div>
            <p className="text-[11px] text-white/40 mt-1.5">
              {file.entropy > 7.2
                ? 'High entropy (>7.2) indicates encrypted payload or packed malware (Ransomware signature).'
                : 'Normal entropy indicates standard text, code, or structured binaries.'}
            </p>
          </div>

          {/* Cryptographic Hashes */}
          <div className="space-y-2">
            <div className="text-xs font-semibold text-white/80">Cryptographic Signatures</div>
            
            {/* SHA-256 */}
            <div className="p-3 rounded-xl bg-black/40 border border-white/5 flex items-center justify-between text-xs font-mono">
              <div className="truncate mr-3">
                <span className="text-blue-400 font-semibold">SHA-256: </span>
                <span className="text-white/80 select-all">{file.sha256}</span>
              </div>
              <button
                onClick={() => copyToClipboard('sha256', file.sha256)}
                className="text-white/40 hover:text-white shrink-0"
              >
                {copiedKey === 'sha256' ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
              </button>
            </div>

            {/* SHA-512 */}
            {file.sha512 && (
              <div className="p-3 rounded-xl bg-black/40 border border-white/5 flex items-center justify-between text-xs font-mono">
                <div className="truncate mr-3">
                  <span className="text-purple-400 font-semibold">SHA-512: </span>
                  <span className="text-white/80 select-all">{file.sha512}</span>
                </div>
                <button
                  onClick={() => copyToClipboard('sha512', file.sha512!)}
                  className="text-white/40 hover:text-white shrink-0"
                >
                  {copiedKey === 'sha512' ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                </button>
              </div>
            )}
          </div>

          {/* Timestamps & Anti-Forensics Analysis */}
          <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/10 space-y-2 text-xs font-mono">
            <div className="flex items-center space-x-2 text-white/80 font-semibold mb-1">
              <Clock className="w-4 h-4 text-amber-400" />
              <span>Timestamp & Anti-Forensics Check</span>
            </div>
            <div className="flex justify-between">
              <span className="text-white/40">File Size:</span>
              <span className="text-white/80">{file.size} bytes</span>
            </div>
            <div className="flex justify-between">
              <span className="text-white/40">Mode / Permissions:</span>
              <span className="text-white/80">{file.permissions}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-white/40">mtime (Content Modified):</span>
              <span className="text-white/80">{new Date(file.mtime * 1000).toLocaleString()}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-white/40">ctime (Inode Status Change):</span>
              <span className="text-white/80">{new Date(file.ctime * 1000).toLocaleString()}</span>
            </div>
            {file.timestomp_suspect && (
              <div className="mt-2 p-2 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-300 text-[11px]">
                Warning: Kernel ctime is significantly newer than mtime. The modification time was likely falsified using touch or utime API (MITRE T1070.006).
              </div>
            )}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="mt-6 pt-4 border-t border-white/10 flex items-center justify-end space-x-3">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-white text-xs font-semibold transition-all"
          >
            Dismiss
          </button>
          <button
            onClick={handleQuarantine}
            disabled={isQuarantining}
            className="flex items-center space-x-2 px-4 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-semibold shadow-lg shadow-red-500/25 transition-all"
          >
            <Lock className="w-4 h-4" />
            <span>{isQuarantining ? 'Quarantining...' : 'Quarantine File to Vault'}</span>
          </button>
        </div>
      </motion.div>
    </div>
  );
};

