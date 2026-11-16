import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FileMetadata } from '../types/fim';
import { Shield, FileCode, Lock, AlertTriangle, Flame, Clock, CheckCircle2, ChevronRight } from 'lucide-react';
import { soundEngine } from '../services/soundEngine';

interface FileRadarProps {
  files: FileMetadata[];
  onSelectFile: (file: FileMetadata) => void;
}

export const FileRadar: React.FC<FileRadarProps> = ({ files, onSelectFile }) => {
  const [filter, setFilter] = useState<'ALL' | 'TAMPERED' | 'TIMESTOMPED' | 'CANARY'>('ALL');

  const filteredFiles = files.filter((f) => {
    if (filter === 'TAMPERED') return f.is_tampered || !f.is_in_baseline;
    if (filter === 'TIMESTOMPED') return f.timestomp_suspect;
    if (filter === 'CANARY') return f.rel_path.includes('!00_') || f.rel_path.includes('canary') || f.rel_path.includes('.env');
    return true;
  });

  return (
    <div className="apple-glass-card rounded-3xl p-6 border border-white/10 shadow-2xl relative">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-6 border-b border-white/10">
        <div className="flex items-center space-x-3">
          <div className="relative w-8 h-8 rounded-xl bg-cyan-500/20 text-cyan-400 flex items-center justify-center border border-cyan-500/30 overflow-hidden">
            <Shield className="w-4 h-4 z-10" />
            <div className="absolute inset-0 bg-gradient-to-tr from-cyan-500/20 to-transparent animate-radar-spin origin-bottom-right" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-white tracking-tight">
              File System Radar & Telemetry
            </h3>
            <p className="text-xs text-white/60 font-mono">
              Live inode surveillance • {files.length} active nodes registered
            </p>
          </div>
        </div>

        {/* Filter Pills */}
        <div className="flex items-center p-1 rounded-xl bg-white/5 border border-white/10 text-xs font-medium">
          {(['ALL', 'TAMPERED', 'TIMESTOMPED', 'CANARY'] as const).map((cat) => (
            <button
              key={cat}
              onClick={() => {
                soundEngine.playTap();
                setFilter(cat);
              }}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                filter === cat
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'text-white/60 hover:text-white'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Grid of File Cards */}
      <div className="mt-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 max-h-[500px] overflow-y-auto pr-2">
        <AnimatePresence>
          {filteredFiles.map((file) => {
            const isTampered = file.is_tampered || !file.is_in_baseline;
            const isTimestomped = file.timestomp_suspect;
            const isCanary = file.rel_path.includes('!00_') || file.rel_path.includes('canary');
            const isHighEntropy = file.entropy > 7.0;

            let badgeColor = 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
            let badgeText = 'INTACT';
            if (isHighEntropy) {
              badgeColor = 'bg-purple-500/20 text-purple-300 border-purple-500/30';
              badgeText = 'ENCRYPTED/HIGH ENTROPY';
            } else if (isTampered) {
              badgeColor = 'bg-red-500/20 text-red-400 border-red-500/30';
              badgeText = file.is_in_baseline ? 'ALTERED' : 'UNAUTHORIZED ADD';
            } else if (isTimestomped) {
              badgeColor = 'bg-amber-500/20 text-amber-400 border-amber-500/30';
              badgeText = 'TIMESTOMPED';
            } else if (isCanary) {
              badgeColor = 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30';
              badgeText = 'CANARY TRAP';
            }

            return (
              <motion.div
                key={file.rel_path}
                layout
                initial={{ opacity: 0, scale: 0.96 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.96 }}
                onClick={() => {
                  soundEngine.playTap();
                  onSelectFile(file);
                }}
                className={`p-4 rounded-2xl border cursor-pointer transition-all hover:scale-[1.01] active:scale-[0.99] flex flex-col justify-between ${
                  isTampered
                    ? 'bg-red-950/25 border-red-500/30 hover:border-red-500/50'
                    : 'bg-white/[0.03] hover:bg-white/[0.06] border-white/10'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between gap-2">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-semibold border ${badgeColor}`}>
                      {badgeText}
                    </span>
                    <span className="text-[11px] text-white/40 font-mono">
                      {file.permissions}
                    </span>
                  </div>

                  <div className="mt-2.5 flex items-start space-x-2.5">
                    <div className="p-2 rounded-xl bg-white/5 text-white/70 mt-0.5 shrink-0">
                      <FileCode className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <h4 className="text-sm font-semibold text-white/95 truncate">
                        {file.rel_path}
                      </h4>
                      <p className="text-[11px] text-white/50 font-mono mt-0.5">
                        {file.size} bytes • Entropy: {file.entropy}/8.0
                      </p>
                    </div>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-white/5 flex items-center justify-between text-[11px] font-mono text-white/40">
                  <span className="truncate mr-2">SHA: {file.sha256.slice(0, 12)}...</span>
                  <ChevronRight className="w-4 h-4 text-white/30 shrink-0" />
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </div>
  );
};
