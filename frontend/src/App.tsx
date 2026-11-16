import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Shield,
  ShieldAlert,
  ShieldCheck,
  Bug,
  Link2,
  Flame,
  Terminal,
  Volume2,
  VolumeX,
  Tv,
  RefreshCw,
  Search,
  CheckCircle2,
  AlertTriangle,
  FileText,
  Lock,
  Layers,
  Sparkles,
  Server,
  CloudLightning
} from 'lucide-react';

import { api } from './services/api';
import { soundEngine } from './services/soundEngine';
import {
  SystemStatus,
  FileMetadata,
  IntegrityVerificationReport,
  RootkitAuditResult,
  CanaryItem,
  CanaryIncident,
  MerkleBlock,
  MerkleVerification
} from './types/fim';

import { DynamicIsland, DynamicIslandEvent } from './components/DynamicIsland';
import { FileRadar } from './components/FileRadar';
import { FileDetailModal } from './components/FileDetailModal';
import { RootkitInspector } from './components/RootkitInspector';
import { MerkleVisualizer } from './components/MerkleVisualizer';
import { CanaryManager } from './components/CanaryManager';
import { AttackSimulatorModal } from './components/AttackSimulatorModal';
import { CommandPalette } from './components/CommandPalette';
import { PwaPrompt } from './components/PwaPrompt';
import { PresentationMode } from './components/PresentationMode';

