import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Shield, Bug, Flame, Link2, Terminal, RefreshCw, X, ShieldCheck } from 'lucide-react';
import { soundEngine } from '../services/soundEngine';

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectAction: (actionId: string) => void;
}

export const CommandPalette: React.FC<CommandPaletteProps> = ({ isOpen, onClose, onSelectAction }) => {
  const [query, setQuery] = useState('');

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        onSelectAction('TOGGLE_PALETTE');
      }
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose, onSelectAction]);

  if (!isOpen) return null;

  const actions = [
    { id: 'SCAN_INTEGRITY', label: 'Run Deep SHA-256 Integrity Verification', icon: Shield, tag: 'FIM' },
    { id: 'CREATE_BASELINE', label: 'Establish New Baseline Manifest', icon: ShieldCheck, tag: 'Baseline' },
    { id: 'ROOTKIT_AUDIT', label: 'Audit Exp 5 Rootkit & Hook Vectors', icon: Bug, tag: 'Exp 5' },
    { id: 'VERIFY_MERKLE', label: 'Verify Cryptographic Merkle Hash Chain', icon: Link2, tag: 'Crypto' },
    { id: 'DEPLOY_CANARY', label: 'Deploy Ransomware Honeypot Canaries', icon: Flame, tag: 'Deception' },
    { id: 'OPEN_SIMULATOR', label: 'Open Live Attack Simulation Console', icon: Terminal, tag: 'Attacks' },
    { id: 'RESET_SANDBOX', label: 'Reset Sandbox Files to Clean Baseline', icon: RefreshCw, tag: 'System' },
  ];

  const filtered = actions.filter(a => a.label.toLowerCase().includes(query.toLowerCase()) || a.tag.toLowerCase().includes(query.toLowerCase()));

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-24 p-4 bg-black/60 backdrop-blur-xl">
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: -10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: -10 }}
        transition={{ type: 'spring', stiffness: 450, damping: 30 }}
        className="apple-glass rounded-3xl max-w-xl w-full border border-white/20 shadow-2xl overflow-hidden"
      >
        <div className="p-4 border-b border-white/10 flex items-center space-x-3">
          <Search className="w-5 h-5 text-white/50" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search commands, forensic tasks, or verification suites (⌘K)..."
            autoFocus
            className="w-full bg-transparent text-white placeholder-white/40 text-sm focus:outline-none font-sans"
          />
          <button onClick={onClose} className="p-1 rounded-full text-white/40 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-2 max-h-80 overflow-y-auto space-y-1">
          {filtered.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                onClick={() => {
                  soundEngine.playTap();
                  onSelectAction(item.id);
                  onClose();
                }}
                className="w-full px-4 py-3 rounded-2xl flex items-center justify-between hover:bg-white/10 transition-all text-left text-xs group"
              >
                <div className="flex items-center space-x-3">
                  <div className="p-2 rounded-xl bg-white/5 group-hover:bg-blue-500/20 text-white/70 group-hover:text-blue-400 transition-colors">
                    <Icon className="w-4 h-4" />
                  </div>
                  <span className="font-medium text-white/90 group-hover:text-white">
                    {item.label}
                  </span>
                </div>
                <span className="px-2 py-0.5 rounded-md text-[10px] font-mono bg-white/5 text-white/40 border border-white/10">
                  {item.tag}
                </span>
              </button>
            );
          })}
        </div>
      </motion.div>
    </div>
  );
};

