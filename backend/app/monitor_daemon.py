"""
AegisFIM - Real-Time File System Observer Daemon (Watchdog)
Asynchronous event dispatcher with WebSocket integration
"""

import os
import time
import asyncio
from typing import Callable, Optional, Dict, Any
from watchdog.observers import Observer
from watchdog.events import FileSystemEventHandler, FileSystemEvent


class FIMWatchdogHandler(FileSystemEventHandler):
    def __init__(self, callback: Callable[[str, str, Dict], None], target_dir: str):
        super().__init__()
        self.callback = callback
        self.target_dir = os.path.abspath(target_dir)

    def on_created(self, event: FileSystemEvent):
        if not event.is_directory:
            rel = os.path.relpath(event.src_path, self.target_dir)
            if not rel.startswith(".git") and "__pycache__" not in rel and not rel.startswith(".DS_Store"):
                self.callback("CREATED", event.src_path, {"path": rel, "abs_path": event.src_path})

    def on_modified(self, event: FileSystemEvent):
        if not event.is_directory:
            rel = os.path.relpath(event.src_path, self.target_dir)
            if not rel.startswith(".git") and "__pycache__" not in rel and not rel.startswith(".DS_Store"):
                self.callback("MODIFIED", event.src_path, {"path": rel, "abs_path": event.src_path})

    def on_deleted(self, event: FileSystemEvent):
        if not event.is_directory:
            rel = os.path.relpath(event.src_path, self.target_dir)
            if not rel.startswith(".git") and "__pycache__" not in rel and not rel.startswith(".DS_Store"):
                self.callback("DELETED", event.src_path, {"path": rel, "abs_path": event.src_path})

    def on_moved(self, event: FileSystemEvent):
        if not event.is_directory:
            rel_src = os.path.relpath(event.src_path, self.target_dir)
            rel_dest = os.path.relpath(event.dest_path, self.target_dir)
            if not rel_src.startswith(".git") and not rel_dest.startswith(".git"):
                self.callback("MOVED", event.dest_path, {
                    "old_path": rel_src,
                    "new_path": rel_dest,
                    "abs_path": event.dest_path
                })


class FIMObserverDaemon:
    def __init__(self, target_directory: str, event_callback: Callable[[str, str, dict], None]):
        self.target_directory = os.path.abspath(target_directory)
        self.event_callback = event_callback
        self.observer: Optional[Observer] = None
        self.is_running = False

    def start(self):
        """Start directory monitoring thread."""
        os.makedirs(self.target_directory, exist_ok=True)
        event_handler = FIMWatchdogHandler(self.event_callback, self.target_directory)
        self.observer = Observer()
        self.observer.schedule(event_handler, self.target_directory, recursive=True)
        self.observer.start()
        self.is_running = True

    def stop(self):
        """Gracefully terminate observer."""
        if self.observer and self.is_running:
            self.observer.stop()
            self.observer.join()
            self.is_running = False
