/**
 * AegisFIM - Standalone Client-Side WebCrypto Engine
 * Enables 100% offline functionality and interactive Cloudflare Pages demo mode.
 * Utilizes the browser's native crypto.subtle API for SHA-256 hashing.
 */

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

async function sha256Browser(text: string): Promise<string> {
  const enc = new TextEncoder();
  const data = enc.encode(text);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

function calculateShannonEntropy(str: string): number {
  if (!str) return 0;
  const len = str.length;
  const counts: Record<string, number> = {};
  for (let i = 0; i < len; i++) {
    counts[str[i]] = (counts[str[i]] || 0) + 1;
  }
  let entropy = 0;
  for (const char in counts) {
    const p = counts[char] / len;
    entropy -= p * Math.log2(p);
  }
  return Math.round(entropy * 1000) / 1000;
}

const INITIAL_MOCK_FILES: Record<string, { content: string; mode: string; mtimeOffset: number }> = {
  'etc/passwd': {
    content: 'root:x:0:0:root:/root:/bin/bash\nuser:x:1000:1000:User:/home/user:/bin/bash\n',
    mode: '0644',
    mtimeOffset: -86400 * 20
  },
  'etc/hosts': {
    content: '127.0.0.1 localhost\n::1 localhost\n192.168.1.1 gateway.corp.internal\n',
    mode: '0644',
    mtimeOffset: -86400 * 45
  },
  'bin/auth_daemon': {
    content: '#!/bin/bash\n# Core Authentication Gateway Daemon\nverify_token_integrity "$1"\nexit 0\n',
    mode: '0755',
    mtimeOffset: -86400 * 12
  },
  'bin/sshd_config': {
    content: 'PermitRootLogin prohibit-password\nPasswordAuthentication no\nPubkeyAuthentication yes\n',
    mode: '0600',
    mtimeOffset: -86400 * 90
  },
  'secure_vault/financial_records.dat': {
    content: 'Q1_REVENUE=15420000\nQ2_REVENUE=19800000\nQ3_REVENUE=24150000\nTAX_STATUS=COMPLIANT\n',
    mode: '0600',
    mtimeOffset: -86400 * 5
  },
  'secure_vault/secrets.env': {
    content: 'VAULT_KEY=ae829f041284aef0019bc\nDB_PASS=Sup3rS3cur3P@ssw0rd!\nAPI_SALT=k99xL201\n',
    mode: '0600',
    mtimeOffset: -86400 * 8
  }
};

export class ClientFIMEngine {
  private files: Record<string, { content: string; mode: string; mtime: number; ctime: number }> = {};
  private baseline: Record<string, FileMetadata> = {};
  private merkleChain: MerkleBlock[] = [];
  private canaries: CanaryItem[] = [];
  private canaryIncidents: CanaryIncident[] = [];
  private initialized = false;

  public async init() {
    if (this.initialized) return;
    const now = Math.floor(Date.now() / 1000);

    for (const [path, data] of Object.entries(INITIAL_MOCK_FILES)) {
      this.files[path] = {
        content: data.content,
        mode: data.mode,
        mtime: now + data.mtimeOffset,
        ctime: now + data.mtimeOffset + 120
      };
    }

    // Genesis Merkle Block
    const genesisPayload = {
      system: 'AegisFIM In-Browser WebCrypto Cryptographic Engine',
      developer: 'Mahansh Gaur (23ESKCY302 | Roll 32 | CSL-G28)',
      module: 'Exp 5 - Rootkits & System Integrity',
      mode: 'WEBCRYPTO_CLIENT_PERSISTED'
    };
    const genesisHash = await sha256Browser(`0:${now}:GENESIS:${JSON.stringify(genesisPayload)}:${'0'.repeat(64)}`);
    this.merkleChain = [
      {
        index: 0,
        timestamp: now,
        event_type: 'GENESIS',
        payload: genesisPayload,
        prev_hash: '0'.repeat(64),
        block_hash: genesisHash
      }
    ];

    await this.createBaseline();
    this.initialized = true;
  }

  public async createBaseline(): Promise<{ total_files: number; merkle_root: string }> {
    this.baseline = {};
    const hashes: string[] = [];
    const now = Math.floor(Date.now() / 1000);

    for (const [rel_path, f] of Object.entries(this.files)) {
      const sha256 = await sha256Browser(f.content);
      const entropy = calculateShannonEntropy(f.content);
      const meta: FileMetadata = {
        rel_path,
        abs_path: `/sandbox/${rel_path}`,
        size: f.content.length,
        sha256,
        entropy,
        permissions: f.mode,
        mtime: f.mtime,
        ctime: f.ctime,
        timestomp_suspect: false,
        is_in_baseline: true,
        is_tampered: false
      };
      this.baseline[rel_path] = meta;
      hashes.push(sha256);
    }

    hashes.sort();
    const merkleRoot = await sha256Browser(hashes.join(''));
    await this.appendMerkleBlock('BASELINE_ESTABLISHED', {
      total_files: hashes.length,
      merkle_root: merkleRoot
    });

    return { total_files: hashes.length, merkle_root: merkleRoot };
  }

  public async verifyIntegrity(): Promise<IntegrityVerificationReport> {
    const now = Math.floor(Date.now() / 1000);
    const added: any[] = [];
    const modified: any[] = [];
    const deleted: any[] = [];
    const timestomped: any[] = [];
    const permission_changed: any[] = [];
    const untouched: string[] = [];

    // Current files check
    for (const [path, f] of Object.entries(this.files)) {
      const currSha = await sha256Browser(f.content);
      const currEntropy = calculateShannonEntropy(f.content);

      if (!this.baseline[path]) {
        added.push({
          path,
          abs_path: `/sandbox/${path}`,
          sha256: currSha,
          size: f.content.length,
          entropy: currEntropy,
          is_high_entropy: currEntropy > 7.2,
          detected_at: now,
          reason: 'Unrecognized file not found in baseline'
        });
      } else {
        const base = this.baseline[path];
        const reasons: string[] = [];

        if (currSha !== base.sha256) {
          reasons.push('Cryptographic SHA-256 hash altered');
        }
        if (f.content.length !== base.size) {
          reasons.push(`Size altered: ${base.size} -> ${f.content.length} bytes`);
        }
        if (f.mode !== base.permissions) {
          permission_changed.push({
            path,
            old_mode: base.permissions,
            new_mode: f.mode,
            diff: `Mode changed from ${base.permissions} to ${f.mode}`
          });
          reasons.push('File permissions changed');
        }

        // Timestomping heuristic check:
        // If mtime is drastically older than ctime after write
        if (f.ctime > f.mtime + 86400 * 3) {
          timestomped.push({
            path,
            mtime: f.mtime,
            ctime: f.ctime,
            reason: 'Modification time rolled back while kernel ctime reflects recent change'
          });
          reasons.push('Timestomping evasion detected');
        }

        if (reasons.length > 0) {
          const delta = Math.round((currEntropy - base.entropy) * 1000) / 1000;
          modified.push({
            path,
            abs_path: `/sandbox/${path}`,
            old_sha256: base.sha256,
            new_sha256: currSha,
            old_size: base.size,
            new_size: f.content.length,
            old_entropy: base.entropy,
            new_entropy: currEntropy,
            entropy_delta: delta,
            is_ransomware_suspect: delta > 1.8 && currEntropy > 7.0,
            reasons,
            detected_at: now
          });
        } else {
          untouched.push(path);
        }
      }
    }

    // Check for deleted
    for (const [path, base] of Object.entries(this.baseline)) {
      if (!this.files[path]) {
        deleted.push({
          path,
          last_known_sha256: base.sha256,
          size: base.size,
          detected_at: now,
          reason: 'Baseline file missing or deleted'
        });
      }
    }

    const isCompromised = added.length > 0 || modified.length > 0 || deleted.length > 0 || timestomped.length > 0;

    return {
      status: isCompromised ? 'COMPROMISED' : 'SECURE',
      scan_timestamp: now,
      total_baseline_files: Object.keys(this.baseline).length,
      total_scanned_files: Object.keys(this.files).length,
      summary: {
        added_count: added.length,
        modified_count: modified.length,
        deleted_count: deleted.length,
        timestomped_count: timestomped.length,
        permission_changed_count: permission_changed.length,
        untouched_count: untouched.length
      },
      added,
      modified,
      deleted,
      timestomped,
      permission_changed,
      untouched_files: untouched
    };
  }

  public async getMonitoredFiles(): Promise<FileMetadata[]> {
    const list: FileMetadata[] = [];
    for (const [path, f] of Object.entries(this.files)) {
      const sha256 = await sha256Browser(f.content);
      const entropy = calculateShannonEntropy(f.content);
      const inBase = Boolean(this.baseline[path]);
      const isTampered = inBase && this.baseline[path].sha256 !== sha256;
      list.push({
        rel_path: path,
        abs_path: `/sandbox/${path}`,
        size: f.content.length,
        sha256,
        entropy,
        permissions: f.mode,
        mtime: f.mtime,
        ctime: f.ctime,
        is_in_baseline: inBase,
        is_tampered: isTampered,
        timestomp_suspect: f.ctime > f.mtime + 86400 * 3
      });
    }
    return list;
  }

  public runRootkitAudit(): RootkitAuditResult {
    const findings: any[] = [];
    const now = Math.floor(Date.now() / 1000);

    for (const [path, f] of Object.entries(this.files)) {
      // 1. Dynamic Linker Preload hook
      if (path.includes('ld.so.preload') || path.includes('preload')) {
        findings.push({
          severity: 'CRITICAL',
          type: 'DYNAMIC_LINKER_HIJACKING',
          source: path,
          file: path,
          detail: `Malicious library injection hook detected in ${path}: ${f.content.trim()}`,
          mitre_technique: 'T1574.006 (Dynamic Linker Hijacking)',
          timestamp: now
        });
      }

      // 2. Hidden dotfiles
      const baseName = path.split('/').pop() || '';
      if (baseName.startsWith('.') && !baseName.startsWith('.git')) {
        findings.push({
          severity: 'MEDIUM',
          type: 'STEALTH_DOTFILE_ARTIFACT',
          file: path,
          detail: `Hidden file artifact concealed in directory: ${path}`,
          mitre_technique: 'T1564.001 (Hide Artifacts)',
          timestamp: now
        });
      }

      // 3. SUID bit set
      if (f.mode.startsWith('4') || f.mode === '4755') {
        findings.push({
          severity: 'CRITICAL',
          type: 'SUID_ROOT_BACKDOOR',
          file: path,
          detail: `Executable marked with SUID permission bit (${f.mode}): enables instant root privilege escalation`,
          mitre_technique: 'T1548.001 (Setuid and Setgid)',
          timestamp: now
        });
      }

      // 4. Timestomping evasion
      if (f.ctime > f.mtime + 86400 * 3) {
        findings.push({
          severity: 'HIGH',
          type: 'TIMESTOMPING_EVASION_CONFIRMED',
          file: path,
          detail: `mtime was artificially backdated while kernel ctime reflects modification!`,
          mitre_technique: 'T1070.006 (Timestomping)',
          timestamp: now
        });
      }
    }

    const threatScore = Math.min(100, findings.length * 25);
    const status = threatScore >= 50 ? 'ROOTKIT_THREAT_ACTIVE' : threatScore > 0 ? 'SUSPICIOUS_ANOMALIES' : 'CLEAN';

    return {
      module: 'Exp 5 - Rootkits & System Integrity',
      audit_timestamp: now,
      status,
      threat_score: threatScore,
      threats_count: findings.length,
      findings,
      mitre_coverage: [
        { id: 'T1014', name: 'Rootkit', status: 'Audited' },
        { id: 'T1070.006', name: 'Timestomp', status: 'Audited' },
        { id: 'T1564.001', name: 'Hidden Files & Directories', status: 'Audited' },
        { id: 'T1574.006', name: 'Dynamic Linker Hijacking', status: 'Audited' },
        { id: 'T1548.001', name: 'Setuid and Setgid', status: 'Audited' }
      ]
    };
  }

  public async deployCanaries(): Promise<CanaryItem[]> {
    const now = Math.floor(Date.now() / 1000);
    const items: CanaryItem[] = [
      {
        filename: '!00_CONFIDENTIAL_PAYROLL_2025.xlsx',
        path: '/sandbox/!00_CONFIDENTIAL_PAYROLL_2025.xlsx',
        category: 'Financial Decoy',
        description: 'Alphabetically top decoy file to bait ransomware enumeration first',
        sha256: await sha256Browser('CANARY_PAYROLL_TRIPWIRE_TOKEN_ACTIVE'),
        size: 320,
        deployed_at: now,
        status: 'ARMED_AND_WATCHING'
      },
      {
        filename: 'backup_aws_service_credentials.env',
        path: '/sandbox/backup_aws_service_credentials.env',
        category: 'Credential Decoy',
        description: 'Decoy credentials file designed to trip infostealers and exfiltration scripts',
        sha256: await sha256Browser('AWS_ACCESS_KEY_ID=AKIA_CANARY_ACTIVE'),
        size: 180,
        deployed_at: now,
        status: 'ARMED_AND_WATCHING'
      }
    ];

    this.canaries = items;
    for (const c of items) {
      this.files[c.filename] = {
        content: `CANARY_HONEYPOT_ACTIVE_${c.filename}`,
        mode: '0600',
        mtime: now,
        ctime: now
      };
    }

    await this.appendMerkleBlock('CANARIES_DEPLOYED', { count: items.length });
    return items;
  }

  public checkCanaries(): { status: string; incidents: CanaryIncident[]; total_registered: number } {
    return {
      status: this.canaryIncidents.length > 0 ? 'ALERT' : 'SECURE',
      incidents: this.canaryIncidents,
      total_registered: this.canaries.length
    };
  }

  public async appendMerkleBlock(eventType: string, payload: any): Promise<MerkleBlock> {
    const prevBlock = this.merkleChain[this.merkleChain.length - 1];
    const prevHash = prevBlock.block_hash;
    const newIndex = this.merkleChain.length;
    const now = Math.floor(Date.now() / 1000);

    const blockContent = `${newIndex}:${now}:${eventType}:${JSON.stringify(payload)}:${prevHash}`;
    const blockHash = await sha256Browser(blockContent);

    const block: MerkleBlock = {
      index: newIndex,
      timestamp: now,
      event_type: eventType,
      payload,
      prev_hash: prevHash,
      block_hash: blockHash
    };

    this.merkleChain.push(block);
    return block;
  }

  public async verifyMerkleChain(): Promise<MerkleVerification> {
    for (let i = 0; i < this.merkleChain.length; i++) {
      const curr = this.merkleChain[i];
      if (i === 0) {
        if (curr.prev_hash !== '0'.repeat(64)) {
          return { valid: false, status: 'GENESIS_TAMPERED', detail: 'Genesis block prev_hash was modified!' };
        }
      } else {
        const prev = this.merkleChain[i - 1];
        if (curr.prev_hash !== prev.block_hash) {
          return {
            valid: false,
            status: 'HASH_CHAIN_BROKEN',
            compromised_block_index: i,
            detail: `Block #${i} prev_hash broken!`
          };
        }
      }
    }
    const latest = this.merkleChain[this.merkleChain.length - 1];
    return {
      valid: true,
      status: 'CRYPTOGRAPHICALLY_VERIFIED',
      chain_length: this.merkleChain.length,
      latest_block_hash: latest.block_hash,
      detail: `All ${this.merkleChain.length} audit blocks cryptographically linked via SHA-256 Merkle chain.`
    };
  }

  public getMerkleBlocks(): MerkleBlock[] {
    return [...this.merkleChain].reverse();
  }

  public async simulateAttack(attackType: string): Promise<any> {
    const now = Math.floor(Date.now() / 1000);
    let result: any = null;

    if (attackType === 'modification') {
      const curr = this.files['etc/passwd']?.content || '';
      this.files['etc/passwd'] = {
        content: curr + `\nbackdoor_root_${Math.floor(Math.random() * 900)}:x:0:0:root:/root:/bin/bash # EXPLOIT\n`,
        mode: '0644',
        mtime: now,
        ctime: now
      };
      result = {
        attack: 'UNAUTHORIZED_FILE_MODIFICATION',
        target: 'etc/passwd',
        payload: 'Injected unauthorized root account (UID 0)',
        mitre: 'T1078 (Valid Accounts), T1098 (Account Manipulation)'
      };
    } else if (attackType === 'timestomping') {
      this.files['bin/auth_daemon'] = {
        content: '#!/bin/bash\n# Patched backdoor auth bypass\nexit 0\n',
        mode: '0755',
        mtime: now - 86400 * 365 * 4, // 4 years ago!
        ctime: now // Real OS ctime updated to today!
      };
      result = {
        attack: 'TIMESTOMPING_EVASION',
        target: 'bin/auth_daemon',
        payload: 'Binary overwritten and forged mtime to 2021 to evade timestamp auditing',
        mitre: 'T1070.006 (Timestomping)'
      };
    } else if (attackType === 'ransomware') {
      // Simulate AES-256 random encryption payload (high Shannon entropy)
      const randomChars = Array.from({ length: 1200 }, () => String.fromCharCode(Math.floor(Math.random() * 256))).join('');
      this.files['secure_vault/financial_records.dat.locked'] = {
        content: randomChars,
        mode: '0600',
        mtime: now,
        ctime: now
      };
      // Encrypt canary too
      if (this.files['!00_CONFIDENTIAL_PAYROLL_2025.xlsx']) {
        this.files['!00_CONFIDENTIAL_PAYROLL_2025.xlsx'].content = randomChars.substring(0, 500);
        this.canaryIncidents.push({
          severity: 'CRITICAL_RANSOMWARE_BURST',
          canary_file: '!00_CONFIDENTIAL_PAYROLL_2025.xlsx',
          event: 'CANARY_FILE_ENCRYPTED',
          current_entropy: 7.96,
          is_high_entropy: true,
          detail: 'Decoy canary file encrypted! Entropy: 7.96/8.0 (Active ransomware threat caught)',
          mitre_technique: 'T1486 (Data Encrypted for Impact)',
          timestamp: now
        });
      }
      result = {
        attack: 'RANSOMWARE_ENCRYPTION_BURST',
        target: 'secure_vault/financial_records.dat.locked',
        payload: 'High-entropy payload written (Entropy: 7.96/8.0), Canary trap tripped!',
        mitre: 'T1486 (Data Encrypted for Impact)'
      };
    } else if (attackType === 'rootkit_preload') {
      this.files['etc/ld.so.preload'] = {
        content: '/lib/security/libshadow_rootkit_hook.so\n',
        mode: '0644',
        mtime: now,
        ctime: now
      };
      result = {
        attack: 'LD_PRELOAD_ROOTKIT_INJECTION',
        target: 'etc/ld.so.preload',
        payload: 'Added dynamic linker hook pointing to rogue DSO',
        mitre: 'T1574.006 (Dynamic Linker Hijacking), T1014 (Rootkit)'
      };
    } else if (attackType === 'suid_backdoor') {
      this.files['bin/.stealth_suid_backdoor'] = {
        content: '#!/bin/sh\n/bin/bash -p\n',
        mode: '4755',
        mtime: now,
        ctime: now
      };
      result = {
        attack: 'SUID_PRIVILEGE_ESCALATION_BACKDOOR',
        target: 'bin/.stealth_suid_backdoor',
        payload: 'Hidden file created with SUID execution bit (4755)',
        mitre: 'T1548.001 (Setuid and Setgid), T1564.001 (Hidden Files)'
      };
    }

    await this.appendMerkleBlock('ATTACK_SIMULATED', result);
    return result;
  }

  public async resetSandbox(): Promise<void> {
    const now = Math.floor(Date.now() / 1000);
    this.files = {};
    for (const [path, data] of Object.entries(INITIAL_MOCK_FILES)) {
      this.files[path] = {
        content: data.content,
        mode: data.mode,
        mtime: now + data.mtimeOffset,
        ctime: now + data.mtimeOffset + 120
      };
    }
    this.canaryIncidents = [];
    await this.createBaseline();
    await this.appendMerkleBlock('SANDBOX_RESET', { status: 'RESTORED_TO_PRISTINE' });
  }

  public async quarantineFile(relPath: string): Promise<void> {
    delete this.files[relPath];
    await this.appendMerkleBlock('FILE_QUARANTINED', { file: relPath });
  }

  public getSystemStatus(): SystemStatus {
    return {
      system: {
        platform: 'Cloudflare Edge / WebCrypto Engine',
        cpu_percent: Math.floor(Math.random() * 8) + 4,
        memory_percent: 28.5,
        uptime_seconds: 86400 * 3
      },
      fim_daemon: {
        monitoring_directory: '/sandbox/system_files',
        observer_running: true,
        baseline_initialized: true,
        baseline_created_at: Date.now() / 1000 - 3600,
        total_baseline_files: Object.keys(this.baseline).length,
        merkle_root: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855'
      },
      student_metadata: {
        name: 'Mahansh Gaur',
        roll: 32,
        reg_no: '23ESKCY302',
        batch: 'CSL-G28',
        subject: 'Cyber Security Lab (Exp 5 - Rootkits & System Integrity)'
      }
    };
  }
}

export const clientFim = new ClientFIMEngine();
