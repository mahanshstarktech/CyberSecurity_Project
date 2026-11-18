"""
AegisFIM - Ransomware Canary & Deception Trap Subsystem
Assisted by Anthropic Cybersecurity Skills: deploying-ransomware-canary-files
MITRE ATT&CK: T1486 (Data Encrypted for Impact), T1083 (File and Directory Discovery)
"""

import os
import time
import hashlib
from typing import Dict, List, Any


CANARY_TEMPLATES = [
    {
        "filename": "!00_CONFIDENTIAL_PAYROLL_2025.xlsx",
        "category": "Financial Decoy",
        "description": "Alphabetically sorted top decoy file to bait ransomware enumeration first",
        "mock_content": b"ACME_CORP_PAYROLL_DATA_CONFIDENTIAL_HASH_TRIPWIRE_CANARY_ACTIVE" * 64
    },
    {
        "filename": "backup_aws_service_credentials.env",
        "category": "Credential Decoy",
        "description": "Decoy credentials file designed to trip data theft and infostealers",
        "mock_content": b"AWS_ACCESS_KEY_ID=AKIAIOSFODNN7EXAMPLE\nAWS_SECRET_ACCESS_KEY=wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY\n" * 16
    },
    {
        "filename": "executive_crypto_recovery_seed.txt",
        "category": "Cryptographic Decoy",
        "description": "High-value crypto target decoy to intercept rapid automated encryption",
        "mock_content": b"TRIPWIRE_SECURITY_CANARY_DO_NOT_ALTER_MONITORED_BY_AEGIS_FIM" * 32
    }
]


class RansomwareCanaryManager:
    def __init__(self, target_dir: str):
        self.target_dir = os.path.abspath(target_dir)
        self.canary_registry: Dict[str, Dict[str, Any]] = {}

    def deploy_canaries(self) -> List[Dict[str, Any]]:
        """Deploy decoy canary files in target directories and record baseline hashes."""
        deployed = []
        os.makedirs(self.target_dir, exist_ok=True)

        for template in CANARY_TEMPLATES:
            file_path = os.path.join(self.target_dir, template["filename"])
            # Write canary content
            with open(file_path, "wb") as f:
                f.write(template["mock_content"])

            sha256 = hashlib.sha256(template["mock_content"]).hexdigest()
            canary_info = {
                "filename": template["filename"],
                "path": file_path,
                "category": template["category"],
                "description": template["description"],
                "sha256": sha256,
                "size": len(template["mock_content"]),
                "deployed_at": time.time(),
                "status": "ARMED_AND_WATCHING"
            }
            self.canary_registry[template["filename"]] = canary_info
            deployed.append(canary_info)

        return deployed

    def check_canaries(self) -> List[Dict[str, Any]]:
        """
        Verify status of all deployed canaries.
        If a canary file has been encrypted, altered, or deleted, triggers a Critical Ransomware Alert!
        """
        incidents = []

        for name, canary in self.canary_registry.items():
            path = canary["path"]
            if not os.path.exists(path):
                incidents.append({
                    "severity": "CRITICAL_RANSOMWARE_INDICATOR",
                    "canary_file": name,
                    "event": "CANARY_FILE_DELETED",
                    "detail": "Canary trap file was deleted or unlinked by unauthorized process!",
                    "mitre_technique": "T1485 (Data Destruction)",
                    "timestamp": time.time()
                })
            else:
                try:
                    with open(path, "rb") as f:
                        curr_data = f.read()
                    curr_hash = hashlib.sha256(curr_data).hexdigest()
                    if curr_hash != canary["sha256"]:
                        # Calculate entropy of the modified canary file
                        import math
                        byte_counts = [0] * 256
                        for b in curr_data:
                            byte_counts[b] += 1
                        entropy = 0.0
                        if curr_data:
                            for c in byte_counts:
                                if c > 0:
                                    p = c / len(curr_data)
                                    entropy -= p * math.log2(p)

                        incidents.append({
                            "severity": "CRITICAL_RANSOMWARE_ACTIVE",
                            "canary_file": name,
                            "event": "CANARY_FILE_ENCRYPTED_OR_MODIFIED",
                            "current_entropy": round(entropy, 3),
                            "is_high_entropy": entropy > 7.3,
                            "detail": f"Decoy file contents tampered! Entropy: {round(entropy, 3)}/8.0 (Likely automated encryption attack)",
                            "mitre_technique": "T1486 (Data Encrypted for Impact)",
                            "timestamp": time.time()
                        })
                except Exception as e:
                    incidents.append({
                        "severity": "HIGH",
                        "canary_file": name,
                        "event": "CANARY_ACCESS_DENIED",
                        "detail": f"Canary file locked or inaccessible: {str(e)}",
                        "timestamp": time.time()
                    })

        return incidents

