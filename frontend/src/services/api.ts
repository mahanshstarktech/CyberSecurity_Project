/**
 * AegisFIM - Unified API Gateway
 * Intelligently switches between Live Backend (FastAPI / Render) and Standalone WebCrypto Engine.
 */

import { clientFim } from './clientFimEngine';
import {
  FileMetadata,
  IntegrityVerificationReport,
  RootkitAuditResult,
  CanaryItem,
  CanaryIncident,
  MerkleBlock,
  MerkleVerification,
  SystemStatus
} from '../types/fim';

const API_BASE = import.meta.env.VITE_API_URL || '';

export class ApiGateway {
  public isConnectedToBackend = false;
  public useSandboxMode = false;
  private ws: WebSocket | null = null;
  private wsListeners: Array<(msg: any) => void> = [];

  constructor() {
    clientFim.init();
    this.checkBackendHealth();
  }

  public async checkBackendHealth(): Promise<boolean> {
    try {
      const res = await fetch(`${API_BASE}/api/status`, { signal: AbortSignal.timeout(2500) });
      if (res.ok) {
        this.isConnectedToBackend = true;
        this.initWebSocket();
        return true;
      }
    } catch (e) {
      this.isConnectedToBackend = false;
    }
    return false;
  }

  private initWebSocket() {
    if (this.ws || typeof window === 'undefined') return;
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = API_BASE ? API_BASE.replace(/^http(s)?:\/\//, '') : window.location.host;
    const wsUrl = `${protocol}//${host}/ws`;

    try {
      this.ws = new WebSocket(wsUrl);
      this.ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          this.wsListeners.forEach(listener => listener(data));
        } catch (e) {}
      };
      this.ws.onclose = () => {
        this.ws = null;
        setTimeout(() => {
          if (this.isConnectedToBackend) this.initWebSocket();
        }, 5000);
      };
    } catch (e) {}
  }

  public subscribeToLiveEvents(callback: (msg: any) => void) {
    this.wsListeners.push(callback);
    return () => {
      this.wsListeners = this.wsListeners.filter(l => l !== callback);
    };
  }

  public broadcastClientEvent(msg: any) {
    this.wsListeners.forEach(l => l(msg));
  }

  public async getStatus(): Promise<SystemStatus> {
    if (this.isConnectedToBackend && !this.useSandboxMode) {
      try {
        const res = await fetch(`${API_BASE}/api/status`);
        return await res.json();
      } catch (e) {
        this.isConnectedToBackend = false;
      }
    }
    return clientFim.getSystemStatus();
  }

  public async createBaseline(): Promise<any> {
    if (this.isConnectedToBackend && !this.useSandboxMode) {
      const res = await fetch(`${API_BASE}/api/baseline/create`, { method: 'POST' });
      return await res.json();
    }
    return await clientFim.createBaseline();
  }

  public async verifyBaseline(): Promise<IntegrityVerificationReport> {
    if (this.isConnectedToBackend && !this.useSandboxMode) {
      const res = await fetch(`${API_BASE}/api/baseline/verify`);
      return await res.json();
    }
    return await clientFim.verifyIntegrity();
  }

  public async getMonitoredFiles(): Promise<FileMetadata[]> {
    if (this.isConnectedToBackend && !this.useSandboxMode) {
      const res = await fetch(`${API_BASE}/api/monitored-files`);
      const data = await res.json();
      return data.files || [];
    }
    return await clientFim.getMonitoredFiles();
  }

  public async getRootkitAudit(): Promise<RootkitAuditResult> {
    if (this.isConnectedToBackend && !this.useSandboxMode) {
      const res = await fetch(`${API_BASE}/api/rootkit/audit`);
      return await res.json();
    }
    return clientFim.runRootkitAudit();
  }

  public async deployCanaries(): Promise<CanaryItem[]> {
    if (this.isConnectedToBackend && !this.useSandboxMode) {
      const res = await fetch(`${API_BASE}/api/canary/deploy`, { method: 'POST' });
      const data = await res.json();
      return data.canaries || [];
    }
    return await clientFim.deployCanaries();
  }

  public async checkCanaries(): Promise<{ status: string; incidents: CanaryIncident[]; total_registered: number }> {
    if (this.isConnectedToBackend && !this.useSandboxMode) {
      const res = await fetch(`${API_BASE}/api/canary/status`);
      return await res.json();
    }
    return clientFim.checkCanaries();
  }

  public async getMerkleChain(): Promise<MerkleBlock[]> {
    if (this.isConnectedToBackend && !this.useSandboxMode) {
      const res = await fetch(`${API_BASE}/api/merkle/chain`);
      const data = await res.json();
      return data.blocks || [];
    }
    return clientFim.getMerkleBlocks();
  }

  public async verifyMerkleChain(): Promise<MerkleVerification> {
    if (this.isConnectedToBackend && !this.useSandboxMode) {
      const res = await fetch(`${API_BASE}/api/merkle/verify`);
      return await res.json();
    }
    return await clientFim.verifyMerkleChain();
  }

  public async quarantineFile(relPath: string): Promise<any> {
    if (this.isConnectedToBackend && !this.useSandboxMode) {
      const res = await fetch(`${API_BASE}/api/quarantine`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rel_path: relPath })
      });
      return await res.json();
    }
    return await clientFim.quarantineFile(relPath);
  }

  public async simulateAttack(attackType: string): Promise<any> {
    if (this.isConnectedToBackend && !this.useSandboxMode) {
      const res = await fetch(`${API_BASE}/api/simulate/${attackType}`, { method: 'POST' });
      return await res.json();
    }
    const result = await clientFim.simulateAttack(attackType);
    this.broadcastClientEvent({
      type: 'ATTACK_TRIGGERED',
      attack: attackType,
      details: result
    });
    return result;
  }

  public async resetSandbox(): Promise<any> {
    if (this.isConnectedToBackend && !this.useSandboxMode) {
      const res = await fetch(`${API_BASE}/api/reset`, { method: 'POST' });
      return await res.json();
    }
    await clientFim.resetSandbox();
    this.broadcastClientEvent({
      type: 'SYSTEM_RESET',
      message: 'Sandbox restored to clean baseline state'
    });
    return { status: 'CLEAN' };
  }
}

export const api = new ApiGateway();
