"""
AegisFIM - Enterprise Autonomous File Integrity & Rootkit Detection System
FastAPI Backend API & Real-time WebSocket Server
Student: Mahansh Gaur (23ESKCY302 | Roll 32 | CSL-G28)
Exp 5 - Rootkits & System Integrity
"""

import os
import sys
import time
import psutil
import asyncio
from typing import Dict, List, Any, Optional
from contextlib import asynccontextmanager

from fastapi import FastAPI, WebSocket, WebSocketDisconnect, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from .fim_core import FIMCoreEngine
from .rootkit_detector import RootkitDetector
from .ransomware_canary import RansomwareCanaryManager
from .merkle_chain import MerkleAuditChain
from .monitor_daemon import FIMObserverDaemon
from .mock_attacks import AttackSimulator

# Base directories
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
MONITORED_DIR = os.environ.get("MONITORED_DIR", os.path.join(BASE_DIR, "..", "monitored_directory"))
MONITORED_DIR = os.path.abspath(MONITORED_DIR)
BASELINE_FILE = os.path.join(BASE_DIR, "baseline.json")
MERKLE_FILE = os.path.join(BASE_DIR, "merkle_chain.json")
QUARANTINE_DIR = os.path.join(BASE_DIR, "quarantine_vault")

os.makedirs(MONITORED_DIR, exist_ok=True)
os.makedirs(QUARANTINE_DIR, exist_ok=True)

# Subsystem initializations
fim_engine = FIMCoreEngine(target_directory=MONITORED_DIR, baseline_path=BASELINE_FILE)
rootkit_detector = RootkitDetector(monitored_dir=MONITORED_DIR)
canary_manager = RansomwareCanaryManager(target_dir=MONITORED_DIR)
merkle_chain = MerkleAuditChain(storage_path=MERKLE_FILE)
attack_simulator = AttackSimulator(monitored_dir=MONITORED_DIR)


class ConnectionManager:
    def __init__(self):
        self.active_connections: List[WebSocket] = []

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)

    def disconnect(self, websocket: WebSocket):
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)

    async def broadcast(self, message: dict):
        for connection in list(self.active_connections):
            try:
                await connection.send_json(message)
            except Exception:
                self.disconnect(connection)


ws_manager = ConnectionManager()
loop = asyncio.new_event_loop()


def on_fs_event(event_type: str, file_path: str, meta: dict):
    """Callback triggered synchronously by Watchdog daemon thread."""
    rel_p = meta.get("path", os.path.basename(file_path))
    
    # Calculate hash and entropy if file exists
    curr_sha = ""
    entropy = 0.0
    if os.path.exists(file_path) and os.path.isfile(file_path):
        from .fim_core import compute_file_hashes
        try:
            h = compute_file_hashes(file_path)
            curr_sha = h["sha256"]
            entropy = h["entropy"]
        except Exception:
            pass

    event_payload = {
        "event_type": event_type,
        "file": rel_p,
        "abs_path": file_path,
        "sha256": curr_sha,
        "entropy": entropy,
        "timestamp": time.time(),
        "is_canary": "!00_" in rel_p or "canary" in rel_p.lower()
    }

    # Append to append-only Merkle Hash Chain
    merkle_chain.add_event(f"FS_{event_type}", event_payload)

    # Broadcast via asyncio to connected WebSockets
    try:
        asyncio.run(ws_manager.broadcast({
            "type": "LIVE_FS_EVENT",
            "data": event_payload
        }))
    except Exception:
        pass


observer_daemon = FIMObserverDaemon(target_directory=MONITORED_DIR, event_callback=on_fs_event)


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: Ensure baseline and start watchdog
    if not os.path.exists(os.path.join(MONITORED_DIR, "etc")):
        attack_simulator.reset_sandbox_to_clean()
    if not fim_engine.baseline:
        fim_engine.create_baseline()
        merkle_chain.add_event("BASELINE_CREATED", {"files_count": fim_engine.baseline.get("total_files", 0)})
    
    # Start live directory observer
    observer_daemon.start()
    yield
    # Shutdown
    observer_daemon.stop()