export const App: React.FC = () => {
  // Navigation
  const [activeTab, setActiveTab] = useState<'RADAR' | 'ROOTKIT' | 'MERKLE' | 'CANARY'>('RADAR');
  const [soundEnabled, setSoundEnabled] = useState(true);

  // Core Data State
  const [systemStatus, setSystemStatus] = useState<SystemStatus | null>(null);
  const [files, setFiles] = useState<FileMetadata[]>([]);
  const [integrityReport, setIntegrityReport] = useState<IntegrityVerificationReport | null>(null);
  const [rootkitResult, setRootkitResult] = useState<RootkitAuditResult | null>(null);
  const [canaries, setCanaries] = useState<CanaryItem[]>([]);
  const [canaryIncidents, setCanaryIncidents] = useState<CanaryIncident[]>([]);
  const [merkleBlocks, setMerkleBlocks] = useState<MerkleBlock[]>([]);

  // Modals & Overlays
  const [selectedFile, setSelectedFile] = useState<FileMetadata | null>(null);
  const [isSimulatorOpen, setIsSimulatorOpen] = useState(false);
  const [isPaletteOpen, setIsPaletteOpen] = useState(false);
  const [isPresentationOpen, setIsPresentationOpen] = useState(false);
  const [dynamicEvent, setDynamicEvent] = useState<DynamicIslandEvent | null>(null);

  // Loading States
  const [isScanning, setIsScanning] = useState(false);
  const [isBaselineCreating, setIsBaselineCreating] = useState(false);

  // Initial Data Fetch & WebSocket Setup
  useEffect(() => {
    refreshAllData();

    // Subscribe to live WebSocket & client events
    const unsubscribe = api.subscribeToLiveEvents((event: any) => {
      handleLiveNotification(event);
      // Auto refresh data on security events
      refreshAllData();
    });

    return () => unsubscribe();
  }, []);

  const refreshAllData = async () => {
    try {
      const [status, fileList, rep, rk, can, blocks] = await Promise.all([
        api.getStatus(),
        api.getMonitoredFiles(),
        api.verifyBaseline(),
        api.getRootkitAudit(),
        api.checkCanaries(),
        api.getMerkleChain()
      ]);

      setSystemStatus(status);
      setFiles(fileList);
      setIntegrityReport(rep);
      setRootkitResult(rk);
      setCanaryIncidents(can.incidents || []);
      setMerkleBlocks(blocks);
    } catch (e) {
      console.warn('Refresh error:', e);
    }
  };

  const handleLiveNotification = (event: any) => {
    if (event.type === 'ATTACK_TRIGGERED') {
      setDynamicEvent({
        id: String(Date.now()),
        type: 'DANGER',
        title: `Security Incident: ${event.details?.attack || 'Unauthorized Activity'}`,
        subtitle: event.details?.payload || 'Anomalous file modification detected.',
        actionText: 'Inspect Vector',
        onAction: () => {
          if (event.attack?.includes('rootkit') || event.attack?.includes('suid')) {
            setActiveTab('ROOTKIT');
          } else if (event.attack?.includes('ransomware')) {
            setActiveTab('CANARY');
          } else {
            setActiveTab('RADAR');
          }
        }
      });
    } else if (event.type === 'LIVE_FS_EVENT') {
      const d = event.data;
      const isDangerous = d.is_canary || d.entropy > 7.0 || d.file?.includes('.preload');
      setDynamicEvent({
        id: String(Date.now()),
        type: isDangerous ? 'DANGER' : 'WARN',
        title: `Kernel Event: ${d.event_type} on ${d.file}`,
        subtitle: `Entropy: ${d.entropy}/8.0 • SHA: ${d.sha256?.slice(0, 10)}...`,
        actionText: 'View Radar',
        onAction: () => setActiveTab('RADAR')
      });
    } else if (event.type === 'BASELINE_UPDATED') {
      setDynamicEvent({
        id: String(Date.now()),
        type: 'SUCCESS',
        title: 'Cryptographic Baseline Established',
        subtitle: `${event.data?.total_files} files signed with SHA-256 Merkle root.`,
      });
    }
  };

  // Integrity Scan
  const handleRunIntegrityScan = async () => {
    soundEngine.playTap();
    setIsScanning(true);
    try {
      const rep = await api.verifyBaseline();
      setIntegrityReport(rep);
      const filesList = await api.getMonitoredFiles();
      setFiles(filesList);

      if (rep.status === 'COMPROMISED') {
        soundEngine.playCritical();
        setDynamicEvent({
          id: String(Date.now()),
          type: 'DANGER',
          title: 'Integrity Scan: Compromised!',
          subtitle: `${rep.summary.modified_count} modified, ${rep.summary.added_count} added, ${rep.summary.timestomped_count} timestomped.`,
          actionText: 'Review Diff',
          onAction: () => setActiveTab('RADAR')
        });
      } else {
        soundEngine.playSuccess();
        setDynamicEvent({
          id: String(Date.now()),
          type: 'SUCCESS',
          title: 'Integrity Scan: Intact',
          subtitle: 'All monitored inodes match cryptographic SHA-256 baseline.',
        });
      }
    } finally {
      setIsScanning(false);
    }
  };

  // Re-establish Baseline
  const handleCreateBaseline = async () => {
    soundEngine.playTap();
    setIsBaselineCreating(true);
    try {
      await api.createBaseline();
      await refreshAllData();
      soundEngine.playSuccess();
    } finally {
      setIsBaselineCreating(false);
    }
  };

  // Toggle Sound
  const toggleSound = () => {
    const next = !soundEnabled;
    setSoundEnabled(next);
    soundEngine.enabled = next;
    if (next) soundEngine.playTap();
  };

  // Quarantine File
  const handleQuarantine = async (relPath: string) => {
    await api.quarantineFile(relPath);
    await refreshAllData();
    setDynamicEvent({
      id: String(Date.now()),
      type: 'INFO',
      title: 'File Quarantined',
      subtitle: `${relPath} moved to locked vault with chmod 0000.`,
    });
  };

  const isCompromised = integrityReport?.status === 'COMPROMISED';

  return (
    <div className="min-h-screen bg-[#050507] text-[#F5F5F7] flex flex-col font-sans selection:bg-[#0077ED]/30 selection:text-white pb-24 md:pb-8">
      {/* Apple Dynamic Island Notification HUD */}
      <DynamicIsland activeEvent={dynamicEvent} onDismiss={() => setDynamicEvent(null)} />

      {/* Top Header / macOS Style Navigation Bar */}
      <header className="sticky top-0 z-40 bg-[#050507]/80 backdrop-blur-2xl border-b border-white/[0.08] px-4 lg:px-8 py-3.5">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
          {/* Logo & Student Identity */}
          <div className="flex items-center space-x-3.5">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-blue-600 via-cyan-400 to-indigo-600 p-[1px] shadow-[0_0_25px_rgba(0,119,237,0.4)]">
              <div className="w-full h-full bg-[#0A0A0C] rounded-[15px] flex items-center justify-center">
                <Shield className="w-5 h-5 text-blue-400" />
              </div>
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h1 className="text-base font-bold tracking-tight text-white flex items-center space-x-1.5">
                  <span>AegisFIM</span>
                  <span className="text-white/40 font-normal">/</span>
                  <span className="text-blue-400 font-mono text-xs">Tripwire-X</span>
                </h1>
                <span className="hidden sm:inline-block px-2 py-0.5 rounded-full text-[10px] font-mono font-semibold bg-blue-500/15 text-blue-400 border border-blue-500/25">
                  Exp 5
                </span>
              </div>
              <p className="text-[11px] text-white/50 font-mono truncate max-w-[280px] sm:max-w-none">
                Mahansh Gaur • Roll 32 • Reg: 23ESKCY302 • CSL-G28
              </p>
            </div>
          </div>

          {/* Quick Action Controls */}
          <div className="flex items-center space-x-2">
            {/* Mode Indicator: Backend vs WebCrypto Edge */}
            <div className="hidden md:flex items-center space-x-2 px-3 py-1.5 rounded-full bg-white/[0.04] border border-white/10 text-xs font-mono">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              <span className="text-white/70">
                {api.isConnectedToBackend ? 'Render/Local Daemon' : 'Cloudflare WebCrypto Edge'}
              </span>
            </div>

            {/* Attack Simulator Button */}
            <button
              onClick={() => {
                soundEngine.playTap();
                setIsSimulatorOpen(true);
              }}
              className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-red-600/20 hover:bg-red-600/30 text-red-300 border border-red-500/30 text-xs font-semibold shadow-sm transition-all active:scale-95"
            >
              <Terminal className="w-3.5 h-3.5 text-red-400" />
              <span className="hidden sm:inline">Attack Lab</span>
            </button>

            {/* 65" TV Presentation Mode Button */}
            <button
              onClick={() => {
                soundEngine.playTap();
                setIsPresentationOpen(true);
              }}
              className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-white/[0.06] hover:bg-white/[0.12] text-white text-xs font-semibold border border-white/10 transition-all active:scale-95"
              title="Presentation Mode (65-inch TV / HUD)"
            >
              <Tv className="w-3.5 h-3.5 text-cyan-400" />
              <span className="hidden sm:inline">HUD</span>
            </button>

            {/* Command Palette Trigger */}
            <button
              onClick={() => {
                soundEngine.playTap();
                setIsPaletteOpen(true);
              }}
              className="p-2 rounded-xl bg-white/[0.06] hover:bg-white/[0.12] text-white/70 hover:text-white border border-white/10 transition-all"
              title="Spotlight Search (⌘K)"
            >
              <Search className="w-4 h-4" />
            </button>

            {/* Sound Toggle */}
            <button
              onClick={toggleSound}
              className="p-2 rounded-xl bg-white/[0.06] hover:bg-white/[0.12] text-white/70 hover:text-white border border-white/10 transition-all"
              title={soundEnabled ? 'Mute Audio' : 'Unmute Audio'}
            >
              {soundEnabled ? <Volume2 className="w-4 h-4 text-emerald-400" /> : <VolumeX className="w-4 h-4 text-white/40" />}
            </button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-7xl mx-auto w-full px-4 lg:px-8 py-6 flex-1 flex flex-col space-y-6">
        {/* KPI Status Strip */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 lg:gap-4">
          {/* Posture Status */}
          <div className="apple-glass rounded-2xl p-4 border border-white/10 flex flex-col justify-between">
            <div className="flex items-center justify-between text-white/50 text-xs font-medium">
              <span>System Posture</span>
              <ShieldCheck className="w-4 h-4 text-blue-400" />
            </div>
            <div className="mt-2 flex items-baseline space-x-2">
              <span className={`text-xl lg:text-2xl font-bold font-mono ${isCompromised ? 'text-red-400' : 'text-emerald-400'}`}>
                {isCompromised ? 'ALERT' : 'SECURE'}
              </span>
            </div>
            <p className="text-[11px] text-white/40 mt-1 font-mono">
              {integrityReport?.summary.modified_count || 0} modified • {integrityReport?.summary.timestomped_count || 0} timestomped
            </p>
          </div>

          {/* Rootkit Threat Index */}
          <div className="apple-glass rounded-2xl p-4 border border-white/10 flex flex-col justify-between">
            <div className="flex items-center justify-between text-white/50 text-xs font-medium">
              <span>Rootkit Index</span>
              <Bug className="w-4 h-4 text-rose-400" />
            </div>
            <div className="mt-2 flex items-baseline space-x-2">
              <span className={`text-xl lg:text-2xl font-bold font-mono ${(rootkitResult?.threat_score || 0) > 0 ? 'text-rose-400' : 'text-cyan-400'}`}>
                {rootkitResult?.threat_score || 0}
              </span>
              <span className="text-xs text-white/40 font-mono">/ 100</span>
            </div>
            <p className="text-[11px] text-white/40 mt-1 font-mono">
              {rootkitResult?.findings.length || 0} anomaly vectors
            </p>
          </div>

          {/* Merkle Chain Tip */}
          <div className="apple-glass rounded-2xl p-4 border border-white/10 flex flex-col justify-between">
            <div className="flex items-center justify-between text-white/50 text-xs font-medium">
              <span>Merkle Blocks</span>
              <Link2 className="w-4 h-4 text-blue-400" />
            </div>
            <div className="mt-2 flex items-baseline space-x-2">
              <span className="text-xl lg:text-2xl font-bold font-mono text-white">
                #{merkleBlocks.length || 1}
              </span>
              <span className="text-xs text-emerald-400 font-mono">Append-Only</span>
            </div>
            <p className="text-[11px] text-white/40 mt-1 font-mono truncate">
              SHA-256 Ledger Vault
            </p>
          </div>

          {/* Canaries */}
          <div className="apple-glass rounded-2xl p-4 border border-white/10 flex flex-col justify-between">
            <div className="flex items-center justify-between text-white/50 text-xs font-medium">
              <span>Canary Traps</span>
              <Flame className="w-4 h-4 text-amber-400" />
            </div>
            <div className="mt-2 flex items-baseline space-x-2">
              <span className="text-xl lg:text-2xl font-bold font-mono text-cyan-400">
                {canaries.length || 2} Armed
              </span>
            </div>
            <p className="text-[11px] text-white/40 mt-1 font-mono">
              {canaryIncidents.length > 0 ? `${canaryIncidents.length} tripped!` : '0 incidents'}
            </p>
          </div>
        </div>

        {/* Global Action Banner */}
        <div className="apple-glass rounded-3xl p-4 lg:p-5 border border-white/10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-blue-500/20 text-blue-400 flex items-center justify-center border border-blue-500/30 shrink-0">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-white">
                Autonomous File Integrity Surveillance Active
              </h3>
              <p className="text-xs text-white/60 font-mono mt-0.5">
                Target: {systemStatus?.fim_daemon.monitoring_directory || '/sandbox/system_files'} • Merkle Root: {systemStatus?.fim_daemon.merkle_root.slice(0, 16) || 'e3b0c44...'}
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2 w-full sm:w-auto">
            <button
              onClick={handleRunIntegrityScan}
              disabled={isScanning}
              className="flex-1 sm:flex-none flex items-center justify-center space-x-2 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shadow-lg shadow-blue-500/25 transition-all active:scale-95"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isScanning ? 'animate-spin' : ''}`} />
              <span>{isScanning ? 'Scanning...' : 'Verify Baseline'}</span>
            </button>
            <button
              onClick={handleCreateBaseline}
              disabled={isBaselineCreating}
              className="flex-1 sm:flex-none px-4 py-2 rounded-xl bg-white/[0.08] hover:bg-white/[0.14] text-white text-xs font-semibold border border-white/10 transition-all active:scale-95"
            >
              {isBaselineCreating ? 'Generating...' : 'Update Baseline'}
            </button>
          </div>
        </div>

        {/* Segmented Tab Controls (Apple macOS / iOS Segmented Picker) */}
        <div className="flex items-center p-1 rounded-2xl bg-white/[0.04] border border-white/10 text-xs font-medium w-full max-w-2xl mx-auto">
          {[
            { id: 'RADAR', label: 'File Radar & Inodes', icon: Shield },
            { id: 'ROOTKIT', label: 'Exp 5: Rootkits', icon: Bug },
            { id: 'MERKLE', label: 'Merkle Hash Chain', icon: Link2 },
            { id: 'CANARY', label: 'Ransomware Canaries', icon: Flame },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => {
                  soundEngine.playTap();
                  setActiveTab(tab.id as any);
                }}
                className={`relative flex-1 flex items-center justify-center space-x-2 py-2.5 rounded-xl transition-all ${
                  isActive ? 'text-white font-semibold' : 'text-white/60 hover:text-white'
                }`}
              >
                {isActive && (
                  <motion.div
                    layoutId="activeTabPill"
                    transition={{ type: 'spring', stiffness: 450, damping: 30 }}
                    className="absolute inset-0 bg-white/15 rounded-xl border border-white/20 shadow-md"
                  />
                )}
                <Icon className="w-3.5 h-3.5 relative z-10" />
                <span className="relative z-10 hidden sm:inline">{tab.label}</span>
                <span className="relative z-10 sm:hidden">{tab.label.split(' ')[0]}</span>
              </button>
            );
          })}
        </div>

        {/* Tab View Content */}
        <AnimatePresence mode="wait">
          {activeTab === 'RADAR' && (
            <motion.div
              key="radar"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
            >
              <FileRadar files={files} onSelectFile={(file) => setSelectedFile(file)} />
            </motion.div>
          )}

          {activeTab === 'ROOTKIT' && (
            <motion.div
              key="rootkit"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
            >
              <RootkitInspector
                auditResult={rootkitResult}
                onRunAudit={async () => {
                  const res = await api.getRootkitAudit();
                  setRootkitResult(res);
                  return res;
                }}
              />
            </motion.div>
          )}

          {activeTab === 'MERKLE' && (
            <motion.div
              key="merkle"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
            >
              <MerkleVisualizer
                blocks={merkleBlocks}
                onVerify={async () => await api.verifyMerkleChain()}
                onRefresh={async () => {
                  const b = await api.getMerkleChain();
                  setMerkleBlocks(b);
                }}
              />
            </motion.div>
          )}

          {activeTab === 'CANARY' && (
            <motion.div
              key="canary"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
            >
              <CanaryManager
                canaries={canaries}
                incidents={canaryIncidents}
                onDeploy={async () => {
                  const c = await api.deployCanaries();
                  setCanaries(c);
                  return c;
                }}
                onCheck={async () => {
                  const c = await api.checkCanaries();
                  setCanaryIncidents(c.incidents || []);
                  return c;
                }}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Modals and Overlays */}
      <FileDetailModal
        file={selectedFile}
        onClose={() => setSelectedFile(null)}
        onQuarantine={handleQuarantine}
      />

      <AttackSimulatorModal
        isOpen={isSimulatorOpen}
        onClose={() => setIsSimulatorOpen(false)}
        onSimulate={async (type) => await api.simulateAttack(type)}
        onReset={async () => {
          await api.resetSandbox();
          await refreshAllData();
        }}
      />

      <CommandPalette
        isOpen={isPaletteOpen}
        onClose={() => setIsPaletteOpen(false)}
        onSelectAction={(actionId) => {
          if (actionId === 'TOGGLE_PALETTE') setIsPaletteOpen(!isPaletteOpen);
          if (actionId === 'SCAN_INTEGRITY') handleRunIntegrityScan();
          if (actionId === 'CREATE_BASELINE') handleCreateBaseline();
          if (actionId === 'ROOTKIT_AUDIT') setActiveTab('ROOTKIT');
          if (actionId === 'VERIFY_MERKLE') setActiveTab('MERKLE');
          if (actionId === 'DEPLOY_CANARY') setActiveTab('CANARY');
          if (actionId === 'OPEN_SIMULATOR') setIsSimulatorOpen(true);
          if (actionId === 'RESET_SANDBOX') api.resetSandbox().then(() => refreshAllData());
        }}
      />

      <PresentationMode
        isOpen={isPresentationOpen}
        onClose={() => setIsPresentationOpen(false)}
        status={systemStatus}
        report={integrityReport}
        rootkitResult={rootkitResult}
      />

      {/* PWA Install Banner */}
      <PwaPrompt />
    </div>
  );
};

export default App;
