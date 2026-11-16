"""
chain.py - the bits every script shares: where the network is, where the
contract is, and how to speak JSON-RPC. Address resolution order:

    1. ANTEDATE_ADDRESS environment variable
    2. contracts/FROZEN.json  ->  deployment.address

Change the address in exactly one of those two places and every tool -
scripts and the web site alike - follows.
"""

from __future__ import annotations

import hashlib
import json
import os
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
FROZEN_PATH = ROOT / "contracts" / "FROZEN.json"
CONTRACT_PATH = ROOT / "contracts" / "antedate.py"


def frozen() -> dict:
    return json.loads(FROZEN_PATH.read_text(encoding="utf-8"))


def network() -> dict:
    return frozen()["network"]


def address() -> str:
    env = os.environ.get("ANTEDATE_ADDRESS", "").strip()
    if env:
        return env
    found = frozen()["deployment"]["address"]
    if not found or set(found) <= {"0", "x"}:
        raise SystemExit(
            "no contract address configured - deploy with scripts/deploy.py, "
            "then write contracts/FROZEN.json or export ANTEDATE_ADDRESS"
        )
    return found


def source_bytes() -> bytes:
    return CONTRACT_PATH.read_bytes()


def source_sha256() -> str:
    return hashlib.sha256(source_bytes()).hexdigest()


def rpc(method: str, params: list | None = None, timeout: int = 30):
    """One JSON-RPC call against the Studio Next endpoint."""
    url = network()["rpc"]
    body = json.dumps({"jsonrpc": "2.0", "id": 1, "method": method, "params": params or []}).encode()
    req = urllib.request.Request(
        url,
        data=body,
        headers={"Content-Type": "application/json", "User-Agent": "antedate-scripts/1.0"},
    )
    with urllib.request.urlopen(req, timeout=timeout) as res:
        out = json.loads(res.read().decode())
    if "error" in out:
        raise SystemExit(f"rpc error from {method}: {out['error']}")
    return out.get("result")


def explorer_tx(tx: str) -> str:
    return f"{network()['explorer']}/tx/{tx}"


def explorer_address(addr: str) -> str:
    return f"{network()['explorer']}/address/{addr}"
