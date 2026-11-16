"""
AegisFIM - Automated Validation & Test Suite
Student: Mahansh Gaur | Roll 32 | Reg: 23ESKCY302 | Batch: CSL-G28
"""

import os
import shutil
import tempfile
import unittest
from app.fim_core import FIMCoreEngine, calculate_entropy, compute_file_hashes
from app.rootkit_detector import RootkitDetector
from app.ransomware_canary import RansomwareCanaryManager
from app.merkle_chain import MerkleAuditChain
from app.mock_attacks import AttackSimulator


class TestAegisFIM(unittest.TestCase):
    def setUp(self):
        self.test_dir = tempfile.mkdtemp(prefix="aegisfim_test_")
        self.baseline_file = os.path.join(self.test_dir, "test_baseline.json")
        self.merkle_file = os.path.join(self.test_dir, "test_merkle.json")

        # Create sample files
        os.makedirs(os.path.join(self.test_dir, "etc"), exist_ok=True)
        self.sample_passwd = os.path.join(self.test_dir, "etc", "passwd")
        with open(self.sample_passwd, "w") as f:
            f.write("root:x:0:0:root:/root:/bin/bash\n")

    def tearDown(self):
        shutil.rmtree(self.test_dir, ignore_errors=True)

    def test_entropy_calculation(self):
        # Uniform text has low entropy
        low_entropy = calculate_entropy(b"AAAAAAAABBBBBBBBCCCCCCCC")
        self.assertLess(low_entropy, 2.0)
        
        # Pseudo-random bytes have high entropy (~7.5+)
        random_bytes = os.urandom(2048)
        high_entropy = calculate_entropy(random_bytes)
        self.assertGreater(high_entropy, 7.3)

    def test_baseline_and_integrity_verification(self):
        engine = FIMCoreEngine(target_directory=self.test_dir, baseline_path=self.baseline_file)
        baseline = engine.create_baseline()
        self.assertGreaterEqual(baseline["total_files"], 1)

        # Baseline verification when clean
        report = engine.verify_integrity()
        self.assertEqual(report["status"], "SECURE")
        self.assertEqual(len(report["modified"]), 0)

        # Tamper with file
        with open(self.sample_passwd, "a") as f:
            f.write("backdoor_hacker:x:0:0::/root:/bin/bash\n")

        # Re-verify -> should detect modification
        report_after = engine.verify_integrity()
        self.assertEqual(report_after["status"], "COMPROMISED")
        self.assertEqual(len(report_after["modified"]), 1)
        self.assertEqual(report_after["modified"][0]["path"], "etc/passwd")

    def test_merkle_tamper_proofing(self):
        chain = MerkleAuditChain(storage_path=self.merkle_file)
        chain.add_event("FILE_SCAN", {"status": "CLEAN"})
        chain.add_event("FILE_MODIFIED", {"file": "etc/passwd"})
        
        # Verify legitimate chain
        res = chain.verify_chain_integrity()
        self.assertTrue(res["valid"])
        self.assertEqual(res["status"], "CRYPTOGRAPHICALLY_VERIFIED")

        # Simulate attacker tampering with block #1 payload
        chain.chain[1]["payload"]["file"] = "innocent_file.txt"
        tampered_res = chain.verify_chain_integrity()
        self.assertFalse(tampered_res["valid"])
        self.assertEqual(tampered_res["compromised_block_index"], 1)

    def test_canary_deployment_and_trip(self):
        mgr = RansomwareCanaryManager(target_dir=self.test_dir)
        deployed = mgr.deploy_canaries()
        self.assertGreaterEqual(len(deployed), 2)

        # Before tampering
        incidents = mgr.check_canaries()
        self.assertEqual(len(incidents), 0)

        # Ransomware modifies top canary
        canary_path = deployed[0]["path"]
        with open(canary_path, "wb") as f:
            f.write(os.urandom(1024))

        # Check -> must trip alert!
        tripped = mgr.check_canaries()
        self.assertGreaterEqual(len(tripped), 1)
        self.assertIn("CANARY_FILE_ENCRYPTED", tripped[0]["event"])

    def test_rootkit_preload_detection(self):
        detector = RootkitDetector(monitored_dir=self.test_dir)
        preload_path = os.path.join(self.test_dir, "etc", "ld.so.preload")
        with open(preload_path, "w") as f:
            f.write("/lib/security/librootkit.so\n")

        findings = detector.run_full_rootkit_audit()
        self.assertGreater(findings["threat_score"], 0)
        has_preload_alert = any("Preload" in f.get("source", "") or "ld.so.preload" in f.get("source", "") for f in findings["findings"])
        self.assertTrue(has_preload_alert)


if __name__ == "__main__":
    unittest.main()
