"""
AegisFIM - Core File Integrity Monitoring Engine
Student: Mahansh Gaur | Roll 32 | Reg: 23ESKCY302 | Batch: CSL-G28
Topic: File Integrity Monitoring System (Tripwire-like)
Module: Exp 5 - Rootkits & System Integrity
"""

import os
import math
import time
import json
import hashlib
from typing import Dict, List, Optional, Any
from pathlib import Path


def calculate_entropy(data: bytes) -> float:
    """Calculate Shannon entropy of byte data: 0.0 (uniform) to 8.0 (fully random/encrypted)."""
    if not data:
        return 0.0
    entropy = 0.0
    length = len(data)
    byte_counts = [0] * 256
    for b in data:
        byte_counts[b] += 1
    for count in byte_counts:
        if count > 0:
            p_x = count / length
            entropy -= p_x * math.log2(p_x)
    return round(entropy, 4)


def compute_file_hashes(file_path: str) -> Dict[str, Any]:
    """Compute SHA-256, SHA-512, MD5, and Shannon entropy for a file."""
    sha256 = hashlib.sha256()
    sha512 = hashlib.sha512()
    md5 = hashlib.md5()
    
    sample_bytes = bytearray()
    max_sample = 65536  # 64KB for entropy sampling
    total_size = 0
    
    with open(file_path, "rb") as f:
        while chunk := f.read(65536):
            total_size += len(chunk)
            sha256.update(chunk)
            sha512.update(chunk)
            md5.update(chunk)
            if len(sample_bytes) < max_sample:
                sample_bytes.extend(chunk[: max_sample - len(sample_bytes)])
                
    entropy = calculate_entropy(bytes(sample_bytes))
    return {
        "sha256": sha256.hexdigest(),
        "sha512": sha512.hexdigest(),
        "md5": md5.hexdigest(),
        "entropy": entropy,
        "size": total_size
    }


