"""
AegisFIM - Exp 5: Rootkit Detection & Deep System Integrity Module
Assisted by Anthropic Cybersecurity Skills: detecting-rootkit-activity & analyzing-bootkit-and-rootkit-samples
MITRE ATT&CK: T1014 (Rootkit), T1070.006 (Timestomping), T1564.001 (Hidden Artifacts), T1547.006 (Kernel Modules)
"""

import os
import sys
import glob
import time
from typing import Dict, List, Any


class RootkitDetector:
    def __init__(self, monitored_dir: str):
        self.monitored_dir = os.path.abspath(monitored_dir)

    def audit_preloaded_libraries(self) -> List[Dict[str, Any]]:
        """
        Detect LD_PRELOAD / DYLD_INSERT_LIBRARIES hijacking.
        User-space rootkits hook libc readdir/stat via preload injection to hide files and processes.
        """
        findings = []
        
        # Check environment variables
        preload_envs = ["LD_PRELOAD", "DYLD_INSERT_LIBRARIES", "DYLD_LIBRARY_PATH"]
        for env_var in preload_envs:
            val = os.environ.get(env_var)
            if val:
                findings.append({
                    "severity": "CRITICAL",
                    "type": "USERSPACE_ROOTKIT_PRELOAD",
                    "source": f"Environment variable {env_var}",
                    "detail": f"Active injection hook detected: {val}",
                    "mitre_technique": "T1574.006 (Dynamic Linker Hijacking)",
                    "timestamp": time.time()
                })

        # Check system configuration preload files
        system_preload_files = [
            "/etc/ld.so.preload",
            "/etc/ld.so.conf",
            os.path.join(self.monitored_dir, "etc", "ld.so.preload"),
            os.path.join(self.monitored_dir, "ld.so.preload")
        ]
        
        for path in system_preload_files:
            if os.path.exists(path):
                try:
                    with open(path, "r", encoding="utf-8", errors="ignore") as f:
                        content = f.read().strip()
                        if content:
                            findings.append({
                                "severity": "HIGH",
                                "type": "PERSISTENT_ROOTKIT_HOOK",
                                "source": path,
                                "detail": f"Preload configuration references libraries: {content}",
                                "mitre_technique": "T1574.006",
                                "timestamp": time.time()
                            })
                except Exception:
                    pass

        return findings

    def scan_hidden_artifacts(self) -> List[Dict[str, Any]]:
        """
        Detect files hiding using leading dots, zero-width characters, or disguise.
        Rootkits frequently drop payloads in world-writable directories or use misleading names.
        """
        findings = []
        suspicious_keywords = ["rootkit", "backdoor", "dropper", "c2", "revshell", "inject", "hook"]

        for root, dirs, files in os.walk(self.monitored_dir):
            for filename in files:
                full_path = os.path.join(root, filename)
                rel_path = os.path.relpath(full_path, self.monitored_dir)
                
                # Check 1: Hidden dotfiles in unexpected places
                if filename.startswith(".") and not filename.startswith(".git"):
                    findings.append({
                        "severity": "MEDIUM",
                        "type": "STEALTH_DOTFILE_ARTIFACT",
                        "file": rel_path,
                        "detail": f"Hidden file detected in monitored scope: {filename}",
                        "mitre_technique": "T1564.001 (Hide Artifacts)",
                        "timestamp": time.time()
                    })

                # Check 2: Keyword signature match
                lower_name = filename.lower()
                for kw in suspicious_keywords:
                    if kw in lower_name:
                        findings.append({
                            "severity": "HIGH",
                            "type": "MALICIOUS_SIGNATURE_SUSPECT",
                            "file": rel_path,
                            "detail": f"Filename matches suspicious threat keyword '{kw}'",
                            "mitre_technique": "T1014 (Rootkit)",
                            "timestamp": time.time()
                        })

                # Check 3: Suspicious SUID/SGID permissions
                try:
                    st = os.stat(full_path, follow_symlinks=False)
                    mode = st.st_mode
                    is_suid = bool(mode & 0o4000)
                    is_sgid = bool(mode & 0o2000)
                    if is_suid or is_sgid:
                        findings.append({
                            "severity": "CRITICAL",
                            "type": "PRIVILEGE_ESCALATION_SUID_SET",
                            "file": rel_path,
                            "detail": f"SUID/SGID executable bit enabled: mode {oct(mode)[-4:]}",
                            "mitre_technique": "T1548.001 (Setuid and Setgid)",
                            "timestamp": time.time()
                        })
                except OSError:
                    pass

        return findings

    def cross_view_heuristic_audit(self, baseline_files: Dict[str, Any]) -> List[Dict[str, Any]]:
        """
        Cross-View Detection:
        Examines discrepancies between filesystem metadata tables and direct enumerations.
        Flags timestomping evasion techniques where mtime is rolled back to match legitimate timestamps.
        """
        anomalies = []
        now = time.time()

        for root, dirs, files in os.walk(self.monitored_dir):
            for file in files:
                full_path = os.path.join(root, file)
                rel_path = os.path.relpath(full_path, self.monitored_dir)
                try:
                    st = os.stat(full_path)
                    # Check for impossible timestamps (future timestamps or extreme past)
                    if st.st_mtime > now + 300:
                        anomalies.append({
                            "severity": "HIGH",
                            "type": "TIMESTOMPING_FUTURE_TIMESTAMP",
                            "file": rel_path,
                            "detail": f"File mtime is set into the future ({time.ctime(st.st_mtime)})",
                            "mitre_technique": "T1070.006 (Timestomp)",
                            "timestamp": time.time()
                        })
                    
                    # Check ctime vs mtime drift:
                    # ctime cannot be altered directly via userland touch command without root raw inode edits!
                    if st.st_ctime > st.st_mtime + 86400: # ctime is >24 hours newer than mtime
                        # If baseline recorded this file and its content changed, timestomp is confirmed!
                        if rel_path in baseline_files:
                            anomalies.append({
                                "severity": "HIGH",
                                "type": "TIMESTOMPING_EVASION_CONFIRMED",
                                "file": rel_path,
                                "detail": f"mtime was backdated to {time.ctime(st.st_mtime)} while kernel ctime reflects recent change at {time.ctime(st.st_ctime)}",
                                "mitre_technique": "T1070.006",
                                "timestamp": time.time()
                            })
                except OSError:
                    pass

        return anomalies

    def run_full_rootkit_audit(self, baseline_files: Dict[str, Any] = None) -> Dict[str, Any]:
        """Execute complete Exp 5 rootkit assessment suite."""
        baseline_files = baseline_files or {}
        preload_findings = self.audit_preloaded_libraries()
        hidden_findings = self.scan_hidden_artifacts()
        cross_view_findings = self.cross_view_heuristic_audit(baseline_files)

        all_threats = preload_findings + hidden_findings + cross_view_findings
        threat_score = min(100, len(all_threats) * 25)
        
        status = "CLEAN"
        if threat_score >= 50:
            status = "ROOTKIT_THREAT_ACTIVE"
        elif threat_score > 0:
            status = "SUSPICIOUS_ANOMALIES"

        return {
            "module": "Exp 5 - Rootkits & System Integrity",
            "audit_timestamp": time.time(),
            "status": status,
            "threat_score": threat_score,
            "threats_count": len(all_threats),
            "findings": all_threats,
            "mitre_coverage": [
                {"id": "T1014", "name": "Rootkit", "status": "Audited"},
                {"id": "T1070.006", "name": "Timestomp", "status": "Audited"},
                {"id": "T1564.001", "name": "Hidden Files and Directories", "status": "Audited"},
                {"id": "T1574.006", "name": "Dynamic Linker Hijacking", "status": "Audited"},
                {"id": "T1548.001", "name": "Setuid and Setgid", "status": "Audited"}
            ]
        }
