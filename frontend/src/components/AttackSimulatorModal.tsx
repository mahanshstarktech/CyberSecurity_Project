import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Flame, X, ShieldAlert, Clock, Terminal, Key, RefreshCw, CheckCircle2, AlertTriangle } from 'lucide-react';
import { soundEngine } from '../services/soundEngine';

interface AttackSimulatorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSimulate: (attackType: string) => Promise<any>;
  onReset: () => Promise<any>;
}

export const AttackSimulatorModal: React.FC<AttackSimulatorModalProps> = ({
  isOpen,
  onClose,
  onSimulate,
  onReset
}) => {
  const [activeAttack, setActiveAttack] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const attacks = [
    {
      id: 'modification',
      name: 'Unauthorized File Modification',
      target: 'etc/passwd',
      mitre: 'T1078 (Valid Accounts), T1098',
      desc: 'Injects rogue root-level user backdoor_root into passwd file. Tests core Tripwire SHA-256 detection.',
      icon: Terminal,
      color: 'bg-red-500/20 text-red-400 border-red-500/30'
    },
    {
      id: 'timestomping',
      name: 'Timestomping Anti-Forensics Evasion',
      target: 'bin/auth_daemon',
      mitre: 'T1070.006 (Timestomping)',
      desc: 'Modifies binary and deliberately backdates mtime to 2019 to fool traditional date-based scanners. Tests kernel ctime drift heuristic.',
      icon: Clock,
      color: 'bg-amber-500/20 text-amber-400 border-amber-500/30'
    },
    {
      id: 'ransomware',
      name: 'Ransomware Burst & Canary Honeypot',
      target: 'secure_vault/financial_records.dat.locked',
      mitre: 'T1486 (Data Encrypted for Impact)',
      desc: 'Simulates rapid AES encryption spiking Shannon entropy to ~7.98 and attacks deceptive Canary decoy files.',
      icon: Flame,
      color: 'bg-purple-500/20 text-purple-400 border-purple-500/30'
    },
    {
      id: 'rootkit_preload',
      name: 'LD_PRELOAD Dynamic Linker Rootkit',
      target: 'etc/ld.so.preload',
      mitre: 'T1574.006 (Dynamic Linker Hijacking), T1014',
      desc: 'Injects persistent DSO hook into dynamic linker configuration to intercept standard libc readdir/stat calls.',
      icon: Key,
      color: 'bg-rose-500/20 text-rose-400 border-rose-500/30'
    },
    {
      id: 'suid_backdoor',
      name: 'Stealth SUID Privilege Escalation',
      target: 'bin/.stealth_suid_backdoor',
      mitre: 'T1548.001 (Setuid), T1564.001 (Hidden Files)',
      desc: 'Drops disguised hidden dotfile binary with SUID execution permissions (mode 4755) granting instant root access.',
      icon: ShieldAlert,
      color: 'bg-orange-500/20 text-orange-400 border-orange-500/30'
    }
  ];

  const handleExecute = async (id: string) => {
    soundEngine.playTap();
    setActiveAttack(id);
    setStatusMessage('Executing simulation...');
    try {
      const res = await onSimulate(id);
      soundEngine.playCritical();
      setStatusMessage(`Attack triggered: ${res.attack || id}. Check FIM alerts!`);
    } catch (e: any) {
      setStatusMessage('Simulation failed to trigger');
    } finally {
      setActiveAttack(null);
    }
  };

  const handleReset = async () => {
    soundEngine.playTap();
    setStatusMessage('Restoring clean baseline...');
    try {
      await onReset();
      soundEngine.playSuccess();
      setStatusMessage('Sandbox files restored to clean baseline state.');
    } catch (e) {
      setStatusMessage('Reset failed');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xl">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="apple-glass rounded-3xl p-6 max-w-2xl w-full border border-white/15 shadow-2xl relative"
      >
        <div className="flex items-center justify-between pb-4 border-b border-white/10">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-red-500/20 text-red-400 flex items-center justify-center border border-red-500/30">
              <Flame className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">Live Attack & Rootkit Simulator</h3>
              <p className="text-xs text-white/60 font-mono">
                Exp 5 Interactive Demonstration Suite • Student: Mahansh Gaur
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full bg-white/5 hover:bg-white/15 text-white/60 hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {statusMessage && (
          <div className="my-4 p-3 rounded-xl bg-white/5 border border-white/10 text-xs font-mono text-cyan-300 flex items-center space-x-2">
            <AlertTriangle className="w-4 h-4 text-cyan-400 shrink-0" />
            <span>{statusMessage}</span>
          </div>
        )}

        <div className="mt-4 space-y-3 max-h-[55vh] overflow-y-auto pr-1">
          {attacks.map((a) => {
            const Icon = a.icon;
            const isRunning = activeAttack === a.id;
            return (
              <div
                key={a.id}
                className="p-4 rounded-2xl bg-white/[0.03] hover:bg-white/[0.06] border border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-all"
              >
                <div className="flex items-start space-x-3">
                  <div className={`p-2.5 rounded-xl border shrink-0 ${a.color}`}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="flex items-center space-x-2">
                      <h4 className="text-sm font-semibold text-white">{a.name}</h4>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-white/10 text-white/70">
                        {a.target}
                      </span>
                    </div>
                    <p className="text-xs text-white/60 mt-1">{a.desc}</p>
                    <div className="text-[10px] text-white/40 font-mono mt-1">MITRE: {a.mitre}</div>
                  </div>
                </div>

                <button
                  onClick={() => handleExecute(a.id)}
                  disabled={isRunning}
                  className="px-4 py-2 rounded-xl bg-red-600/80 hover:bg-red-500 text-white text-xs font-semibold shrink-0 shadow-lg shadow-red-500/20 transition-all active:scale-95"
                >
                  {isRunning ? 'Injecting...' : 'Launch Attack'}
                </button>
              </div>
            );
          })}
        </div>

        <div className="mt-6 pt-4 border-t border-white/10 flex items-center justify-between">
          <button
            onClick={handleReset}
            className="flex items-center space-x-2 px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-semibold transition-all"
          >
            <RefreshCw className="w-4 h-4" />
            <span>Reset Sandbox to Clean Baseline</span>
          </button>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-white/60 hover:text-white text-xs font-semibold"
          >
            Close
          </button>
        </div>
      </motion.div>
    </div>
  );
};

