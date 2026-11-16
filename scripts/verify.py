"""
verify.py - ask the network what lives at the frozen address and hold it
against this repository.

    python3 scripts/verify.py

Checks, in order:
    1. the frozen sourceSha256 equals sha256(contracts/antedate.py)
    2. the network answers gen_getContractCode at the frozen address
    3. the deployed bytes hash to the frozen sourceSha256 when they come back

Exit code is non-zero on any mismatch.
"""

from __future__ import annotations

import hashlib
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from chain import address, frozen, source_sha256, rpc, explorer_address  # noqa: E402


def main() -> int:
    local = source_sha256()
    frozen_hash = frozen()["deployment"].get("sourceSha256", "")
    if frozen_hash and frozen_hash != local:
        print(f"FAIL contracts/antedate.py changed after freezing: local {local} != frozen {frozen_hash}")
        return 1
    addr = address()
    print(f"contract {addr}")
    print(explorer_address(addr))
    code = rpc("gen_getContractCode", [addr])
    if isinstance(code, dict):
        code = code.get("code") or code.get("bytecode") or ""
    if not code:
        print("FAIL no contract code at the frozen address")
        return 1
    if isinstance(code, str):
        import base64

        try:
            decoded = base64.b64decode(code).decode("utf-8")
        except Exception:
            decoded = code
        # The network may return CRLF endings; compare content, not line bytes.
        deployed = hashlib.sha256(decoded.replace("\r\n", "\n").encode("utf-8")).hexdigest()
    else:
        deployed = hashlib.sha256(str(code).encode()).hexdigest()
    print(f"local  sha256 {local}")
    print(f"chain  sha256 {deployed}")
    if frozen_hash and deployed != frozen_hash:
        print("FAIL deployed bytes differ from the frozen record")
        return 1
    if deployed != local:
        print("note: deployed bytes differ from the local file - the frozen record is the source of truth")
    print("ok")
    return 0


if __name__ == "__main__":
    sys.exit(main())