class FIMCoreEngine:
    def __init__(self, target_directory: str, baseline_path: str = "baseline.json"):
        self.target_directory = os.path.abspath(target_directory)
        self.baseline_path = os.path.abspath(baseline_path)
        self.baseline: Dict[str, Any] = {}
        self.load_baseline()

    def scan_file(self, full_path: str) -> Optional[Dict[str, Any]]:
        """Extract full cryptographic and forensic metadata for a single file."""
        try:
            st = os.stat(full_path, follow_symlinks=False)
            is_symlink = os.path.islink(full_path)
            
            # File system attributes
            mode = oct(st.st_mode)[-4:]
            uid = st.st_uid
            gid = st.st_gid
            mtime = st.st_mtime
            ctime = st.st_ctime
            atime = st.st_atime
            
            hashes = compute_file_hashes(full_path)
            
            # Timestomping heuristic check:
            # If modification time is drastically in the past compared to status change (ctime),
            # or if mtime lies in the distant future, flag potential timestomping!
            timestomp_detected = False
            time_diff = abs(ctime - mtime)
            # 1 day threshold where mtime is older than ctime after write
            if ctime > mtime + 86400:
                timestomp_detected = True

            rel_path = os.path.relpath(full_path, self.target_directory)

            return {
                "rel_path": rel_path,
                "abs_path": full_path,
                "size": hashes["size"],
                "sha256": hashes["sha256"],
                "sha512": hashes["sha512"],
                "md5": hashes["md5"],
                "entropy": hashes["entropy"],
                "permissions": mode,
                "uid": uid,
                "gid": gid,
                "mtime": mtime,
                "ctime": ctime,
                "atime": atime,
                "is_symlink": is_symlink,
                "timestomp_suspect": timestomp_detected,
                "scanned_at": time.time()
            }
        except (PermissionError, FileNotFoundError, OSError):
            return None

    def create_baseline(self) -> Dict[str, Any]:
        """Recursively scan target directory and establish a cryptographic SHA-256 baseline."""
        new_baseline: Dict[str, Any] = {
            "version": "1.0-AegisFIM",
            "created_at": time.time(),
            "target_directory": self.target_directory,
            "total_files": 0,
            "files": {},
            "merkle_root": ""
        }
        
        file_hashes = []
        
        for root, dirs, files in os.walk(self.target_directory):
            # Exclude hidden VCS and temp cache
            dirs[:] = [d for d in dirs if not d.startswith(".git") and d != "__pycache__"]
            for file in sorted(files):
                if file.startswith(".DS_Store") or file.endswith("baseline.json"):
                    continue
                full_path = os.path.join(root, file)
                if os.path.abspath(full_path) == self.baseline_path:
                    continue
                metadata = self.scan_file(full_path)
                if metadata:
                    rel_p = metadata["rel_path"]
                    new_baseline["files"][rel_p] = metadata
                    file_hashes.append(metadata["sha256"])
                    
        new_baseline["total_files"] = len(new_baseline["files"])
        
        # Calculate overall Merkle root hash of all files
        combined = "".join(sorted(file_hashes)).encode("utf-8")
        new_baseline["merkle_root"] = hashlib.sha256(combined).hexdigest() if combined else ""
        
        # Write to disk securely
        with open(self.baseline_path, "w", encoding="utf-8") as f:
            json.dump(new_baseline, f, indent=2)
            
        self.baseline = new_baseline
        return new_baseline

    def load_baseline(self) -> bool:
        """Load pre-existing baseline if available."""
        if os.path.exists(self.baseline_path):
            try:
                with open(self.baseline_path, "r", encoding="utf-8") as f:
                    self.baseline = json.load(f)
                return True
            except Exception:
                self.baseline = {}
        return False

    def verify_integrity(self) -> Dict[str, Any]:
        """
        Deep integrity scan comparing current filesystem state against baseline.
        Categorizes: Added, Modified, Deleted, Timestomped, Permission Changed, and Untouched.
        """
        if not self.baseline or "files" not in self.baseline:
            return {
                "error": "No baseline found. Please create a baseline first.",
                "status": "UNINITIALIZED"
            }
            
        base_files: Dict[str, Any] = self.baseline.get("files", {})
        current_files: Dict[str, Any] = {}
        
        for root, dirs, files in os.walk(self.target_directory):
            dirs[:] = [d for d in dirs if not d.startswith(".git") and d != "__pycache__"]
            for file in sorted(files):
                if file.startswith(".DS_Store") or file.endswith("baseline.json"):
                    continue
                full_path = os.path.join(root, file)
                if os.path.abspath(full_path) == self.baseline_path:
                    continue
                metadata = self.scan_file(full_path)
                if metadata:
                    current_files[metadata["rel_path"]] = metadata
                    
        added = []
        modified = []
        deleted = []
        timestomped = []
        permission_changed = []
        untouched = []
        
        # Check current files against baseline
        for rel_path, curr in current_files.items():
            if rel_path not in base_files:
                added.append({
                    "path": rel_path,
                    "abs_path": curr["abs_path"],
                    "sha256": curr["sha256"],
                    "size": curr["size"],
                    "entropy": curr["entropy"],
                    "is_high_entropy": curr["entropy"] > 7.2,
                    "detected_at": time.time(),
                    "reason": "New unrecognized file found"
                })
            else:
                base = base_files[rel_path]
                diffs = []
                
                # Check SHA-256 hash mismatch
                if curr["sha256"] != base["sha256"]:
                    diffs.append("Content hash altered")
                    
                if curr["size"] != base["size"]:
                    diffs.append(f"Size changed: {base['size']} -> {curr['size']} bytes")
                    
                if curr["permissions"] != base["permissions"]:
                    permission_changed.append({
                        "path": rel_path,
                        "old_mode": base["permissions"],
                        "new_mode": curr["permissions"],
                        "diff": f"Mode changed from {base['permissions']} to {curr['permissions']}"
                    })
                    diffs.append(f"Permissions changed from {base['permissions']} to {curr['permissions']}")
                    
                if curr["timestomp_suspect"] or abs(curr["mtime"] - base["mtime"]) > 1:
                    if curr["timestomp_suspect"]:
                        timestomped.append({
                            "path": rel_path,
                            "mtime": curr["mtime"],
                            "ctime": curr["ctime"],
                            "reason": "mtime altered while ctime retained evidence of modification"
                        })
                        diffs.append("Possible Timestomping evasion detected")
                        
                if diffs:
                    entropy_delta = round(curr["entropy"] - base.get("entropy", 0.0), 3)
                    modified.append({
                        "path": rel_path,
                        "abs_path": curr["abs_path"],
                        "old_sha256": base["sha256"],
                        "new_sha256": curr["sha256"],
                        "old_size": base["size"],
                        "new_size": curr["size"],
                        "old_entropy": base.get("entropy", 0.0),
                        "new_entropy": curr["entropy"],
                        "entropy_delta": entropy_delta,
                        "is_ransomware_suspect": entropy_delta > 1.8 and curr["entropy"] > 7.0,
                        "reasons": diffs,
                        "detected_at": time.time()
                    })
                else:
                    untouched.append(rel_path)
                    
        # Check for deleted files
        for rel_path, base in base_files.items():
            if rel_path not in current_files:
                deleted.append({
                    "path": rel_path,
                    "last_known_sha256": base["sha256"],
                    "size": base["size"],
                    "detected_at": time.time(),
                    "reason": "Baseline file missing or unlinked"
                })
                
        is_compromised = bool(added or modified or deleted or timestomped)
        
        return {
            "status": "COMPROMISED" if is_compromised else "SECURE",
            "scan_timestamp": time.time(),
            "total_baseline_files": len(base_files),
            "total_scanned_files": len(current_files),
            "summary": {
                "added_count": len(added),
                "modified_count": len(modified),
                "deleted_count": len(deleted),
                "timestomped_count": len(timestomped),
                "permission_changed_count": len(permission_changed),
                "untouched_count": len(untouched)
            },
            "added": added,
            "modified": modified,
            "deleted": deleted,
            "timestomped": timestomped,
            "permission_changed": permission_changed,
            "untouched_files": untouched[:50]
        }