app = FastAPI(
    title="AegisFIM API",
    description="Enterprise File & Rootkit Integrity Monitoring System",
    version="1.0.0",
    lifespan=lifespan
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
def read_root():
    return {
        "service": "AegisFIM Enterprise Security Daemon",
        "student": "Mahansh Gaur",
        "registration_id": "23ESKCY302",
        "roll_number": 32,
        "batch": "CSL-G28",
        "lab_experiment": "Exp 5 - Rootkits & System Integrity",
        "status": "ONLINE",
        "docs": "/docs"
    }


@app.get("/api/status")
def get_system_status():
    mem = psutil.virtual_memory()
    return {
        "system": {
            "platform": sys.platform,
            "cpu_percent": psutil.cpu_percent(),
            "memory_percent": mem.percent,
            "uptime_seconds": round(time.time() - psutil.boot_time(), 1),
        },
        "fim_daemon": {
            "monitoring_directory": MONITORED_DIR,
            "observer_running": observer_daemon.is_running,
            "baseline_initialized": bool(fim_engine.baseline),
            "baseline_created_at": fim_engine.baseline.get("created_at"),
            "total_baseline_files": fim_engine.baseline.get("total_files", 0),
            "merkle_root": fim_engine.baseline.get("merkle_root", "")
        },
        "student_metadata": {
            "name": "Mahansh Gaur",
            "roll": 32,
            "reg_no": "23ESKCY302",
            "batch": "CSL-G28",
            "subject": "Cyber Security Lab (Exp 5)"
        }
    }


@app.post("/api/baseline/create")
async def create_baseline():
    baseline = fim_engine.create_baseline()
    block = merkle_chain.add_event("BASELINE_REGENERATED", {
        "total_files": baseline["total_files"],
        "merkle_root": baseline["merkle_root"]
    })
    await ws_manager.broadcast({
        "type": "BASELINE_UPDATED",
        "data": {
            "total_files": baseline["total_files"],
            "merkle_root": baseline["merkle_root"],
            "block_hash": block["block_hash"]
        }
    })
    return {
        "status": "SUCCESS",
        "message": "SHA-256 baseline generated successfully",
        "total_files": baseline["total_files"],
        "merkle_root": baseline["merkle_root"],
        "block": block
    }


@app.get("/api/baseline/verify")
def verify_baseline():
    result = fim_engine.verify_integrity()
    return result


@app.get("/api/monitored-files")
def list_monitored_files():
    files_list = []
    baseline_files = fim_engine.baseline.get("files", {})
    
    for root, dirs, files in os.walk(MONITORED_DIR):
        dirs[:] = [d for d in dirs if not d.startswith(".git") and d != "__pycache__"]
        for f in files:
            if f.startswith(".DS_Store"):
                continue
            full_path = os.path.join(root, f)
            meta = fim_engine.scan_file(full_path)
            if meta:
                rel = meta["rel_path"]
                in_base = rel in baseline_files
                base_sha = baseline_files[rel]["sha256"] if in_base else None
                is_tampered = in_base and meta["sha256"] != base_sha
                meta["is_in_baseline"] = in_base
                meta["is_tampered"] = is_tampered
                files_list.append(meta)

    return {
        "count": len(files_list),
        "files": files_list
    }


@app.get("/api/rootkit/audit")
def run_rootkit_audit():
    result = rootkit_detector.run_full_rootkit_audit(fim_engine.baseline.get("files", {}))
    return result


@app.post("/api/canary/deploy")
def deploy_canaries():
    deployed = canary_manager.deploy_canaries()
    merkle_chain.add_event("CANARIES_DEPLOYED", {"count": len(deployed)})
    return {
        "status": "DEPLOYED",
        "canaries": deployed
    }


@app.get("/api/canary/status")
def check_canaries():
    incidents = canary_manager.check_canaries()
    return {
        "status": "ALERT" if incidents else "SECURE",
        "incidents": incidents,
        "total_registered": len(canary_manager.canary_registry)
    }


@app.get("/api/merkle/chain")
def get_merkle_chain(limit: int = 50):
    return {
        "chain_length": len(merkle_chain.chain),
        "blocks": merkle_chain.get_recent_blocks(limit)
    }


@app.get("/api/merkle/verify")
def verify_merkle_integrity():
    verification = merkle_chain.verify_chain_integrity()
    return verification


class QuarantineRequest(BaseModel):
    rel_path: str


@app.post("/api/quarantine")
async def quarantine_file(req: QuarantineRequest):
    target = os.path.join(MONITORED_DIR, req.rel_path)
    if not os.path.exists(target):
        raise HTTPException(status_code=404, detail="File not found")

    dest = os.path.join(QUARANTINE_DIR, f"{os.path.basename(req.rel_path)}.{int(time.time())}.quarantine")
    os.rename(target, dest)
    # Strip all execution and read permissions
    try:
        os.chmod(dest, 0o000)
    except OSError:
        pass

    block = merkle_chain.add_event("FILE_QUARANTINED", {
        "file": req.rel_path,
        "vault_path": dest
    })
    
    await ws_manager.broadcast({
        "type": "SECURITY_ACTION",
        "action": "QUARANTINE",
        "file": req.rel_path
    })

    return {
        "status": "QUARANTINED",
        "file": req.rel_path,
        "quarantine_vault": dest,
        "block": block
    }


@app.post("/api/simulate/{attack_type}")
async def simulate_attack(attack_type: str):
    attack_map = {
        "modification": attack_simulator.attack_unauthorized_modification,
        "timestomping": attack_simulator.attack_timestomping,
        "ransomware": attack_simulator.attack_ransomware_encryption,
        "rootkit_preload": attack_simulator.attack_ld_preload_rootkit,
        "suid_backdoor": attack_simulator.attack_suid_backdoor,
    }

    if attack_type not in attack_map:
        raise HTTPException(status_code=400, detail=f"Unknown attack type: {attack_type}")

    result = attack_map[attack_type]()
    block = merkle_chain.add_event("ATTACK_SIMULATED", result)
    
    await ws_manager.broadcast({
        "type": "ATTACK_TRIGGERED",
        "attack": attack_type,
        "details": result
    })

    return {
        "status": "TRIGGERED",
        "attack_result": result,
        "block": block
    }


@app.post("/api/reset")
async def reset_sandbox():
    attack_simulator.reset_sandbox_to_clean()
    fim_engine.create_baseline()
    block = merkle_chain.add_event("SANDBOX_RESET", {"status": "RESTORED_TO_PRISTINE"})
    
    await ws_manager.broadcast({
        "type": "SYSTEM_RESET",
        "message": "Monitored directory restored to clean baseline"
    })

    return {
        "status": "CLEAN",
        "message": "Sandbox files restored and baseline re-established",
        "block": block
    }


@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await ws_manager.connect(websocket)
    try:
        # Send initial status packet
        await websocket.send_json({
            "type": "CONNECTED",
            "message": "Connected to AegisFIM Real-Time Telemetry Stream",
            "timestamp": time.time()
        })
        while True:
            # Keepalive receiver
            data = await websocket.receive_text()
            if data == "ping":
                await websocket.send_json({"type": "pong", "timestamp": time.time()})
    except WebSocketDisconnect:
        ws_manager.disconnect(websocket)
    except Exception:
        ws_manager.disconnect(websocket)

