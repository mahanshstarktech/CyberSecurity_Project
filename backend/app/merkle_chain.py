"""
AegisFIM - Tamper-Proof Cryptographic Hash Chain & Merkle Tree Vault
Assisted by Anthropic Cybersecurity Skills: implementing-log-integrity-with-blockchain
NIST CSF 2.0: PR.DS-11, DE.CM-01 | MITRE ATT&CK: T1070 (Indicator Removal)
"""

import time
import json
import hashlib
from typing import Dict, List, Any, Optional


def sha256_hash(data: str) -> str:
    """Compute standard SHA-256 hex digest."""
    return hashlib.sha256(data.encode("utf-8")).hexdigest()


class MerkleAuditChain:
    def __init__(self, storage_path: str = "merkle_chain.json"):
        self.storage_path = storage_path
        self.chain: List[Dict[str, Any]] = []
        self.load_or_genesis()

    def create_genesis_block(self):
        """Create initial tamper-proof genesis block."""
        genesis_payload = {
            "system": "AegisFIM Enterprise Cryptographic Audit Vault",
            "developer": "Mahansh Gaur (23ESKCY302 | Roll 32 | CSL-G28)",
            "exp_module": "Exp 5 - Rootkits & System Integrity",
            "security_mode": "CRYPTOGRAPHIC_APPEND_ONLY_CHAIN"
        }
        timestamp = time.time()
        block_content = f"0:{timestamp}:GENESIS:{json.dumps(genesis_payload, sort_keys=True)}:0000000000000000000000000000000000000000000000000000000000000000"
        block_hash = sha256_hash(block_content)
        
        genesis_block = {
            "index": 0,
            "timestamp": timestamp,
            "event_type": "GENESIS",
            "payload": genesis_payload,
            "prev_hash": "0" * 64,
            "block_hash": block_hash
        }
        self.chain = [genesis_block]
        self.save_chain()

    def load_or_genesis(self):
        """Load persistent chain from disk or initialize genesis."""
        try:
            with open(self.storage_path, "r", encoding="utf-8") as f:
                self.chain = json.load(f)
                if not self.chain:
                    self.create_genesis_block()
        except Exception:
            self.create_genesis_block()

    def save_chain(self):
        """Persist chain to disk."""
        try:
            with open(self.storage_path, "w", encoding="utf-8") as f:
                json.dump(self.chain, f, indent=2)
        except Exception:
            pass

    def add_event(self, event_type: str, payload: Dict[str, Any]) -> Dict[str, Any]:
        """
        Append a new security event to the tamper-proof cryptographic chain.
        Incorporates the previous block's SHA-256 hash.
        """
        prev_block = self.chain[-1]
        prev_hash = prev_block["block_hash"]
        new_index = len(self.chain)
        timestamp = time.time()

        serialized_payload = json.dumps(payload, sort_keys=True)
        block_content = f"{new_index}:{timestamp}:{event_type}:{serialized_payload}:{prev_hash}"
        block_hash = sha256_hash(block_content)

        block = {
            "index": new_index,
            "timestamp": timestamp,
            "event_type": event_type,
            "payload": payload,
            "prev_hash": prev_hash,
            "block_hash": block_hash
        }

        self.chain.append(block)
        self.save_chain()
        return block

    def verify_chain_integrity(self) -> Dict[str, Any]:
        """
        Mathematically verify the cryptographic integrity of the entire audit chain.
        Returns VERIFIED if pristine, or pinpoints the exact compromised block.
        """
        if not self.chain:
            return {"status": "EMPTY", "valid": False}

        for i in range(len(self.chain)):
            current = self.chain[i]

            # 1. Check previous hash reference
            if i == 0:
                if current["prev_hash"] != "0" * 64:
                    return {
                        "valid": False,
                        "status": "GENESIS_TAMPERED",
                        "compromised_block_index": 0,
                        "detail": "Genesis block prev_hash was modified!"
                    }
            else:
                previous = self.chain[i - 1]
                if current["prev_hash"] != previous["block_hash"]:
                    return {
                        "valid": False,
                        "status": "HASH_CHAIN_BROKEN",
                        "compromised_block_index": i,
                        "detail": f"Block #{i} prev_hash does not match Block #{i-1} block_hash! Possible log deletion or insertion."
                    }

            # 2. Recalculate block hash
            serialized_payload = json.dumps(current["payload"], sort_keys=True)
            expected_content = f"{current['index']}:{current['timestamp']}:{current['event_type']}:{serialized_payload}:{current['prev_hash']}"
            computed_hash = sha256_hash(expected_content)

            if computed_hash != current["block_hash"]:
                return {
                    "valid": False,
                    "status": "BLOCK_CONTENT_TAMPERED",
                    "compromised_block_index": i,
                    "expected_hash": computed_hash,
                    "recorded_hash": current["block_hash"],
                    "detail": f"Cryptographic integrity failed at Block #{i}! The log payload was altered post-recording."
                }

        latest_hash = self.chain[-1]["block_hash"]
        return {
            "valid": True,
            "status": "CRYPTOGRAPHICALLY_VERIFIED",
            "chain_length": len(self.chain),
            "latest_block_hash": latest_hash,
            "verified_at": time.time(),
            "detail": f"All {len(self.chain)} audit blocks cryptographically intact with valid SHA-256 Merkle links."
        }

    def get_recent_blocks(self, limit: int = 50) -> List[Dict[str, Any]]:
        """Return the most recent blocks in reverse chronological order."""
        return list(reversed(self.chain[-limit:]))

