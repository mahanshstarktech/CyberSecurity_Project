"""
AegisFIM - Attack Simulator Suite for Lab Demos & Evaluations
Student: Mahansh Gaur (23ESKCY302 | Roll 32 | CSL-G28)
Exp 5: Rootkits & System Integrity Testing
"""

import os
import time
import random
import os.path
from typing import Dict, Any


class AttackSimulator:
    def __init__(self, monitored_dir: str):
        self.monitored_dir = os.path.abspath(monitored_dir)

    def attack_unauthorized_modification(self) -> Dict[str, Any]:
        """Modify /etc/passwd or a system file to inject an unauthorized root backdoor account."""
        target_file = os.path.join(self.monitored_dir, "etc", "passwd")
        os.makedirs(os.path.dirname(target_file), exist_ok=True)
        
        # Ensure file exists
        if not os.path.exists(target_file):
            with open(target_file, "w") as f:
                f.write("root:x:0:0:root:/root:/bin/bash\ndaemon:x:1:1:daemon:/usr/sbin:/usr/sbin/nologin\n")

        with open(target_file, "a") as f:
            f.write(f"\nbackdoor_admin_{random.randint(100, 999)}:x:0:0:root:/root:/bin/bash # INJECTED_BY_EXPLOIT\n")

        return {
            "attack": "UNAUTHORIZED_FILE_MODIFICATION",
            "target": os.path.relpath(target_file, self.monitored_dir),
            "payload": "Appended unauthorized root account (UID 0) to passwd file",
            "mitre": "T1078 (Valid Accounts), T1098 (Account Manipulation)",
            "timestamp": time.time()
        }

    def attack_timestomping(self) -> Dict[str, Any]:
        """
        Modify a critical file and roll back its modification time (mtime) to 2019.
        Standard 'ls -l' will show 2019, but kernel 'ctime' will reveal recent change!
        """
        target_file = os.path.join(self.monitored_dir, "bin", "auth_daemon")
        os.makedirs(os.path.dirname(target_file), exist_ok=True)
        
        with open(target_file, "w") as f:
            f.write("#!/bin/bash\n# Patched authentication bypass\nexit 0\n")

        # Roll back mtime to Jan 1, 2019 (1546300800)
        old_epoch = 1546300800.0
        os.utime(target_file, (old_epoch, old_epoch))

        return {
            "attack": "TIMESTOMPING_EVASION",
            "target": os.path.relpath(target_file, self.monitored_dir),
            "payload": "Modified binary content and forged mtime to 2019-01-01 to evade audit timestamp checks",
            "mitre": "T1070.006 (Timestomping)",
            "timestamp": time.time()
        }

    def attack_ransomware_encryption(self) -> Dict[str, Any]:
        """Simulate ransomware encrypting files and spiking Shannon entropy towards 8.0."""
        target_file = os.path.join(self.monitored_dir, "secure_vault", "financial_records.dat")
        os.makedirs(os.path.dirname(target_file), exist_ok=True)

        # Generate high-entropy pseudo-random bytes (simulating AES-256 encryption)
        encrypted_bytes = os.urandom(8192)
        with open(target_file + ".locked", "wb") as f:
            f.write(encrypted_bytes)

        # Also touch canary if exists
        canary_path = os.path.join(self.monitored_dir, "!00_CONFIDENTIAL_PAYROLL_2025.xlsx")
        if os.path.exists(canary_path):
            with open(canary_path, "wb") as f:
                f.write(os.urandom(4096))

        return {
            "attack": "RANSOMWARE_ENCRYPTION_BURST",
            "target": "secure_vault/financial_records.dat.locked",
            "payload": "Encrypted file payload created (Entropy ~7.98), Canary bait file encrypted!",
            "mitre": "T1486 (Data Encrypted for Impact)",
            "timestamp": time.time()
        }

    def attack_ld_preload_rootkit(self) -> Dict[str, Any]:
        """Inject malicious shared library hook into ld.so.preload config."""
        preload_file = os.path.join(self.monitored_dir, "etc", "ld.so.preload")
        os.makedirs(os.path.dirname(preload_file), exist_ok=True)

        with open(preload_file, "w") as f:
            f.write("/lib/security/libshadow_rootkit_hook.so\n")

        return {
            "attack": "LD_PRELOAD_ROOTKIT_INJECTION",
            "target": "etc/ld.so.preload",
            "payload": "Configured dynamic linker hook to inject rootkit DSO into every spawned process",
            "mitre": "T1574.006 (Dynamic Linker Hijacking), T1014 (Rootkit)",
            "timestamp": time.time()
        }

    def attack_suid_backdoor(self) -> Dict[str, Any]:
        """Drop a stealth SUID binary in a disguised location."""
        backdoor_path = os.path.join(self.monitored_dir, "bin", ".stealth_suid_backdoor")
        os.makedirs(os.path.dirname(backdoor_path), exist_ok=True)

        with open(backdoor_path, "w") as f:
            f.write("#!/bin/sh\n/bin/bash -p\n")

        # Try setting SUID bit
        try:
            os.chmod(backdoor_path, 0o4755)
        except OSError:
            pass

        return {
            "attack": "SUID_PRIVILEGE_ESCALATION_BACKDOOR",
            "target": "bin/.stealth_suid_backdoor",
            "payload": "Hidden executable created with SUID permission bit (04755)",
            "mitre": "T1548.001 (Setuid and Setgid), T1564.001 (Hidden Files)",
            "timestamp": time.time()
        }

    def reset_sandbox_to_clean(self):
        """Reset the demo sandbox back to clean known system files."""
        # Clean directory
        import shutil
        if os.path.exists(self.monitored_dir):
            shutil.rmtree(self.monitored_dir)
            
        # Re-create clean baseline structure
        os.makedirs(os.path.join(self.monitored_dir, "etc"), exist_ok=True)
        os.makedirs(os.path.join(self.monitored_dir, "bin"), exist_ok=True)
        os.makedirs(os.path.join(self.monitored_dir, "secure_vault"), exist_ok=True)

        with open(os.path.join(self.monitored_dir, "etc", "passwd"), "w") as f:
            f.write("root:x:0:0:root:/root:/bin/bash\nuser:x:1000:1000:User:/home/user:/bin/bash\n")

        with open(os.path.join(self.monitored_dir, "etc", "hosts"), "w") as f:
            f.write("127.0.0.1 localhost\n::1 localhost\n")

        with open(os.path.join(self.monitored_dir, "bin", "auth_daemon"), "w") as f:
            f.write("#!/bin/bash\n# Standard secure auth daemon binary stub\necho 'Service verified'\n")

        with open(os.path.join(self.monitored_dir, "secure_vault", "financial_records.dat"), "w") as f:
            f.write("Q1_PROVENUE=15420000\nQ2_PROVENUE=19800000\nTAX_STATUS=COMPLIANT\n")

