export interface FileMetadata {
  rel_path: string;
  abs_path: string;
  size: number;
  sha256: string;
  sha512?: string;
  md5?: string;
  entropy: number;
  permissions: string;
  uid?: number;
  gid?: number;
  mtime: number;
  ctime: number;
  atime?: number;
  is_symlink?: boolean;
  timestomp_suspect?: boolean;
  is_in_baseline?: boolean;
  is_tampered?: boolean;
  is_canary?: boolean;
}

export interface IntegrityDiffModified {
  path: string;
  abs_path: string;
  old_sha256: string;
  new_sha256: string;
  old_size: number;
  new_size: number;
  old_entropy: number;
  new_entropy: number;
  entropy_delta: number;
  is_ransomware_suspect: boolean;
  reasons: string[];
  detected_at: number;
}

export interface IntegrityDiffAdded {
  path: string;
  abs_path: string;
  sha256: string;
  size: number;
  entropy: number;
  is_high_entropy: boolean;
  detected_at: number;
  reason: string;
}

export interface IntegrityDiffDeleted {
  path: string;
  last_known_sha256: string;
  size: number;
  detected_at: number;
  reason: string;
}

export interface IntegrityDiffTimestomped {
  path: string;
  mtime: number;
  ctime: number;
  reason: string;
}

export interface IntegrityDiffPermission {
  path: string;
  old_mode: string;
  new_mode: string;
  diff: string;
}

export interface IntegrityVerificationReport {
  status: 'SECURE' | 'COMPROMISED' | 'UNINITIALIZED';
  scan_timestamp: number;
  total_baseline_files: number;
  total_scanned_files: number;
  summary: {
    added_count: number;
    modified_count: number;
    deleted_count: number;
    timestomped_count: number;
    permission_changed_count: number;
    untouched_count: number;
  };
  added: IntegrityDiffAdded[];
  modified: IntegrityDiffModified[];
  deleted: IntegrityDiffDeleted[];
  timestomped: IntegrityDiffTimestomped[];
  permission_changed: IntegrityDiffPermission[];
  untouched_files: string[];
}

export interface RootkitFinding {
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  type: string;
  source?: string;
  file?: string;
  detail: string;
  mitre_technique?: string;
  timestamp: number;
}

export interface RootkitAuditResult {
  module: string;
  audit_timestamp: number;
  status: 'CLEAN' | 'SUSPICIOUS_ANOMALIES' | 'ROOTKIT_THREAT_ACTIVE';
  threat_score: number;
  threats_count: number;
  findings: RootkitFinding[];
  mitre_coverage: Array<{
    id: string;
    name: string;
    status: string;
  }>;
}

export interface CanaryItem {
  filename: string;
  path: string;
  category: string;
  description: string;
  sha256: string;
  size: number;
  deployed_at: number;
  status: string;
}

export interface CanaryIncident {
  severity: string;
  canary_file: string;
  event: string;
  current_entropy?: number;
  is_high_entropy?: boolean;
  detail: string;
  mitre_technique?: string;
  timestamp: number;
}

export interface MerkleBlock {
  index: number;
  timestamp: number;
  event_type: string;
  payload: Record<string, any>;
  prev_hash: string;
  block_hash: string;
}

export interface MerkleVerification {
  valid: boolean;
  status: string;
  chain_length?: number;
  latest_block_hash?: string;
  verified_at?: number;
  detail: string;
  compromised_block_index?: number;
}

export interface SystemStatus {
  system: {
    platform: string;
    cpu_percent: number;
    memory_percent: number;
    uptime_seconds: number;
  };
  fim_daemon: {
    monitoring_directory: string;
    observer_running: boolean;
    baseline_initialized: boolean;
    baseline_created_at: number;
    total_baseline_files: number;
    merkle_root: string;
  };
  student_metadata: {
    name: string;
    roll: number;
    reg_no: string;
    batch: string;
    subject: string;
  };
}

